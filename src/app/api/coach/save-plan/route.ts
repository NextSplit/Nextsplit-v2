import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { CoachSavePlanSchema, zodError } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import { requireCoachPro } from '@/lib/server/requireCoachPro'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Must be a coach
    const { data: coachProfile } = await db(supabase)
      .from('coach_profiles')
      .select('user_id, verified')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!coachProfile) return NextResponse.json({ error: 'Not a coach' }, { status: 403 })

    const parsed = CoachSavePlanSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const {
      name, description, subtitle, distance, level,
      weeks_data, price_gbp, is_public, template_id,
      runs_per_week, peak_km_week, longest_run_km,
    } = parsed.data

    if (!name || !distance || !level || !weeks_data) {
      return NextResponse.json({ error: 'name, distance, level and weeks_data are required' }, { status: 400 })
    }

    // OQ#2 = C — only Coach-Pro can publish plans publicly OR sell them.
    // Free Split Leaders can save private plans for assigning to their own
    // athletes (the assign flow uses /api/coach/plans/assign, no gate),
    // but `is_public = true` (marketplace listing) and `price_gbp > 0`
    // (plan sales) both go behind the £29/mo paywall.
    if (is_public || (price_gbp ?? 0) > 0) {
      const featureKey = (price_gbp ?? 0) > 0 ? 'plan_sales' : 'marketplace_listing'
      const gate = await requireCoachPro(supabase, user.id, featureKey)
      if (gate) return gate
    }

    const weeksArr  = Array.isArray(weeks_data) ? weeks_data : []
    const weekCount = weeksArr.length

    const planData = {
      name,
      slug:       name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
      subtitle:   subtitle ?? null,
      distance,
      level,
      description: description ?? null,
      weeks_min:   weekCount,
      weeks_max:   weekCount,
      runs_per_week: runs_per_week ?? 4,
      peak_km_week: peak_km_week ?? null,
      longest_run_km: longest_run_km ?? null,
      weeks_data:  weeksArr,
      meta:        { price_gbp: price_gbp ?? null },
      author_type: 'coach',
      author_id:   user.id,
      price_gbp:   price_gbp ?? null,
      is_public,
    }

    let result
    if (template_id) {
      // Update existing
      const { data, error } = await db(supabase)
        .from('plan_templates')
        .update(planData)
        .eq('id', template_id)
        .eq('author_id', user.id) // safety check
        .select()
        .single()
      if (error) throw error
      result = data
    } else {
      // Create new
      const { data, error } = await db(supabase)
        .from('plan_templates')
        .insert(planData)
        .select()
        .single()
      if (error) throw error
      result = data
    }

    return NextResponse.json({ success: true, plan: result })

  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Save plan error:' } })
    return NextResponse.json({ error: 'Failed to save plan' }, { status: 500 })
  }
}
