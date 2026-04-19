'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import { db } from '@/lib/supabase/db'
import type { ActivityLog } from '@/types/database'

export type ActivityType = ActivityLog['activity_type']

export const ACTIVITY_TYPES: Array<{
  type: ActivityType
  label: string
  emoji: string
  affectsTDEE: boolean
  metFactor: number  // METs for TDEE calculation
}> = [
  { type: 'swim',  label: 'Swimming',    emoji: '🏊', affectsTDEE: true,  metFactor: 7.0 },
  { type: 'cycle', label: 'Cycling',     emoji: '🚴', affectsTDEE: true,  metFactor: 8.0 },
  { type: 'walk',  label: 'Walking',     emoji: '🚶', affectsTDEE: true,  metFactor: 3.5 },
  { type: 'hike',  label: 'Hiking',      emoji: '🥾', affectsTDEE: true,  metFactor: 5.3 },
  { type: 'yoga',  label: 'Yoga',        emoji: '🧘', affectsTDEE: false, metFactor: 2.5 },
  { type: 'other', label: 'Other sport', emoji: '🏅', affectsTDEE: false, metFactor: 4.0 },
]

export function useActivityLog() {
  const supabase = useSupabase()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) setLoading(false); return }

      const { data } = await db(supabase)
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(90)  // last 90 days

      if (!cancelled && data) setLogs(data as ActivityLog[])
      if (!cancelled) setLoading(false)
    }
    fetch()
    return () => { cancelled = true }
  }, [supabase])

  const saveActivity = useCallback(async (params: {
    activity_type: ActivityType
    logged_at?: string
    duration_secs?: number
    distance_km?: number
    calories?: number
    effort?: number
    notes?: string
  }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await db(supabase)
      .from('activity_logs')
      .upsert({
        user_id: user.id,
        logged_at: params.logged_at ?? new Date().toISOString().slice(0, 10),
        ...params,
      })
      .select()
      .single()

    if (!error && data) {
      setLogs(prev => [data as ActivityLog, ...prev.filter(l => l.id !== (data as ActivityLog).id)])
    }
    return { error }
  }, [supabase])

  const deleteActivity = useCallback(async (id: string) => {
    await db(supabase).from('activity_logs').delete().eq('id', id)
    setLogs(prev => prev.filter(l => l.id !== id))
  }, [supabase])

  /**
   * Extra calories burned from non-running activities today.
   * Used to adjust TDEE upward on cross-training days.
   */
  const extraCaloriesToday = useCallback((weightKg: number): number => {
    const today = new Date().toISOString().slice(0, 10)
    const todayLogs = logs.filter(l => l.logged_at === today)
    return todayLogs.reduce((total, log) => {
      const typeDef = ACTIVITY_TYPES.find(t => t.type === log.activity_type)
      if (!typeDef || !typeDef.affectsTDEE || !log.duration_secs) return total
      // Calories = METs × weight(kg) × time(hours)
      const hours = log.duration_secs / 3600
      return total + Math.round(typeDef.metFactor * weightKg * hours)
    }, 0)
  }, [logs])

  return { logs, loading, saveActivity, deleteActivity, extraCaloriesToday }
}
