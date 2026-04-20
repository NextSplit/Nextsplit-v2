import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { athlete_id, plan_id, week_n, day_i, session_i, note, reaction } = await req.json()

    if (!athlete_id || !note) {
      return NextResponse.json({ error: 'athlete_id and note are required' }, { status: 400 })
    }

    // Verify coach-athlete relationship is active
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

    const { data, error } = await db(supabase)
      .from('session_annotations')
      .insert({
        coach_id:   user.id,
        athlete_id,
        plan_id:    plan_id ?? 'general',
        week_n:     week_n ?? 0,
        day_i:      day_i ?? 0,
        session_i:  session_i ?? 0,
        note,
        reaction:   reaction ?? null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, annotation: data })

  } catch (err) {
    console.error('Annotate error:', err)
    return NextResponse.json({ error: 'Failed to save annotation' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const athlete_id = searchParams.get('athlete_id')
    const plan_id    = searchParams.get('plan_id')

    let query = db(supabase)
      .from('session_annotations')
      .select('*')
      .order('created_at', { ascending: false })

    if (athlete_id) {
      // Coach fetching for their athlete
      query = query.eq('coach_id', user.id).eq('athlete_id', athlete_id)
    } else {
      // Athlete fetching their own annotations
      query = query.eq('athlete_id', user.id)
    }

    if (plan_id) query = query.eq('plan_id', plan_id)

    const { data, error } = await query.limit(50)
    if (error) throw error

    return NextResponse.json({ annotations: data ?? [] })

  } catch (err) {
    console.error('Get annotations error:', err)
    return NextResponse.json({ error: 'Failed to fetch annotations' }, { status: 500 })
  }
}
