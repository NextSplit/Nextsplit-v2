import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PlanTemplate } from '@/types/database'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'
import { raceToPaces, personaliseSessionPace } from '@/lib/vdot'

const ActivateSchema = z.object({
  template_id:  z.string().uuid().optional(),
  slug:         z.string().min(1).max(100).optional(),
  name:         z.string().min(1).max(200),
  race_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  plan_type:    z.string().optional(),
  include_gym:  z.boolean().default(true),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const parsed = ActivateSchema.safeParse(await req.json())
  if (!parsed.success) return zodError(parsed.error)
  const { template_id, slug, name, race_date, plan_type, include_gym } = parsed.data

  if (!template_id && !slug) {
    return NextResponse.json({ error: 'template_id or slug required' }, { status: 400 })
  }

  // Validate race date is in the future
  if (race_date) {
    const raceTime = new Date(race_date).getTime()
    if (isNaN(raceTime) || raceTime < Date.now() - 86400000) {
      return NextResponse.json({ error: 'Race date must be today or in the future' }, { status: 400 })
    }
  }

  // Archive any existing active plan
  await supabase
    .from('user_plans')
    .update({ status: 'archived', updated_at: new Date().toISOString() } as never)
    .eq('user_id', user.id)
    .eq('status', 'active')

  // Fetch full template — by id or slug
  const query = supabase.from('plan_templates').select('*')
  const { data: template, error: tErr } = template_id
    ? await query.eq('id', template_id).single()
    : await query.eq('slug', slug!).single()

  if (tErr || !template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  const t = template as PlanTemplate

  // Calculate start date — today, or worked back from race_date
  let startDate = new Date().toISOString().split('T')[0]
  let raceTooSoon = false
  if (race_date) {
    const raceMs = new Date(race_date).getTime()
    const weeksMs = t.weeks_min * 7 * 24 * 60 * 60 * 1000
    const calcStart = new Date(raceMs - weeksMs)
    if (calcStart > new Date()) {
      startDate = calcStart.toISOString().split('T')[0]
    } else {
      // Race is sooner than the plan length — start today but flag it
      raceTooSoon = true
    }
  }

  // Strip gym sessions if user opted out
  type PlanSession = { c: string; n: string; det: string; km: number }
  type PlanDay = { sessions: PlanSession[] }
  type PlanWeek = { days: PlanDay[] }

  const weeksData: PlanWeek[] = include_gym
    ? t.weeks_data as PlanWeek[]
    : (t.weeks_data as PlanWeek[]).map(week => ({
        ...week,
        days: week.days.map(day => ({
          ...day,
          sessions: day.sessions.filter((s: PlanSession) => !s?.c?.startsWith('gym')),
        })),
      }))

  // VDOT pace personalisation — fetch user's recent race times from profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileData } = await (supabase as any)
    .from('profiles')
    .select('recent_race_5k_secs, recent_race_10k_secs, recent_race_half_secs, recent_race_marathon_secs')
    .eq('id', user.id)
    .single()

  // Find best available race time for VDOT
  const racePairs: [number, number | null][] = [
    [42.2, profileData?.recent_race_marathon_secs],
    [21.1, profileData?.recent_race_half_secs],
    [10,   profileData?.recent_race_10k_secs],
    [5,    profileData?.recent_race_5k_secs],
  ]
  const bestRace = racePairs.find(([, t]) => t && t > 0)

  let personalised = weeksData
  if (bestRace && bestRace[1]) {
    try {
      const paces = raceToPaces(bestRace[0], bestRace[1])
      personalised = weeksData.map(week => ({
        ...week,
        days: week.days.map(day => ({
          ...day,
          sessions: day.sessions.map((s: PlanSession) => ({
            ...s,
            det: s.det ? personaliseSessionPace(s.det, paces) : s.det,
          })),
        })),
      }))
    } catch { /* non-blocking — use generic paces if VDOT fails */ }
  }

  const { data: newPlan, error: insertErr } = await supabase
    .from('user_plans')
    .insert({
      user_id: user.id,
      template_id,
      plan_type: (plan_type ?? 'predetermined') as 'predetermined' | 'ai_bespoke' | 'manual' | 'lifestyle',
      status: 'active',
      name: name.trim(),
      goal: null,
      race_date: race_date ?? null,
      start_date: startDate,
      total_weeks: t.weeks_min,
      current_week: 1,
      weeks_data: personalised,
      meta: {
        peak_km_week: t.peak_km_week,
        longest_run_km: t.longest_run_km,
        distance: t.distance,
        level: t.level,
        include_gym,
      },
    } as never)
    .select()
    .single()

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ plan: newPlan, raceTooSoon }, { status: 201 })
}
