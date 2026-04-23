'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useProfile } from '@/hooks/useProfile'
import { useRecipes } from '@/hooks/useRecipes'
import { useMealPlan } from '@/hooks/useMealPlan'
import { getDayType, DAY_TYPE_CONFIG, calcCalories } from '@/lib/nutrition'
import { MEAL_SLOTS, type MealSlotId } from '@/types/database'
import type { Recipe, MealPlanEntryWithRecipe } from '@/types/database'
import DarkModeToggle from '@/components/DarkModeToggle'
import { useActivityLog } from '@/hooks/useActivityLog'
import { useToast } from '@/components/Toast'
import SupplementTracker from '@/components/nutrition/SupplementTracker'
import MacroBar from '@/components/nutrition/MacroBar'
import RecipeFormModal from '@/components/nutrition/RecipeFormModal'
import AssignMealModal from '@/components/nutrition/AssignMealModal'
import DayMealCard from '@/components/nutrition/DayMealCard'
import ShoppingList from '@/components/nutrition/ShoppingList'
import RecipeCard from '@/components/nutrition/RecipeCard'
import TDEESetupCard from '@/components/nutrition/TDEESetupCard'
import AIFuelCoach from '@/components/nutrition/AIFuelCoach'
import CalorieRing from '@/components/nutrition/CalorieRing'

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
  const [tdee, setTdee] = useState<{ height: number; age: number; sex: 'male' | 'female' } | null>(() => {
    try {
      const stored = localStorage.getItem('nextsplit_tdee')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  function saveTdee(h: number, a: number, s: 'male' | 'female') {
    const data = { height: h, age: a, sex: s }
    setTdee(data)
    try { localStorage.setItem('nextsplit_tdee', JSON.stringify(data)) } catch {}
  }
  const { logs: activityLogs, extraCaloriesToday } = useActivityLog()

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
      tdee?.age ?? profile?.age ?? undefined,
      tdee?.sex
    )
    const extraKcal = date === new Date().toISOString().slice(0, 10)
      ? extraCaloriesToday(profile.weight_kg)
      : 0
    const totalKcal = kcal + extraKcal
    return {
      kcal: totalKcal,
      protein: Math.round(totalKcal * cfg.protein / 100 / 4),
      carbs:   Math.round(totalKcal * cfg.carbs   / 100 / 4),
      fat:     Math.round(totalKcal * cfg.fat     / 100 / 9),
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
    <div className="min-h-screen pb-24" style={{ background: "var(--color-bg)" }}>
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
                  activeTab === tab ? 'border-[var(--ns-forest)] text-[var(--ns-forest)]' : 'border-transparent text-gray-400'
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
              className="inline-block bg-[var(--ns-forest)] text-white px-6 py-2.5 rounded-xl text-sm font-semibold">
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
                <span className="text-sm font-bold text-gray-900">Today's macros</span>
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
            <TDEESetupCard onSave={saveTdee} />

            {/* Supplement tracker */}
            <SupplementTracker />

            {/* Today's meal slots */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <span className="text-sm font-bold text-gray-900">Today's meals</span>
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
                          className="text-[11px] font-semibold text-[var(--ns-forest)]">+ Add</button>
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

            {/* Cross-training today — shows if activity logged, adjusts calorie target */}
            {(() => {
              const todayStr = new Date().toISOString().slice(0, 10)
              const todayActivities = activityLogs.filter((l: { logged_at: string }) => l.logged_at === todayStr)
              if (todayActivities.length === 0) return null
              const extraKcal = extraCaloriesToday(profile?.weight_kg ?? 70)
              return (
                <div className="bg-[var(--ns-forest-light)] rounded-2xl border border-teal-100 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">🏅</span>
                    <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wide">Cross-training today</span>
                    {extraKcal > 0 && <span className="ml-auto text-[11px] font-bold text-[var(--ns-forest)]">+{extraKcal} kcal</span>}
                  </div>
                  <div className="space-y-1">
                    {todayActivities.map((a: { id: string; activity_type: string; duration_secs?: number | null; notes?: string | null }) => (
                      <div key={a.id} className="flex items-center gap-2 text-xs text-[var(--ns-forest)]">
                        <span>{a.activity_type === 'cycle' ? '🚴' : a.activity_type === 'swim' ? '🏊' : a.activity_type === 'walk' ? '🚶' : a.activity_type === 'hike' ? '🥾' : '🏅'}</span>
                        <span className="capitalize font-medium">{a.activity_type}</span>
                        {a.duration_secs && <span className="text-[var(--ns-forest-mid)]">{Math.round(a.duration_secs / 60)}min</span>}
                        {a.notes && <span className="text-[var(--ns-forest-mid)] truncate max-w-[120px]">{a.notes}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

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
              className="w-full py-3 rounded-2xl bg-[var(--ns-forest)] text-white text-sm font-semibold active:scale-95 transition-transform">
              + New recipe
            </button>
            {recipes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <div className="text-4xl mb-3">📖</div>
                <p className="text-sm font-bold text-gray-900 mb-2">Build your recipe book</p>
                <p className="text-xs text-gray-500 leading-relaxed mb-5">
                  Add your go-to meals and they'll appear when planning your weekly nutrition.
                  Start with your usual breakfast or pre-run snack.
                </p>
                <button
                  onClick={() => { setEditingRecipe(null); setShowRecipeForm(true) }}
                  className="inline-block bg-[var(--ns-forest)] text-white px-5 py-2 rounded-xl text-sm font-semibold">
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

