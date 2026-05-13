// Single consolidated cron — Vercel Hobby caps daily crons at 2 (founder
// decision 2026-05-07, roadmap §9 v0.3). All time-driven push dispatch lands
// here, NOT in a separate /api/cron/squad-nudges route.
//
// Per-user timezone gate (P2.7 followup): the cron fires once daily at
// 14:00 UTC. For each user we compute their local hour using their stored
// IANA timezone (`profiles.timezone`, captured client-side in useProfile)
// and skip delivery if the local hour is outside 09:00-21:00. Users
// without a timezone fall back to "send" — preserves the original behaviour
// for accounts created before the column existed.
//
// Priority order, first match wins (one notification per user per fire):
//   1. Active plan + tomorrow's session is hard (long/tempo/int/mp/race) →
//      Pre-Load fuel nudge (per-user loop below) — highest because it's
//      narrowly targeted, time-sensitive, and actionable tonight.
//   2. Sunday → weekly wrap (regardless of log state)
//   3. Leader-queued squad nudge (squad_nudges.queued_for_date = today) — runs
//      pre-loop via runCronSlot2QueuedNudges; not in the per-user cascade
//      because each row already has a specific recipient.
//   4. At-risk squad-member detection (no done log in last 3 days) — runs
//      pre-loop via runCronSlot3AtRiskDetection; idempotent via 72h
//      notifications-table check.
//   5. Active plan + not logged today → keep-streak fallback (per-user loop below)
//   6. No notification

import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runMondayDigest } from '@/lib/monday-digest'
import { runTrialLifecycleSweep, runDay8AutoTrialSweep } from '@/lib/trial-lifecycle'
import { runCronSlot2QueuedNudges, runCronSlot3AtRiskDetection } from '@/lib/cron-slots'
import type { PlanWeek } from '@/types/database'

// Returns the user's local hour (0-23) given an IANA timezone, or null
// if Intl can't resolve it. Errors are swallowed to default-allow.
function localHourFor(timezone: string | null): number | null {
  if (!timezone) return null
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone, hour: '2-digit', hour12: false,
    })
    const parts = fmt.formatToParts(new Date())
    const hourStr = parts.find(p => p.type === 'hour')?.value
    if (!hourStr) return null
    const h = parseInt(hourStr, 10)
    return Number.isFinite(h) ? h : null
  } catch {
    return null
  }
}

const QUIET_START_HOUR = 9   // 09:00 local
const QUIET_END_HOUR   = 21  // 21:00 local — last fire window starts at 20:59

// Pre-Load Nudge targets. Fires evening-of-day-before for glycogen-depleting
// sessions where dinner carbs materially affect tomorrow's performance.
// Easy runs + gym + rest are deliberately excluded — pre-loading doesn't
// matter and would devalue the signal. Title prefix 🥗 lets analytics filter
// without a new notifications.type enum value.
const PRELOAD_TARGETS: Record<string, { title: string; body: string }> = {
  'run-long':  { title: '🥗 Pre-load tonight',  body: "Long run tomorrow. Carb-rich dinner tonight (rice, pasta, potatoes) sets you up." },
  'run-tempo': { title: '🥗 Pre-load tonight',  body: "Threshold session tomorrow. Extra carbs at dinner — keep fat + fibre light." },
  'run-int':   { title: '🥗 Pre-load tonight',  body: "Intervals tomorrow. Fuel up tonight with easy-digest carbs." },
  'run-mp':    { title: '🥗 Pre-load tonight',  body: "Marathon-pace session tomorrow. Carb-rich dinner — familiar foods only." },
  'run-race':  { title: '🏁 Race tomorrow',     body: "Pre-race meal tonight: familiar carbs + light protein. Hydrate. No new foods." },
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // PR H3 cron observability — start time + service-role client for writing
  // the persistent run-ledger row on completion (success OR error path).
  const startedAt = Date.now()

  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any
    const now      = new Date()
    const isSunday = now.getUTCDay() === 0
    const todayStr = now.toISOString().slice(0, 10)

    // BL-C5 day-8 auto-trial sweep — daily fire. RPC selects users at
    // signup_age ∈ [7d, 30d] who haven't received a trial yet, grants it,
    // and returns user_ids for welcome-push fan-out. Idempotent via the
    // same trial_started_at IS NULL guard. Bounded backfill (30d window)
    // prevents the first deploy from retroactively granting trials to
    // every dormant account.
    try {
      const day8Result = await runDay8AutoTrialSweep()
      Sentry.addBreadcrumb({
        category: 'cron',
        message:  '[smart-notify day8-auto-trial]',
        level:    'info',
        data:     day8Result,
      })
    } catch (day8Err) {
      Sentry.captureException(day8Err, {
        tags:  { feature: 'blc5-day8-trial' },
        extra: { context: '[smart-notify day8-auto-trial]' },
      })
    }

    // Slot 2 — leader-queued squad nudges. Reads squad_nudges.queued_for_date
    // = today, fires push using the variant + clears the queue marker for
    // idempotency. Fan-out failure tagged feature='cron-slot-2-queued-nudge'.
    try {
      const slot2 = await runCronSlot2QueuedNudges()
      Sentry.addBreadcrumb({
        category: 'cron',
        message:  '[smart-notify slot-2-queued-nudge]',
        level:    'info',
        data:     slot2,
      })
    } catch (slot2Err) {
      Sentry.captureException(slot2Err, {
        tags:  { feature: 'cron-slot-2-queued-nudge' },
        extra: { context: '[smart-notify slot-2]' },
      })
    }

    // Slot 3 — at-risk squad-member detection. For each user in a squad
    // with ≥ 2 members AND no done log in last 3d AND no `squad_at_risk`
    // notification in last 72h → fire NUDGE_MESSAGES['missing'] push.
    // Idempotency via notifications-table check, no new schema.
    try {
      const slot3 = await runCronSlot3AtRiskDetection()
      Sentry.addBreadcrumb({
        category: 'cron',
        message:  '[smart-notify slot-3-at-risk]',
        level:    'info',
        data:     slot3,
      })
    } catch (slot3Err) {
      Sentry.captureException(slot3Err, {
        tags:  { feature: 'cron-slot-3-at-risk' },
        extra: { context: '[smart-notify slot-3]' },
      })
    }

    // BL-C6 lifecycle sweep — runs every fire (not Monday-only). Idempotent
    // server-side via warn_overdue_trials() / expire_overdue_trials() RPCs:
    //   · day-13 warning push fires once per user (trial_warned_at gate)
    //   · day-14 expiry push fires once per user (trial_ended_at gate)
    // Fire-and-forget — failures Sentry-log under feature='blc6-trial-lifecycle'
    // but don't block the user-notify cycle.
    try {
      const result = await runTrialLifecycleSweep()
      Sentry.addBreadcrumb({
        category: 'cron',
        message:  '[smart-notify trial-lifecycle]',
        level:    'info',
        data:     result,
      })
    } catch (lifeErr) {
      Sentry.captureException(lifeErr, {
        tags:  { feature: 'blc6-trial-lifecycle' },
        extra: { context: '[smart-notify trial-lifecycle]' },
      })
    }

    // BL-C4 Coach-Pro Monday digest: idempotent per (coach_id, ISO-week)
    // via coach_digest_runs UNIQUE constraint. Runs on Mondays before the
    // user-notify cycle so coaches see their digest near the start of
    // their week. Fire-and-forget — fan-out failures Sentry-log
    // (feature: 'blc4-monday-digest') but don't block notifications.
    if (now.getUTCDay() === 1) {
      try {
        const result = await runMondayDigest()
        Sentry.addBreadcrumb({
          category: 'cron',
          message:  '[smart-notify monday-digest]',
          level:    'info',
          data:     result,
        })
      } catch (digestErr) {
        Sentry.captureException(digestErr, {
          tags:  { feature: 'blc4-monday-digest' },
          extra: { context: '[smart-notify monday-digest]' },
        })
      }
    }

    // P3.10 Squad seasons (light): if this is the 1st of the month, snapshot
    // the previous month's squad season totals before the user-notify cycle.
    // Idempotent server-side via UNIQUE (squad_id, season_type, period) +
    // UPSERT, so multiple fires of the same period just overwrite. Fire-and-
    // forget; failures Sentry-log but don't block notifications.
    if (now.getUTCDate() === 1) {
      const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
      const prevPeriod = `${prevMonth.getUTCFullYear()}-${String(prevMonth.getUTCMonth() + 1).padStart(2, '0')}`
      try {
        await s.rpc('snapshot_squad_seasons_for_month', { p_period: prevPeriod })
      } catch (snapErr) {
        Sentry.captureException(snapErr, {
          extra: { context: '[smart-notify season snapshot]', period: prevPeriod },
        })
      }
    }

    const { data: users } = await s
      .from('profiles').select('id, display_name, timezone')
      .not('push_subscription', 'is', null).limit(500)

    if (!users?.length) return NextResponse.json({ sent: 0 })
    const userIds = users.map((u: { id: string }) => u.id)

    const { data: todayLogs } = await s
      .from('training_logs').select('user_id')
      .in('user_id', userIds).eq('done', true)
      .gte('created_at', `${todayStr}T00:00:00`)

    const loggedToday = new Set((todayLogs ?? []).map((l: { user_id: string }) => l.user_id))

    const { data: plans } = await s
      .from('user_plans').select('user_id, weeks_data')
      .in('user_id', userIds).eq('status', 'active')

    const hasPlan = new Set((plans ?? []).map((p: { user_id: string }) => p.user_id))

    // Pre-Load Nudge lookup: userId → push payload. Walks the active plan's
    // weeks_data for the day whose `dt` matches UTC tomorrow. First matching
    // hard-session code wins. Bad/missing data Sentry-logs and skips the user
    // — never throws (cron must keep dispatching other slots).
    const tomorrowStr = new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10)
    const preloadByUser = new Map<string, { title: string; body: string }>()
    type PlanRow = { user_id: string; weeks_data: unknown }
    for (const p of (plans ?? []) as PlanRow[]) {
      try {
        const weeks = p.weeks_data as PlanWeek[] | null
        if (!Array.isArray(weeks)) continue
        for (const week of weeks) {
          if (!Array.isArray(week?.days)) continue
          const day = week.days.find(d => d?.dt === tomorrowStr)
          if (!day) continue
          if (!Array.isArray(day.sessions)) break
          for (const sess of day.sessions) {
            const payload = PRELOAD_TARGETS[sess?.c]
            if (payload) { preloadByUser.set(p.user_id, payload); break }
          }
          break  // matched tomorrow's day in this week — stop scanning weeks
        }
      } catch (preloadErr) {
        Sentry.captureException(preloadErr, {
          tags: { feature: 'cron-preload-nudge' },
          extra: { userId: p.user_id, tomorrowStr },
        })
      }
    }

    // Priority cascade — slots map to the ordered list in the file header.
    // First match wins; any user gets at most ONE notification per fire.
    const toNotify: Array<{ userId: string; title: string; body: string }> = []

    let skippedQuietHours = 0
    for (const user of users) {
      // P2.7 timezone gate: skip if outside the user's 09:00-21:00 local
      // window. Users without a timezone fall back to "send" (default-allow).
      const localHour = localHourFor((user as { timezone: string | null }).timezone)
      if (localHour !== null && (localHour < QUIET_START_HOUR || localHour >= QUIET_END_HOUR)) {
        skippedQuietHours++
        continue
      }

      // Slot 1: Pre-Load Nudge — tomorrow is a hard session.
      const preload = preloadByUser.get(user.id)
      if (preload) {
        toNotify.push({ userId: user.id, title: preload.title, body: preload.body })
        continue
      }

      // Slot 2: Sunday weekly wrap.
      if (isSunday) {
        toNotify.push({
          userId: user.id,
          title:  '📊 Weekly wrap',
          body:   'Check how your week went and get ready for the week ahead.',
        })
        continue
      }

      // Slot 3 + Slot 4 are dispatched pre-loop above (separate fan-out
      // queries — they don't fit the per-user iteration model since each
      // queued nudge already has a specific recipient and the at-risk
      // sweep aggregates across squads).

      // Slot 5: keep-streak fallback (active plan + nothing logged today).
      if (hasPlan.has(user.id) && !loggedToday.has(user.id)) {
        toNotify.push({
          userId: user.id,
          title:  '🔥 Keep the streak — log before evening',
          body:   'Your session is waiting. Get it logged today and keep the momentum going.',
        })
      }
    }

    let sent = 0
    let insertError: unknown = null
    if (toNotify.length > 0) {
      const { error } = await s.from('notifications').insert(
        toNotify.map(n => ({ user_id: n.userId, type: 'smart_notify', title: n.title, body: n.body, read: false }))
      )
      if (error) {
        insertError = error
      } else {
        sent = toNotify.length
      }
    }

    // F0.2 (audit) zero-send alert. If we matched users to slots but the
    // single batch insert failed, the previous .catch(() => {}) silently
    // swallowed the error and made the cron look successful. This surfaces
    // it as a Sentry alert with the route tag.
    if (toNotify.length > 0 && sent === 0) {
      Sentry.captureMessage('cron-zero-send: smart-notify matched eligible users but inserted zero notifications', {
        level: 'error',
        tags: { feature: 'cron-zero-send', route: 'smart-notify' },
        extra: { eligible: toNotify.length, sent, isSunday, skippedQuietHours, insertError },
      })
    }

    // PR H3 — record successful run to cron_runs ledger.
    try {
      await s.from('cron_runs').insert({
        job:         'smart-notify',
        started_at:  new Date(startedAt).toISOString(),
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
        ok:          true,
        result:      { sent, eligible: toNotify.length, isSunday, skippedQuietHours },
      })
    } catch (logErr) {
      Sentry.captureException(logErr, {
        tags: { feature: 'cron-runs-ledger', route: 'smart-notify' },
      })
    }

    return NextResponse.json({ sent, eligible: toNotify.length, isSunday, skippedQuietHours })
  } catch (err) {
    Sentry.captureException(err)

    // PR H3 — record failed run. Best-effort; uses a fresh service-role
    // client because the original supabase from the try block isn't in
    // scope here.
    try {
      const supabase = await createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('cron_runs').insert({
        job:           'smart-notify',
        started_at:    new Date(startedAt).toISOString(),
        finished_at:   new Date().toISOString(),
        duration_ms:   Date.now() - startedAt,
        ok:            false,
        error_message: err instanceof Error ? err.message : String(err),
      })
    } catch { /* swallow — already in error path */ }

    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
