import { NextRequest, NextResponse } from 'next/server'
import { CoachFeaturedPlansSchema, zodError } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const weekStart = searchParams.get('week') ?? new Date().toISOString().split('T')[0]

    // Get this week's featured plans with template + coach info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: featured } = await (supabase as any)
      .from('featured_plans')
      .select(`
        id, position, feature_type, impressions, clicks, conversions,
        template_id
      `)
      .gte('week_start', weekStart)
      .order('position', { ascending: true })
      .limit(5)

    if (!featured?.length) {
      // Fall back to top-rated plans
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: topPlans } = await (supabase as any)
        .from('plan_templates')
        .select('id, name, distance, level, description, meta, author_type, author_id, avg_rating, total_starts, review_count')
        .eq('is_public', true)
        .order('total_starts', { ascending: false })
        .limit(5)

      return NextResponse.json({ featured: topPlans ?? [], source: 'top_rated' })
    }

    return NextResponse.json({ featured, source: 'editorial' })

  } catch (err) {
    console.error('Featured plans error:', err)
    return NextResponse.json({ error: 'Failed to fetch featured plans' }, { status: 500 })
  }
}

// Admin endpoint to set featured plans for the week
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // TODO: check admin role — for now any authenticated user can set featured (admin only in production)
    const parsed = CoachFeaturedPlansSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { template_ids, week_start, feature_type } = parsed.data

    if (!template_ids?.length || !week_start) {
      return NextResponse.json({ error: 'template_ids and week_start required' }, { status: 400 })
    }

    // Remove existing for this week
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('featured_plans')
      .delete()
      .eq('week_start', week_start)

    // Insert new featured plans
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('featured_plans')
      .insert(
        template_ids.map((id: string, i: number) => ({
          template_id:  id,
          week_start,
          feature_type,
          position:     i + 1,
        }))
      )

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Featured plans set error:', err)
    return NextResponse.json({ error: 'Failed to set featured plans' }, { status: 500 })
  }
}
