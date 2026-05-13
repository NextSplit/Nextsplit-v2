'use client'

import { useCallback, useEffect, useState } from 'react'
import type { NutritionSettings } from '@/lib/nutrition'

// PR C1 — Nutrition planner v2 foundation. TDEE settings persist to
// localStorage rather than DB (no migration in C1 scope). Cloud sync
// becomes a follow-on when the founder wants cross-device parity.

const STORAGE_KEY = 'nextsplit_nutrition_settings_v1'

export function useNutritionSettings() {
  const [settings, setSettingsState] = useState<NutritionSettings | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setSettingsState(JSON.parse(raw) as NutritionSettings)
    } catch { /* localStorage unavailable */ }
    setLoaded(true)
  }, [])

  const save = useCallback((next: NutritionSettings) => {
    setSettingsState(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* noop */ }
  }, [])

  const clear = useCallback(() => {
    setSettingsState(null)
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* noop */ }
  }, [])

  return { settings, loaded, save, clear }
}
