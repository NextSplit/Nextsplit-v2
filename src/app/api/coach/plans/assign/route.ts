import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'
import { coachPush } from '@/lib/coach-push'

// P3.2 — Assign a coach-authored plan template to one of the coach's
// athletes. Creates a user_plans row for the athlete using the template's
// weeks_data (same shape as marketplace purchase + AI plan generation).
// Archives the athlete's existing active plan if any (one-active-plan rule
// at the user_plans level — the predetermined / AI / coach paths all
// converge on this constraint).
//
// BL-C3 — coach must supply a `reason` (10–500 chars) explaining why
// they're assigning/replacing the plan. The reason persists in
// `user_plans.meta.assigned_reason` so the athlete can audit history,
// and feeds the push body so the athlete sees the rationale on their
// lock-screen instead of a generic "your plan changed" alert.
//
// Auth: caller must be the coach who authored the template AND have an
// active coach_athletes relationship with the target athlete. Both checks
// happen server-side; client tampering on athlete_id can't bypass the
// gate.

const AssignSchema = z.object({
  template_id: z.string().uuid(),
  athlete_id:  z.string().uuid(),
  reason:      z.string().min(10).max(500),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = AssignSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { template_id, athlete_id, reason } = parsed.data

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
    // The `as never` cast matches the marketplace/purchase pattern — the
    // generated Database['public']['Tables']['user_plans']['Update'] type
    // doesn't include updated_at, so the type-checker rejects `any` but
    // accepts `never` (TypeScript's universal-cast escape hatch).
    await supabase
      .from('user_plans')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ status: 'archived', updated_at: new Date().toISOString() } as never)
      .eq('user_id', athlete_id)
      .eq('status', 'active')

    // 4. Create the new active plan from the template. The reason persists
    // in meta.assigned_reason so subsequent UI surfaces (audit log, athlete
    // detail) can render the rationale without a separate join.
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
        meta: {
          source:           'coach_assigned',
          template_id,
          assigned_by:      user.id,
          assigned_reason:  reason,
          assigned_at:      new Date().toISOString(),
        },
      })
      .select()
      .single()

    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })

    // 5. Bump the template's start counter so the coach's revenue dashboard
    // and the marketplace metrics reflect the assignment. Pattern matches
    // marketplace/purchase: db(supabase) wrapper handles the typing without
    // a cast. Wrapped in try/catch so a counter-bump failure doesn't
    // shadow the successful plan creation.
    try {
      // PR J1 — route through SECURITY DEFINER RPC. Direct UPDATE was
      // removed because its supporting policy allowed arbitrary edits.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.rpc as any)('bump_plan_template_starts', { p_template_id: template_id })
    } catch { /* non-blocking — counter is decorative */ }

    // 6. BL-C3 — push the rationale to the athlete. fire-and-forget; the
    // in-app notification mirror inside coachPush ensures the athlete sees
    // the change even if push delivery fails. The reason itself is the
    // body so the athlete reads the *why* on their lock-screen.
    const { data: coachProfile } = await db(supabase)
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle()
    const coachName = (coachProfile as { display_name?: string } | null)?.display_name ?? 'Your coach'

    const trimmedReason = reason.trim()
    const reasonPreview = trimmedReason.length > 140 ? trimmedReason.slice(0, 137) + '…' : trimmedReason

    void coachPush({
      recipientId:    athlete_id,
      title:          `${coachName} updated your plan`,
      body:           `${tmpl.name} — ${reasonPreview}`,
      destinationUrl: '/train',
      type:           'plan_change',
      data:           {
        coach_id:    user.id,
        template_id,
        plan_name:   tmpl.name,
        reason:      trimmedReason,
      },
      feature:        'blc3-plan-change',
    })

    return NextResponse.json({ ok: true, plan: newPlan })

  } catch (err) {
    Sentry.captureException(err, { tags: { feature: 'blc3-plan-change' }, extra: { context: '[coach/plans/assign]' } })
    return NextResponse.json({ error: 'Failed to assign plan' }, { status: 500 })
  }
}
