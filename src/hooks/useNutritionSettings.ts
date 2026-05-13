'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/supabase/db'
import type { NutritionSettings, ActivityLevel, NutritionGoal, NutritionSex } from '@/lib/nutrition'

// PR C1 introduced this hook with localStorage-only persistence (no DB
// migration in C1 scope). PR F1 adds cloud sync via the new
// profiles.nutrition_settings jsonb column.
//
// Strategy: cloud is authoritative; localStorage is the offline cache.
//   • On mount: read cloud first. If cloud is null but localStorage has
//     data, hydrate from localStorage and write back to cloud (first-run
//     migration for users who set TDEE before F1 landed).
//   • On save: write cloud + localStorage in parallel.
//   • On clear: clear both.
//
// The hook contract (settings, loaded, save, clear) is unchanged so
// existing call-sites (TrainFuelTab) keep working without edits.

const STORAGE_KEY = 'nextsplit_nutrition_settings_v1'

function readLocalStorage(): NutritionSettings | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as NutritionSettings) : null
  } catch {
    return null
  }
}

function writeLocalStorage(s: NutritionSettings | null) {
  if (typeof window === 'undefined') return
  try {
    if (s === null) window.localStorage.removeItem(STORAGE_KEY)
    else            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch { /* localStorage unavailable */ }
}

// Defensive parse — cloud could hold legacy/partial data from a future
// schema. Validate before returning to call-sites.
function parseCloud(raw: unknown): NutritionSettings | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.weight_kg !== 'number') return null
  if (typeof o.height_cm !== 'number') return null
  if (typeof o.age       !== 'number') return null
  if (o.sex !== 'male' && o.sex !== 'female' && o.sex !== 'other') return null
  const activity = o.activity_level as ActivityLevel
  const validActivity = ['sedentary', 'light', 'moderate', 'active', 'very_active'] as const
  if (!validActivity.includes(activity)) return null
  const goal = o.goal as NutritionGoal
  const validGoal = ['cut', 'maintain', 'build'] as const
  if (!validGoal.includes(goal)) return null
  return {
    weight_kg: o.weight_kg,
    height_cm: o.height_cm,
    age:       o.age,
    sex:       o.sex as NutritionSex,
    activity_level: activity,
    goal:      goal,
  }
}

export function useNutritionSettings() {
  const [settings, setSettingsState] = useState<NutritionSettings | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const localFallback = readLocalStorage()

      if (!user) {
        // Anon — localStorage only.
        if (!cancelled) {
          setSettingsState(localFallback)
          setLoaded(true)
        }
        return
      }

      const { data: profile } = await db(supabase)
        .from('profiles')
        .select('nutrition_settings')
        .eq('id', user.id)
        .maybeSingle()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cloud = parseCloud((profile as any)?.nutrition_settings)

      if (cancelled) return

      if (cloud) {
        setSettingsState(cloud)
        // Keep localStorage in sync as offline cache (cloud is authoritative)
        writeLocalStorage(cloud)
      } else if (localFallback) {
        // First-run migration: user set TDEE pre-F1 (localStorage only).
        // Push to cloud silently so it carries across devices going forward.
        setSettingsState(localFallback)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db(supabase) as any)
          .from('profiles')
          .update({ nutrition_settings: localFallback })
          .eq('id', user.id)
      } else {
        setSettingsState(null)
      }
      setLoaded(true)
    }
    hydrate()
    return () => { cancelled = true }
  }, [])

  const save = useCallback(async (next: NutritionSettings) => {
    setSettingsState(next)
    writeLocalStorage(next)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return // anon — localStorage already updated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db(supabase) as any)
      .from('profiles')
      .update({ nutrition_settings: next })
      .eq('id', user.id)
  }, [])

  const clear = useCallback(async () => {
    setSettingsState(null)
    writeLocalStorage(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db(supabase) as any)
      .from('profiles')
      .update({ nutrition_settings: null })
      .eq('id', user.id)
  }, [])

  return { settings, loaded, save, clear }
}
