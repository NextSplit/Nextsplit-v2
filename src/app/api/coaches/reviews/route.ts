import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'

const ReviewSchema = z.object({
  coach_id:        z.string().uuid(),
  rating:          z.number().int().min(1).max(5),
  review_text:     z.string().max(1000).optional(),
  would_recommend: z.boolean().default(true),
  is_anonymous:    z.boolean().default(true),
})

/**
 * GET  /api/coaches/reviews?coach_id=...  — fetch published reviews for a coach
 * POST /api/coaches/reviews               — submit a review (requires 50% plan completion)
 */
export async function GET(req: NextRequest) {
  try {
    const coachId = req.nextUrl.searchParams.get('coach_id')
    if (!coachId) return NextResponse.json({ error: 'coach_id required' }, { status: 400 })

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    const { data: reviews } = await s
      .from('coach_reviews')
      .select(`
        id, rating, review_text, would_recommend, is_anonymous, published_at,
        profiles!athlete_id(display_name, handle)
      `)
      .eq('coach_id', coachId)
      .eq('is_flagged', false)
      .order('published_at', { ascending: false })
      .limit(20)

    // Anonymise where requested
    const sanitised = (reviews ?? []).map((r: {
      is_anonymous: boolean
      profiles: { display_name: string | null; handle: string | null } | null
      [key: string]: unknown
    }) => ({
      ...r,
      profiles: r.is_anonymous ? null : r.profiles,
    }))

    return NextResponse.json({ reviews: sanitised })
  } catch (err) {
    console.error('Reviews fetch error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = ReviewSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { coach_id, rating, review_text, would_recommend, is_anonymous } = parsed.data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    // Verify athlete has an active or ended coach relationship
    const { data: relationship } = await s
      .from('coach_athletes')
      .select('id, status, accepted_at')
      .eq('coach_id', coach_id)
      .eq('athlete_id', user.id)
      .in('status', ['active', 'ended', 'paused'])
      .maybeSingle()

    if (!relationship) {
      return NextResponse.json({
        error: 'You can only review coaches you have worked with',
      }, { status: 403 })
    }

    // Enforce 50% programme completion gate (by date: 30+ days since accepted)
    if (relationship.accepted_at) {
      const daysSince = Math.floor(
        (Date.now() - new Date(relationship.accepted_at).getTime()) / (1000 * 3600 * 24)
      )
      if (daysSince < 30) {
        return NextResponse.json({
          error: `Reviews unlock after 30 days of coaching. You have ${30 - daysSince} days to go.`,
        }, { status: 403 })
      }
    }

    // Upsert review
    const { error } = await s.from('coach_reviews').upsert({
      coach_id,
      athlete_id:       user.id,
      coach_athlete_id: relationship.id,
      rating,
      review_text:      review_text ?? null,
      would_recommend,
      is_anonymous,
      published_at:     new Date().toISOString(),
    }, { onConflict: 'coach_id,athlete_id' })

    if (error) {
      console.error('Review upsert error:', error)
      return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
    }

    // Refresh coach aggregate rating
    await s.rpc('refresh_coach_rating', { p_coach_id: coach_id })

    return NextResponse.json({ submitted: true })
  } catch (err) {
    console.error('Review submit error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
