import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'

const ImportSchema = z.object({
  strava_id:     z.number(),
  km:            z.number().positive(),
  duration_secs: z.number().positive(),
  avg_pace_secs: z.number().nullable().optional(),
  avg_hr:        z.number().nullable().optional(),
  name:          z.string(),
  activity_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  week_n:        z.number().int().positive().optional(),
  day_i:         z.number().int().min(0).optional(),
  session_i:     z.number().int().min(0).optional(),
  plan_id:       z.string().uuid().optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const parsed = ImportSchema.safeParse(await req.json())
  if (!parsed.success) return zodError(parsed.error)
  const { strava_id, km, duration_secs, avg_pace_secs, avg_hr, name, activity_date, week_n, day_i, session_i, plan_id } = parsed.data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = supabase as any

  // Duplicate check
  const { data: existing } = await db(supabase)
    .from('training_logs').select('id')
    .eq('user_id', user.id).eq('strava_id', strava_id).maybeSingle()

  if (existing) return NextResponse.json({ error: 'Already imported', logId: existing.id }, { status: 409 })

  const paceStr = avg_pace_secs
    ? `${Math.floor(avg_pace_secs / 60)}:${String(avg_pace_secs % 60).padStart(2, '0')}/km`
    : null

  const baseLog = {
    user_id: user.id, done: true, km, pace: paceStr, hr: avg_hr,
    duration_secs, strava_id, notes: `Imported from Strava: ${name}`,
    created_at: `${activity_date}T12:00:00.000Z`,
  }

  const { data: log, error } = await s.from('training_logs')
    .insert({
      ...baseLog,
      plan_id: plan_id ?? null,
      week_n: week_n ?? 0,
      day_i: day_i ?? 0,
      session_i: session_i ?? 0,
    }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ log, matched: !!(plan_id && week_n !== undefined) })
}
