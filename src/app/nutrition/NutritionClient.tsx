'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useProfile } from '@/hooks/useProfile'
import { useRecipes } from '@/hooks/useRecipes'
import { useMealPlan } from '@/hooks/useMealPlan'
import { getDayType, DAY_TYPE_CONFIG, calcCalories } from '@/lib/nutrition'
import { MEAL_SLOTS, type MealSlotId } from '@/types/database'
import type { Recipe, RecipeIngredient, MealPlanEntryWithRecipe } from '@/types/database'
import DarkModeToggle from '@/components/DarkModeToggle'
import { useToast } from '@/components/Toast'

// ─── Supplement Tracker ───────────────────────────────────────────────────────

const SUPPLEMENTS = [
  { id: 'omega3',  label: 'Omega-3',       dose: '2g'        },
  { id: 'vit_d',   label: 'Vitamin D3/K2', dose: '2000IU'    },
  { id: 'magnesium',label: 'Magnesium',    dose: '300mg'      },
  { id: 'creatine',label: 'Creatine',      dose: '5g'        },
  { id: 'protein', label: 'Protein',       dose: 'post-run'  },
]

function suppTodayKey() {
  const d = new Date()
  return `nextsplit_supps_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

/** Compute how many consecutive days had at least one supplement logged */
function computeSuppStreak(): number {
  let streak = 0
  const d = new Date()
  for (let i = 0; i < 60; i++) {
    const key = `nextsplit_supps_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const raw = localStorage.getItem(key)
    if (!raw) { if (i > 0) break; d.setDate(d.getDate() - 1); continue }
    try {
      const parsed = JSON.parse(raw)
      const hasAny = Object.values(parsed).some(Boolean)
      if (!hasAny) { if (i > 0) break; d.setDate(d.getDate() - 1); continue }
      streak++
    } catch { break }
    d.setDate(d.getDate() - 1)
  }
  return streak
}

function SupplementTracker() {
  const key = suppTodayKey()
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) setChecked(JSON.parse(raw))
    } catch {}
    setLoaded(true)
  }, [key])

  function toggle(id: string) {
    const next = { ...checked, [id]: !checked[id] }
    setChecked(next)
    localStorage.setItem(key, JSON.stringify(next))
    // Update streak counter so profile RPG reads it
    const streak = computeSuppStreak()
    localStorage.setItem('nextsplit_supp_streak', String(streak))
  }

  const doneCount = SUPPLEMENTS.filter(s => checked[s.id]).length

  if (!loaded) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
        <span className="text-sm font-bold text-gray-900">💊 Supplements</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${doneCount === SUPPLEMENTS.length ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
          {doneCount}/{SUPPLEMENTS.length} today
        </span>
      </div>
      <div className="divide-y divide-gray-50">
        {SUPPLEMENTS.map(s => (
          <button key={s.id} onClick={() => toggle(s.id)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left">
            <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${checked[s.id] ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>
              {checked[s.id] && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <span className={`text-sm font-medium ${checked[s.id] ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                {s.label}
              </span>
              <span className="text-[10px] text-gray-400 ml-2">{s.dose}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10) }

function weekStartEnd(plan: { current_week: number; start_date: string } | null) {
  if (!plan) { const t = todayStr(); return { start: t, end: t } }
  const start = new Date(plan.start_date + 'T00:00:00')
  start.setDate(start.getDate() + (plan.current_week - 1) * 7)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

function weekDates(startStr: string): string[] {
  const dates: string[] = []
  const d = new Date(startStr + 'T00:00:00')
  for (let i = 0; i < 7; i++) {
    dates.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return dates
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function perPortion(recipe: Recipe, portions: number) {
  const mult = portions / recipe.servings
  return {
    kcal:    Math.round((recipe.kcal_total    ?? 0) * mult),
    protein: Math.round((recipe.protein_total ?? 0) * mult * 10) / 10,
    carbs:   Math.round((recipe.carbs_total   ?? 0) * mult * 10) / 10,
    fat:     Math.round((recipe.fat_total     ?? 0) * mult * 10) / 10,
  }
}

// ─── Macro Bar ─────────────────────────────────────────────────────────────

function MacroBar({ label, actual, target, colour }: {
  label: string; actual: number; target: number; colour: string
}) {
  const pct = target > 0 ? Math.min((actual / target) * 100, 110) : 0
  const over = pct > 100
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-0.5">
        <span className="text-gray-500 font-medium">{label}</span>
        <span className={`font-bold ${over ? 'text-red-500' : 'text-gray-700'}`}>
          {Math.round(actual)}{label === 'kcal' ? '' : 'g'}
          {target > 0 && <span className="font-normal text-gray-400">/{Math.round(target)}</span>}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-red-400' : colour}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}

// ─── Recipe Form Modal ─────────────────────────────────────────────────────

function RecipeFormModal({
  existing, onSave, onClose
}: {
  existing?: Recipe
  onSave: (data: Omit<Recipe, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(existing?.name ?? '')
  const [servings, setServings] = useState(existing?.servings ?? 2)
  const [kcal, setKcal] = useState(existing?.kcal_total?.toString() ?? '')
  const [protein, setProtein] = useState(existing?.protein_total?.toString() ?? '')
  const [carbs, setCarbs] = useState(existing?.carbs_total?.toString() ?? '')
  const [fat, setFat] = useState(existing?.fat_total?.toString() ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    existing?.ingredients ?? [{ name: '', quantity: 0, unit: 'g' }]
  )
  const [saving, setSaving] = useState(false)

  function addIngredient() {
    setIngredients(prev => [...prev, { name: '', quantity: 0, unit: 'g' }])
  }
  function removeIngredient(i: number) {
    setIngredients(prev => prev.filter((_, idx) => idx !== i))
  }
  function updateIngredient(i: number, field: keyof RecipeIngredient, value: string | number) {
    setIngredients(prev => prev.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing))
  }

  async function handleSave() {
    if (!name.trim() || servings < 1) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        servings,
        kcal_total: kcal ? Number(kcal) : null,
        protein_total: protein ? Number(protein) : null,
        carbs_total: carbs ? Number(carbs) : null,
        fat_total: fat ? Number(fat) : null,
        ingredients: ingredients.filter(i => i.name.trim()),
        notes: notes.trim() || null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="overflow-y-auto flex-1 p-6">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
          <h2 className="text-lg font-bold text-gray-900 mb-5">
            {existing ? 'Edit recipe' : 'New recipe'}
          </h2>

          {/* Name + servings */}
          <div className="space-y-4 mb-5">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Recipe name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Overnight oats"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Total servings <span className="text-gray-400 font-normal">(recipe makes this many portions)</span>
              </label>
              <div className="flex items-center gap-3">
                <button onClick={() => setServings(s => Math.max(1, s - 1))}
                  className="w-9 h-9 rounded-full bg-gray-100 text-gray-700 font-bold flex items-center justify-center">−</button>
                <span className="text-2xl font-bold text-gray-900 w-8 text-center">{servings}</span>
                <button onClick={() => setServings(s => s + 1)}
                  className="w-9 h-9 rounded-full bg-gray-100 text-gray-700 font-bold flex items-center justify-center">+</button>
                <span className="text-xs text-gray-400">portions</span>
              </div>
            </div>
          </div>

          {/* Macros — total for whole recipe */}
          <div className="mb-5">
            <label className="text-xs font-semibold text-gray-600 block mb-2">
              Macros <span className="text-gray-400 font-normal">(totals for entire recipe — app divides by servings)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'kcal total', val: kcal, set: setKcal, colour: 'bg-amber-50 border-amber-200' },
                { label: 'protein (g)', val: protein, set: setProtein, colour: 'bg-blue-50 border-blue-200' },
                { label: 'carbs (g)', val: carbs, set: setCarbs, colour: 'bg-green-50 border-green-200' },
                { label: 'fat (g)', val: fat, set: setFat, colour: 'bg-red-50 border-red-200' },
              ].map(({ label, val, set, colour }) => (
                <div key={label}>
                  <label className="text-[10px] text-gray-500 block mb-1">{label}</label>
                  <input type="number" value={val} onChange={e => set(e.target.value)}
                    placeholder="0"
                    className={`w-full border ${colour} rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0D9488]`} />
                </div>
              ))}
            </div>
            {servings > 0 && (kcal || protein || carbs || fat) && (
              <p className="text-[10px] text-gray-400 mt-2">
                Per portion: {kcal ? Math.round(Number(kcal)/servings) + ' kcal' : ''}
                {protein ? ' · ' + Math.round(Number(protein)/servings*10)/10 + 'g protein' : ''}
                {carbs ? ' · ' + Math.round(Number(carbs)/servings*10)/10 + 'g carbs' : ''}
                {fat ? ' · ' + Math.round(Number(fat)/servings*10)/10 + 'g fat' : ''}
              </p>
            )}
          </div>

          {/* Ingredients */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600">Ingredients</label>
              <button onClick={addIngredient}
                className="text-[11px] font-semibold text-[#0D9488]">+ Add</button>
            </div>
            <div className="space-y-2">
              {ingredients.map((ing, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)}
                    placeholder="Ingredient"
                    className="flex-1 border border-gray-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0D9488]" />
                  <input type="number" value={ing.quantity || ''} onChange={e => updateIngredient(i, 'quantity', Number(e.target.value))}
                    placeholder="Qty"
                    className="w-14 border border-gray-200 rounded-xl px-2 py-2 text-xs text-center focus:outline-none focus:ring-1 focus:ring-[#0D9488]" />
                  <select value={ing.unit} onChange={e => updateIngredient(i, 'unit', e.target.value)}
                    className="border border-gray-200 rounded-xl px-1.5 py-2 text-xs focus:outline-none">
                    {['g','ml','cup','tbsp','tsp','piece','slice'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  {ingredients.length > 1 && (
                    <button onClick={() => removeIngredient(i)}
                      className="text-gray-300 text-base leading-none">×</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-600 block mb-1">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Preparation notes, tips..."
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-[#0D9488]" />
          </div>
        </div>

        <div className="px-6 pb-6 pt-3 border-t border-gray-50 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !name.trim()}
            className="flex-1 py-3 rounded-xl bg-[#0D9488] text-white text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : existing ? 'Update' : 'Save recipe'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Assign Meal Modal ──────────────────────────────────────────────────────

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
                    className={`w-full text-left rounded-2xl border px-4 py-3 transition-all ${selected?.id === r.id ? 'border-[#0D9488] bg-teal-50' : 'border-gray-100 bg-white'}`}
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
                        <span className="text-[#0D9488] text-lg">✓</span>
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
            className="flex-1 py-3 rounded-xl bg-[#0D9488] text-white text-sm font-semibold disabled:opacity-50">
            {saving ? 'Adding…' : 'Add to plan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Day Meal Card ──────────────────────────────────────────────────────────

function DayMealCard({
  date, dayEntries, recipes, macroTargets, onAdd, onRemove, isToday
}: {
  date: string
  dayEntries: MealPlanEntryWithRecipe[]
  recipes: Recipe[]
  macroTargets: { kcal: number; protein: number; carbs: number; fat: number }
  onAdd: (slot: MealSlotId) => void
  onRemove: (id: string) => void
  isToday: boolean
}) {
  const [expanded, setExpanded] = useState(isToday)
  const totals = dayEntries.reduce((acc, e) => {
    const pp = perPortion(e.recipe, e.portions)
    return { kcal: acc.kcal + pp.kcal, protein: acc.protein + pp.protein, carbs: acc.carbs + pp.carbs, fat: acc.fat + pp.fat }
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 })

  const calPct = macroTargets.kcal > 0 ? Math.min(Math.round(totals.kcal / macroTargets.kcal * 100), 110) : 0

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden ${isToday ? 'border-[#0D9488] shadow-sm' : 'border-gray-100'}`}>
      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${isToday ? 'bg-[#0D9488] text-white' : 'bg-gray-100 text-gray-500'}`}>
          {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-gray-900">
            {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            {isToday && <span className="text-[#0D9488] ml-1.5">· Today</span>}
          </div>
          {dayEntries.length === 0 ? (
            <div className="text-[10px] text-gray-400">No meals planned</div>
          ) : (
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${calPct > 100 ? 'bg-red-400' : 'bg-[#0D9488]'}`} style={{ width: `${Math.min(calPct, 100)}%` }} />
              </div>
              <span className="text-[10px] text-gray-500">{Math.round(totals.kcal)} kcal</span>
            </div>
          )}
        </div>
        <div className={`text-gray-300 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-50">
          {/* Macro summary */}
          {dayEntries.length > 0 && macroTargets.kcal > 0 && (
            <div className="px-4 pt-3 pb-2 space-y-1.5">
              <MacroBar label="kcal" actual={totals.kcal} target={macroTargets.kcal} colour="bg-amber-400" />
              <div className="grid grid-cols-3 gap-2">
                <MacroBar label="protein" actual={totals.protein} target={macroTargets.protein} colour="bg-blue-400" />
                <MacroBar label="carbs" actual={totals.carbs} target={macroTargets.carbs} colour="bg-green-400" />
                <MacroBar label="fat" actual={totals.fat} target={macroTargets.fat} colour="bg-red-400" />
              </div>
            </div>
          )}

          {/* Meal slots */}
          <div className="divide-y divide-gray-50">
            {MEAL_SLOTS.map(slot => {
              const slotEntries = dayEntries.filter(e => e.meal_slot === slot.id)
              return (
                <div key={slot.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                      {slot.emoji} {slot.label}
                    </span>
                    <button onClick={() => onAdd(slot.id as MealSlotId)}
                      className="text-[10px] font-semibold text-[#0D9488]">+ Add</button>
                  </div>
                  {slotEntries.length === 0 ? (
                    <p className="text-[10px] text-gray-300 italic">Nothing planned</p>
                  ) : (
                    <div className="space-y-1">
                      {slotEntries.map(e => {
                        const pp = perPortion(e.recipe, e.portions)
                        return (
                          <div key={e.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-800 truncate">{e.recipe.name}</p>
                              <p className="text-[10px] text-gray-400">
                                {e.portions}x portion{e.portions !== 1 ? 's' : ''}
                                {pp.kcal > 0 && ` · ${pp.kcal} kcal`}
                                {pp.protein > 0 && ` · ${pp.protein}g P`}
                              </p>
                            </div>
                            <button onClick={() => onRemove(e.id)}
                              className="text-gray-300 text-xl leading-none ml-2">×</button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Shopping List ──────────────────────────────────────────────────────────

function ShoppingList({ entries }: { entries: MealPlanEntryWithRecipe[] }) {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)

  const aggregated = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; unit: string; category: string }>()
    for (const e of entries) {
      const mult = e.portions / e.recipe.servings
      for (const ing of (e.recipe.ingredients ?? [])) {
        if (!ing.name.trim()) continue
        const key = `${ing.name.toLowerCase()}::${ing.unit}`
        const existing = map.get(key)
        if (existing) {
          existing.quantity += ing.quantity * mult
        } else {
          map.set(key, {
            name: ing.name,
            quantity: ing.quantity * mult,
            unit: ing.unit,
            category: inferCategory(ing.name),
          })
        }
      }
    }
    return [...map.values()].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
  }, [entries])

  const categories = [...new Set(aggregated.map(i => i.category))]

  function copyList() {
    const text = categories.map(cat => {
      const items = aggregated.filter(i => i.category === cat)
      return `${cat}:\n${items.map(i => `  ${formatQty(i.quantity)} ${i.unit} ${i.name}`).join('\n')}`
    }).join('\n\n')
    navigator.clipboard.writeText('Shopping list:\n\n' + text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  if (aggregated.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
        <div className="text-3xl mb-2">🛒</div>
        <p className="text-sm text-gray-500">Assign meals to days to generate your shopping list.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
        <div>
          <span className="text-sm font-bold text-gray-900">🛒 Shopping list</span>
          <span className="text-[10px] text-gray-400 ml-2">{aggregated.length} items</span>
        </div>
        <button onClick={copyList}
          className="text-[11px] font-semibold text-[#0D9488]">
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
      </div>
      <div className="px-4 py-3 space-y-4">
        {categories.map(cat => (
          <div key={cat}>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">{cat}</div>
            <div className="space-y-1.5">
              {aggregated.filter(i => i.category === cat).map((item, idx) => {
                const key = `${item.name}::${item.unit}`
                const done = checked.has(key)
                return (
                  <button key={idx} onClick={() => setChecked(s => {
                    const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n
                  })}
                    className="w-full flex items-center gap-3 text-left">
                    <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${done ? 'border-[#0D9488] bg-[#0D9488]' : 'border-gray-300'}`}>
                      {done && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className={`text-sm flex-1 ${done ? 'line-through text-gray-300' : 'text-gray-700'}`}>
                      {item.name}
                    </span>
                    <span className={`text-xs ${done ? 'text-gray-300' : 'text-gray-400'}`}>
                      {formatQty(item.quantity)} {item.unit}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatQty(q: number): string {
  const r = Math.round(q * 10) / 10
  return r % 1 === 0 ? r.toString() : r.toFixed(1)
}

function inferCategory(name: string): string {
  const n = name.toLowerCase()
  if (/chicken|beef|salmon|tuna|turkey|egg|pork|lamb|fish|shrimp|prawn/.test(n)) return '🥩 Protein'
  if (/milk|yogurt|cheese|cream|butter|whey/.test(n)) return '🥛 Dairy'
  if (/rice|pasta|oat|bread|flour|quinoa|noodle|potato|sweet potato/.test(n)) return '🌾 Carbs'
  if (/spinach|kale|broccoli|carrot|tomato|lettuce|pepper|onion|garlic|cucumber|courgette|zucchini|mushroom|celery|pea|bean|lentil/.test(n)) return '🥦 Produce'
  if (/banana|apple|orange|berry|berries|mango|blueberry|strawberry/.test(n)) return '🍎 Fruit'
  if (/olive oil|coconut oil|avocado|nut|seed|almond|walnut|peanut/.test(n)) return '🥑 Fats'
  if (/protein powder|creatine|supplement|vitamin/.test(n)) return '💊 Supplements'
  return '🥫 Pantry'
}

// ─── Recipe Card ──────────────────────────────────────────────────────────

function RecipeCard({
  recipe, onEdit, onDelete, onDuplicate
}: {
  recipe: Recipe
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const pp = perPortion(recipe, 1)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-xl flex-shrink-0">🍽️</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">{recipe.name}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {recipe.servings} servings
            {pp.kcal > 0 && ` · ${pp.kcal} kcal`}
            {pp.protein > 0 && ` · ${pp.protein}g P`}
            {pp.carbs > 0 && ` · ${pp.carbs}g C`}
            {pp.fat > 0 && ` · ${pp.fat}g F`}
          </p>
        </div>
        <div className={`text-gray-300 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-50 px-4 py-3 space-y-3">
          {/* Macros per portion */}
          {(pp.kcal > 0 || pp.protein > 0) && (
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: 'kcal', val: pp.kcal, colour: 'text-amber-600' },
                { label: 'protein', val: pp.protein + 'g', colour: 'text-blue-600' },
                { label: 'carbs', val: pp.carbs + 'g', colour: 'text-green-600' },
                { label: 'fat', val: pp.fat + 'g', colour: 'text-red-500' },
              ].map(m => (
                <div key={m.label} className="text-center bg-gray-50 rounded-xl py-2">
                  <div className={`text-sm font-bold ${m.colour}`}>{m.val}</div>
                  <div className="text-[9px] text-gray-400">{m.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Ingredients */}
          {recipe.ingredients?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Ingredients</p>
              <div className="space-y-1">
                {recipe.ingredients.map((ing, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-700">{ing.name}</span>
                    <span className="text-gray-400">{formatQty(ing.quantity)} {ing.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recipe.notes && (
            <p className="text-xs text-gray-500 italic leading-relaxed">{recipe.notes}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={onEdit}
              className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600">
              Edit
            </button>
            <button onClick={onDuplicate}
              className="flex-1 py-2 rounded-xl border border-blue-100 text-xs font-semibold text-blue-600">
              Duplicate
            </button>
            {confirmDelete ? (
              <div className="flex gap-1 flex-1">
                <button onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500">
                  Cancel
                </button>
                <button onClick={() => { setConfirmDelete(false); onDelete() }}
                  className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-bold">
                  Delete
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="flex-1 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-500">
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── TDEE Setup Card ──────────────────────────────────────────────────────────

function TDEESetupCard({ onSave }: { onSave: (h: number, a: number, s: 'male' | 'female') => void }) {
  const [open, setOpen] = useState(false)
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState<'male' | 'female'>('male')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const h = localStorage.getItem('nextsplit_tdee_height')
    const a = localStorage.getItem('nextsplit_tdee_age')
    const s = localStorage.getItem('nextsplit_tdee_sex') as 'male' | 'female' | null
    if (h) setHeight(h)
    if (a) setAge(a)
    if (s) setSex(s)
    if (h && a && s) {
      setSaved(true)
      onSave(Number(h), Number(a), s)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave() {
    const h = Number(height)
    const a = Number(age)
    if (!h || !a || h < 100 || h > 250 || a < 10 || a > 100) return
    localStorage.setItem('nextsplit_tdee_height', String(h))
    localStorage.setItem('nextsplit_tdee_age', String(a))
    localStorage.setItem('nextsplit_tdee_sex', sex)
    onSave(h, a, sex)
    setSaved(true)
    setOpen(false)
  }

  if (saved && !open) {
    const h = localStorage.getItem('nextsplit_tdee_height')
    const a = localStorage.getItem('nextsplit_tdee_age')
    const s = localStorage.getItem('nextsplit_tdee_sex')
    return (
      <button onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-4 py-3 text-left">
        <div className="flex items-center gap-2">
          <span className="text-base">⚖️</span>
          <div>
            <p className="text-xs font-semibold text-gray-700">TDEE profile</p>
            <p className="text-[10px] text-gray-400">{s === 'female' ? 'Female' : 'Male'} · {h}cm · {a}yo</p>
          </div>
        </div>
        <span className="text-[10px] text-teal-600 font-semibold">Edit ✎</span>
      </button>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-teal-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">⚖️</span>
          <div>
            <p className="text-sm font-bold text-gray-900">Calorie profile</p>
            <p className="text-[10px] text-gray-400">For accurate TDEE calculation</p>
          </div>
        </div>
        {saved && <button onClick={() => setOpen(false)} className="text-gray-300 text-lg">×</button>}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Height (cm)</label>
          <input
            type="number" inputMode="numeric" value={height}
            onChange={e => setHeight(e.target.value)}
            placeholder="175"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Age</label>
          <input
            type="number" inputMode="numeric" value={age}
            onChange={e => setAge(e.target.value)}
            placeholder="30"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Sex</label>
        <div className="flex gap-2">
          {(['male', 'female'] as const).map(s => (
            <button key={s} onClick={() => setSex(s)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${sex === s ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {s === 'male' ? '♂ Male' : '♀ Female'}
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleSave}
        className="w-full py-2.5 rounded-xl bg-teal-500 text-white text-sm font-bold">
        Save profile
      </button>
    </div>
  )
}

// ─── AI Fuel Coach Card ───────────────────────────────────────────────────────

function AIFuelCoach({
  dayType, targets, totals, planName
}: {
  dayType: string
  targets: { kcal: number; protein: number; carbs: number; fat: number }
  totals: { kcal: number; protein: number; carbs: number; fat: number }
  planName: string
}) {
  const [tip, setTip] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  // Cache key so we don't re-call on every render
  const cacheKey = `nextsplit_fuel_tip_${new Date().toISOString().slice(0, 10)}_${dayType}`

  useEffect(() => {
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) { setTip(cached); return }
  }, [cacheKey])

  async function fetchTip() {
    setLoading(true)
    setError(false)
    try {
      const kcalGap = targets.kcal > 0 ? targets.kcal - Math.round(totals.kcal) : null
      const prompt = `You are a sports nutrition coach for a runner. Give ONE specific, practical nutrition tip for today.

Context:
- Training day type: ${dayType}
- Plan: ${planName || 'Running plan'}
- Calorie target: ${targets.kcal > 0 ? targets.kcal + ' kcal' : 'not set'}
- Protein target: ${targets.protein > 0 ? targets.protein + 'g' : 'not set'}
- Carbs target: ${targets.carbs > 0 ? targets.carbs + 'g' : 'not set'}
${kcalGap !== null && kcalGap > 0 ? `- Still ${kcalGap} kcal to eat today` : ''}
${kcalGap !== null && kcalGap < 0 ? `- Already ${Math.abs(kcalGap)} kcal over target` : ''}

Rules:
- One tip only, 1-2 sentences max
- Be specific (mention actual foods or timings)
- Tailor to the day type (rest day vs long run vs intervals etc)
- No preamble, no "Great question!", just the tip
- Start with an action verb`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 120,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await res.json()
      const text = data.content?.[0]?.text?.trim()
      if (text) {
        setTip(text)
        sessionStorage.setItem(cacheKey, text)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (!tip && !loading) {
    return (
      <button onClick={fetchTip}
        className="w-full flex items-center gap-3 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl p-4 text-left">
        <span className="text-2xl flex-shrink-0">🧠</span>
        <div className="flex-1">
          <p className="text-white text-xs font-bold">AI Nutrition Coach</p>
          <p className="text-teal-100 text-[10px] mt-0.5">Tap for today&apos;s personalised fuel tip</p>
        </div>
        <span className="text-white text-lg">›</span>
      </button>
    )
  }

  return (
    <div className="bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🧠</span>
        <span className="text-white text-xs font-bold">AI Nutrition Coach</span>
        <span className="text-teal-200 text-[9px] ml-auto">Today · {dayType}</span>
      </div>
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-3 h-3 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-3 h-3 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      ) : error ? (
        <div className="flex items-center justify-between">
          <p className="text-teal-100 text-xs">Couldn&apos;t load tip right now.</p>
          <button onClick={fetchTip} className="text-white text-xs font-bold underline">Retry</button>
        </div>
      ) : (
        <div>
          <p className="text-white text-sm leading-relaxed">{tip}</p>
          <button onClick={() => { setTip(null); sessionStorage.removeItem(cacheKey) }}
            className="text-teal-200 text-[10px] mt-2 font-medium">
            ↻ New tip
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Calorie Ring ─────────────────────────────────────────────────────────────

function CalorieRing({ actual, target }: { actual: number; target: number }) {
  const pct = target > 0 ? Math.min(actual / target, 1) : 0
  const r = 34
  const circ = 2 * Math.PI * r
  const dash = pct * circ
  const colour = pct > 1.05 ? '#EF4444' : pct >= 0.9 ? '#10B981' : '#0D9488'

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20">
        <svg width="80" height="80" className="-rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#f3f4f6" strokeWidth="7" />
          <circle cx="40" cy="40" r={r} fill="none" stroke={colour} strokeWidth="7"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-black text-gray-900">{target > 0 ? Math.round(actual) : '—'}</span>
          <span className="text-[8px] text-gray-400">kcal</span>
        </div>
      </div>
      {target > 0 && (
        <span className="text-[9px] text-gray-400 mt-0.5">of {target}</span>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NutritionClient() {
  const { plan, weeks, loading: planLoading } = useActivePlan()
  const { profile, loading: profileLoading } = useProfile()
  const { recipes, createRecipe, updateRecipe, deleteRecipe, duplicateRecipe } = useRecipes()
  const { success: toastSuccess, error: toastError } = useToast()

  const { start, end } = useMemo(() => weekStartEnd(plan), [plan])
  const dates = useMemo(() => weekDates(start), [start])
  const todayDate = todayStr()

  const { byDate, assignMeal, removeMeal } = useMealPlan(start, end)

  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'recipes'>('today')
  const [showRecipeForm, setShowRecipeForm] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [assigningSlot, setAssigningSlot] = useState<{ date: string; slot: MealSlotId } | null>(null)
  const [tdee, setTdee] = useState<{ height: number; age: number; sex: 'male' | 'female' } | null>(null)

  function getMacroTargets(date: string) {
    if (!profile?.weight_kg) return { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    const d = new Date(date + 'T00:00:00')
    const dayI = d.getDay() === 0 ? 6 : d.getDay() - 1
    const currentWeekN = plan?.current_week ?? 1
    const week = weeks.find(w => w.n === currentWeekN)
    const sessions = week?.days?.[dayI]?.sessions ?? []
    const dayType = getDayType(sessions)
    const cfg = DAY_TYPE_CONFIG[dayType]
    const kcal = calcCalories(
      profile.weight_kg,
      dayType,
      tdee?.height,
      tdee?.age,
      tdee?.sex
    )
    return {
      kcal,
      protein: Math.round(kcal * cfg.protein / 100 / 4),
      carbs:   Math.round(kcal * cfg.carbs   / 100 / 4),
      fat:     Math.round(kcal * cfg.fat     / 100 / 9),
    }
  }

  const todayEntries = byDate[todayDate] ?? []
  const todayTargets = getMacroTargets(todayDate)
  const todayTotals = todayEntries.reduce((acc, e) => {
    const pp = perPortion(e.recipe, e.portions)
    return { kcal: acc.kcal + pp.kcal, protein: acc.protein + pp.protein, carbs: acc.carbs + pp.carbs, fat: acc.fat + pp.fat }
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 })

  // Day type for AI coach
  const todayDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  const todayWeek = weeks.find(w => w.n === (plan?.current_week ?? 1))
  const todaySessions = todayWeek?.days?.[todayDayIndex]?.sessions ?? []
  const todayDayType = getDayType(todaySessions)
  const todayDayTypeLabel = DAY_TYPE_CONFIG[todayDayType].label

  const allWeekEntries = Object.values(byDate).flat()

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-0 sticky top-0 z-40">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-900">Fuel</h1>
            <DarkModeToggle />
          </div>
          <div className="flex border-b border-gray-100">
            {(['today', 'week', 'recipes'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-[12px] font-semibold border-b-2 transition-colors capitalize ${
                  activeTab === tab ? 'border-[#0D9488] text-[#0D9488]' : 'border-transparent text-gray-400'
                }`}>
                {tab === 'today' ? 'Today' : tab === 'week' ? 'This Week' : 'Recipes'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">

        {/* Loading state */}
        {(planLoading || profileLoading) && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {/* No plan state — prompt to choose one */}
        {!planLoading && !plan && activeTab === 'today' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <div className="text-4xl mb-3">🍽️</div>
            <h2 className="text-base font-bold text-gray-900 mb-2">Fuel your training</h2>
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
              Calorie targets, macro tracking, and AI nutrition tips are tailored to your training plan.
              Choose a plan first to unlock personalised fuel guidance.
            </p>
            <a href="/onboarding"
              className="inline-block bg-[#0D9488] text-white px-6 py-2.5 rounded-xl text-sm font-semibold">
              Choose a plan →
            </a>
          </div>
        )}

        {/* Main content — only when not loading */}
        {!planLoading && !profileLoading && (plan || activeTab === 'recipes') && (<>
        {activeTab === 'today' && (
          <>
            {/* AI Fuel Coach */}
            <AIFuelCoach
              dayType={todayDayTypeLabel}
              targets={todayTargets}
              totals={todayTotals}
              planName={plan?.name ?? ''}
            />

            {/* Macro summary — ring + bars */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-900">Today&apos;s macros</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${DAY_TYPE_CONFIG[todayDayType].colour} ${DAY_TYPE_CONFIG[todayDayType].text}`}>
                  {DAY_TYPE_CONFIG[todayDayType].emoji} {todayDayTypeLabel}
                </span>
              </div>

              {/* Calorie ring + macro grid */}
              <div className="flex items-center gap-4 mb-3">
                <CalorieRing actual={todayTotals.kcal} target={todayTargets.kcal} />
                <div className="flex-1 space-y-2">
                  {[
                    { label: 'Protein', actual: Math.round(todayTotals.protein), target: todayTargets.protein, colour: 'bg-blue-400', unit: 'g' },
                    { label: 'Carbs',   actual: Math.round(todayTotals.carbs),   target: todayTargets.carbs,   colour: 'bg-green-400', unit: 'g' },
                    { label: 'Fat',     actual: Math.round(todayTotals.fat),     target: todayTargets.fat,     colour: 'bg-amber-400', unit: 'g' },
                  ].map(m => (
                    <div key={m.label}>
                      <div className="flex justify-between text-[9px] text-gray-500 mb-0.5">
                        <span className="font-semibold">{m.label}</span>
                        <span>{m.actual}/{m.target}{m.unit}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${m.colour} rounded-full transition-all`}
                          style={{ width: `${m.target > 0 ? Math.min((m.actual / m.target) * 100, 100) : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {!profile?.weight_kg ? (
                <p className="text-[10px] text-gray-400">Add your weight in Settings to see calorie targets.</p>
              ) : (
                <p className="text-[10px] text-gray-400">{DAY_TYPE_CONFIG[todayDayType].note}</p>
              )}
            </div>

            {/* TDEE profile card */}
            <TDEESetupCard onSave={(h, a, s) => setTdee({ height: h, age: a, sex: s })} />

            {/* Supplement tracker */}
            <SupplementTracker />

            {/* Today's meal slots */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <span className="text-sm font-bold text-gray-900">Today&apos;s meals</span>
              </div>
              <div className="divide-y divide-gray-50">
                {MEAL_SLOTS.map(slot => {
                  const slotEntries = todayEntries.filter(e => e.meal_slot === slot.id)
                  return (
                    <div key={slot.id} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                          {slot.emoji} {slot.label}
                        </span>
                        <button onClick={() => setAssigningSlot({ date: todayDate, slot: slot.id as MealSlotId })}
                          className="text-[11px] font-semibold text-[#0D9488]">+ Add</button>
                      </div>
                      {slotEntries.length === 0 ? (
                        <p className="text-[10px] text-gray-300 italic">Nothing planned</p>
                      ) : (
                        <div className="space-y-1.5">
                          {slotEntries.map(e => {
                            const pp = perPortion(e.recipe, e.portions)
                            return (
                              <div key={e.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-gray-800 truncate">{e.recipe.name}</p>
                                  <p className="text-[10px] text-gray-400">
                                    {e.portions}x · {pp.kcal > 0 ? `${pp.kcal} kcal` : ''}{pp.protein > 0 ? ` · ${pp.protein}g P` : ''}
                                  </p>
                                </div>
                                <button onClick={() => removeMeal(e.id)}
                                  className="text-gray-300 text-lg leading-none">×</button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* WEEK TAB */}
        {activeTab === 'week' && (
          <>
            <ShoppingList entries={allWeekEntries} />
            {dates.map(date => (
              <DayMealCard
                key={date}
                date={date}
                dayEntries={byDate[date] ?? []}
                recipes={recipes}
                macroTargets={getMacroTargets(date)}
                onAdd={slot => setAssigningSlot({ date, slot })}
                onRemove={removeMeal}
                isToday={date === todayDate}
              />
            ))}
          </>
        )}

        {/* RECIPES TAB */}
        {activeTab === 'recipes' && (
          <>
            <button onClick={() => { setEditingRecipe(null); setShowRecipeForm(true) }}
              className="w-full py-3 rounded-2xl bg-[#0D9488] text-white text-sm font-semibold active:scale-95 transition-transform">
              + New recipe
            </button>
            {recipes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <div className="text-4xl mb-3">📖</div>
                <p className="text-sm font-bold text-gray-900 mb-2">Build your recipe book</p>
                <p className="text-xs text-gray-500 leading-relaxed mb-5">
                  Add your go-to meals and they&apos;ll appear when planning your weekly nutrition.
                  Start with your usual breakfast or pre-run snack.
                </p>
                <button
                  onClick={() => { setEditingRecipe(null); setShowRecipeForm(true) }}
                  className="inline-block bg-[#0D9488] text-white px-5 py-2 rounded-xl text-sm font-semibold">
                  Add first recipe →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {recipes.map(r => (
                  <RecipeCard key={r.id} recipe={r}
                    onEdit={() => { setEditingRecipe(r); setShowRecipeForm(true) }}
                    onDelete={async () => {
                      try {
                        await deleteRecipe(r.id)
                        toastSuccess('Recipe deleted')
                      } catch {
                        toastError('Failed to delete recipe')
                      }
                    }}
                    onDuplicate={async () => {
                      try {
                        await duplicateRecipe(r)
                        toastSuccess('Recipe duplicated')
                      } catch {
                        toastError('Failed to duplicate recipe')
                      }
                    }} />
                ))}
              </div>
            )}
          </>
        )}
        </>)}{/* end main content fragment */}

      </div>

      {/* Modals */}
      {showRecipeForm && (
        <RecipeFormModal
          existing={editingRecipe ?? undefined}
          onSave={async data => {
            try {
              if (editingRecipe) await updateRecipe(editingRecipe.id, data)
              else await createRecipe(data)
              toastSuccess(editingRecipe ? 'Recipe updated' : 'Recipe saved')
            } catch {
              toastError('Failed to save recipe — check your connection')
              throw new Error('save failed') // keep modal open
            }
          }}
          onClose={() => { setShowRecipeForm(false); setEditingRecipe(null) }}
        />
      )}

      {assigningSlot && (
        <AssignMealModal
          date={assigningSlot.date}
          slot={assigningSlot.slot}
          recipes={recipes}
          onAssign={async (recipeId, portions) => {
            try {
              await assignMeal({ plan_date: assigningSlot.date, meal_slot: assigningSlot.slot, recipe_id: recipeId, portions })
              toastSuccess('Meal added')
              setAssigningSlot(null)
            } catch {
              toastError('Failed to add meal')
            }
          }}
          onClose={() => setAssigningSlot(null)}
        />
      )}
    </div>
  )
}
