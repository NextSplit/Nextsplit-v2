'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import type { CharacterConfig, UserGoal, SportId } from '@/types/database'

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
  kitColour:     '#0d9488',
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
  const [step, setStep] = useState(initialStep)
  const [data, setData] = useState<OnboardingData>(defaultData)

  const next = useCallback(() => setStep(s => Math.min(s + 1, TOTAL_STEPS)), [])
  const back = useCallback(() => setStep(s => Math.max(s - 1, 1)), [])
  const update = useCallback((partial: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...partial }))
  }, [])
  const reset = useCallback(() => {
    setData(defaultData)
    setStep(1)
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
