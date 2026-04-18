'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import type { TrainingLog } from '@/types/database'

interface LogSessionParams {
  plan_id: string
  week_n: number
  day_i: number
  session_i: number
  done: boolean
  effort?: number
  km?: number
  pace?: string
  hr?: number
  duration_secs?: number
  notes?: string
  splits?: object[]
  strava_id?: number
}

interface UseTrainingLogReturn {
  /** All logs for the given plan, keyed as "weekN_dayI_sessionI" */
  logs: Record<string, TrainingLog>
  loading: boolean
  error: string | null
  logSession: (params: LogSessionParams) => Promise<TrainingLog>
  undoSession: (logId: string) => Promise<void>
  refresh: () => void
}

/**
 * Reads and writes training logs for a given plan.
 *
 * Usage:
 *   const { logs, logSession } = useTrainingLog(planId)
 *   const key = `${weekN}_${dayI}_${sessionI}`
 *   const isLogged = !!logs[key]
 */
export function useTrainingLog(planId: string | null): UseTrainingLogReturn {
  const supabase = useSupabase()
  const [logs, setLogs] = useState<Record<string, TrainingLog>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!planId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)

    async function fetchLogs() {
      const { data, error: fetchErr } = await (supabase as any)
        .from('training_logs')
        .select('*')
        .eq('plan_id', planId!)
        .order('week_n', { ascending: true })

      if (!cancelled) {
        if (fetchErr) {
          setError(fetchErr.message)
        } else {
          const keyed: Record<string, TrainingLog> = {}
          for (const log of (data ?? []) as TrainingLog[]) {
            keyed[`${log.week_n}_${log.day_i}_${log.session_i}`] = log
          }
          setLogs(keyed)
        }
        setLoading(false)
      }
    }

    fetchLogs()
    return () => { cancelled = true }
  }, [supabase, planId, tick])

  const logSession = useCallback(async (params: LogSessionParams): Promise<TrainingLog> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const row = {
      user_id: user.id,
      plan_id: params.plan_id,
      week_n: params.week_n,
      day_i: params.day_i,
      session_i: params.session_i,
      done: params.done,
      effort: params.effort ?? null,
      km: params.km ?? null,
      pace: params.pace ?? null,
      hr: params.hr ?? null,
      duration_secs: params.duration_secs ?? null,
      notes: params.notes ?? null,
      splits: params.splits ?? null,
      strava_id: params.strava_id ?? null,
      logged_at: new Date().toISOString(),
    }

    // Upsert — idempotent on (user_id, plan_id, week_n, day_i, session_i)
    const { data, error: upsertErr } = await (supabase as any)
      .from('training_logs')
      .upsert(row, { onConflict: 'user_id,plan_id,week_n,day_i,session_i' })
      .select()
      .single()

    if (upsertErr) throw new Error(upsertErr.message)
    refresh()
    return data as TrainingLog
  }, [supabase, refresh])

  const undoSession = useCallback(async (logId: string) => {
    const { error: delErr } = await (supabase as any)
      .from('training_logs')
      .delete()
      .eq('id', logId)
    if (delErr) throw new Error(delErr.message)
    refresh()
  }, [supabase, refresh])

  return { logs, loading, error, logSession, undoSession, refresh }
}
