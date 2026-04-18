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
  const { template_id, name, race_date } = body

  if (!template_id || !name) {
    return NextResponse.json({ error: 'template_id and name are required' }, { status: 400 })
  }

  // Archive any existing active plan
  await supabase
    .from('user_plans')
    .update({ status: 'archived', updated_at: new Date().toISOString() } as never)
    .eq('user_id', user.id)
    .eq('status', 'active')

  // Fetch full template (includes weeks_data)
  const { data: template, error: tErr } = await supabase
    .from('plan_templates')
    .select('*')
    .eq('id', template_id)
    .single()

  if (tErr || !template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  const t = template as PlanTemplate

  // Calculate start date — today, or worked back from race_date
  let startDate = new Date().toISOString().split('T')[0]
  if (race_date) {
    const raceMs = new Date(race_date).getTime()
    const weeksMs = t.weeks_min * 7 * 24 * 60 * 60 * 1000
    const calcStart = new Date(raceMs - weeksMs)
    // If calculated start is in the past, use today
    if (calcStart > new Date()) {
      startDate = calcStart.toISOString().split('T')[0]
    }
  }

  const { data: newPlan, error: insertErr } = await supabase
    .from('user_plans')
    .insert({
      user_id: user.id,
      template_id,
      plan_type: 'predetermined',
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

  return NextResponse.json({ plan: newPlan }, { status: 201 })
}
