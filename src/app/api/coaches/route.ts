import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const FilterSchema = z.object({
  specialty:     z.string().optional(),
  distance:      z.string().optional(),
  max_price:     z.coerce.number().optional(),
  language:      z.string().optional(),
  verified_only: z.coerce.boolean().optional(),
  limit:         z.coerce.number().int().min(1).max(50).default(20),
  offset:        z.coerce.number().int().min(0).default(0),
})

/**
 * GET /api/coaches
 * Athlete-facing coach browse with filters.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const params   = Object.fromEntries(req.nextUrl.searchParams)
    const parsed   = FilterSchema.safeParse(params)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid filters' }, { status: 400 })

    const { specialty, distance, max_price, language, verified_only, limit, offset } = parsed.data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    const { data, error } = await s.rpc('marketplace_coaches', {
      p_specialty:     specialty     ?? null,
      p_distance:      distance      ?? null,
      p_max_price:     max_price     ?? null,
      p_language:      language      ?? null,
      p_verified_only: verified_only ?? false,
      p_limit:         limit,
      p_offset:        offset,
    })

    if (error) {
      console.error('Coach browse RPC error:', error)
      return NextResponse.json({ error: 'Failed to load coaches' }, { status: 500 })
    }

    return NextResponse.json({ coaches: data ?? [] })
  } catch (err) {
    console.error('Coach browse error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
