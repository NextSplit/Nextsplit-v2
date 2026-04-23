'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { CharacterConfig, UserGoal, SportId } from '@/types/database'
import { Analytics } from '@/lib/analytics'

// Human-readable step names for PostHog funnel
const STEP_NAMES: Record<number, string> = {
  1: 'welcome', 2: 'character_creation', 3: 'sport_select', 4: 'goals',
  5: 'your_running', 6: 'your_life', 7: 'gym_config', 8: 'about_you',
  9: 'training_path', 10: 'strava_connect', 11: 'plan_generation', 12: 'plan_preview',
}

// ── Total steps in the flow ───────────────────────────────────────────────────
export const TOTAL_STEPS = 12

export type TrainingPath = 'predetermined' | 'ai_bespoke' | 'manual' | 'lifestyle' | 'coach_marketplace'

// ── Shape of all onboarding data ──────────────────────────────────────────────
export interface OnboardingData {
  // Step 2 — Character
  handle:           string
  characterConfig:  CharacterConfig

  // Step 3 — Sport
  sportFocus:       SportId[]

  // Step 4 — About You
  displayName:      string
  age:              number | null
  biologicalSex:    'male' | 'female' | 'prefer_not_to_say' | null
  injuryNotes:      string
  healthFlags:      string[]

  // Step 5 — Your Running
  runningExperience: 'lt_6mo' | '6_12mo' | '1_3yr' | '3yr_plus' | null
  weeklyKmCurrent:  number
  recentRaceTimes:  { '5k'?: number; '10k'?: number; half?: number; marathon?: number }
  longestRecentRun: number | null
  runSurfaces:      string[]

  // Step 6 — Goals
  goals:            Partial<UserGoal>[]

  // Step 7 — Your Life
  trainingDays:     number
  preferredLongRunDay: string | null
  preferredRunTime: 'morning' | 'lunchtime' | 'evening' | 'varies' | null

  // Step 8 — Gym
  gymEnabled:           boolean
  gymSessionsPerWeek:   number
  gymEquipment:         string[]
  gymFocus:             'general' | 'runner_specific' | 'hypertrophy' | 'rehab' | null

  // Step 9 — Path
  trainingPath:     TrainingPath | null
}

const defaultCharacter: CharacterConfig = {
  bodyType:      'athletic',
  skinTone:      'tone-3',
  hairStyle:     'short',
  hairColour:    '#3b2314',
  faceShape:     'oval',
  kitColour:     'var(--ns-ember)',
  shoeColour:    '#1e293b',
  accessories:   [],
  startingTitle: 'The Newcomer',
}

const defaultData: OnboardingData = {
  handle:           '',
  characterConfig:  defaultCharacter,
  sportFocus:       ['running'],
  displayName:      '',
  age:              null,
  biologicalSex:    null,
  injuryNotes:      '',
  healthFlags:      [],
  runningExperience: null,
  weeklyKmCurrent:  20,
  recentRaceTimes:  {},
  longestRecentRun: null,
  runSurfaces:      [],
  goals:            [],
  trainingDays:     4,
  preferredLongRunDay: null,
  preferredRunTime: null,
  gymEnabled:       true,
  gymSessionsPerWeek: 2,
  gymEquipment:     [],
  gymFocus:         null,
  trainingPath:     null,
}

// ── Context shape ─────────────────────────────────────────────────────────────
interface OnboardingContextValue {
  step:       number
  totalSteps: number
  data:       OnboardingData
  setStep:    (step: number) => void
  next:       () => void
  back:       () => void
  update:     (partial: Partial<OnboardingData>) => void
  reset:      () => void
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

export function OnboardingProvider({ children, initialStep = 1 }: {
  children: React.ReactNode
  initialStep?: number
}) {
  // Load from localStorage on mount (survives page refresh/crash)
  const [step, setStep] = useState(() => {
    if (typeof window === 'undefined') return initialStep
    try {
      const saved = localStorage.getItem('nextsplit_onboarding_step')
      return saved ? Math.max(initialStep, parseInt(saved, 10)) : initialStep
    } catch { return initialStep }
  })

  const [data, setData] = useState<OnboardingData>(() => {
    if (typeof window === 'undefined') return defaultData
    try {
      const saved = localStorage.getItem('nextsplit_onboarding_data')
      return saved ? { ...defaultData, ...JSON.parse(saved) } : defaultData
    } catch { return defaultData }
  })

  const next = useCallback(() => setStep(s => {
    const n = Math.min(s + 1, TOTAL_STEPS)
    try { localStorage.setItem('nextsplit_onboarding_step', String(n)) } catch { /* ignore */ }
    Analytics.onboardingStep(s, STEP_NAMES[s] ?? `step_${s}`)
    Analytics.onboardingStepViewed(n, STEP_NAMES[n] ?? `step_${n}`)
    return n
  }), [])
  const back = useCallback(() => setStep(s => Math.max(s - 1, 1)), [])
  const update = useCallback((partial: Partial<OnboardingData>) => {
    setData(prev => {
      const next = { ...prev, ...partial }
      try { localStorage.setItem('nextsplit_onboarding_data', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])
  const reset = useCallback(() => {
    setData(defaultData)
    setStep(1)
    try {
      localStorage.removeItem('nextsplit_onboarding_data')
      localStorage.removeItem('nextsplit_onboarding_step')
    } catch { /* ignore */ }
  }, [])

  return (
    <OnboardingContext.Provider value={{ step, totalSteps: TOTAL_STEPS, data, setStep, next, back, update, reset }}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider')
  return ctx
}
