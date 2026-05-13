'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import type { MealPlanEntry, Recipe } from '@/types/database'
import { db } from '@/lib/supabase/db'

// PR E5: recipe is now optional — freeform entries carry their macros
// inline (snapshot at assignment time) and have null recipe_id. The DB
// CHECK constraint ensures either recipe_id or name is set.
export interface MealPlanEntryWithRecipe extends MealPlanEntry {
  recipe: Recipe | null
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

      // Fetch associated recipes (only entries with recipe_id set)
      const recipeIds = [...new Set(
        (entryData as MealPlanEntry[])
          .map(e => e.recipe_id)
          .filter((id): id is string => !!id)
      )]
      const { data: recipeData, error: recipeErr } = recipeIds.length > 0
        ? await db(supabase).from('recipes').select('*').in('id', recipeIds)
        : { data: [] as Recipe[], error: null }

      if (!cancelled) {
        if (recipeErr) { setError(recipeErr.message); setLoading(false); return }
        const recipeMap = new Map((recipeData ?? []).map((r: Recipe) => [r.id, r]))
        const joined = (entryData as MealPlanEntry[]).map(e => ({
          ...e,
          recipe: e.recipe_id ? (recipeMap.get(e.recipe_id) ?? null) : null,
        })) as MealPlanEntryWithRecipe[]
        setEntries(joined)
        setLoading(false)
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [supabase, startDate, endDate, tick])

  // PR E5: two-shape assign. Recipe-backed entry snapshots the recipe's
  // macros at assignment time × portions; freeform entry takes user input
  // directly. The DB CHECK constraint guarantees at least one of recipe_id
  // or name is set.
  type AssignParams =
    | { plan_date: string; meal_slot: string; recipe: Recipe; portions: number }
    | { plan_date: string; meal_slot: string; freeform: {
        name: string; kcal_total?: number | null; protein_total?: number | null
        carbs_total?: number | null; fat_total?: number | null
      } }

  const assignMeal = useCallback(async (params: AssignParams): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const row = 'recipe' in params ? {
      user_id:       user.id,
      plan_date:     params.plan_date,
      meal_slot:     params.meal_slot,
      recipe_id:     params.recipe.id,
      portions:      params.portions,
      name:          params.recipe.name,
      kcal_total:    params.recipe.kcal_total    !== null ? Math.round(params.recipe.kcal_total    * params.portions / params.recipe.servings) : null,
      protein_total: params.recipe.protein_total !== null ? Math.round(params.recipe.protein_total * params.portions / params.recipe.servings) : null,
      carbs_total:   params.recipe.carbs_total   !== null ? Math.round(params.recipe.carbs_total   * params.portions / params.recipe.servings) : null,
      fat_total:     params.recipe.fat_total     !== null ? Math.round(params.recipe.fat_total     * params.portions / params.recipe.servings) : null,
    } : {
      user_id:       user.id,
      plan_date:     params.plan_date,
      meal_slot:     params.meal_slot,
      recipe_id:     null,
      portions:      1,
      name:          params.freeform.name,
      kcal_total:    params.freeform.kcal_total    ?? null,
      protein_total: params.freeform.protein_total ?? null,
      carbs_total:   params.freeform.carbs_total   ?? null,
      fat_total:     params.freeform.fat_total     ?? null,
    }

    const { error: err } = await db(supabase)
      .from('meal_plan_entries')
      .insert(row)

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

  /** Daily macro totals for a given date. PR E5: snapshot columns on
   *  meal_plan_entries are the source of truth (recipe_id is optional;
   *  recipe edits don't mutate historical rows). */
  function dailyMacros(date: string) {
    const dayEntries = byDate[date] ?? []
    return dayEntries.reduce((acc, e) => ({
      kcal:    acc.kcal    + (e.kcal_total    ?? 0),
      protein: acc.protein + (e.protein_total ?? 0),
      carbs:   acc.carbs   + (e.carbs_total   ?? 0),
      fat:     acc.fat     + (e.fat_total     ?? 0),
    }), { kcal: 0, protein: 0, carbs: 0, fat: 0 })
  }

  return { entries, byDate, loading, error, assignMeal, removeMeal, refresh, dailyMacros }
}
