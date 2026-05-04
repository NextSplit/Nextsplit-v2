'use client'

import { useState } from 'react'
import { useRecipes } from '@/hooks/useRecipes'
import { useToast } from '@/components/Toast'
import type { Recipe, RecipeIngredient } from '@/types/database'

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
          <div className="w-10 h-1 bg-[var(--color-surface-3)] rounded-full mx-auto mb-5" />
          <h2 className="text-lg font-bold text-gray-900 mb-5">
            {existing ? 'Edit recipe' : 'New recipe'}
          </h2>

          {/* Name + servings */}
          <div className="space-y-4 mb-5">
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] block mb-1">Recipe name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Overnight oats"
                className="w-full border border-[var(--color-border-2)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ns-ember)]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] block mb-1">
                Total servings <span className="text-[var(--color-text-tertiary)] font-normal">(recipe makes this many portions)</span>
              </label>
              <div className="flex items-center gap-3">
                <button onClick={() => setServings(s => Math.max(1, s - 1))}
                  className="w-9 h-9 rounded-full bg-[var(--color-surface-2)] text-gray-700 font-bold flex items-center justify-center">−</button>
                <span className="text-2xl font-bold text-gray-900 w-8 text-center">{servings}</span>
                <button onClick={() => setServings(s => s + 1)}
                  className="w-9 h-9 rounded-full bg-[var(--color-surface-2)] text-gray-700 font-bold flex items-center justify-center">+</button>
                <span className="text-xs text-[var(--color-text-tertiary)]">portions</span>
              </div>
            </div>
          </div>

          {/* Macros — total for whole recipe */}
          <div className="mb-5">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)] block mb-2">
              Macros <span className="text-[var(--color-text-tertiary)] font-normal">(totals for entire recipe — app divides by servings)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'kcal total', val: kcal, set: setKcal, colour: 'bg-amber-50 border-amber-200' },
                { label: 'protein (g)', val: protein, set: setProtein, colour: 'bg-blue-50 border-blue-200' },
                { label: 'carbs (g)', val: carbs, set: setCarbs, colour: 'bg-green-50 border-green-200' },
                { label: 'fat (g)', val: fat, set: setFat, colour: 'bg-red-50 border-red-200' },
              ].map(({ label, val, set, colour }) => (
                <div key={label}>
                  <label className="text-[10px] text-[var(--color-text-tertiary)] block mb-1">{label}</label>
                  <input type="number" value={val} onChange={e => set(e.target.value)}
                    placeholder="0"
                    className={`w-full border ${colour} rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ns-ember)]`} />
                </div>
              ))}
            </div>
            {servings > 0 && (kcal || protein || carbs || fat) && (
              <p className="text-[10px] text-[var(--color-text-tertiary)] mt-2">
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
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Ingredients</label>
              <button onClick={addIngredient}
                className="text-[11px] font-semibold text-[var(--ns-ember)]">+ Add</button>
            </div>
            <div className="space-y-2">
              {ingredients.map((ing, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)}
                    placeholder="Ingredient"
                    className="flex-1 border border-[var(--color-border-2)] rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--ns-ember)]" />
                  <input type="number" value={ing.quantity || ''} onChange={e => updateIngredient(i, 'quantity', Number(e.target.value))}
                    placeholder="Qty"
                    className="w-14 border border-[var(--color-border-2)] rounded-xl px-2 py-2 text-xs text-center focus:outline-none focus:ring-1 focus:ring-[var(--ns-ember)]" />
                  <select value={ing.unit} onChange={e => updateIngredient(i, 'unit', e.target.value)}
                    className="border border-[var(--color-border-2)] rounded-xl px-1.5 py-2 text-xs focus:outline-none">
                    {['g','ml','cup','tbsp','tsp','piece','slice'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  {ingredients.length > 1 && (
                    <button aria-label="Close" onClick={() => removeIngredient(i)}
                      className="text-gray-300 text-base leading-none">×</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)] block mb-1">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Preparation notes, tips..."
              rows={2}
              className="w-full border border-[var(--color-border-2)] rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-[var(--ns-ember)]" />
          </div>
        </div>

        <div className="px-6 pb-6 pt-3 border-t border-[var(--color-border)] flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-[var(--color-border-2)] text-sm font-semibold text-[var(--color-text-secondary)]">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !name.trim()}
            className="flex-1 py-3 rounded-xl bg-[var(--ns-ember)] text-white text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : existing ? 'Update' : 'Save recipe'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Assign Meal Modal ──────────────────────────────────────────────────────


export default RecipeFormModal
