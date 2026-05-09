import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'
import { BUILD_CLASSES, type BuildClass } from '@/lib/character'

// Character system V1 — create / read own character.
// POST creates (or updates the build_class on) the caller's row in the
// public.characters table. RLS gates the write to the caller's own user_id.
// GET returns the caller's character if it exists, else 404.

const CreateCharacterSchema = z.object({
  build_class: z.enum(BUILD_CLASSES as unknown as [BuildClass, ...BuildClass[]]),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = CreateCharacterSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { build_class } = parsed.data

    // Upsert: first time creates the row at level 1 with zero stats; second
    // time updates only build_class (preserves accumulated XP + stats).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db(supabase) as any)
      .from('characters')
      .upsert(
        { user_id: user.id, build_class },
        { onConflict: 'user_id', ignoreDuplicates: false },
      )
      .select('user_id, build_class, level, xp, speed_stat, endurance_stat, resilience_stat, active_cosmetics, created_at, updated_at')
      .single()

    if (error) {
      Sentry.captureException(error, { extra: { context: '[api/character POST]' } })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ character: data })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: '[api/character POST catch]' } })
    return NextResponse.json({ error: 'Failed to create character' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (db(supabase) as any)
      .from('characters')
      .select('user_id, build_class, level, xp, speed_stat, endurance_stat, resilience_stat, active_cosmetics, created_at, updated_at')
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({ character: data ?? null })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: '[api/character GET]' } })
    return NextResponse.json({ error: 'Failed to fetch character' }, { status: 500 })
  }
}
