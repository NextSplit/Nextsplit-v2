'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import type { WellnessLog } from '@/types/database'

interface LogWellnessParams {
  log_date: string        // YYYY-MM-DD
  log_type?: 'daily' | 'weekly'
  sleep?: number
  energy?: number
  mood?: number
  soreness?: number
  stress?: number
  weight_kg?: number
  notes?: string
}

interface UseWellnessReturn {
  /** Today's daily wellness log, if it exists */
  today: WellnessLog | null
  /** Last 28 days of logs */
  recent: WellnessLog[]
  loading: boolean
  error: string | null
  logWellness: (params: LogWellnessParams) => Promise<WellnessLog>
  refresh: () => void
}

/**
 * Reads and writes wellness logs.
 * `today` is null if the user hasn't logged yet today.
 *
 * Usage:
 *   const { today, logWellness } = useWellness()
 *   if (!today) showWellnessPrompt()
 */
export function useWellness(): UseWellnessReturn {
  const supabase = useSupabase()
  const [recent, setRecent] = useState<WellnessLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function fetchWellness() {
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr || !user) {
        if (!cancelled) { setError('Not authenticated'); setLoading(false) }
        return
      }

      const since = new Date()
      since.setDate(since.getDate() - 28)

      const { data, error: fetchErr } = await (supabase as any)
        .from('wellness_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('log_date', since.toISOString().split('T')[0])
        .order('log_date', { ascending: false })

      if (!cancelled) {
        if (fetchErr) setError(fetchErr.message)
        else setRecent((data ?? []) as WellnessLog[])
        setLoading(false)
      }
    }

    fetchWellness()
    return () => { cancelled = true }
  }, [supabase, tick])

  const todayStr = new Date().toISOString().split('T')[0]
  const today = recent.find(l => l.log_date === todayStr && l.log_type === 'daily') ?? null

  const logWellness = useCallback(async (params: LogWellnessParams): Promise<WellnessLog> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const row = {
      user_id: user.id,
      log_date: params.log_date,
      log_type: params.log_type ?? 'daily',
      sleep: params.sleep ?? null,
      energy: params.energy ?? null,
      mood: params.mood ?? null,
      soreness: params.soreness ?? null,
      stress: params.stress ?? null,
      weight_kg: params.weight_kg ?? null,
      notes: params.notes ?? null,
    }

    const { data, error: upsertErr } = await (supabase as any)
      .from('wellness_logs')
      .upsert(row, { onConflict: 'user_id,log_date,log_type' })
      .select()
      .single()

    if (upsertErr) throw new Error(upsertErr.message)
    refresh()
    return data as WellnessLog
  }, [supabase, refresh])

  return { today, recent, loading, error, logWellness, refresh }
}
