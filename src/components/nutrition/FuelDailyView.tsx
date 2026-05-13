'use client'

import {
  calculateMacroTargets, getSessionFuelSuggestion, DEFAULT_MEAL_SLOTS,
  type NutritionSettings,
} from '@/lib/nutrition'
import type { PlanSession } from '@/types/database'

// PR C1 — daily fuel view. Top-line: today's calorie + macro target,
// auto-derived from NutritionSettings. Below: 5 default meal slots
// (breakfast / pre-run / lunch / post-run / dinner), each carrying its
// share of the calorie budget. When today has a planned run, the
// pre-run and post-run slots get session-aware carb/protein hints.
//
// Slot assignment (recipes) is wired in C2 — this is the skeleton.

interface Props {
  settings: NutritionSettings
  todaySessions: PlanSession[]
  onEditSettings: () => void
}

export function FuelDailyView({ settings, todaySessions, onEditSettings }: Props) {
  const targets = calculateMacroTargets(settings)
  const primarySession = todaySessions[0]
  const fuelHint = getSessionFuelSuggestion(primarySession?.c)
  const hasSession = todaySessions.length > 0 && primarySession?.c !== 'rest'

  return (
    <div className="space-y-3">

      {/* Daily target header card — pale-cream pattern matches NextRewardCard */}
      <div className="rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255,184,0,0.12), rgba(255,140,0,0.05))',
          border: '2px solid rgba(255,184,0,0.45)',
          boxShadow: '0 4px 24px rgba(255,184,0,0.10)',
        }}>
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#ffb800' }}>
              Today&apos;s fuel target
            </p>
            <p className="text-3xl font-black mt-1"
              style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {targets.calories}
              <span className="text-base font-bold ml-1" style={{ color: 'var(--color-text-tertiary)' }}>
                kcal
              </span>
            </p>
          </div>
          <button onClick={onEditSettings}
            className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,184,0,0.15)', color: '#ffb800', border: '1.5px solid rgba(255,184,0,0.35)' }}>
            Edit
          </button>
        </div>
        <div className="px-4 pb-4 grid grid-cols-3 gap-2">
          <MacroPill label="Protein" value={`${targets.protein_g}g`} colour="#ef4444" />
          <MacroPill label="Carbs"   value={`${targets.carbs_g}g`}   colour="#3b82f6" />
          <MacroPill label="Fat"     value={`${targets.fat_g}g`}     colour="#eab308" />
        </div>
      </div>

      {/* Today's session-aware fuel hint */}
      {hasSession && (
        <div className="rounded-2xl p-4"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-1.5"
            style={{ color: 'var(--color-text-tertiary)' }}>
            Today · {primarySession?.n ?? primarySession?.c}
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {fuelHint.note}
          </p>
          <div className="flex gap-4 mt-2 text-xs">
            {fuelHint.pre_carbs_g > 0 && (
              <span style={{ color: 'var(--color-text-secondary)' }}>
                🍌 Pre: <strong style={{ color: '#3b82f6' }}>~{fuelHint.pre_carbs_g}g carbs</strong>
              </span>
            )}
            {fuelHint.post_protein_g > 0 && (
              <span style={{ color: 'var(--color-text-secondary)' }}>
                💪 Post: <strong style={{ color: '#ef4444' }}>~{fuelHint.post_protein_g}g protein</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Meal slots */}
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest px-1"
          style={{ color: 'var(--color-text-tertiary)' }}>
          Today&apos;s meals
        </p>
        {DEFAULT_MEAL_SLOTS.map(slot => {
          const slotCalories = Math.round(targets.calories * slot.pct)
          return (
            <div key={slot.id}
              className="rounded-2xl px-4 py-3 flex items-center gap-3"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <span className="text-2xl flex-shrink-0">{slot.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>
                  {slot.label}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                  {slot.timing} · ~{slotCalories} kcal
                </p>
              </div>
              <button
                className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg opacity-60"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}
                title="Recipe assignment ships in C2">
                Assign
              </button>
            </div>
          )
        })}
      </div>

      <p className="text-[10px] text-center mt-2 px-4"
        style={{ color: 'var(--color-text-tertiary)' }}>
        Recipe library + AI fuel coach ship in the next nutrition release (C2).
        Today&apos;s view: calorie + macro targets, session-aware hints, meal slots.
      </p>
    </div>
  )
}

function MacroPill({ label, value, colour }: { label: string; value: string; colour: string }) {
  return (
    <div className="rounded-xl px-2.5 py-2 text-center"
      style={{ background: `${colour}15`, border: `1.5px solid ${colour}35` }}>
      <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: colour }}>{label}</p>
      <p className="text-base font-black mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
    </div>
  )
}
