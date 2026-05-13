'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import type { TrainingLog } from '@/types/database'
import { db } from '@/lib/supabase/db'

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
      const { data, error: fetchErr } = await db(supabase)
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

    const loggedAt = new Date().toISOString()

    // Defensive: the DB has a CHECK constraint blocking future-dated logs
    // (training_logs_logged_at_not_future, +18h tolerance for max IANA TZ).
    // logged_at here is always now(), so this throw is a safety net for
    // future code paths that might add backdating UI — surface a friendly
    // error before the DB rejects the insert.
    if (new Date(loggedAt).getTime() > Date.now() + 18 * 3600 * 1000) {
      throw new Error('Cannot log future sessions')
    }

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
      logged_at: loggedAt,
    }

    // Upsert — idempotent on (user_id, plan_id, week_n, day_i, session_i)
    const { data, error: upsertErr } = await db(supabase)
      .from('training_logs')
      .upsert(row, { onConflict: 'user_id,plan_id,week_n,day_i,session_i' })
      .select()
      .single()

    if (upsertErr) throw new Error(upsertErr.message)

    // Cross-hook invalidation: tell useAllTrainingLogs (and any other
    // subscribers — eg /home today-card) that a log was created/updated.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nextsplit:training-log-changed'))
    }

    // Set first_session_logged_at on profile if this is the first completed session
    if (row.done) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = supabase as any
        const { data: prof } = await sb
          .from('profiles')
          .select('first_session_logged_at')
          .eq('id', user.id)
          .single()
        if (prof && !prof.first_session_logged_at) {
          await sb
            .from('profiles')
            .update({ first_session_logged_at: new Date().toISOString() })
            .eq('id', user.id)
        }
      } catch { /* non-blocking */ }
    }

    refresh()
    return data as TrainingLog
  }, [supabase, refresh])

  const undoSession = useCallback(async (logId: string) => {
    const { error: delErr } = await db(supabase)
      .from('training_logs')
      .delete()
      .eq('id', logId)
    if (delErr) throw new Error(delErr.message)
    refresh()
  }, [supabase, refresh])

  return { logs, loading, error, logSession, undoSession, refresh }
}
