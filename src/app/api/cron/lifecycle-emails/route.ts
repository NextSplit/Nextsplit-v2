import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { serverConfig } from '@/lib/config'
import { LIFECYCLE_EMAILS, buildLifecycleEmailHtml } from '@/lib/lifecycleEmails'
import type { LifecycleEmailId } from '@/lib/lifecycleEmails'

/**
 * Lifecycle email cron — runs daily at 9am UTC.
 * Growth Pillar spec: 7-email sequence that turns signups into believers.
 * All emails in coach voice. Triggered by days since signup + conditions.
 */

function isAuthorized(req: NextRequest) {
  return req.headers.get('authorization') === `Bearer ${serverConfig.cronSecret}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!serverConfig.resendApiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  try {
    const { Resend } = await import('resend')
    const resend     = new Resend(serverConfig.resendApiKey)
    const supabase   = await createClient()
    const nowUtc     = new Date()

    // Fetch all users with email + signup date + lifecycle tracking
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await (supabase as any)
      .from('profiles')
      .select(`
        id, display_name, email, created_at, lifecycle_email_sent,
        last_session_logged_at, race_date, sessions_logged_count
      `)
      .not('email', 'is', null) as { data: AnyRecord[] | null }

    if (!profiles?.length) return NextResponse.json({ ok: true, sent: 0 })

    // Batch-check who has active plans
    const userIds = profiles.map(p => p.id as string)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: plans } = await (supabase as any)
      .from('user_plans')
      .select('user_id, name, current_week, total_weeks, race_date')
      .in('user_id', userIds)
      .eq('status', 'active') as { data: AnyRecord[] | null }

    const planByUser: Record<string, AnyRecord> = {}
    for (const p of plans ?? []) planByUser[p.user_id as string] = p

    // Batch-check session logs (last 30 days)
    const thirtyDaysAgo = new Date(nowUtc.getTime() - 30 * 86400000).toISOString()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: recentLogs } = await (supabase as any)
      .from('training_logs')
      .select('user_id, logged_at, km')
      .in('user_id', userIds)
      .gte('logged_at', thirtyDaysAgo)
      .eq('done', true) as { data: AnyRecord[] | null }

    // Group logs by user
    const logsByUser: Record<string, AnyRecord[]> = {}
    for (const l of recentLogs ?? []) {
      const uid = l.user_id as string
      if (!logsByUser[uid]) logsByUser[uid] = []
      logsByUser[uid].push(l)
    }

    let sent = 0

    for (const profile of profiles) {
      const uid       = profile.id as string
      const email     = profile.email as string | null
      if (!email) continue

      const firstName = (profile.display_name as string | null)?.split(' ')[0] ?? 'Runner'
      const plan      = planByUser[uid]
      const userLogs  = logsByUser[uid] ?? []
      const sentSet   = new Set<string>(profile.lifecycle_email_sent ?? [])

      // Days since signup
      const signupDate = new Date(profile.created_at as string)
      const daysSince  = Math.floor((nowUtc.getTime() - signupDate.getTime()) / 86400000)

      // Race date context
      const raceDateStr = plan?.race_date as string | null ?? profile.race_date as string | null
      const raceDate    = raceDateStr ? new Date(raceDateStr) : null
      const daysToRace  = raceDate ? Math.ceil((raceDate.getTime() - nowUtc.getTime()) / 86400000) : null

      // Session context
      const sessionsLogged = userLogs.length
      const totalKm        = userLogs.reduce((s: number, l: AnyRecord) => s + ((l.km as number) ?? 0), 0)
      const hasLoggedSession = sessionsLogged > 0
      const daysSinceLog   = userLogs.length > 0
        ? Math.floor((nowUtc.getTime() - new Date(userLogs[0].logged_at as string).getTime()) / 86400000)
        : null

      // Determine which email to send today (if any)
      let emailToSend: LifecycleEmailId | null = null

      // Post-race — event-based, highest priority
      if (raceDate && !sentSet.has('post_race')) {
        const daysSinceRace = Math.floor((nowUtc.getTime() - raceDate.getTime()) / 86400000)
        if (daysSinceRace >= 0 && daysSinceRace <= 1) {
          emailToSend = 'post_race'
        }
      }

      if (!emailToSend) {
        // Day 45 — at-risk (only if low activity)
        if (daysSince >= 45 && !sentSet.has('at_risk')) {
          const isLowActivity = !hasLoggedSession || (daysSinceLog !== null && daysSinceLog >= 14)
          if (isLowActivity) emailToSend = 'at_risk'
        }

        // Day 21 — soft conversion (always)
        if (!emailToSend && daysSince >= 21 && daysSince < 25 && !sentSet.has('soft_conversion')) {
          emailToSend = 'soft_conversion'
        }

        // Day 14 — adaptation primer (always)
        if (!emailToSend && daysSince >= 14 && daysSince < 18 && !sentSet.has('adaptation_primer')) {
          emailToSend = 'adaptation_primer'
        }

        // Day 7 — week one done (always)
        if (!emailToSend && daysSince >= 7 && daysSince < 11 && !sentSet.has('week_one_done')) {
          emailToSend = 'week_one_done'
        }

        // Day 3 — still there (only if no session logged)
        if (!emailToSend && daysSince >= 3 && daysSince < 7 && !sentSet.has('still_there')) {
          if (!hasLoggedSession) emailToSend = 'still_there'
        }

        // Day 0 — welcome (always, immediately)
        if (!emailToSend && daysSince === 0 && !sentSet.has('welcome')) {
          emailToSend = 'welcome'
        }
      }

      if (!emailToSend) continue

      const emailDef = LIFECYCLE_EMAILS[emailToSend]
      const html     = buildLifecycleEmailHtml(emailToSend, {
        firstName,
        planName:       plan?.name as string | undefined,
        sessionsLogged: sessionsLogged > 0 ? sessionsLogged : undefined,
        totalKm:        totalKm > 0 ? totalKm : undefined,
        raceDate:       raceDateStr ?? undefined,
        daysToRace:     daysToRace ?? undefined,
      })

      try {
        await resend.emails.send({
          from:    'NextSplit <coach@nextsplit.app>',
          to:      email,
          subject: emailDef.subject,
          html,
          headers: {
            'List-Unsubscribe': '<https://nextsplit.app/settings?section=notifications>',
          },
        })

        // Record this email as sent
        const updatedSent = [...sentSet, emailToSend]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('profiles')
          .update({ lifecycle_email_sent: updatedSent })
          .eq('id', uid)

        sent++
      } catch {
        // Non-fatal — skip this user, try next
      }
    }

    return NextResponse.json({ ok: true, sent })
  } catch (err) {
    console.error('[cron/lifecycle-emails]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
