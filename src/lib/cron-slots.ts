import * as Sentry from '@sentry/nextjs'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { config, serverConfig } from '@/lib/config'
import { coachPush } from '@/lib/coach-push'
import { nudgeMessage, pickNudgeVariant, type NudgeVariant } from '@/lib/squad-nudges'

// Smart-notify slot 2 + slot 3 — close the two TODOs in the cron header.
// Both run under the same admin client so we can read squad_members /
// squad_nudges across users (RLS otherwise blocks cross-user reads).
//
// Slot 2 — leader-queued squad nudge:
//   · Read squad_nudges where queued_for_date = today AND not yet sent
//   · Fire push using NUDGE_MESSAGES[message_key][variant]
//   · Mark sent by clearing queued_for_date (idempotent — re-runs no-op)
//
// Slot 3 — at-risk squad-member detection:
//   · For each user in a squad with ≥ 2 active members, check whether
//     they have any done log in the last 3 days
//   · If not, fire NUDGE_MESSAGES['missing'] push (forward-only copy)
//   · Per-user 3-day idempotency via notifications-table check (skip if
//     this user got a `squad_at_risk` notification in the last 72h)

const TODAY_ISO = (): string => new Date().toISOString().slice(0, 10)
const THREE_DAYS_AGO_ISO = (): string =>
  new Date(Date.now() - 3 * 86400000).toISOString()

interface QueuedRow {
  id:               string
  squad_id:         string
  to_user:          string
  from_user:        string
  message_key:      string
  template_variant: NudgeVariant
}

export async function runCronSlot2QueuedNudges(): Promise<{ sent: number }> {
  let sent = 0
  try {
    const admin = createAdminClient(config.supabaseUrl, serverConfig.supabaseServiceRoleKey)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = admin as any

    const { data: rows } = await a
      .from('squad_nudges')
      .select('id, squad_id, to_user, from_user, message_key, template_variant')
      .eq('queued_for_date', TODAY_ISO())
      .limit(500)

    for (const r of (rows ?? []) as QueuedRow[]) {
      const variant = (r.template_variant === 'b' ? 'b' : 'a') as NudgeVariant
      const body    = nudgeMessage(r.message_key, variant)

      // Look up sender name for the push title.
      const { data: senderProfile } = await a
        .from('profiles')
        .select('display_name, handle')
        .eq('id', r.from_user)
        .maybeSingle()
      const senderName = (senderProfile as { display_name?: string; handle?: string } | null)?.display_name
        ?? (senderProfile as { handle?: string } | null)?.handle
        ?? 'Your squad leader'

      await coachPush({
        recipientId:    r.to_user,
        title:          `${senderName} sent you a nudge`,
        body,
        destinationUrl: '/squad',
        type:           'squad_nudge',
        data:           {
          nudge_id:         r.id,
          message_key:      r.message_key,
          template_variant: variant,
          squad_id:         r.squad_id,
          from_user:        r.from_user,
        },
        feature:        'cron-slot-2-queued-nudge',
      })

      // Idempotency: clear the queued_for_date so the row never fires again.
      // We don't delete — analytics still wants the squad_nudges row for
      // effectiveness tracking (P3.9 nudge_effectiveness_summary).
      await a
        .from('squad_nudges')
        .update({ queued_for_date: null })
        .eq('id', r.id)

      sent++
    }
  } catch (err) {
    Sentry.captureException(err, {
      tags:  { feature: 'cron-slot-2-queued-nudge' },
      extra: { context: '[runCronSlot2QueuedNudges]' },
    })
  }
  return { sent }
}

interface SquadMemberRow {
  squad_id: string
  user_id:  string
}

export async function runCronSlot3AtRiskDetection(): Promise<{ sent: number; skipped: number }> {
  let sent    = 0
  let skipped = 0

  try {
    const admin = createAdminClient(config.supabaseUrl, serverConfig.supabaseServiceRoleKey)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = admin as any

    // 1. Pull all active squad members (single query) — bounded to 1000
    //    which covers the entire current user base several times over.
    const { data: members } = await a
      .from('squad_members')
      .select('squad_id, user_id')
      .is('removed_at', null)
      .limit(1000)

    const memberRows = (members ?? []) as SquadMemberRow[]
    if (memberRows.length === 0) return { sent: 0, skipped: 0 }

    // 2. Group by squad_id + filter to squads with ≥ 2 members. A solo
    //    "squad" can't generate the social-context copy ("your squad's
    //    lacing up") meaningfully.
    const bySquad = new Map<string, SquadMemberRow[]>()
    for (const m of memberRows) {
      const arr = bySquad.get(m.squad_id) ?? []
      arr.push(m)
      bySquad.set(m.squad_id, arr)
    }
    const eligibleMembers: SquadMemberRow[] = []
    for (const [, arr] of bySquad) {
      if (arr.length >= 2) eligibleMembers.push(...arr)
    }

    if (eligibleMembers.length === 0) return { sent: 0, skipped: 0 }

    const userIds = eligibleMembers.map(m => m.user_id)

    // 3. Pull last-3d done logs in one query — set membership tells us
    //    which users have logged recently.
    const { data: recentLogs } = await a
      .from('training_logs')
      .select('user_id')
      .in('user_id', userIds)
      .eq('done', true)
      .gte('logged_at', THREE_DAYS_AGO_ISO())
    const loggedRecently = new Set((recentLogs ?? []).map((l: { user_id: string }) => l.user_id))

    // 4. Pull recent at-risk notifications for idempotency — skip users
    //    who already got the nudge in the last 72h.
    const { data: recentAtRisk } = await a
      .from('notifications')
      .select('user_id')
      .in('user_id', userIds)
      .eq('type', 'squad_at_risk')
      .gte('created_at', THREE_DAYS_AGO_ISO())
    const recentlyNudged = new Set((recentAtRisk ?? []).map((n: { user_id: string }) => n.user_id))

    // 5. Fan-out: for each at-risk member, send the missing copy.
    const variant: NudgeVariant = 'a'
    const body                  = nudgeMessage('missing', variant)

    for (const m of eligibleMembers) {
      if (loggedRecently.has(m.user_id)) { continue }
      if (recentlyNudged.has(m.user_id)) { skipped++; continue }

      await coachPush({
        recipientId:    m.user_id,
        title:          'Your squad is lacing up',
        body,
        destinationUrl: '/squad',
        type:           'squad_at_risk',
        data:           { squad_id: m.squad_id, message_key: 'missing', template_variant: variant },
        feature:        'cron-slot-3-at-risk',
      })
      sent++
    }
  } catch (err) {
    Sentry.captureException(err, {
      tags:  { feature: 'cron-slot-3-at-risk' },
      extra: { context: '[runCronSlot3AtRiskDetection]' },
    })
  }
  return { sent, skipped }
}
