import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'

// POST /api/character/inventory/cosmetic-toggle
// Activates a cosmetic (deactivating any other in the same slot) or clears
// the slot when cosmetic_id is null. Calls public.set_active_cosmetic
// (caller-owns SECDEF) which handles the multi-row toggle atomically.

const ToggleSchema = z.object({
  cosmetic_id: z.string().min(1).max(100).nullable(),
  slot:        z.enum(['kit_colour','shoes','accessory','banner','aura']).optional(),
}).refine(
  data => data.cosmetic_id !== null || !!data.slot,
  { message: 'slot required when cosmetic_id is null' },
)

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = ToggleSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { cosmetic_id, slot } = parsed.data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db(supabase) as any).rpc('set_active_cosmetic', {
      p_cosmetic_id: cosmetic_id,
      p_slot:        slot ?? null,
    })

    if (error) {
      const msg = error.message ?? 'set_active_cosmetic failed'
      if (msg.includes('cosmetic not in inventory')) {
        return NextResponse.json({ error: msg }, { status: 409 })
      }
      Sentry.captureException(error, { extra: { context: '[api/character/inventory/cosmetic-toggle]' } })
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    return NextResponse.json({ ok: true })

  } catch (err) {
    Sentry.captureException(err, { extra: { context: '[api/character/inventory/cosmetic-toggle catch]' } })
    return NextResponse.json({ error: 'Failed to toggle cosmetic' }, { status: 500 })
  }
}
