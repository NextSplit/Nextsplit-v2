import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'

import { NUDGE_MESSAGES } from '@/lib/squad-nudges'

const NudgeSchema = z.object({
  to_user:     z.string().uuid(),
  message_key: z.enum(['missing', 'week', 'ran', 'checkin', 'streak', 'champion', 'day', 'motivation']),
})

/**
 * POST /api/squad/nudge — send a nudge to a squad member
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

    // Verify sender is a squad leader
    const { data: squad } = await s
      .from('squads')
      .select('id, name')
      .eq('leader_id', user.id)
      .is('disbanded_at', null)
      .maybeSingle()

    if (!squad) return NextResponse.json({ error: 'Not a squad leader' }, { status: 403 })

    // Verify target is an active member
    const { data: member } = await s
      .from('squad_members')
      .select('id')
      .eq('squad_id', squad.id)
      .eq('user_id', to_user)
      .is('removed_at', null)
      .maybeSingle()

    if (!member) return NextResponse.json({ error: 'Not a squad member' }, { status: 404 })

    // Rate limit: 1 nudge per member per day
    const { data: canNudge } = await s.rpc('can_nudge', { p_from: user.id, p_to: to_user })
    if (!canNudge) {
      return NextResponse.json({ error: 'Already nudged this member today' }, { status: 429 })
    }

    // Record nudge
    await s.from('squad_nudges').insert({
      squad_id:    squad.id,
      from_user:   user.id,
      to_user,
      message_key,
    })

    // Fetch sender profile for notification
    const { data: senderProfile } = await s
      .from('profiles')
      .select('display_name, handle')
      .eq('id', user.id)
      .single()

    const senderName = senderProfile?.display_name ?? senderProfile?.handle ?? 'Your squad leader'
    const messageText = NUDGE_MESSAGES[message_key]

    // Send in-app notification
    await s.from('notifications').insert({
      user_id: to_user,
      type:    'squad_nudge',
      title:   `${senderName} sent you a nudge`,
      body:    messageText,
      data:    { squad_id: squad.id, squad_name: squad.name, from_user: user.id },
    }).catch(() => {}) // non-blocking

    return NextResponse.json({ sent: true, message: messageText })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Nudge error:' } })
    return NextResponse.json({ error: 'Failed to send nudge' }, { status: 500 })
  }
}
