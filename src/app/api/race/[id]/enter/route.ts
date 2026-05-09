import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'

// POST /api/race/[id]/enter
// Calls public.enter_race(p_race_id) RPC (caller-owns SECDEF). The RPC
// handles all guard logic: race exists, entries window open, character
// exists. Maps the Postgres exceptions to friendly HTTP responses.

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db(supabase) as any).rpc('enter_race', { p_race_id: id })

    if (error) {
      // Map RPC exceptions to friendly responses (RPC sets HINT for the
      // not-yet-actionable cases). 4xx for client errors, 5xx for surprises.
      const msg = error.message ?? 'enter_race failed'
      if (msg.includes('character not created')) {
        return NextResponse.json(
          { error: msg, hint: error.hint ?? 'Pick a build class on /you first' },
          { status: 409 },
        )
      }
      if (msg.includes('entries closed') || msg.includes('race finalized')) {
        return NextResponse.json({ error: msg, hint: error.hint }, { status: 410 })
      }
      if (msg.includes('race not found')) {
        return NextResponse.json({ error: msg }, { status: 404 })
      }
      Sentry.captureException(error, { extra: { context: '[api/race/[id]/enter POST]', raceId: id } })
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    return NextResponse.json({ entry: data })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: '[api/race/[id]/enter POST catch]' } })
    return NextResponse.json({ error: 'Failed to enter race' }, { status: 500 })
  }
}
