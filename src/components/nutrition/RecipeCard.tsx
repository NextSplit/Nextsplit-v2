'use client'

import { useState } from 'react'
import type { Recipe, RecipeIngredient, MealPlanEntryWithRecipe } from '@/types/database'
import { perPortion, formatQty, inferCategory } from '@/lib/nutritionUtils'

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
        <div className="w-10 h-10 rounded-xl bg-[var(--ns-forest-light)] flex items-center justify-center text-xl flex-shrink-0">🍽️</div>
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

export default RecipeCard
