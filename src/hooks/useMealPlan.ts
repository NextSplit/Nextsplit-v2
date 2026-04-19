'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import type { MealPlanEntry, Recipe } from '@/types/database'
import { db } from '@/lib/supabase/db'

export interface MealPlanEntryWithRecipe extends MealPlanEntry {
  recipe: Recipe
}

/** Fetch meal plan entries for a date range, joined with recipe data */
export function useMealPlan(startDate: string, endDate: string) {
  const supabase = useSupabase()
  const [entries, setEntries] = useState<MealPlanEntryWithRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!startDate || !endDate) { setLoading(false); return }
    let cancelled = false
    setLoading(true)

    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) setLoading(false); return }

      // Fetch entries in date range
      const { data: entryData, error: entryErr } = await db(supabase)
        .from('meal_plan_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('plan_date', startDate)
        .lte('plan_date', endDate)
        .order('plan_date', { ascending: true })

      if (entryErr || !entryData?.length) {
        if (!cancelled) { setEntries([]); setLoading(false) }
        return
      }

      // Fetch associated recipes
      const recipeIds = [...new Set((entryData as MealPlanEntry[]).map(e => e.recipe_id))]
      const { data: recipeData, error: recipeErr } = await db(supabase)
        .from('recipes')
        .select('*')
        .in('id', recipeIds)

      if (!cancelled) {
        if (recipeErr) { setError(recipeErr.message); setLoading(false); return }
        const recipeMap = new Map((recipeData ?? []).map((r: Recipe) => [r.id, r]))
        const joined = (entryData as MealPlanEntry[])
          .filter(e => recipeMap.has(e.recipe_id))
          .map(e => ({ ...e, recipe: recipeMap.get(e.recipe_id)! })) as MealPlanEntryWithRecipe[]
        setEntries(joined)
        setLoading(false)
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [supabase, startDate, endDate, tick])

  const assignMeal = useCallback(async (params: {
    plan_date: string
    meal_slot: string
    recipe_id: string
    portions: number
  }): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error: err } = await db(supabase)
      .from('meal_plan_entries')
      .upsert(
        { user_id: user.id, ...params },
        { onConflict: 'user_id,plan_date,meal_slot,recipe_id' }
      )

    if (err) throw new Error(err.message)
    refresh()
  }, [supabase, refresh])

  const removeMeal = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await db(supabase)
      .from('meal_plan_entries')
      .delete()
      .eq('id', id)

    if (err) throw new Error(err.message)
    refresh()
  }, [supabase, refresh])

  /** Group entries by date string */
  const byDate = entries.reduce<Record<string, MealPlanEntryWithRecipe[]>>((acc, e) => {
    if (!acc[e.plan_date]) acc[e.plan_date] = []
    acc[e.plan_date].push(e)
    return acc
  }, {})

  /** Daily macro totals for a given date */
  function dailyMacros(date: string) {
    const dayEntries = byDate[date] ?? []
    return dayEntries.reduce((acc, e) => {
      const mult = e.portions / e.recipe.servings
      return {
        kcal:    acc.kcal    + (e.recipe.kcal_total    ?? 0) * mult,
        protein: acc.protein + (e.recipe.protein_total ?? 0) * mult,
        carbs:   acc.carbs   + (e.recipe.carbs_total   ?? 0) * mult,
        fat:     acc.fat     + (e.recipe.fat_total     ?? 0) * mult,
      }
    }, { kcal: 0, protein: 0, carbs: 0, fat: 0 })
  }

  return { entries, byDate, loading, error, assignMeal, removeMeal, refresh, dailyMacros }
}
