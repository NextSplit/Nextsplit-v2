'use client'

import { useState, useEffect } from 'react'
import { useActivePlan } from '@/hooks/useActivePlan'
import { offsetDate, formatDate, decodeHtml } from '@/lib/sessionUtils'
import type { NutritionEvent, PlanDay } from '@/types/database'

// ─── Hydration Tracker ────────────────────────────────────────────────────────

function HydrationTracker({ dateKey }: { dateKey: string }) {
  const storageKey = `hydration_${dateKey}`
  const [glasses, setGlasses] = useState(0)
  const goal = 8

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) setGlasses(Number(saved))
    else setGlasses(0)
  }, [storageKey])

  function add() {
    const next = Math.min(glasses + 1, 12)
    setGlasses(next)
    localStorage.setItem(storageKey, String(next))
  }
  function remove() {
    const next = Math.max(glasses - 1, 0)
    setGlasses(next)
    localStorage.setItem(storageKey, String(next))
  }

  const pct = Math.min((glasses / goal) * 100, 100)
  const done = glasses >= goal

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">💧</span>
          <span className="text-sm font-bold text-gray-900">Hydration</span>
        </div>
        <span className={`text-xs font-semibold ${done ? 'text-emerald-600' : 'text-gray-400'}`}>
          {glasses}/{goal} glasses{done ? ' ✓' : ''}
        </span>
      </div>
      {/* Glasses grid */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {Array.from({ length: goal }).map((_, i) => (
          <div key={i} className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all ${
            i < glasses ? 'bg-blue-100 text-blue-500' : 'bg-gray-100 text-gray-300'
          }`}>
            💧
          </div>
        ))}
      </div>
      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div className="h-full bg-blue-400 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex gap-2">
        <button onClick={remove} disabled={glasses === 0}
          className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 disabled:opacity-30">
          −
        </button>
        <button onClick={add}
          className="flex-2 flex-grow-[2] py-2 rounded-xl bg-blue-50 text-blue-600 text-sm font-semibold border border-blue-100">
          + Add glass
        </button>
      </div>
    </div>
  )
}

// ─── Category config ──────────────────────────────────────────────────────────

const CAT_CONFIG: Record<string, { label: string; colour: string; text: string; dot: string; icon: string }> = {
  food:      { label: 'Food',       colour: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-400',  icon: '🍽️' },
  hydration: { label: 'Hydration',  colour: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-400',   icon: '💧' },
  fuel:      { label: 'Fuel',       colour: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400', icon: '⚡' },
  macro:     { label: 'Macros',     colour: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400', icon: '📊' },
  info:      { label: 'Note',       colour: 'bg-gray-50',   text: 'text-gray-600',   dot: 'bg-gray-400',   icon: 'ℹ️' },
}

function getCat(cat: string) {
  return CAT_CONFIG[cat] ?? CAT_CONFIG['info']
}

// ─── Nutrition entry card ─────────────────────────────────────────────────────

function NutCard({ entry }: { entry: NutritionEvent }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = getCat(entry.cat)

  return (
    <button
      onClick={() => setExpanded(e => !e)}
      className={`w-full text-left rounded-2xl border transition-all overflow-hidden ${
        expanded ? 'border-gray-200 shadow-sm' : 'border-gray-100 bg-white'
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className={`w-9 h-9 rounded-xl ${cfg.colour} flex items-center justify-center flex-shrink-0 text-base`}>
          {cfg.icon}
        </div>

        <div className="flex-1 min-w-0">
          {/* Timing */}
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.text}`}>
              {cfg.label}
            </span>
            <span className="text-[10px] text-gray-400">{entry.t}</span>
          </div>
          {/* Label */}
          <p className="text-sm font-semibold text-gray-900 leading-tight">{entry.l}</p>
          {/* Detail — collapsed to 1 line, expanded to full */}
          {entry.d && (
            <p className={`text-xs text-gray-500 mt-1 leading-relaxed ${expanded ? '' : 'line-clamp-1'}`}>
              {decodeHtml(entry.d)}
            </p>
          )}
        </div>

        {/* Expand chevron */}
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

// ─── Category filter pills ────────────────────────────────────────────────────

function CategoryFilter({
  categories, active, onChange
}: {
  categories: string[]; active: string; onChange: (c: string) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <button
        onClick={() => onChange('all')}
        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
          active === 'all'
            ? 'bg-[#0D9488] text-white'
            : 'bg-white border border-gray-200 text-gray-600'
        }`}
      >
        All
      </button>
      {categories.map(cat => {
        const cfg = getCat(cat)
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
              active === cat
                ? `${cfg.colour} ${cfg.text} border border-transparent`
                : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            <span>{cfg.icon}</span>
            {cfg.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyNutrition({ isRestDay }: { isRestDay: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
      <div className="text-4xl mb-3">{isRestDay ? '😴' : '🥗'}</div>
      <p className="text-sm font-semibold text-gray-700">
        {isRestDay ? 'Rest day' : 'No nutrition data'}
      </p>
      <p className="text-xs text-gray-400 mt-1">
        {isRestDay
          ? 'Keep hydrated and eat well on rest days.'
          : 'Nutrition guidance will appear here once your plan is loaded.'}
      </p>
    </div>
  )
}

// ─── Day summary bar ──────────────────────────────────────────────────────────

function DaySummary({ entries }: { entries: NutritionEvent[] }) {
  const counts = entries.reduce((acc, e) => {
    acc[e.cat] = (acc[e.cat] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (entries.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center justify-between">
      <span className="text-xs font-semibold text-gray-700">{entries.length} entries today</span>
      <div className="flex items-center gap-2">
        {Object.entries(counts).map(([cat, count]) => {
          const cfg = getCat(cat)
          return (
            <div key={cat} className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${cfg.colour} ${cfg.text}`}>
              <span className="text-[10px]">{cfg.icon}</span>
              <span className="text-[10px] font-bold">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NutritionClient() {
  const { plan, weeks, currentWeek, loading } = useActivePlan()
  const [dateOffset, setDateOffset] = useState(0)
  const [activeFilter, setActiveFilter] = useState('all')

  const viewDate = offsetDate(dateOffset)
  const isToday = dateOffset === 0
  const dateKey = viewDate.toISOString().split('T')[0]

  // Map viewed date to plan day — accounting for which week we're viewing
  const dayOfWeek = viewDate.getDay()
  const planDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  // Calculate which week the viewed date falls in
  // Each week starts on Monday; offset by dateOffset determines the week
  const weekOffset = Math.floor(dateOffset / 7) + (dateOffset < 0 && planDayIndex < (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1) ? -1 : 0)
  const viewWeekN = (plan?.current_week ?? 1) + weekOffset
  const viewWeek = weeks.find(w => w.n === viewWeekN) ?? currentWeek

  const planDay: PlanDay | null = viewWeek?.days[planDayIndex] ?? null
  const entries: NutritionEvent[] = planDay?.nut ?? []

  // Available categories for filter
  const categories = [...new Set(entries.map(e => e.cat))]

  // Filtered entries
  const filtered = activeFilter === 'all' ? entries : entries.filter(e => e.cat === activeFilter)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] pb-24 pt-16">
        <div className="max-w-lg mx-auto px-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] pb-24 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="text-5xl mb-4">🥗</div>
          <h2 className="text-base font-bold text-gray-900 mb-2">No active plan</h2>
          <p className="text-sm text-gray-400 mb-5">Nutrition guidance lives inside your training plan.</p>
          <a href="/onboarding" className="inline-block bg-[#0D9488] text-white px-6 py-3 rounded-xl text-sm font-semibold">
            Choose a plan →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-900">Nutrition</h1>
            {plan && (
              <span className="text-xs text-gray-400">Week {plan.current_week}</span>
            )}
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setDateOffset(o => o - 1); setActiveFilter('all') }}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-lg font-light"
            >‹</button>
            <div className="flex-1 text-center">
              <div className="text-sm font-semibold text-gray-900">
                {isToday ? 'Today' : dateOffset === -1 ? 'Yesterday' : dateOffset === 1 ? 'Tomorrow' : formatDate(viewDate)}
              </div>
              <div className="text-[11px] text-gray-400">{formatDate(viewDate)}</div>
            </div>
            <button
              onClick={() => { setDateOffset(o => o + 1); setActiveFilter('all') }}
              disabled={dateOffset >= 0}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-lg font-light disabled:opacity-30"
            >›</button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">

        {/* Day summary */}
        {entries.length > 0 && <DaySummary entries={entries} />}

        {/* Hydration tracker — always visible */}
        <HydrationTracker dateKey={dateKey} />

        {/* Category filter */}
        {categories.length > 1 && (
          <CategoryFilter
            categories={categories}
            active={activeFilter}
            onChange={setActiveFilter}
          />
        )}

        {/* Empty state */}
        {entries.length === 0 && (
          <EmptyNutrition isRestDay={!planDay || planDay.sessions.length === 0} />
        )}

        {/* Filtered empty */}
        {entries.length > 0 && filtered.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">No {activeFilter} entries today</p>
          </div>
        )}

        {/* Nutrition entries */}
        {filtered.map((entry, i) => (
          <NutCard key={i} entry={entry} />
        ))}

        {/* Coaching note for race days */}
        {planDay?.sessions.some(s => s.c === 'run-race') && (
          <div className="bg-yellow-50 rounded-2xl border border-yellow-100 px-4 py-3 flex items-start gap-2.5">
            <span className="text-lg mt-0.5">🏁</span>
            <div>
              <p className="text-xs font-bold text-yellow-800 mb-0.5">Race day nutrition</p>
              <p className="text-xs text-yellow-700 leading-relaxed">
                Stick to foods you&apos;ve trained with. Nothing new on race day. Caffeine 45–60 min before start.
              </p>
            </div>
          </div>
        )}

        {/* Long run fuelling reminder */}
        {planDay?.sessions.some(s => s.c === 'run-long') && (
          <div className="bg-blue-50 rounded-2xl border border-blue-100 px-4 py-3 flex items-start gap-2.5">
            <span className="text-lg mt-0.5">🏃</span>
            <div>
              <p className="text-xs font-bold text-blue-800 mb-0.5">Long run fuelling</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                Carb-load the night before. Gel every 35–45 min during the run. Protein within 30 min of finishing.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
