import * as Sentry from '@sentry/nextjs'
import { config, serverConfig } from '@/lib/config'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import { buildNotification, passesGuardrails } from '@/lib/notifications'
import type { NotificationType } from '@/lib/notifications'

/**
 * Cron notification dispatcher — Growth Pillar spec.
 * Called every hour by Vercel cron. Sends the right notification to the
 * right user at the right time. Guardrails enforced.
 *
 * Vercel cron config in vercel.json:
 * { "crons": [{ "path": "/api/cron/notify", "schedule": "0 * * * *" }] }
 */

function isAuthorized(req: NextRequest) {
  return req.headers.get('authorization') === `Bearer ${serverConfig.cronSecret}`
}

interface PushSub { user_id: string; endpoint: string; p256dh: string; auth: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const webpush = (await import('web-push')).default
    webpush.setVapidDetails(
      `mailto:${serverConfig.vapidEmail || 'hello@nextsplit.app'}`,
      config.vapidPublicKey,
      serverConfig.vapidPrivateKey
    )

    const supabase = await createClient()
    const nowUtc   = new Date()
    const hh       = nowUtc.getUTCHours().toString().padStart(2, '0')
    const dayOfWeek = nowUtc.getUTCDay() // 0=Sun

    // Fetch profiles with push subscriptions who have notifications enabled
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await (db(supabase) as any)
      .from('profiles')
      .select(`
        id, display_name, notification_time, notifications_enabled,
        runner_class, runner_class_revealed, race_date,
        last_notification_at, at_risk_sent_at,
        notif_session_reminder, notif_adaptation_alert, notif_weekly_recap,
        notif_race_countdown, notif_streak_at_risk, notif_coach_message,
        notif_at_risk_reengagement, notif_class_revealed
      `)
      .eq('notifications_enabled', true)
      .gte('notification_time', `${hh}:00:00`)
      .lt('notification_time', `${hh}:59:59`) as { data: AnyRecord[] | null }

    if (!profiles?.length) return NextResponse.json({ ok: true, sent: 0 })

    const userIds = profiles.map(p => p.id as string)

    const { data: subs } = await db(supabase)
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth')
      .in('user_id', userIds) as { data: PushSub[] | null }

    if (!subs?.length) return NextResponse.json({ ok: true, sent: 0 })

    // Batch fetch active plans for session context
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: plans } = await (db(supabase) as any)
      .from('user_plans')
      .select('user_id, name, current_week, total_weeks, race_date')
      .in('user_id', userIds)
      .eq('status', 'active') as { data: AnyRecord[] | null }

    const planByUser: Record<string, AnyRecord> = {}
    for (const p of plans ?? []) planByUser[p.user_id as string] = p

    // Batch fetch today's session logs to detect at-risk users
    const todayStr = nowUtc.toISOString().slice(0, 10)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: todayLogs } = await (db(supabase) as any)
      .from('training_logs')
      .select('user_id, logged_at')
      .in('user_id', userIds)
      .gte('logged_at', todayStr)
      .eq('done', true) as { data: AnyRecord[] | null }

    const loggedTodaySet = new Set((todayLogs ?? []).map((l: AnyRecord) => l.user_id as string))

    let sent = 0

    for (const profile of profiles) {
      const sub = subs.find(s => s.user_id === profile.id)
      if (!sub) continue

      const plan      = planByUser[profile.id as string]
      const firstName = (profile.display_name as string | null)?.split(' ')[0] ?? 'Runner'

      // Build type preferences map
      const typePrefs: Record<string, boolean> = {
        session_reminder:     profile.notif_session_reminder !== false,
        adaptation_alert:     profile.notif_adaptation_alert !== false,
        weekly_recap:         profile.notif_weekly_recap !== false,
        race_countdown:       profile.notif_race_countdown !== false,
        streak_at_risk:       profile.notif_streak_at_risk !== false,
        coach_message:        profile.notif_coach_message !== false,
        at_risk_reengagement: profile.notif_at_risk_reengagement !== false,
        class_revealed:       profile.notif_class_revealed !== false,
      }

      // Determine which notification to send (priority order)
      let notifType: NotificationType = 'session_reminder'

      // Sunday evening → weekly recap
      if (dayOfWeek === 0) notifType = 'weekly_recap'

      // Race countdown — final 4 weeks (28 days)
      const raceDate = plan?.race_date ? new Date(plan.race_date as string) : null
      const daysToRace = raceDate ? Math.ceil((raceDate.getTime() - nowUtc.getTime()) / 86400000) : null
      if (daysToRace !== null && daysToRace > 0 && daysToRace <= 28) notifType = 'race_countdown'

      // Class revealed but not yet opened
      if (profile.runner_class && !profile.runner_class_revealed && profile.runner_class !== 'warming_up') {
        notifType = 'class_revealed'
      }

      // At-risk re-engagement — 4+ days without logging (checked separately, low priority)
      const lastLog = profile.last_notification_at ? new Date(profile.last_notification_at as string) : null
      const daysSinceLog = lastLog ? Math.floor((nowUtc.getTime() - lastLog.getTime()) / 86400000) : null
      if (daysSinceLog !== null && daysSinceLog >= 4 && !loggedTodaySet.has(profile.id as string)) {
        notifType = 'at_risk_reengagement'
      }

      // Default: session reminder
      if (notifType === 'session_reminder' && !plan) continue  // no plan, skip

      // Guardrail check
      const guardrail = passesGuardrails({
        type: notifType,
        userTimezoneOffset: 0,  // UTC for cron — per-user timezone TBD
        lastNotificationAt: lastLog,
        atRiskSentAt: profile.at_risk_sent_at ? new Date(profile.at_risk_sent_at as string) : null,
        notificationsEnabled: true,
        typePrefs,
      })

      if (!guardrail.ok) continue

      // Build the notification
      const payload = buildNotification(notifType, {
        firstName,
        planName:     plan?.name as string | undefined,
        weekN:        plan?.current_week as number | undefined,
        totalWeeks:   plan?.total_weeks as number | undefined,
        daysToRace:   daysToRace ?? undefined,
        classEmoji:   profile.runner_class ? '🏃' : undefined,
        className:    profile.runner_class as string | undefined,
      })

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({
            title: payload.title,
            body:  payload.body,
            url:   payload.url,
            icon:  '/icons/icon-192x192.png',
          })
        )
        sent++

        // Record last notification time
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db(supabase) as any).from('profiles')
          .update({ last_notification_at: nowUtc.toISOString() })
          .eq('id', profile.id)

        // Mark at-risk as sent (one-shot)
        if (notifType === 'at_risk_reengagement') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (db(supabase) as any).from('profiles')
            .update({ at_risk_sent_at: nowUtc.toISOString() })
            .eq('id', profile.id)
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('410') || msg.includes('404')) {
          // Subscription expired — clean up
          await db(supabase).from('push_subscriptions').delete().eq('user_id', sub.user_id)
        }
      }
    }

    return NextResponse.json({ ok: true, sent })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: '[cron/notify]' } })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
