'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import type { UserPlan, PlanWeek, TrainingLog } from '@/types/database'

export interface ArchivedPlanSummary {
  plan: UserPlan
  weeks: PlanWeek[]
  totalKm: number
  loggedSessions: number
  totalSessions: number
  weeksCompleted: number
}

export function usePlanHistory() {
  const supabase = useSupabase()
  const [plans, setPlans] = useState<ArchivedPlanSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) setLoading(false); return }

      // Fetch archived plans
      const { data: archivedPlans } = await (supabase as any)
        .from('user_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'archived')
        .is('deleted_at', null)
        .order('archived_at', { ascending: false })

      if (!archivedPlans || cancelled) { if (!cancelled) setLoading(false); return }

      // For each plan, fetch its logs to compute stats
      const summaries: ArchivedPlanSummary[] = []
      for (const plan of archivedPlans as UserPlan[]) {
        const weeks = (plan.weeks_data as unknown as PlanWeek[]) ?? []

        const { data: logs } = await (supabase as any)
          .from('training_logs')
          .select('done, km, week_n, day_i, session_i')
          .eq('plan_id', plan.id)
          .eq('done', true)

        const logArr = (logs ?? []) as Pick<TrainingLog, 'done' | 'km' | 'week_n' | 'day_i' | 'session_i'>[]
        // Exclude ad-hoc sessions (session_i === 99) from planned stats
        const plannedLogs = logArr.filter(l => l.session_i !== 99)
        const totalKm = plannedLogs.reduce((sum, l) => sum + (l.km ?? 0), 0)
        const loggedSessions = plannedLogs.length
        const totalSessions = weeks.reduce((sum, w) =>
          sum + w.days.reduce((ds, d) => ds + d.sessions.filter(sess => sess.c !== 'rest').length, 0), 0)

        summaries.push({
          plan,
          weeks,
          totalKm: Math.round(totalKm * 10) / 10,
          loggedSessions,
          totalSessions,
          weeksCompleted: plan.current_week - 1,
        })
      }

      if (!cancelled) {
        setPlans(summaries)
        setLoading(false)
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [supabase, tick])

  return { plans, loading, refresh }
}
