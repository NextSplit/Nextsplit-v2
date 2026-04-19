'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import type { TrainingLog } from '@/types/database'

/**
 * Fetches ALL training logs for the current user across all plans.
 * Used by the RPG system so XP persists across plan changes.
 * Do NOT use for session logging — use useTrainingLog(planId) for that.
 */
export function useAllTrainingLogs() {
  const supabase = useSupabase()
  const [logs, setLogs] = useState<TrainingLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) setLoading(false); return }

      const { data, error: fetchErr } = await (supabase as any)
        .from('training_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('done', true)
        .order('logged_at', { ascending: true })

      if (!cancelled) {
        if (fetchErr) setError(fetchErr.message)
        else setLogs((data ?? []) as TrainingLog[])
        setLoading(false)
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [supabase, tick])

  return { logs, loading, error, refresh }
}
