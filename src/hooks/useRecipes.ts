'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import type { Recipe, RecipeIngredient } from '@/types/database'

export interface CreateRecipeParams {
  name: string
  servings: number
  kcal_total?: number | null
  protein_total?: number | null
  carbs_total?: number | null
  fat_total?: number | null
  ingredients: RecipeIngredient[]
  notes?: string | null
}

export function useRecipes() {
  const supabase = useSupabase()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function fetchRecipes() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) setLoading(false); return }

      const { data, error: fetchErr } = await (supabase as any)
        .from('recipes')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true })

      if (!cancelled) {
        if (fetchErr) setError(fetchErr.message)
        else setRecipes((data ?? []) as Recipe[])
        setLoading(false)
      }
    }

    fetchRecipes()
    return () => { cancelled = true }
  }, [supabase, tick])

  const createRecipe = useCallback(async (params: CreateRecipeParams): Promise<Recipe> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error: err } = await (supabase as any)
      .from('recipes')
      .insert({ user_id: user.id, ...params })
      .select()
      .single()

    if (err) throw new Error(err.message)
    refresh()
    return data as Recipe
  }, [supabase, refresh])

  const updateRecipe = useCallback(async (id: string, params: Partial<CreateRecipeParams>): Promise<void> => {
    const { error: err } = await (supabase as any)
      .from('recipes')
      .update(params)
      .eq('id', id)

    if (err) throw new Error(err.message)
    refresh()
  }, [supabase, refresh])

  const deleteRecipe = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await (supabase as any)
      .from('recipes')
      .delete()
      .eq('id', id)

    if (err) throw new Error(err.message)
    refresh()
  }, [supabase, refresh])

  return { recipes, loading, error, createRecipe, updateRecipe, deleteRecipe, refresh }
}
