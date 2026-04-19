'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import type { PlanTemplate, UserPlan } from '@/types/database'
import { db } from '@/lib/supabase/db'

interface ActivatePlanParams {
  template_id: string
  name: string
  goal?: string
  race_date?: string
  start_date?: string
}

interface UsePlanTemplatesReturn {
  templates: PlanTemplate[]
  loading: boolean
  error: string | null
  activatePlan: (params: ActivatePlanParams) => Promise<UserPlan>
  refresh: () => void
}

/**
 * Lists all plan templates and provides a helper to activate one for the current user.
 *
 * Usage:
 *   const { templates, activatePlan } = usePlanTemplates()
 *   const halfPlans = templates.filter(t => t.distance === 'half')
 *   const plan = await activatePlan({ template_id: t.id, name: 'My Half Plan', race_date: '2025-10-05' })
 */
export function usePlanTemplates(): UsePlanTemplatesReturn {
  const supabase = useSupabase()
  const [templates, setTemplates] = useState<PlanTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function fetchTemplates() {
      const { data, error: fetchErr } = await db(supabase)
        .from('plan_templates')
        .select('id, slug, name, subtitle, distance, level, weeks_min, weeks_max, runs_per_week, peak_km_week, longest_run_km, description, meta, created_at')
        // Do NOT select weeks_data here — too large for list views
        .order('distance', { ascending: true })
        .order('level', { ascending: true })

      if (!cancelled) {
        if (fetchErr) setError(fetchErr.message)
        else setTemplates((data ?? []) as PlanTemplate[])
        setLoading(false)
      }
    }

    fetchTemplates()
    return () => { cancelled = true }
  }, [supabase, tick])

  const activatePlan = useCallback(async (params: ActivatePlanParams): Promise<UserPlan> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // First, archive any existing active plan
    await db(supabase)
      .from('user_plans')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('status', 'active')

    // Fetch the full template (with weeks_data) to copy into user_plans
    const { data: template, error: tErr } = await db(supabase)
      .from('plan_templates')
      .select('*')
      .eq('id', params.template_id)
      .single()

    if (tErr || !template) throw new Error(tErr?.message ?? 'Template not found')

    const t = template as PlanTemplate
    const startDate = params.start_date ?? new Date().toISOString().split('T')[0]

    const { data: newPlan, error: insertErr } = await db(supabase)
      .from('user_plans')
      .insert({
        user_id: user.id,
        template_id: params.template_id,
        plan_type: 'predetermined',
        status: 'active',
        name: params.name,
        goal: params.goal ?? null,
        race_date: params.race_date ?? null,
        start_date: startDate,
        total_weeks: t.weeks_min,
        current_week: 1,
        weeks_data: t.weeks_data,
        meta: {
          peak_km_week: t.peak_km_week,
          longest_run_km: t.longest_run_km,
          distance: t.distance,
          level: t.level,
        },
      })
      .select()
      .single()

    if (insertErr) throw new Error(insertErr.message)
    return newPlan as UserPlan
  }, [supabase])

  return { templates, loading, error, activatePlan, refresh }
}
