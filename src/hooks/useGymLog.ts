'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import type { GymLog } from '@/types/database'

export interface GymExerciseSet {
  weight: number | null
  reps: number
  ts: string  // ISO timestamp
}

export interface GymExercise {
  name: string
  sets: GymExerciseSet[]
}

interface SaveGymLogParams {
  plan_id: string
  week_n: number
  day_i: number
  session_i: number
  exercises: GymExercise[]
}

interface UseGymLogReturn {
  /** Gym logs for this plan, keyed as "weekN_dayI_sessionI" */
  gymLogs: Record<string, GymLog>
  loading: boolean
  error: string | null
  saveGymLog: (params: SaveGymLogParams) => Promise<GymLog>
  refresh: () => void
}

/**
 * Reads and writes gym session logs for a given plan.
 * Upserts on (user_id, plan_id, week_n, day_i, session_i).
 *
 * Usage:
 *   const { gymLogs, saveGymLog } = useGymLog(planId)
 *   await saveGymLog({ plan_id, week_n: 1, day_i: 0, session_i: 0, exercises })
 */
export function useGymLog(planId: string | null): UseGymLogReturn {
  const supabase = useSupabase()
  const [gymLogs, setGymLogs] = useState<Record<string, GymLog>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!planId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)

    async function fetchGymLogs() {
      const { data, error: fetchErr } = await (supabase as any)
        .from('gym_logs')
        .select('*')
        .eq('plan_id', planId!)

      if (!cancelled) {
        if (fetchErr) {
          setError(fetchErr.message)
        } else {
          const keyed: Record<string, GymLog> = {}
          for (const log of (data ?? []) as GymLog[]) {
            keyed[`${log.week_n}_${log.day_i}_${log.session_i}`] = log
          }
          setGymLogs(keyed)
        }
        setLoading(false)
      }
    }

    fetchGymLogs()
    return () => { cancelled = true }
  }, [supabase, planId, tick])

  const saveGymLog = useCallback(async (params: SaveGymLogParams): Promise<GymLog> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const row = {
      user_id: user.id,
      plan_id: params.plan_id,
      week_n: params.week_n,
      day_i: params.day_i,
      session_i: params.session_i,
      exercises: params.exercises,
      logged_at: new Date().toISOString(),
    }

    const { data, error: upsertErr } = await (supabase as any)
      .from('gym_logs')
      .upsert(row, { onConflict: 'user_id,plan_id,week_n,day_i,session_i' })
      .select()
      .single()

    if (upsertErr) throw new Error(upsertErr.message)
    refresh()
    return data as GymLog
  }, [supabase, refresh])

  return { gymLogs, loading, error, saveGymLog, refresh }
}
