'use client'

import { useEffect, useState, useCallback } from 'react'

// Today's daily 5K race fetcher + entry mutation. Bound to /api/race/today
// (which auto-seeds via seed_daily_race RPC) + /api/race/[id]/enter.

export interface TodayRaceData {
  me_user_id: string | null
  race: {
    id:                string
    format:            string
    name:              string
    distance_m:        number
    entries_open_at:   string
    entries_close_at:  string
    resolves_at:       string
    finalized_at:      string | null
  } | null
  entry_count: number
  my_entry: {
    id:                 string
    entered_at:         string
    character_snapshot: {
      build_class:     string
      level:           number
      speed_stat:      number
      endurance_stat:  number
      resilience_stat: number
    }
    boost_loadout?:     string[]
  } | null
  result: {
    finishing_order: Array<{ user_id: string; build_class: string; finish_secs: number; rank: number }>
    result_timeline: Array<{ user_id: string; splits: number[] }>
    computed_at:     string
  } | null
  runner_cosmetics?: Record<string, { kit_colour?: string }>
}

interface UseTodayRaceReturn {
  data:    TodayRaceData | null
  loading: boolean
  error:   string | null
  refresh: () => void
  enter:   (boostLoadout?: string[]) => Promise<void>
}

export function useTodayRace(): UseTodayRaceReturn {
  const [data, setData]       = useState<TodayRaceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [tick, setTick]       = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/race/today', { cache: 'no-store' })
      .then(r => r.json())
      .then((res: TodayRaceData & { error?: string }) => {
        if (cancelled) return
        if (res.error) setError(res.error)
        else { setData(res); setError(null) }
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'fetch failed') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tick])

  const enter = useCallback(async (boostLoadout: string[] = []) => {
    if (!data?.race) throw new Error('no race loaded')
    const res = await fetch(`/api/race/${data.race.id}/enter`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ boost_loadout: boostLoadout }),
    })
    const body = await res.json() as { error?: string; hint?: string; entry?: unknown }
    if (!res.ok) {
      throw new Error(body.hint ?? body.error ?? `enter failed (${res.status})`)
    }
    refresh()
  }, [data?.race, refresh])

  return { data, loading, error, refresh, enter }
}
