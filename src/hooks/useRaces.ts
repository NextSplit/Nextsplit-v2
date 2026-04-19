'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import type { Race } from '@/types/database'
import { db } from '@/lib/supabase/db'

interface AddRaceParams {
  name: string
  race_date: string
  distance_km?: number
  distance_label?: string
  priority?: 'A' | 'B' | 'C' | 'training'
  goal_time_secs?: number
  location?: string
  notes?: string
  plan_id?: string
}

interface UseRacesReturn {
  races: Race[]
  upcoming: Race[]
  past: Race[]
  loading: boolean
  error: string | null
  addRace: (params: AddRaceParams) => Promise<Race>
  logResult: (raceId: string, actual_time_secs: number) => Promise<void>
  deleteRace: (raceId: string) => Promise<void>
  refresh: () => void
}

/**
 * Manages the user's race calendar.
 * `upcoming` and `past` are pre-sorted slices of `races`.
 *
 * Usage:
 *   const { upcoming, addRace } = useRaces()
 */
export function useRaces(): UseRacesReturn {
  const supabase = useSupabase()
  const [races, setRaces] = useState<Race[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function fetchRaces() {
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr || !user) {
        if (!cancelled) { setError('Not authenticated'); setLoading(false) }
        return
      }

      const { data, error: fetchErr } = await db(supabase)
        .from('races')
        .select('*')
        .eq('user_id', user.id)
        .order('race_date', { ascending: true })

      if (!cancelled) {
        if (fetchErr) setError(fetchErr.message)
        else setRaces((data ?? []) as Race[])
        setLoading(false)
      }
    }

    fetchRaces()
    return () => { cancelled = true }
  }, [supabase, tick])

  const today = new Date().toISOString().split('T')[0]
  const upcoming = races.filter(r => r.race_date >= today)
  const past = races.filter(r => r.race_date < today)

  const addRace = useCallback(async (params: AddRaceParams): Promise<Race> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error: insertErr } = await db(supabase)
      .from('races')
      .insert({
        user_id: user.id,
        name: params.name,
        race_date: params.race_date,
        distance_km: params.distance_km ?? null,
        distance_label: params.distance_label ?? null,
        priority: params.priority ?? 'A',
        goal_time_secs: params.goal_time_secs ?? null,
        location: params.location ?? null,
        notes: params.notes ?? null,
        plan_id: params.plan_id ?? null,
      })
      .select()
      .single()

    if (insertErr) throw new Error(insertErr.message)
    refresh()
    return data as Race
  }, [supabase, refresh])

  const logResult = useCallback(async (raceId: string, actual_time_secs: number) => {
    const { error: updateErr } = await db(supabase)
      .from('races')
      .update({ actual_time_secs })
      .eq('id', raceId)
    if (updateErr) throw new Error(updateErr.message)
    refresh()
  }, [supabase, refresh])

  const deleteRace = useCallback(async (raceId: string) => {
    const { error: delErr } = await db(supabase)
      .from('races')
      .delete()
      .eq('id', raceId)
    if (delErr) throw new Error(delErr.message)
    refresh()
  }, [supabase, refresh])

  return { races, upcoming, past, loading, error, addRace, logResult, deleteRace, refresh }
}
