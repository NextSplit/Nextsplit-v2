import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'

const DigestSchema = z.object({
  digest_preference: z.enum(['immediate', 'daily', 'weekly']),
  digest_time_utc:   z.number().int().min(0).max(23).optional(),
})

/**
 * GET  /api/coach/digest — get coach digest preferences
 * PATCH /api/coach/digest — update digest preferences
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    const { data } = await s
      .from('coach_profiles')
      .select('digest_preference, digest_time_utc, is_coach_pro')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      digest_preference: data?.digest_preference ?? 'daily',
      digest_time_utc:   data?.digest_time_utc   ?? 8,
      is_coach_pro:      data?.is_coach_pro       ?? false,
    })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Digest get error:' } })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = DigestSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    await s.from('coach_profiles').update({
      digest_preference: parsed.data.digest_preference,
      digest_time_utc:   parsed.data.digest_time_utc ?? 8,
      updated_at:        new Date().toISOString(),
    }).eq('user_id', user.id)

    return NextResponse.json({ updated: true })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Digest update error:' } })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
