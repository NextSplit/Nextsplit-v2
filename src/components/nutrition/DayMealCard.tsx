'use client'

import { useState } from 'react'
import { MEAL_SLOTS, type MealSlotId } from '@/types/database'
import type { Recipe, MealPlanEntryWithRecipe } from '@/types/database'
import { perPortion } from '@/lib/nutritionUtils'
import MacroBar from '@/components/nutrition/MacroBar'

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
    <div className={`bg-white rounded-2xl border overflow-hidden ${isToday ? 'border-[var(--ns-ember)] shadow-sm' : 'border-gray-100'}`}>
      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${isToday ? 'bg-[var(--ns-ember)] text-white' : 'bg-gray-100 text-gray-500'}`}>
          {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-gray-900">
            {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            {isToday && <span className="text-[var(--ns-ember)] ml-1.5">· Today</span>}
          </div>
          {dayEntries.length === 0 ? (
            <div className="text-[10px] text-gray-400">No meals planned</div>
          ) : (
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${calPct > 100 ? 'bg-red-400' : 'bg-[var(--ns-ember)]'}`} style={{ width: `${Math.min(calPct, 100)}%` }} />
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
                      className="text-[10px] font-semibold text-[var(--ns-ember)]">+ Add</button>
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


export default DayMealCard
