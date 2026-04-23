import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/community/race-leaderboard?race_id=X
 *
 * Returns ranked finishers for a virtual race:
 * - position, display_name, runner_class, finish_time, pace, is_pb
 * - medal: 🥇🥈🥉 for top 3
 */

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const race_id = req.nextUrl.searchParams.get('race_id')
    if (!race_id) return NextResponse.json({ error: 'race_id required' }, { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    // Fetch race info
    const { data: race } = await s
      .from('virtual_races')
      .select('id, name, distance_km, ends_at')
      .eq('id', race_id)
      .single()

    if (!race) return NextResponse.json({ error: 'Race not found' }, { status: 404 })

    // Fetch all finishers with profile data, sorted by time
    const { data: entries } = await s
      .from('virtual_race_entries')
      .select(`
        id, user_id, finish_time_secs, pace, position, submitted_at,
        profiles (display_name, handle, runner_class)
      `)
      .eq('race_id', race_id)
      .not('finish_time_secs', 'is', null)
      .order('finish_time_secs', { ascending: true })

    // Detect PBs — compare against user's previous results for same distance
    const userIds = (entries ?? []).map((e: { user_id: string }) => e.user_id)
    let pbSet = new Set<string>()

    if (userIds.length > 0) {
      const { data: prevResults } = await s
        .from('virtual_race_entries')
        .select('user_id, finish_time_secs')
        .in('user_id', userIds)
        .neq('race_id', race_id)
        .not('finish_time_secs', 'is', null)

      // For each finisher, check if current time is better than all previous
      const bestPrevious: Record<string, number> = {}
      ;(prevResults ?? []).forEach((r: { user_id: string; finish_time_secs: number }) => {
        if (!bestPrevious[r.user_id] || r.finish_time_secs < bestPrevious[r.user_id]) {
          bestPrevious[r.user_id] = r.finish_time_secs
        }
      })

      // Mark as PB if current time beats previous best
      ;(entries ?? []).forEach((e: { user_id: string; finish_time_secs: number }) => {
        const prev = bestPrevious[e.user_id]
        if (!prev || e.finish_time_secs < prev) {
          pbSet.add(e.user_id)
        }
      })
    }

    const MEDALS = ['🥇', '🥈', '🥉']

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = (entries ?? []).map((e: any, i: number) => ({
      position:     i + 1,
      medal:        MEDALS[i] ?? null,
      user_id:      e.user_id,
      display_name: e.profiles?.display_name ?? e.profiles?.handle ?? 'Runner',
      runner_class: e.profiles?.runner_class ?? null,
      finish_time_secs: e.finish_time_secs,
      pace:         e.pace,
      is_pb:        pbSet.has(e.user_id),
      is_me:        e.user_id === user.id,
      submitted_at: e.submitted_at,
    }))

    // Find current user's position
    const myResult = results.find((r: { is_me: boolean }) => r.is_me)

    return NextResponse.json({
      race,
      results,
      my_position: myResult?.position ?? null,
      finisher_count: results.length,
    })

  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Race leaderboard error:' } })
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
