'use client'

import { useState, useEffect, useMemo } from 'react'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useProfile } from '@/hooks/useProfile'
import { useTrainingLog } from '@/hooks/useTrainingLog'
import { offsetDate, formatDate, decodeHtml, getSessionType } from '@/lib/sessionUtils'
import type { NutritionEvent, PlanDay, PlanSession } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

const CAT_CONFIG: Record<string, { label: string; colour: string; text: string; icon: string }> = {
  food:      { label: 'Food',      colour: 'bg-green-50',  text: 'text-green-700',  icon: '🍽️' },
  hydration: { label: 'Hydration', colour: 'bg-blue-50',   text: 'text-blue-700',   icon: '💧' },
  fuel:      { label: 'Fuel',      colour: 'bg-orange-50', text: 'text-orange-700', icon: '⚡' },
  macro:     { label: 'Macros',    colour: 'bg-purple-50', text: 'text-purple-700', icon: '📊' },
  info:      { label: 'Note',      colour: 'bg-gray-50',   text: 'text-gray-600',   icon: 'ℹ️' },
}
function getCat(cat: string) { return CAT_CONFIG[cat] ?? CAT_CONFIG['info'] }

// ─── Day Type Detection ───────────────────────────────────────────────────────

type DayType = 'rest' | 'easy' | 'quality' | 'long' | 'race'

function getDayType(sessions: PlanSession[]): DayType {
  if (sessions.length === 0) return 'rest'
  const codes = sessions.map(s => s.c)
  if (codes.some(c => c === 'run-race')) return 'race'
  const totalKm = sessions.reduce((a, s) => a + (s.km || 0), 0)
  if (codes.some(c => c === 'run-long') || totalKm >= 16) return 'long'
  if (codes.some(c => c === 'run-tempo' || c === 'run-int' || c === 'run-mp')) return 'quality'
  return 'easy'
}

const DAY_TYPE_CONFIG: Record<DayType, {
  label: string; emoji: string; colour: string; text: string
  cals: number; carbs: number; protein: number; fat: number
  note: string
}> = {
  rest:    { label: 'Rest Day',      emoji: '😴', colour: 'bg-gray-50',    text: 'text-gray-600',   cals: 1.0, carbs: 45, protein: 25, fat: 30, note: 'Focus on protein and vegetables. Lower carbs today.' },
  easy:    { label: 'Easy Run',      emoji: '🟢', colour: 'bg-emerald-50', text: 'text-emerald-700', cals: 1.3, carbs: 50, protein: 20, fat: 30, note: 'Moderate carbs. Hydrate well before and after.' },
  quality: { label: 'Quality Day',   emoji: '🟠', colour: 'bg-orange-50',  text: 'text-orange-700', cals: 1.5, carbs: 60, protein: 20, fat: 20, note: 'Carb-up today. Quality fuel = quality performance.' },
  long:    { label: 'Long Run',      emoji: '🔵', colour: 'bg-blue-50',    text: 'text-blue-700',   cals: 1.7, carbs: 65, protein: 20, fat: 15, note: 'High carbs. Have gels ready. Big recovery meal after.' },
  race:    { label: 'Race Day! 🏁',  emoji: '🏆', colour: 'bg-yellow-50',  text: 'text-yellow-700', cals: 1.6, carbs: 65, protein: 20, fat: 15, note: 'Familiar foods only. Nothing new on race day.' },
}

// BMR using Mifflin-St Jeor (simplified — gender-neutral midpoint)
function calcCalories(weightKg: number, dayType: DayType): number {
  const bmr = 10 * weightKg + 6.25 * 170 - 5 * 30 + 50 // ~170cm, 30yo estimate
  return Math.round(bmr * DAY_TYPE_CONFIG[dayType].cals / 100) * 100
}

// ─── Supplement Tracker ───────────────────────────────────────────────────────

const SUPPLEMENTS = [
  { id: 'magnesium',  label: 'Magnesium',   emoji: '🪨', note: 'Recovery + sleep' },
  { id: 'vitamin_d',  label: 'Vitamin D',   emoji: '☀️', note: 'Immune + bone' },
  { id: 'omega3',     label: 'Omega-3',     emoji: '🐟', note: 'Inflammation' },
  { id: 'iron',       label: 'Iron',        emoji: '🔴', note: 'Endurance' },
  { id: 'electrolytes',label:'Electrolytes',emoji: '⚡', note: 'Hydration' },
  { id: 'protein',    label: 'Protein',     emoji: '💪', note: 'Recovery' },
]

function todayKey() { return new Date().toISOString().slice(0, 10) }

function SupplementTracker() {
  const storageKey = `nextsplit_supps_${todayKey()}`
  const [checked, setChecked] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) setChecked(new Set(JSON.parse(saved)))
    } catch { /* ignore */ }
  }, [storageKey])

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      localStorage.setItem(storageKey, JSON.stringify([...next]))
      return next
    })
  }

  const doneCount = checked.size
  const allDone = doneCount === SUPPLEMENTS.length

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
        <div>
          <span className="text-sm font-bold text-gray-900">Morning supplements</span>
          <span className="text-[10px] text-gray-400 ml-2">{doneCount}/{SUPPLEMENTS.length} today</span>
        </div>
        {allDone && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✓ All done</span>}
      </div>
      <div className="grid grid-cols-3 gap-0 divide-x divide-y divide-gray-50">
        {SUPPLEMENTS.map(s => {
          const done = checked.has(s.id)
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className={`flex flex-col items-center gap-1 py-3 px-2 transition-colors ${done ? 'bg-teal-50' : 'bg-white'}`}
            >
              <span className="text-xl">{s.emoji}</span>
              <span className={`text-[10px] font-semibold ${done ? 'text-teal-700' : 'text-gray-600'}`}>{s.label}</span>
              <span className="text-[9px] text-gray-400">{s.note}</span>
              {done && <span className="text-[9px] text-teal-500 font-bold">✓</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Calorie & Macro Card ─────────────────────────────────────────────────────

function DayFuelCard({ dayType, weightKg }: { dayType: DayType; weightKg: number | null }) {
  const cfg = DAY_TYPE_CONFIG[dayType]
  const cals = weightKg ? calcCalories(weightKg, dayType) : null
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`rounded-2xl border overflow-hidden ${cfg.colour} border-opacity-50`} style={{borderColor: 'rgba(0,0,0,0.06)'}}>
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center gap-3 px-4 py-3">
        <span className="text-2xl">{cfg.emoji}</span>
        <div className="flex-1 text-left">
          <div className={`text-sm font-bold ${cfg.text}`}>{cfg.label}</div>
          {cals && <div className="text-xs text-gray-500">{cals.toLocaleString()} kcal target</div>}
          {!cals && <div className="text-xs text-gray-400">Add weight in Profile for calorie targets</div>}
        </div>
        <div className={`text-gray-300 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Macro split */}
          {cals && (
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Macro targets</div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Carbs', pct: cfg.carbs, grams: Math.round(cals * cfg.carbs / 100 / 4), colour: 'bg-amber-400' },
                  { label: 'Protein', pct: cfg.protein, grams: Math.round(cals * cfg.protein / 100 / 4), colour: 'bg-blue-400' },
                  { label: 'Fat', pct: cfg.fat, grams: Math.round(cals * cfg.fat / 100 / 9), colour: 'bg-red-400' },
                ].map(m => (
                  <div key={m.label} className="bg-white rounded-xl p-2.5 text-center">
                    <div className={`h-1 ${m.colour} rounded-full mb-2`} style={{ width: `${m.pct}%` }} />
                    <div className="text-sm font-bold text-gray-900">{m.grams}g</div>
                    <div className="text-[9px] text-gray-400">{m.label} · {m.pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-gray-600 leading-relaxed">{cfg.note}</p>
        </div>
      )}
    </div>
  )
}

// ─── Hydration Tracker ────────────────────────────────────────────────────────

function HydrationTracker({ dateKey }: { dateKey: string }) {
  const storageKey = `hydration_${dateKey}`
  const [glasses, setGlasses] = useState(0)
  const goal = 8

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    setGlasses(saved ? Number(saved) : 0)
  }, [storageKey])

  function add() { const n = Math.min(glasses + 1, 12); setGlasses(n); localStorage.setItem(storageKey, String(n)) }
  function remove() { const n = Math.max(glasses - 1, 0); setGlasses(n); localStorage.setItem(storageKey, String(n)) }

  const pct = Math.min((glasses / goal) * 100, 100)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
        <div>
          <span className="text-sm font-bold text-gray-900">💧 Hydration</span>
          <span className="text-[10px] text-gray-400 ml-2">{glasses}/{goal} glasses</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={remove} className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 text-base font-bold flex items-center justify-center">−</button>
          <button onClick={add} className="w-7 h-7 rounded-full bg-blue-500 text-white text-base font-bold flex items-center justify-center">+</button>
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="grid grid-cols-8 gap-1">
          {Array.from({ length: goal }).map((_, i) => (
            <div key={i} className={`h-6 rounded-md transition-colors ${i < glasses ? 'bg-blue-400' : 'bg-gray-100'}`} />
          ))}
        </div>
        {glasses >= goal && <p className="text-[10px] text-blue-600 font-semibold text-center mt-1.5">Well hydrated today! 🎉</p>}
      </div>
    </div>
  )
}

// ─── Nutrition Entry Card ─────────────────────────────────────────────────────

function NutCard({ entry }: { entry: NutritionEvent }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = getCat(entry.cat)

  return (
    <button
      onClick={() => setExpanded(e => !e)}
      className={`w-full text-left rounded-2xl border transition-all overflow-hidden ${expanded ? 'border-gray-200 shadow-sm' : 'border-gray-100 bg-white'}`}
    >
      <div className="flex items-start gap-3 p-4">
        <div className={`w-9 h-9 rounded-xl ${cfg.colour} flex items-center justify-center flex-shrink-0 text-base`}>
          {cfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.text}`}>{cfg.label}</span>
            <span className="text-[10px] text-gray-400">{entry.t}</span>
          </div>
          <p className="text-sm font-semibold text-gray-900 leading-tight">{entry.l}</p>
          {entry.d && (
            <p className={`text-xs text-gray-500 mt-1 leading-relaxed ${expanded ? '' : 'line-clamp-1'}`}>
              {decodeHtml(entry.d)}
            </p>
          )}
        </div>
        {entry.d && entry.d.length > 60 && (
          <div className={`text-gray-300 transition-transform flex-shrink-0 mt-1 ${expanded ? 'rotate-180' : ''}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}
      </div>
    </button>
  )
}

// ─── Weekly Shopping List ─────────────────────────────────────────────────────

function ShoppingList({ weeks, currentWeekN }: { weeks: any[]; currentWeekN: number }) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  const items = useMemo(() => {
    const week = weeks.find(w => w.n === currentWeekN)
    if (!week) return []

    // Collect all nutrition entries for the week
    const allNut: NutritionEvent[] = week.days.flatMap((d: any) => d.nut ?? [])

    // Group by category, deduplicate by label
    const groups: Record<string, string[]> = { food: [], hydration: [], fuel: [], macro: [] }
    const seen = new Set<string>()

    for (const e of allNut) {
      const key = `${e.cat}::${e.l}`
      if (!seen.has(key)) {
        seen.add(key)
        const cat = e.cat in groups ? e.cat : 'food'
        groups[cat].push(e.l)
      }
    }

    return Object.entries(groups)
      .filter(([, items]) => items.length > 0)
      .map(([cat, items]) => ({ cat, items, cfg: getCat(cat) }))
  }, [weeks, currentWeekN])

  const allItems = items.flatMap(g => g.items.map(i => `• ${i}`)).join('\n')

  function copyList() {
    navigator.clipboard.writeText(`Week ${currentWeekN} shopping list:\n${allItems}`).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (items.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🛒</span>
          <span className="text-sm font-bold text-gray-900">Week {currentWeekN} shopping list</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">{items.reduce((a, g) => a + g.items.length, 0)} items</span>
          <div className={`text-gray-300 transition-transform ${open ? 'rotate-180' : ''}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {items.map(({ cat, items: catItems, cfg }) => (
            <div key={cat}>
              <div className={`text-[10px] font-bold uppercase tracking-wide ${cfg.text} mb-1.5 flex items-center gap-1`}>
                <span>{cfg.icon}</span> {cfg.label}
              </div>
              <div className="space-y-1">
                {catItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <div className="w-4 h-4 rounded border-2 border-gray-200 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={copyList}
            className="w-full py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 flex items-center justify-center gap-1.5"
          >
            {copied ? '✓ Copied!' : '📋 Copy list'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyNutrition({ isRestDay }: { isRestDay: boolean }) {
  return (
    <div className="text-center py-10 px-6">
      <div className="text-4xl mb-3">{isRestDay ? '😴' : '🍽️'}</div>
      <p className="text-sm font-semibold text-gray-700 mb-1">
        {isRestDay ? 'Rest day' : 'No nutrition data'}
      </p>
      <p className="text-xs text-gray-400">
        {isRestDay ? 'Focus on recovery. Protein and vegetables today.' : 'No fuel entries for this day.'}
      </p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NutritionClient() {
  const { plan, weeks, currentWeek, loading } = useActivePlan()
  const { profile } = useProfile()
  const { logs } = useTrainingLog(plan?.id ?? null)
  const [dateOffset, setDateOffset] = useState(0)
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeTab, setActiveTab] = useState<'today' | 'week'>('today')

  const viewDate = offsetDate(dateOffset)
  const isToday = dateOffset === 0
  const dateKey = viewDate.toISOString().split('T')[0]

  const dayOfWeek = viewDate.getDay()
  const planDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  // Calculate correct week based on dateOffset
  const weekOffset = Math.floor(dateOffset / 7) + (dateOffset < 0 && planDayIndex < (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1) ? -1 : 0)
  const viewWeekN = (plan?.current_week ?? 1) + weekOffset
  const viewWeek = weeks.find(w => w.n === viewWeekN) ?? currentWeek

  const planDay: PlanDay | null = viewWeek?.days[planDayIndex] ?? null
  const entries: NutritionEvent[] = planDay?.nut ?? []
  const sessions: PlanSession[] = planDay?.sessions ?? []
  const dayType = getDayType(sessions)
  const categories = [...new Set(entries.map(e => e.cat))]
  const filtered = activeFilter === 'all' ? entries : entries.filter(e => e.cat === activeFilter)

  if (!plan && !loading) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] pb-24 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="text-4xl mb-3">🍽️</div>
          <h2 className="text-base font-bold text-gray-900 mb-2">No active plan</h2>
          <p className="text-sm text-gray-500">Start a plan to see your nutrition guide.</p>
          <a href="/onboarding" className="mt-4 inline-block py-2.5 px-5 bg-[#0D9488] text-white rounded-xl text-sm font-semibold">
            Choose a plan
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-0">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-[15px] font-bold text-[#1a1a1a]">Fuel</h1>
          </div>

          {/* Tab switcher */}
          <div className="flex border-b border-gray-100">
            {(['today', 'week'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-[13px] font-semibold border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? 'border-[#0D9488] text-[#0D9488]'
                    : 'border-transparent text-gray-400'
                }`}
              >
                {tab === 'today' ? 'Today' : 'This Week'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">

        {activeTab === 'today' && (
          <>
            {/* Date navigation */}
            <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-4 py-2.5">
              <button onClick={() => setDateOffset(d => d - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-lg font-light">
                ‹
              </button>
              <span className="text-sm font-semibold text-gray-900">
                {isToday ? 'Today' : dateOffset === -1 ? 'Yesterday' : formatDate(viewDate)}
                {!isToday && viewWeekN !== plan?.current_week && (
                  <span className="text-[10px] text-gray-400 ml-1">· W{viewWeekN}</span>
                )}
              </span>
              <button onClick={() => setDateOffset(d => d + 1)}
                disabled={dateOffset >= 0}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-lg font-light disabled:opacity-30">
                ›
              </button>
            </div>

            {/* Supplement tracker — today only */}
            {isToday && <SupplementTracker />}

            {/* Day fuel card — calorie + macro targets */}
            <DayFuelCard dayType={dayType} weightKg={profile?.weight_kg ?? null} />

            {/* Hydration tracker */}
            <HydrationTracker dateKey={dateKey} />

            {/* Category filter */}
            {categories.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
                {['all', ...categories].map(cat => {
                  const cfg = getCat(cat)
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveFilter(cat)}
                      className={`flex-shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${
                        activeFilter === cat
                          ? 'bg-[#0D9488] text-white border-transparent'
                          : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      {cat === 'all' ? 'All' : cfg.label}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Nutrition entries */}
            {filtered.length > 0 ? (
              <div className="space-y-2">
                {filtered.map((entry, i) => <NutCard key={i} entry={entry} />)}
              </div>
            ) : (
              <EmptyNutrition isRestDay={sessions.length === 0} />
            )}
          </>
        )}

        {activeTab === 'week' && plan && (
          <>
            {/* Shopping list */}
            <ShoppingList weeks={weeks} currentWeekN={plan.current_week} />

            {/* Week overview — all days */}
            <div className="space-y-2">
              {(viewWeek ?? currentWeek)?.days.map((day: PlanDay, dayI: number) => {
                const daySessions = day.sessions
                const dayTypeForDay = getDayType(daySessions)
                const cfg = DAY_TYPE_CONFIG[dayTypeForDay]
                const nutCount = day.nut?.length ?? 0

                return (
                  <div key={dayI} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className="text-base">{cfg.emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">{day.d}</span>
                          <span className={`text-[10px] font-semibold ${cfg.text}`}>{cfg.label}</span>
                        </div>
                        {daySessions.length > 0 && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            {daySessions.map(s => {
                              const c = getSessionType(s.c)
                              return `${c.emoji} ${s.n}${s.km > 0 ? ` · ${s.km}km` : ''}`
                            }).join(' · ')}
                          </div>
                        )}
                      </div>
                      {nutCount > 0 && (
                        <span className="text-[10px] text-gray-400">{nutCount} tips</span>
                      )}
                    </div>
                    {day.nut && day.nut.length > 0 && (
                      <div className="border-t border-gray-50 px-4 py-2 space-y-1.5">
                        {day.nut.map((e: NutritionEvent, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[11px]">{getCat(e.cat).icon}</span>
                            <span className="text-xs text-gray-600"><span className="font-medium">{e.t}</span> · {e.l}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
