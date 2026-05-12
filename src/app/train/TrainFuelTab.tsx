'use client'

import { useState } from 'react'
import Link from 'next/link'
import FuelPlanCard from '@/components/FuelPlanCard'
import { TDEESetupCard } from '@/components/nutrition/TDEESetupCard'
import { FuelDailyView } from '@/components/nutrition/FuelDailyView'
import { AIFuelCoach } from '@/components/nutrition/AIFuelCoach'
import { useNutritionSettings } from '@/hooks/useNutritionSettings'
import type { PlanWeek, PlanSession } from '@/types/database'

// PR C1 Nutrition Planner v2 — Fuel tab home.
// Three rendering modes:
//   1. Pre-setup: TDEESetupCard prompts for weight/height/age/sex/
//      activity/goal. Settings persist via useNutritionSettings.
//   2. Editing: TDEESetupCard pre-filled with current settings.
//   3. Set: FuelDailyView shows calorie + macro target, session-aware
//      fuel hints, and meal slots.
//
// The existing race-week pivot card (FuelPlanCard, mounted when
// planDay.nut events exist) renders ABOVE the daily view so race-day
// specific cues stay surfaced when relevant.

interface Props {
  today: PlanWeek['days'][number] | undefined
}

export function TrainFuelTab({ today }: Props) {
  const { settings, loaded, save } = useNutritionSettings()
  const [editing, setEditing] = useState(false)
  const hasRaceWeekFuel = !!today && Array.isArray(today.nut) && today.nut.length > 0
  const todaySessions: PlanSession[] = today?.sessions?.filter(s => s.c && s.c !== 'rest') ?? []

  if (!loaded) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-4 pb-32">
        <div className="rounded-2xl animate-pulse h-48"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }} />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-32 space-y-4">

      {/* Race-week fuel pivot — keeps PR #80 surface for users in race week */}
      {hasRaceWeekFuel && today && <FuelPlanCard planDay={today} />}

      {(!settings || editing) ? (
        <TDEESetupCard
          initial={settings}
          onSave={(s) => { save(s); setEditing(false) }}
          onCancel={editing ? () => setEditing(false) : undefined}
        />
      ) : (
        <>
          <FuelDailyView
            settings={settings}
            todaySessions={todaySessions}
            onEditSettings={() => setEditing(true)}
          />

          {/* PR C2 — AI fuel coach for "what should I eat?" style asks */}
          <AIFuelCoach settings={settings} todaySessions={todaySessions} />

          {/* Recipe library link */}
          <Link href="/train/fuel/recipes"
            className="flex items-center justify-between rounded-2xl px-4 py-3 active:scale-[0.99] transition-transform"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden>📖</span>
              <div>
                <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>
                  Recipe library
                </p>
                <p className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                  Search recipes by macros, save your own
                </p>
              </div>
            </div>
            <span className="text-xl" style={{ color: 'var(--color-text-tertiary)' }} aria-hidden>→</span>
          </Link>
        </>
      )}
    </div>
  )
}
