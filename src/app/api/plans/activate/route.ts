import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PlanTemplate } from '@/types/database'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json()
  const { template_id, slug, name, race_date, plan_type } = body

  if ((!template_id && !slug) || !name) {
    return NextResponse.json({ error: 'template_id (or slug) and name are required' }, { status: 400 })
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
    : await query.eq('slug', slug).single()

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
      weeks_data: t.weeks_data,
      meta: {
        peak_km_week: t.peak_km_week,
        longest_run_km: t.longest_run_km,
        distance: t.distance,
        level: t.level,
      },
    } as never)
    .select()
    .single()

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ plan: newPlan, raceTooSoon }, { status: 201 })
}
