import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'

import { nudgeMessage, pickNudgeVariant } from '@/lib/squad-nudges'

// PR W — leader-queued nudge UI completion. queued_for_date optional,
// must be a YYYY-MM-DD string within +14 days of today (cap to prevent
// runaway-future schedules clogging the queue).
const NudgeSchema = z.object({
  to_user:         z.string().uuid(),
  message_key:     z.enum(['missing', 'week', 'ran', 'checkin', 'streak', 'champion', 'day', 'motivation']),
  queued_for_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine(d => {
  if (!d.queued_for_date) return true
  const ts    = new Date(d.queued_for_date + 'T12:00:00Z').getTime()
  const today = new Date(); today.setUTCHours(0, 0, 0, 0)
  const max   = today.getTime() + 14 * 86400_000
  return Number.isFinite(ts) && ts >= today.getTime() && ts <= max
}, { message: 'queued_for_date must be today or within 14 days', path: ['queued_for_date'] })

/**
 * POST /api/squad/nudge — send a nudge to a squad member.
 *
 * Two paths:
 *   · Immediate (no queued_for_date) — inserts squad_nudges row + fires
 *     in-app notification immediately. P3.9 effectiveness pipeline picks
 *     deterministic A/B variant per (sender, recipient) pair.
 *   · Scheduled (queued_for_date set) — inserts squad_nudges row with
 *     queued_for_date populated. Smart-notify cron slot 2 picks it up on
 *     the matching UTC date, fires the push, clears queued_for_date.
 *     Skips the immediate notification insert.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = NudgeSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { to_user, message_key, queued_for_date } = parsed.data
    const isQueued = !!queued_for_date

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    const { data: squad } = await s
      .from('squads')
      .select('id, name')
      .eq('leader_id', user.id)
      .is('disbanded_at', null)
      .maybeSingle()

    if (!squad) return NextResponse.json({ error: 'Not a squad leader' }, { status: 403 })

    const { data: member } = await s
      .from('squad_members')
      .select('id')
      .eq('squad_id', squad.id)
      .eq('user_id', to_user)
      .is('removed_at', null)
      .maybeSingle()

    if (!member) return NextResponse.json({ error: 'Not a squad member' }, { status: 404 })

    // Per-day rate-limit check is for IMMEDIATE nudges only. Scheduled
    // nudges queue on a future date and don't compete with today's quota
    // for the (from_user, to_user) pair — the cron's queue-pop on the
    // delivery date is the natural rate gate.
    if (!isQueued) {
      const { data: canNudge } = await s.rpc('can_nudge', { p_from: user.id, p_to: to_user })
      if (!canNudge) {
        return NextResponse.json({ error: 'Already nudged this member today' }, { status: 429 })
      }
    }

    const variant     = pickNudgeVariant(user.id, to_user)
    const messageText = nudgeMessage(message_key, variant)

    const { data: nudgeRow } = await s
      .from('squad_nudges')
      .insert({
        squad_id:         squad.id,
        from_user:        user.id,
        to_user,
        message_key,
        template_variant: variant,
        queued_for_date:  queued_for_date ?? null,
      })
      .select('id')
      .single()

    // Scheduled nudge: skip the immediate notification — slot 2 cron will
    // fire it on the matching date with the same metadata. Return early
    // so the leader sees a "queued" confirmation in the UI.
    if (isQueued) {
      return NextResponse.json({
        queued:           true,
        queued_for_date,
        message:          messageText,
        variant,
        nudge_id:         nudgeRow?.id ?? null,
        squad_id:         squad.id,
      })
    }

    const { data: senderProfile } = await s
      .from('profiles')
      .select('display_name, handle')
      .eq('id', user.id)
      .single()

    const senderName = senderProfile?.display_name ?? senderProfile?.handle ?? 'Your squad leader'

    // notifications.data carries nudge_id + template_variant + message_key so
    // the recipient-side dismiss/open path can flip squad_nudges tracking
    // without a join, and fire matching PostHog `nudge_opened`/`nudge_dismissed`
    // events with the same template_id the leader's `nudge_sent` event used.
    await s.from('notifications').insert({
      user_id: to_user,
      type:    'squad_nudge',
      title:   `${senderName} sent you a nudge`,
      body:    messageText,
      data:    {
        squad_id:         squad.id,
        squad_name:       squad.name,
        from_user:        user.id,
        nudge_id:         nudgeRow?.id ?? null,
        message_key,
        template_variant: variant,
      },
    }).catch(() => {})

    return NextResponse.json({
      sent:     true,
      message:  messageText,
      variant,
      nudge_id: nudgeRow?.id ?? null,
      squad_id: squad.id,
    })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Nudge error:' } })
    return NextResponse.json({ error: 'Failed to send nudge' }, { status: 500 })
  }
}
