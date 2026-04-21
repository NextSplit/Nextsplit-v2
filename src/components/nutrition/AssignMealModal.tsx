'use client'

import { useState } from 'react'
import { useMealPlan } from '@/hooks/useMealPlan'
import { MEAL_SLOTS, type MealSlotId } from '@/types/database'
import type { Recipe, MealPlanEntryWithRecipe } from '@/types/database'
import { fmtDate, perPortion } from '@/lib/nutritionUtils'

function AssignMealModal({
  date, slot, recipes, onAssign, onClose
}: {
  date: string
  slot: MealSlotId
  recipes: Recipe[]
  onAssign: (recipeId: string, portions: number) => Promise<void>
  onClose: () => void
}) {
  const [selected, setSelected] = useState<Recipe | null>(null)
  const [portions, setPortions] = useState(1)
  const [saving, setSaving] = useState(false)
  const slotCfg = MEAL_SLOTS.find(s => s.id === slot)

  async function handleAssign() {
    if (!selected) return
    setSaving(true)
    try {
      await onAssign(selected.id, portions)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="overflow-y-auto flex-1 p-6">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
          <h2 className="text-base font-bold text-gray-900 mb-1">
            {slotCfg?.emoji} {slotCfg?.label} · {fmtDate(date)}
          </h2>
          <p className="text-xs text-gray-400 mb-4">Choose a recipe from your repository</p>

          {recipes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No recipes yet.</p>
              <p className="text-xs text-gray-400 mt-1">Add one in the Recipes tab first.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recipes.map(r => {
                const pp = perPortion(r, 1)
                return (
                  <button key={r.id}
                    onClick={() => setSelected(s => s?.id === r.id ? null : r)}
                    className={`w-full text-left rounded-2xl border px-4 py-3 transition-all ${selected?.id === r.id ? 'border-[var(--ns-forest)] bg-teal-50' : 'border-gray-100 bg-white'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {r.servings} servings
                          {pp.kcal > 0 && ` · ${pp.kcal} kcal/portion`}
                          {pp.protein > 0 && ` · ${pp.protein}g protein`}
                        </p>
                      </div>
                      {selected?.id === r.id && (
                        <span className="text-[var(--ns-forest)] text-lg">✓</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {selected && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="text-xs font-semibold text-gray-600 block mb-2">
                Portions <span className="text-gray-400 font-normal">(how many servings for this meal)</span>
              </label>
              <div className="flex items-center gap-3">
                <button onClick={() => setPortions(p => Math.max(0.5, Math.round((p - 0.5) * 10) / 10))}
                  className="w-9 h-9 rounded-full bg-gray-100 text-gray-700 font-bold flex items-center justify-center">−</button>
                <span className="text-2xl font-bold text-gray-900 w-8 text-center">{portions}</span>
                <button onClick={() => setPortions(p => Math.round((p + 0.5) * 10) / 10)}
                  className="w-9 h-9 rounded-full bg-gray-100 text-gray-700 font-bold flex items-center justify-center">+</button>
              </div>
              {selected && (
                <div className="mt-2 grid grid-cols-4 gap-1">
                  {[
                    { label: 'kcal', val: perPortion(selected, portions).kcal, colour: 'text-amber-600' },
                    { label: 'protein', val: perPortion(selected, portions).protein + 'g', colour: 'text-blue-600' },
                    { label: 'carbs', val: perPortion(selected, portions).carbs + 'g', colour: 'text-green-600' },
                    { label: 'fat', val: perPortion(selected, portions).fat + 'g', colour: 'text-red-500' },
                  ].map(m => (
                    <div key={m.label} className="text-center bg-gray-50 rounded-xl py-2">
                      <div className={`text-sm font-bold ${m.colour}`}>{m.val}</div>
                      <div className="text-[9px] text-gray-400">{m.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-3 border-t border-gray-50 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">
            Cancel
          </button>
          <button onClick={handleAssign} disabled={!selected || saving}
            className="flex-1 py-3 rounded-xl bg-[var(--ns-forest)] text-white text-sm font-semibold disabled:opacity-50">
            {saving ? 'Adding…' : 'Add to plan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Day Meal Card ──────────────────────────────────────────────────────────


export default AssignMealModal
