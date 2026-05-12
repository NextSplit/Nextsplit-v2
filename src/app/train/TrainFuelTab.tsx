'use client'

import { useState } from 'react'
import FuelPlanCard from '@/components/FuelPlanCard'
import { TDEESetupCard } from '@/components/nutrition/TDEESetupCard'
import { FuelDailyView } from '@/components/nutrition/FuelDailyView'
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
        <FuelDailyView
          settings={settings}
          todaySessions={todaySessions}
          onEditSettings={() => setEditing(true)}
        />
      )}
    </div>
  )
}
