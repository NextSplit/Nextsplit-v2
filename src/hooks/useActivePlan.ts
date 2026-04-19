'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import type { UserPlan, PlanWeek } from '@/types/database'
import { db } from '@/lib/supabase/db'

interface UseActivePlanReturn {
  plan: UserPlan | null
  weeks: PlanWeek[]
  currentWeek: PlanWeek | null
  loading: boolean
  error: string | null
  advanceWeek: () => Promise<void>
  updatePlan: (updates: Partial<Pick<UserPlan, 'name' | 'goal' | 'race_date' | 'status' | 'meta'>>) => Promise<void>
  archivePlan: () => Promise<void>
  refresh: () => void
}

/**
 * Returns the current user's active plan, its typed weeks array,
 * and the current week object.
 *
 * Usage:
 *   const { plan, currentWeek, loading } = useActivePlan()
 */
export function useActivePlan(): UseActivePlanReturn {
  const supabase = useSupabase()
  const [plan, setPlan] = useState<UserPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function fetchPlan() {
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr || !user) {
        if (!cancelled) { setError('Not authenticated'); setLoading(false) }
        return
      }

      const { data, error: fetchErr } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!cancelled) {
        if (fetchErr) setError(fetchErr.message)
        else setPlan(data as UserPlan | null)
        setLoading(false)
      }
    }

    fetchPlan()
    return () => { cancelled = true }
  }, [supabase, tick])

  // Derive typed week data from the JSONB column
  const weeks = (plan?.weeks_data as unknown as PlanWeek[]) ?? []
  const currentWeek = weeks.find(w => w.n === plan?.current_week) ?? null

  const advanceWeek = useCallback(async () => {
    if (!plan) return
    const nextWeek = plan.current_week + 1
    if (nextWeek > plan.total_weeks) {
      // Plan complete — mark as completed instead of advancing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: upErr } = await db(supabase)
        .from('user_plans')
        .update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', plan.id)
      if (upErr) throw new Error(upErr.message)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: upErr } = await db(supabase)
        .from('user_plans')
        .update({ current_week: nextWeek, updated_at: new Date().toISOString() })
        .eq('id', plan.id)
      if (upErr) throw new Error(upErr.message)
    }
    refresh()
  }, [supabase, plan, refresh])

  const updatePlan = useCallback(async (
    updates: Partial<Pick<UserPlan, 'name' | 'goal' | 'race_date' | 'status' | 'meta'>>
  ) => {
    if (!plan) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upErr } = await db(supabase)
      .from('user_plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', plan.id)
    if (upErr) throw new Error(upErr.message)
    refresh()
  }, [supabase, plan, refresh])

  const archivePlan = useCallback(async () => {
    if (!plan) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upErr } = await db(supabase)
      .from('user_plans')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', plan.id)
    if (upErr) throw new Error(upErr.message)
    refresh()
  }, [supabase, plan, refresh])

  return { plan, weeks, currentWeek, loading, error, advanceWeek, updatePlan, archivePlan, refresh }
}
