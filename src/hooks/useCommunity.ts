'use client'

import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/supabase/db'
import { createClient } from '@/lib/supabase/client'

interface Club {
  id: string; name: string; slug: string; description: string | null
  emoji: string; is_public: boolean; join_code: string
  member_count: number; weekly_km: number; total_km: number
}

interface MyClub {
  club_id: string; role: string; weekly_km: number; season_xp: number
  clubs: Club
}

interface Challenge {
  id: string; title: string; description: string | null
  challenge_type: string; target_value: number; target_unit: string
  starts_at: string; ends_at: string; reward_xp: number
  reward_badge: string | null; reward_title: string | null
  entry_count: number; is_global: boolean
  my_entry: { progress: number; completed: boolean } | null
}

interface Race {
  id: string; name: string; description: string | null
  distance_km: number; starts_at: string; ends_at: string
  entry_fee_gbp: number; entry_count: number; max_entries: number | null
  my_entry: { finish_time_secs: number | null; position: number | null; submitted_at: string | null } | null
}

interface LeaderboardEntry {
  user_id: string; display_name: string | null; handle: string | null
  season_xp: number; current_league: string; weekly_km: number
  runner_class: string | null; is_split_leader: boolean | null
}

interface CommunityState {
  myClubs:     MyClub[]
  challenges:  Challenge[]
  races:       Race[]
  leaderboard: LeaderboardEntry[]
  season:      { number: number; name: string; ends_at: string } | null
  loading:     boolean
}

export function useCommunity() {
  const [state, setState] = useState<CommunityState>({
    myClubs: [], challenges: [], races: [], leaderboard: [], season: null, loading: true,
  })
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { if (!cancelled) setState(s => ({ ...s, loading: false })); return }

        const [clubsRes, challengesRes, racesRes, leaderRes, seasonRes] = await Promise.all([
          fetch('/api/community/clubs?filter=mine'),
          fetch('/api/community/challenges'),
          fetch('/api/community/races'),
          // Top 20 by season XP
          supabase.from('profiles')
            .select('id, display_name, handle, season_xp, current_league, runner_class, is_split_leader')
            .order('season_xp', { ascending: false })
            .limit(20),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          db(supabase).from('seasons').select('number, name, ends_at').eq('is_active', true).single(),
        ])

        if (cancelled) return

        const [clubsData, challengesData, racesData] = await Promise.all([
          clubsRes.json(), challengesRes.json(), racesRes.json(),
        ])

        setState({
          myClubs:     clubsData.clubs ?? [],
          challenges:  challengesData.challenges ?? [],
          races:       racesData.races ?? [],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          leaderboard: ((leaderRes.data ?? []) as Array<Record<string,unknown>>).map(p => ({ ...p, user_id: p.id as string })) as LeaderboardEntry[],
          season:      seasonRes.data ?? null,
          loading:     false,
        })
      } catch {
        if (!cancelled) setState(s => ({ ...s, loading: false }))
      }
    }
    load()
    return () => { cancelled = true }
  }, [tick])

  return { ...state, refresh }
}
