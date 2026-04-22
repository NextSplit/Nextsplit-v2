import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'

const ALLOWED_REACTIONS = ['👍', '❤️', '🔥', '💪', '👏', '😊', '🙏']

const ReactSchema = z.object({
  message_id: z.string().uuid(),
  reaction:   z.string().refine(r => ALLOWED_REACTIONS.includes(r), {
    message: `Reaction must be one of: ${ALLOWED_REACTIONS.join(', ')}`,
  }),
})

/**
 * POST /api/coach/message-react
 * Athlete reacts to a coach message. One reaction per message — replaces previous.
 * Also marks message as read if not already.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = ReactSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { message_id, reaction } = parsed.data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    // Verify the message is addressed to this user (athlete)
    const { data: msg } = await s
      .from('coach_messages')
      .select('id, athlete_id, coach_id, read_at')
      .eq('id', message_id)
      .eq('athlete_id', user.id)
      .maybeSingle()

    if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

    // Set reaction + mark as read
    await s.from('coach_messages').update({
      reaction:    reaction,
      reaction_at: new Date().toISOString(),
      read_at:     msg.read_at ?? new Date().toISOString(),
    }).eq('id', message_id)

    return NextResponse.json({ reacted: true, reaction })
  } catch (err) {
    console.error('Message react error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
