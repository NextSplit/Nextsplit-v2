import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { coach_id, plan_id, rating, review_text } = await req.json()

    if (!coach_id || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'coach_id and rating (1-5) required' }, { status: 400 })
    }

    // Must have an active or past relationship with coach OR have purchased their plan
    const { data: rel } = await db(supabase)
      .from('coach_athletes')
      .select('id')
      .eq('coach_id', coach_id)
      .eq('athlete_id', user.id)
      .in('status', ['active', 'ended'])
      .maybeSingle()

    if (!rel) {
      return NextResponse.json({ error: 'You must be coached by this coach to leave a review' }, { status: 403 })
    }

    // Check not already reviewed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('coach_reviews')
      .select('id')
      .eq('coach_id', coach_id)
      .eq('athlete_id', user.id)
      .maybeSingle()

    if (existing) {
      // Update existing review
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('coach_reviews')
        .update({ rating, review_text: review_text ?? null })
        .eq('id', existing.id)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('coach_reviews')
        .insert({
          coach_id,
          athlete_id:  user.id,
          plan_id:     plan_id ?? null,
          rating,
          review_text: review_text ?? null,
          is_visible:  false, // visible once coach has 5+ reviews
        })
    }

    // Update coach plan_templates avg_rating + review_count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: reviews } = await (supabase as any)
      .from('coach_reviews')
      .select('rating')
      .eq('coach_id', coach_id)

    if (reviews && reviews.length >= 5) {
      const avg = reviews.reduce((a: number, r: { rating: number }) => a + r.rating, 0) / reviews.length
      // Mark all reviews visible
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('coach_reviews')
        .update({ is_visible: true })
        .eq('coach_id', coach_id)

      // Update plan templates authored by this coach
      await db(supabase)
        .from('plan_templates')
        .update({
          avg_rating:   Math.round(avg * 100) / 100,
          review_count: reviews.length,
        })
        .eq('author_id', coach_id)
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Review error:', err)
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const coach_id = searchParams.get('coach_id')
    if (!coach_id) return NextResponse.json({ error: 'coach_id required' }, { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('coach_reviews')
      .select('id, rating, review_text, coach_reply, created_at')
      .eq('coach_id', coach_id)
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({ reviews: data ?? [] })

  } catch (err) {
    console.error('Get reviews error:', err)
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }
}
