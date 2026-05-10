import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'

// P3.9 — recipient-side tracking for squad nudge effectiveness.
//
// Two actions both flip exactly one timestamp on squad_nudges:
//   · opened    → opened_at = now()    (fired when recipient taps through)
//   · dismissed → dismissed_at = now() (fired when recipient × the in-app card)
//
// "Drop-dead" nudges (dismissed without ever opening) are computed at read
// time by `nudge_effectiveness_summary()` — no extra column needed.
//
// RLS: the `Recipients update tracking` policy added in
// phase-p3-9-nudge-ab-v1.sql restricts UPDATE to to_user = auth.uid(), so
// the `.eq('to_user', user.id)` here is belt-and-braces. Idempotent: only
// the first call lands the timestamp (we don't overwrite a non-null value).

const TrackSchema = z.object({
  nudge_id: z.string().uuid(),
  action:   z.enum(['opened', 'dismissed']),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = TrackSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { nudge_id, action } = parsed.data

    const column = action === 'opened' ? 'opened_at' : 'dismissed_at'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    const { error } = await s
      .from('squad_nudges')
      .update({ [column]: new Date().toISOString() })
      .eq('id', nudge_id)
      .eq('to_user', user.id)
      .is(column, null) // idempotent — only first interaction wins

    if (error) {
      Sentry.captureException(error, { tags: { feature: 'nudge_tracking' }, extra: { nudge_id, action } })
      return NextResponse.json({ error: 'Failed to track' }, { status: 500 })
    }

    return NextResponse.json({ tracked: true })
  } catch (err) {
    Sentry.captureException(err, { tags: { feature: 'nudge_tracking' } })
    return NextResponse.json({ error: 'Failed to track' }, { status: 500 })
  }
}
