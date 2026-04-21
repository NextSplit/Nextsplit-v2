import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'

/**
 * GET  /api/community/feed?club_id=X  — fetch club feed (20 most recent posts)
 * POST /api/community/feed            — add reaction to a feed item
 */

const ReactionSchema = z.object({
  feed_item_id: z.string().uuid(),
  reaction:     z.enum(['🔥', '👏', '💪', '🏃']),
})

export async function GET(req: NextRequest) {
  try {
    const supabase  = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const club_id = req.nextUrl.searchParams.get('club_id')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    // If club_id provided, fetch that club's feed
    // Otherwise fetch all clubs the user belongs to (aggregated)
    let feedQuery = s
      .from('club_feed')
      .select(`
        id, club_id, user_id, session_type, session_name,
        km, duration_secs, pace, effort, milestone_type,
        created_at,
        profiles (display_name, handle, runner_class),
        club_feed_reactions (reaction, user_id)
      `)
      .order('created_at', { ascending: false })
      .limit(30)

    if (club_id) {
      feedQuery = feedQuery.eq('club_id', club_id)
    } else {
      // Fetch from all clubs user belongs to
      const { data: memberships } = await s
        .from('club_members')
        .select('club_id')
        .eq('user_id', user.id)

      const clubIds = (memberships ?? []).map((m: { club_id: string }) => m.club_id)
      if (clubIds.length === 0) return NextResponse.json({ feed: [] })
      feedQuery = feedQuery.in('club_id', clubIds)
    }

    const { data: feed, error } = await feedQuery

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ feed: feed ?? [] })
  } catch (err) {
    console.error('Feed GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = ReactionSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { feed_item_id, reaction } = parsed.data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    // Upsert reaction (one per user per item — toggle)
    const { data: existing } = await s
      .from('club_feed_reactions')
      .select('id, reaction')
      .eq('feed_item_id', feed_item_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      if (existing.reaction === reaction) {
        // Same reaction — remove it (toggle off)
        await s.from('club_feed_reactions').delete().eq('id', existing.id)
        return NextResponse.json({ removed: true })
      }
      // Different reaction — update
      await s.from('club_feed_reactions').update({ reaction }).eq('id', existing.id)
    } else {
      // New reaction
      await s.from('club_feed_reactions').insert({ feed_item_id, user_id: user.id, reaction })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Feed reaction error:', err)
    return NextResponse.json({ error: 'Reaction failed' }, { status: 500 })
  }
}
