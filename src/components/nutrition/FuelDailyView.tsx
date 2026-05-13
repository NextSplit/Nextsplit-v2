'use client'

import { useState } from 'react'
import {
  calculateMacroTargets, getSessionFuelSuggestion, DEFAULT_MEAL_SLOTS,
  type NutritionSettings, type MealSlot,
} from '@/lib/nutrition'
import { useMealPlan } from '@/hooks/useMealPlan'
import { AssignMealModal } from './AssignMealModal'
import type { PlanSession, Recipe } from '@/types/database'

// PR C1 — daily fuel view. PR E5 wires the previously-inert Assign button
// to a real modal backed by the meal_plan_entries DB table.

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

  const today = new Date().toISOString().slice(0, 10)
  const { byDate, assignMeal, removeMeal, dailyMacros } = useMealPlan(today, today)
  const todayEntries = byDate[today] ?? []
  const consumed = dailyMacros(today)

  const [assignSlot, setAssignSlot] = useState<MealSlot | null>(null)

  return (
    <div className="space-y-3">

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
            {consumed.kcal > 0 && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Logged: <strong style={{ color: '#ffb800' }}>{Math.round(consumed.kcal)} kcal</strong>
                {' '}· remaining {Math.max(0, targets.calories - Math.round(consumed.kcal))} kcal
              </p>
            )}
          </div>
          <button onClick={onEditSettings}
            className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,184,0,0.15)', color: '#ffb800', border: '1.5px solid rgba(255,184,0,0.35)' }}>
            Edit
          </button>
        </div>
        <div className="px-4 pb-4 grid grid-cols-3 gap-2">
          <MacroPill label="Protein" value={`${targets.protein_g}g`} consumed={Math.round(consumed.protein)} colour="#ef4444" />
          <MacroPill label="Carbs"   value={`${targets.carbs_g}g`}   consumed={Math.round(consumed.carbs)}   colour="#3b82f6" />
          <MacroPill label="Fat"     value={`${targets.fat_g}g`}     consumed={Math.round(consumed.fat)}     colour="#eab308" />
        </div>
      </div>

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

      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest px-1"
          style={{ color: 'var(--color-text-tertiary)' }}>
          Today&apos;s meals
        </p>
        {DEFAULT_MEAL_SLOTS.map(slot => {
          const slotCalories = Math.round(targets.calories * slot.pct)
          const slotEntries = todayEntries.filter(e => e.meal_slot === slot.id)
          const hasEntries = slotEntries.length > 0
          return (
            <div key={slot.id}
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="px-4 py-3 flex items-center gap-3">
                <span className="text-2xl flex-shrink-0">{slot.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>
                    {slot.label}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                    {slot.timing} · target ~{slotCalories} kcal
                  </p>
                </div>
                <button onClick={() => setAssignSlot(slot)}
                  className="text-[10px] font-black px-2.5 py-1.5 rounded-lg active:scale-95"
                  style={{
                    background: hasEntries ? 'var(--color-surface-2)' : '#ffb800',
                    color: hasEntries ? 'var(--color-text-secondary)' : '#0a0e1a',
                  }}>
                  {hasEntries ? '+ Add' : 'Assign'}
                </button>
              </div>
              {hasEntries && (
                <div className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                  {slotEntries.map(entry => (
                    <div key={entry.id} className="px-4 py-2 flex items-center gap-3"
                      style={{ background: 'rgba(255,184,0,0.04)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {entry.name ?? entry.recipe?.name ?? 'Meal'}
                        </p>
                        <div className="flex gap-2 text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                          {entry.kcal_total !== null && <span>{entry.kcal_total} kcal</span>}
                          {entry.protein_total !== null && <span style={{ color: '#ef4444' }}>P {entry.protein_total}</span>}
                          {entry.carbs_total !== null && <span style={{ color: '#3b82f6' }}>C {entry.carbs_total}</span>}
                          {entry.fat_total !== null && <span style={{ color: '#eab308' }}>F {entry.fat_total}</span>}
                        </div>
                      </div>
                      <button onClick={() => removeMeal(entry.id).catch(() => {})}
                        aria-label="Remove entry"
                        className="text-base leading-none px-2 py-1"
                        style={{ color: 'var(--color-text-tertiary)' }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {assignSlot && (
        <AssignMealModal
          slotId={assignSlot.id}
          slotLabel={assignSlot.label}
          planDate={today}
          onClose={() => setAssignSlot(null)}
          onAssignRecipe={async (recipe: Recipe, portions: number) => {
            await assignMeal({ plan_date: today, meal_slot: assignSlot.id, recipe, portions })
          }}
          onAssignFreeform={async (freeform) => {
            await assignMeal({ plan_date: today, meal_slot: assignSlot.id, freeform })
          }}
        />
      )}
    </div>
  )
}

function MacroPill({ label, value, consumed, colour }: {
  label: string; value: string; consumed: number; colour: string
}) {
  return (
    <div className="rounded-xl px-2.5 py-2 text-center"
      style={{ background: `${colour}15`, border: `1.5px solid ${colour}35` }}>
      <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: colour }}>{label}</p>
      <p className="text-base font-black mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
      {consumed > 0 && (
        <p className="text-[9px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
          logged {consumed}g
        </p>
      )}
    </div>
  )
}
