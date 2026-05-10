import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'

import { nudgeMessage, pickNudgeVariant } from '@/lib/squad-nudges'

const NudgeSchema = z.object({
  to_user:     z.string().uuid(),
  message_key: z.enum(['missing', 'week', 'ran', 'checkin', 'streak', 'champion', 'day', 'motivation']),
})

/**
 * POST /api/squad/nudge — send a nudge to a squad member.
 *
 * P3.9 effectiveness pipeline: picks a deterministic A/B variant per
 * (sender, recipient) pair, persists template_variant + nudge_id breadcrumb
 * onto the resulting notifications row so /api/squad/nudge/track can flip
 * opened_at / dismissed_at on recipient interaction.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = NudgeSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { to_user, message_key } = parsed.data

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

    const { data: canNudge } = await s.rpc('can_nudge', { p_from: user.id, p_to: to_user })
    if (!canNudge) {
      return NextResponse.json({ error: 'Already nudged this member today' }, { status: 429 })
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
      })
      .select('id')
      .single()

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
