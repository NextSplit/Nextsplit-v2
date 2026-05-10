import * as Sentry from '@sentry/nextjs'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { config, serverConfig } from '@/lib/config'
import { coachPush } from '@/lib/coach-push'

// BL-C6 lifecycle — closes the trial loop by sending three pushes around
// the 14-day window:
//
//   1. WELCOME — fired right after grant_trial_if_eligible succeeds in
//      /api/squad/members (squad-join path) or /api/coach/message
//      (first-coach-msg path). Source-aware copy: squad-join welcome cites
//      the squad, coach-msg welcome cites the coach.
//
//   2. WARNING — day 13. smart-notify cron sweeps via warn_overdue_trials()
//      (idempotent via trial_warned_at column). Tells the user 1 day is
//      left and routes to /upgrade so they can lock in founding pricing
//      before the bell.
//
//   3. ENDED — day 14+. smart-notify cron sweeps via expire_overdue_trials()
//      which flips trial_ended_at + subscription_status, and returns the
//      affected user_ids so we send exactly one "trial ended" push per
//      user. Idempotent via trial_ended_at IS NULL guard in the RPC.
//
// All pushes route through coachPush (BL-C2/C3 helper) so they share the
// observability tag (`feature: 'blc6-trial-lifecycle'`) and notifications
// fan-out behaviour.

const TRIAL_WELCOME_TYPE = 'trial_welcome'
const TRIAL_WARNING_TYPE = 'trial_warning'
const TRIAL_ENDED_TYPE   = 'trial_ended'

interface TrialRow {
  user_id:      string
  trial_source: string | null
}

const SOURCE_FRIENDLY: Record<string, string> = {
  squad_join:           'your squad unlocked',
  first_coach_message:  'your coach unlocked',
}

export async function sendTrialWelcomePush(
  athleteId: string,
  source: 'squad_join' | 'first_coach_message',
): Promise<void> {
  const friendly = SOURCE_FRIENDLY[source] ?? 'someone unlocked'
  await coachPush({
    recipientId:    athleteId,
    title:          '⭐ Pro on us for 14 days',
    body:           `${friendly.charAt(0).toUpperCase()}${friendly.slice(1)} adaptive plans, ACWR, and AI coaching. Tap to explore.`,
    destinationUrl: '/home',
    type:           TRIAL_WELCOME_TYPE,
    data:           { trial_source: source },
    feature:        'blc6-trial-lifecycle',
  })
}

// runTrialLifecycleSweep — daily cron call. Runs the warning sweep first
// (smaller window) then the expiry sweep, dispatching one push per user
// flipped. Returns counts for breadcrumb logging.
export async function runTrialLifecycleSweep(): Promise<{ warned: number; expired: number }> {
  let warned  = 0
  let expired = 0

  try {
    const admin = createAdminClient(config.supabaseUrl, serverConfig.supabaseServiceRoleKey)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = admin as any

    // ── Warning sweep (day 13) ──────────────────────────────────────────
    try {
      const { data: warnedRows } = await a.rpc('warn_overdue_trials')
      const rows = (warnedRows ?? []) as TrialRow[]
      for (const r of rows) {
        await coachPush({
          recipientId:    r.user_id,
          title:          '⏳ 1 day left in your trial',
          body:           'Lock in founding £7.99/mo before tomorrow to keep adaptive plans + AI coaching.',
          destinationUrl: '/upgrade',
          type:           TRIAL_WARNING_TYPE,
          data:           { trial_source: r.trial_source ?? '' },
          feature:        'blc6-trial-lifecycle',
        })
        warned++
      }
    } catch (warnErr) {
      Sentry.captureException(warnErr, {
        tags:  { feature: 'blc6-trial-lifecycle' },
        extra: { context: '[warn_overdue_trials]' },
      })
    }

    // ── Expiry sweep (day 14+) ──────────────────────────────────────────
    try {
      const { data: expiredRows } = await a.rpc('expire_overdue_trials')
      const rows = (expiredRows ?? []) as TrialRow[]
      for (const r of rows) {
        await coachPush({
          recipientId:    r.user_id,
          title:          'Your free trial has ended',
          body:           'Lock in founding £7.99/mo to keep adaptive plans + AI coaching going.',
          destinationUrl: '/upgrade',
          type:           TRIAL_ENDED_TYPE,
          data:           { trial_source: r.trial_source ?? '' },
          feature:        'blc6-trial-lifecycle',
        })
        expired++
      }
    } catch (expErr) {
      Sentry.captureException(expErr, {
        tags:  { feature: 'blc6-trial-lifecycle' },
        extra: { context: '[expire_overdue_trials]' },
      })
    }
  } catch (err) {
    Sentry.captureException(err, {
      tags:  { feature: 'blc6-trial-lifecycle' },
      extra: { context: '[runTrialLifecycleSweep top-level]' },
    })
  }

  return { warned, expired }
}
