import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'

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

    const {
      name, subtitle, distance, level, description,
      weeks_data, runs_per_week, peak_km_week, longest_run_km,
      price_gbp, is_public = true,
      template_id, // if editing existing
    } = await req.json()

    if (!name || !distance || !level || !weeks_data) {
      return NextResponse.json({ error: 'name, distance, level and weeks_data are required' }, { status: 400 })
    }

    const weeks    = Array.isArray(weeks_data) ? weeks_data : []
    const weekCount = weeks.length

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
      weeks_data:  weeks,
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
    console.error('Save plan error:', err)
    return NextResponse.json({ error: 'Failed to save plan' }, { status: 500 })
  }
}
