import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'
import { requireCoachPro } from '@/lib/server/requireCoachPro'

const BroadcastSchema = z.object({
  body:        z.string().min(1).max(2000),
  athlete_ids: z.array(z.string().uuid()).min(1).max(50).optional(),
})

/**
 * POST /api/coach/broadcast
 * Sends a message to all active athletes (or a subset).
 * Creates one coach_messages row per athlete.
 *
 * OQ#2 = C — bulk_broadcast is Coach-Pro only. Free Split Leaders can
 * still 1-on-1 message via /api/coach/message; this route is the bulk
 * sender that goes behind the £29/mo paywall.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // OQ#2 — Coach-Pro gate. Returns 403 with `upgrade: true` when the
    // coach isn't Pro; client-side BroadcastModal hides itself for non-Pro
    // coaches but server enforcement is the canonical guard.
    const gate = await requireCoachPro(supabase, user.id, 'bulk_broadcast')
    if (gate) return gate

    const parsed = BroadcastSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { body, athlete_ids } = parsed.data

    // Fetch all active athletes (or the specified subset)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (db(supabase) as any)
      .from('coach_athletes')
      .select('athlete_id')
      .eq('coach_id', user.id)
      .eq('status', 'active')

    if (athlete_ids?.length) {
      query = query.in('athlete_id', athlete_ids)
    }

    const { data: relationships } = await query
    if (!relationships?.length) {
      return NextResponse.json({ error: 'No active athletes found' }, { status: 400 })
    }

    // Insert one message per athlete
    const messages = relationships.map((r: { athlete_id: string }) => ({
      coach_id:   user.id,
      athlete_id: r.athlete_id,
      sender_id:  user.id,
      body:       body.trim(),
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db(supabase) as any)
      .from('coach_messages')
      .insert(messages)

    if (error) throw error

    return NextResponse.json({ sent: messages.length, success: true })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'broadcast error:' } })
    return NextResponse.json({ error: 'Broadcast failed' }, { status: 500 })
  }
}
