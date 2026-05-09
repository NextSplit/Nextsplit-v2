'use client'

import { useEffect, useState, useCallback } from 'react'

// Fetcher + entry mutation for ALL active races (PR #6 multi-format).
// Replaces useTodayRace's role on the /race surface. useTodayRace is kept
// for the Home compact teaser which still focuses on the daily 5K.

export interface RaceBundle {
  race: {
    id:                string
    format:            string
    name:              string
    distance_m:        number
    entries_open_at:   string
    entries_close_at:  string
    resolves_at:       string
    finalized_at:      string | null
  }
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
  } | null
  result: {
    finishing_order: Array<{ user_id: string; build_class: string; finish_secs: number; rank: number }>
    result_timeline: Array<{ user_id: string; splits: number[] }>
    computed_at:     string
  } | null
}

export interface ActiveRacesData {
  me_user_id: string | null
  races:      RaceBundle[]
}

interface UseActiveRacesReturn {
  data:    ActiveRacesData | null
  loading: boolean
  error:   string | null
  refresh: () => void
  enter:   (raceId: string) => Promise<void>
}

export function useActiveRaces(): UseActiveRacesReturn {
  const [data, setData]       = useState<ActiveRacesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [tick, setTick]       = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/race/active', { cache: 'no-store' })
      .then(r => r.json())
      .then((res: ActiveRacesData & { error?: string }) => {
        if (cancelled) return
        if (res.error) setError(res.error)
        else { setData(res); setError(null) }
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'fetch failed') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tick])

  const enter = useCallback(async (raceId: string) => {
    const res = await fetch(`/api/race/${raceId}/enter`, { method: 'POST' })
    const body = await res.json() as { error?: string; hint?: string; entry?: unknown }
    if (!res.ok) {
      throw new Error(body.hint ?? body.error ?? `enter failed (${res.status})`)
    }
    refresh()
  }, [refresh])

  return { data, loading, error, refresh, enter }
}
