import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { serverConfig } from '@/lib/config'
import { buildNotificationEmail } from '@/lib/notificationEmails'
import type { NotificationEmailType } from '@/lib/notificationEmails'

/**
 * Splity Notification Email Cron
 * Called daily by GitHub Actions (free tier friendly — no Vercel cron needed).
 * Sends the right Splity email to the right user at the right time.
 *
 * Guardrails:
 * - Max 1 email per user per day
 * - Quiet days: respects user preferences
 * - at_risk_reengagement sent once only
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
    const resend    = new Resend(serverConfig.resendApiKey)
    const supabase  = await createClient()
    const now       = new Date()
    const todayStr  = now.toISOString().slice(0, 10)
    const dayOfWeek = now.getUTCDay() // 0=Sun, 0 = Sunday recap day

    // Fetch all users with email notifications enabled
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await (supabase as any)
      .from('profiles')
      .select(`
        id, display_name,
        last_notification_at, at_risk_sent_at,
        notif_session_reminder, notif_streak_at_risk,
        notif_weekly_recap, notif_at_risk_reengagement, notif_race_countdown
      `)
      .eq('notifications_enabled', true) as { data: AnyRecord[] | null }

    if (!profiles?.length) {
      return NextResponse.json({ ok: true, sent: 0, reason: 'no_eligible_users' })
    }

    const userIds = profiles.map(p => p.id as string)

    // Fetch emails via service role (auth.users not accessible with anon key)
    const { createServiceClient } = await import('@/lib/supabase/server')
    const svc = createServiceClient() as any
    const emailByUser: Record<string, string> = {}
    for (const uid of userIds) {
      const { data: u } = await svc.auth.admin.getUserById(uid)
      if (u?.user?.email) emailByUser[uid] = u.user.email
    }

    // Fetch active plans
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: plans } = await (supabase as any)
      .from('user_plans')
      .select('user_id, name, current_week, total_weeks, race_date')
      .in('user_id', userIds)
      .eq('status', 'active') as { data: AnyRecord[] | null }

    const planByUser: Record<string, AnyRecord> = {}
    for (const p of plans ?? []) planByUser[p.user_id as string] = p

    // Fetch today's training logs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: todayLogs } = await (supabase as any)
      .from('training_logs')
      .select('user_id, done, week_n')
      .in('user_id', userIds)
      .gte('logged_at', `${todayStr}T00:00:00Z`) as { data: AnyRecord[] | null }

    const loggedTodaySet = new Set((todayLogs ?? []).filter(l => l.done).map(l => l.user_id as string))

    // Fetch streaks (last 7 days of logs)
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: recentLogs } = await (supabase as any)
      .from('training_logs')
      .select('user_id, logged_at, done')
      .in('user_id', userIds)
      .gte('logged_at', weekAgo)
      .eq('done', true) as { data: AnyRecord[] | null }

    // Compute streak per user (days with at least one log)
    const streakByUser: Record<string, number> = {}
    for (const log of recentLogs ?? []) {
      const uid = log.user_id as string
      streakByUser[uid] = (streakByUser[uid] ?? 0) + 1
    }

    let sent = 0
    const results: string[] = []

    for (const profile of profiles) {
      const uid       = profile.id as string
      const firstName = (profile.display_name as string | null)?.split(' ')[0] ?? 'Runner'
      const email     = emailByUser[uid]
      if (!email) { results.push(`${uid}: no_email`); continue }

      // Rate limit: 1 email per day
      if (profile.last_notification_at) {
        const lastSent = new Date(profile.last_notification_at as string)
        if ((now.getTime() - lastSent.getTime()) < 20 * 3600 * 1000) {
          results.push(`${uid}: skipped (rate_limit)`)
          continue
        }
      }

      const plan = planByUser[uid]
      const hasLoggedToday = loggedTodaySet.has(uid)
      const streak = streakByUser[uid] ?? 0
      let emailType: NotificationEmailType | null = null
      let emailCtx: Parameters<typeof buildNotificationEmail>[1] = { firstName, email }

      // ── Determine which email to send ────────────────────────────────────

      // 1. Race countdown — highest priority if race is close
      if (plan?.race_date && profile.notif_race_countdown !== false) {
        const daysToRace = Math.ceil((new Date(plan.race_date).getTime() - now.getTime()) / 86400000)
        if (daysToRace > 0 && daysToRace <= 28 && dayOfWeek === 1) { // Monday
          emailType = 'race_countdown'
          emailCtx = { ...emailCtx, daysToRace, planName: plan.name }
        }
      }

      // 2. Streak at risk — if streak ≥ 3 and no log today
      if (!emailType && streak >= 3 && !hasLoggedToday && profile.notif_streak_at_risk !== false) {
        emailType = 'streak_at_risk'
        emailCtx = { ...emailCtx, streakDays: streak }
      }

      // 3. Weekly recap — Sundays only
      if (!emailType && dayOfWeek === 0 && profile.notif_weekly_recap !== false && plan) {
        emailType = 'weekly_recap'
        emailCtx = {
          ...emailCtx,
          weekN: plan.current_week,
          totalWeeks: plan.total_weeks,
          planName: plan.name,
        }
      }

      // 4. At-risk re-engagement — if no log in 4+ days, once only
      if (!emailType && !hasLoggedToday && profile.notif_at_risk_reengagement !== false) {
        const daysSinceLog = streak === 0 ? 99 : 0
        if (daysSinceLog >= 4 && !profile.at_risk_sent_at) {
          emailType = 'at_risk_reengagement'
        }
      }

      if (!emailType) {
        results.push(`${uid}: no_trigger`)
        continue
      }

      // Build and send
      try {
        const { subject, html, text } = buildNotificationEmail(emailType, emailCtx)

        await resend.emails.send({
          from:    'Splity at NextSplit <onboarding@resend.dev>',
          to:      email,
          subject,
          html,
          text,
        })

        // Update last sent timestamp
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('profiles')
          .update({
            last_notification_at: now.toISOString(),
            ...(emailType === 'at_risk_reengagement' ? { at_risk_sent_at: now.toISOString() } : {}),
          })
          .eq('id', uid)

        sent++
        results.push(`${uid}: sent(${emailType})`)
      } catch (err) {
        results.push(`${uid}: error(${String(err)})`)
      }
    }

    return NextResponse.json({ ok: true, sent, results })
  } catch (err) {
    console.error('[notify-email]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
