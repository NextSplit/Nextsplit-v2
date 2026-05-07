import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'

// P3.2 — Assign a coach-authored plan template to one of the coach's
// athletes. Creates a user_plans row for the athlete using the template's
// weeks_data (same shape as marketplace purchase + AI plan generation).
// Archives the athlete's existing active plan if any (one-active-plan rule
// at the user_plans level — the predetermined / AI / coach paths all
// converge on this constraint).
//
// Auth: caller must be the coach who authored the template AND have an
// active coach_athletes relationship with the target athlete. Both checks
// happen server-side; client tampering on athlete_id can't bypass the
// gate.

const AssignSchema = z.object({
  template_id: z.string().uuid(),
  athlete_id:  z.string().uuid(),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = AssignSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { template_id, athlete_id } = parsed.data

    // 1. Template ownership check — caller must be the author.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tmpl } = await db(supabase)
      .from('plan_templates')
      .select('id, author_id, name, weeks_data, weeks_min, weeks_max')
      .eq('id', template_id)
      .maybeSingle()

    if (!tmpl) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    if (tmpl.author_id !== user.id) {
      return NextResponse.json({ error: 'Not your template' }, { status: 403 })
    }

    // 2. Coach-athlete relationship check — must be active.
    const { data: rel } = await db(supabase)
      .from('coach_athletes')
      .select('id')
      .eq('coach_id', user.id)
      .eq('athlete_id', athlete_id)
      .eq('status', 'active')
      .maybeSingle()

    if (!rel) {
      return NextResponse.json({ error: 'No active coaching relationship' }, { status: 403 })
    }

    // 3. Archive athlete's existing active plan (one-active-plan rule).
    await supabase
      .from('user_plans')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ status: 'archived', updated_at: new Date().toISOString() } as any)
      .eq('user_id', athlete_id)
      .eq('status', 'active')

    // 4. Create the new active plan from the template.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newPlan, error: createErr } = await db(supabase)
      .from('user_plans')
      .insert({
        user_id:      athlete_id,
        template_id,
        plan_type:    'coach_assigned',
        status:       'active',
        name:         tmpl.name,
        start_date:   new Date().toISOString().slice(0, 10),
        total_weeks:  tmpl.weeks_max ?? tmpl.weeks_min ?? 12,
        current_week: 1,
        weeks_data:   tmpl.weeks_data,
        meta:         { source: 'coach_assigned', template_id, assigned_by: user.id },
      })
      .select()
      .single()

    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })

    // 5. Bump the template's start counter so the coach's revenue dashboard
    // and the marketplace metrics reflect the assignment.
    await db(supabase)
      .from('plan_templates')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ total_starts: ((tmpl as any).total_starts ?? 0) + 1 })
      .eq('id', template_id)
      .catch(() => { /* non-blocking */ })

    return NextResponse.json({ ok: true, plan: newPlan })

  } catch (err) {
    Sentry.captureException(err, { extra: { context: '[coach/plans/assign]' } })
    return NextResponse.json({ error: 'Failed to assign plan' }, { status: 500 })
  }
}
