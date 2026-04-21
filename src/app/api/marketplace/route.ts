import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'

/**
 * GET  /api/marketplace           — list all public plans with coach + purchase info
 * POST /api/marketplace           — publish a coach plan to marketplace
 * GET  /api/marketplace?purchased=1 — return plans the current user has purchased
 */

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const purchasedOnly = req.nextUrl.searchParams.get('purchased') === '1'

    // Fetch plans
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = (supabase as any)
      .from('plan_templates')
      .select(`
        id, slug, name, subtitle, distance, level,
        weeks_min, weeks_max, description, meta,
        author_type, author_id, is_public,
        avg_completion_rate, total_starts, avg_rating, review_count, created_at
      `)
      .eq('is_public', true)
      .order('total_starts', { ascending: false })

    const { data: plans, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Batch-fetch coach profiles for authored plans
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coachIds = [...new Set(((plans ?? []) as any[]).filter(p => p.author_id).map(p => p.author_id))]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: coaches } = coachIds.length > 0 ? await (supabase as any)
      .from('coach_profiles')
      .select('user_id, display_name, slug, verified, photo_url')
      .in('user_id', coachIds) : { data: [] }

    // Fetch this user's purchases to flag what they own
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: purchases } = await (supabase as any)
      .from('plan_purchases')
      .select('template_id')
      .eq('athlete_id', user.id)

    const purchasedIds = new Set(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (purchases ?? []).map((p: any) => p.template_id)
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enriched = ((plans ?? []) as any[]).map(p => ({
      ...p,
      price_gbp: (p.meta as Record<string, unknown>)?.price_gbp ?? null,
      coach: coaches?.find((c: { user_id: string }) => c.user_id === p.author_id) ?? null,
      owned: p.author_type === 'nextsplit' || !p.meta?.price_gbp || purchasedIds.has(p.id),
    }))

    if (purchasedOnly) {
      return NextResponse.json({ plans: enriched.filter(p => p.owned && p.author_type === 'coach') })
    }

    return NextResponse.json({ plans: enriched })
  } catch (err) {
    console.error('Marketplace GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Verify user is a Pro Coach
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('coach_tier, is_coach')
      .eq('id', user.id)
      .single()

    if (!profile?.is_coach || profile?.coach_tier !== 'professional') {
      return NextResponse.json({ error: 'Pro Coach account required to publish plans' }, { status: 403 })
    }

    const body = await req.json()
    const {
      name, subtitle, distance, level, weeks_min, weeks_max,
      description, price_gbp, weeks_data, meta = {},
      runs_per_week = 4, peak_km_week = null, longest_run_km = null,
    } = body

    if (!name || !distance || !level || !weeks_data) {
      return NextResponse.json({ error: 'name, distance, level, weeks_data required' }, { status: 400 })
    }

    if (price_gbp !== null && price_gbp !== undefined && (price_gbp < 0 || price_gbp > 500)) {
      return NextResponse.json({ error: 'Price must be between £0 and £500' }, { status: 400 })
    }

    const slug = `coach_${user.id.slice(0, 8)}_${Date.now()}`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('plan_templates')
      .insert({
        slug,
        name,
        subtitle: subtitle ?? null,
        distance,
        level,
        weeks_min: weeks_min ?? weeks_data.length,
        weeks_max: weeks_max ?? weeks_data.length,
        runs_per_week,
        peak_km_week,
        longest_run_km,
        description: description ?? null,
        meta: { ...meta, price_gbp: price_gbp ?? 0 },
        weeks_data,
        author_type: 'coach',
        author_id: user.id,
        is_public: true,
        total_starts: 0,
        review_count: 0,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ plan: data })
  } catch (err) {
    console.error('Marketplace POST error:', err)
    return NextResponse.json({ error: 'Failed to publish' }, { status: 500 })
  }
}
