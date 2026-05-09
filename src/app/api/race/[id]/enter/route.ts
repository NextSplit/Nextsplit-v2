import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'

// POST /api/race/[id]/enter
// Calls public.enter_race(p_race_id, p_boost_loadout) RPC (caller-owns
// SECDEF). RPC handles all guard logic: race exists, entries window open,
// character exists, boost loadout valid (max 2, no dupes, owned + in
// stock). Maps the Postgres exceptions to friendly HTTP responses.
//
// Request body:
//   { boost_loadout?: string[] }   — array of boost_id strings, max 2

const EnterSchema = z.object({
  boost_loadout: z.array(z.string().min(1).max(100)).max(2).optional().default([]),
})

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Parse optional body. Body may be empty (legacy callers) → default [].
    let payload = { boost_loadout: [] as string[] }
    try {
      const body = await req.json().catch(() => ({}))
      const parsed = EnterSchema.safeParse(body ?? {})
      if (!parsed.success) return zodError(parsed.error)
      payload = parsed.data
    } catch {
      // Empty body / invalid JSON — treat as no boosts.
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db(supabase) as any).rpc('enter_race', {
      p_race_id:       id,
      p_boost_loadout: payload.boost_loadout,
    })

    if (error) {
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
      if (msg.includes('max 2 boosts') || msg.includes('duplicate boost') || msg.includes('unknown boost')) {
        return NextResponse.json({ error: msg, hint: error.hint }, { status: 400 })
      }
      if (msg.includes('no inventory for boost')) {
        return NextResponse.json(
          { error: msg, hint: error.hint ?? 'You do not own this boost' },
          { status: 409 },
        )
      }
      Sentry.captureException(error, { extra: { context: '[api/race/[id]/enter POST]', raceId: id, loadout: payload.boost_loadout } })
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    return NextResponse.json({ entry: data })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: '[api/race/[id]/enter POST catch]' } })
    return NextResponse.json({ error: 'Failed to enter race' }, { status: 500 })
  }
}
