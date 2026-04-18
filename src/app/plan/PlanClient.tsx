'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import React from 'react'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useTrainingLog } from '@/hooks/useTrainingLog'
import { useMealPlan } from '@/hooks/useMealPlan'
import { getSessionType, fmtKm, decodeHtml } from '@/lib/sessionUtils'
import { MEAL_SLOTS } from '@/types/database'
import type { PlanWeek, PlanDay, PlanSession, MealPlanEntryWithRecipe } from '@/types/database'

const PHASE_LABELS: Record<string, { label: string; colour: string }> = {
  p1: { label: 'Phase 1', colour: 'bg-teal-100 text-teal-800' },
  p2: { label: 'Phase 2', colour: 'bg-violet-100 text-violet-800' },
  tr: { label: 'Travel', colour: 'bg-amber-100 text-amber-800' },
}

const WEEK_TYPE: Record<string, { label: string; colour: string }> = {
  k: { label: 'Build', colour: 'text-blue-600' },
  d: { label: 'Deload', colour: 'text-orange-500' },
  p: { label: 'Peak', colour: 'text-red-600' },
  r: { label: 'Race', colour: 'text-yellow-600' },
}

function SessionPill({ session }: { session: PlanSession }) {
  const cfg = getSessionType(session.c)
  const name = decodeHtml(session.n)
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${cfg.colour} ${cfg.textColour} text-[10px] font-medium`}>
      <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
      {name.length > 22 ? name.slice(0, 22) + '…' : name}
      {session.km > 0 && <span className="opacity-70 ml-0.5">{fmtKm(session.km)}</span>}
    </div>
  )
}

function DayRow({ day, dayIndex, weekN, logs, isToday, mealEntries }: {
  day: PlanDay; dayIndex: number; weekN: number
  logs: Record<string, import('@/types/database').TrainingLog>; isToday: boolean
  mealEntries: MealPlanEntryWithRecipe[]
}) {
  const allDone = day.sessions.length > 0 && day.sessions.every((_, i) => logs[`${weekN}_${dayIndex}_${i}`]?.done)

  return (
    <div className={`px-4 py-3 border-b border-gray-50 last:border-0 ${isToday ? 'bg-teal-50/40' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 text-center flex-shrink-0">
          <div className={`text-xs font-bold ${isToday ? 'text-[#0D9488]' : 'text-gray-400'}`}>{day.d}</div>
          {isToday && <div className="text-[9px] text-[#0D9488]">Today</div>}
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Training sessions */}
          {day.sessions.length === 0 ? (
            <span className="text-xs text-gray-400 italic">Rest</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {day.sessions.map((s, i) => <SessionPill key={i} session={s} />)}
            </div>
          )}
          {/* Meal plan entries — shown inline between sessions */}
          {mealEntries.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {mealEntries.slice(0, 3).map(e => {
                const slot = MEAL_SLOTS.find(s => s.id === e.meal_slot)
                return (
                  <div key={e.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-medium">
                    <span>{slot?.emoji ?? '🍽️'}</span>
                    <span className="truncate max-w-[80px]">{e.recipe.name}</span>
                  </div>
                )
              })}
              {mealEntries.length > 3 && (
                <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-500 text-[10px] font-medium">
                  +{mealEntries.length - 3} more
                </div>
              )}
            </div>
          )}
          {/* Nutrition hint from plan data */}
          {mealEntries.length === 0 && day.nut && day.nut.length > 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px]">🍽️</span>
              <span className="text-[10px] text-gray-400 truncate">{day.nut[0].l}</span>
              {day.nut.length > 1 && (
                <span className="text-[10px] text-gray-400">+{day.nut.length - 1}</span>
              )}
            </div>
          )}
        </div>
        {allDone && (
          <div className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}

function WeekRow({ week, isCurrent, logs, todayDayIndex, weekRef, mealsByDate, weekDates }: {
  week: PlanWeek; isCurrent: boolean
  logs: Record<string, import('@/types/database').TrainingLog>; todayDayIndex: number
  weekRef?: React.RefObject<HTMLDivElement | null>
  mealsByDate: Record<string, MealPlanEntryWithRecipe[]>
  weekDates: string[]   // Mon–Sun ISO date strings for this week
}) {
  const [open, setOpen] = useState(isCurrent)
  const phase = PHASE_LABELS[week.ph] ?? { label: week.ph, colour: 'bg-gray-100 text-gray-700' }
  const weekType = WEEK_TYPE[week.b] ?? { label: '', colour: '' }
  const totalSessions = week.days.reduce((a, d) => a + d.sessions.length, 0)
  const doneSessions = week.days.reduce((acc, day, dayI) =>
    acc + day.sessions.filter((_, sessI) => logs[`${week.n}_${dayI}_${sessI}`]?.done).length, 0)

  return (
    <div ref={weekRef} className={`rounded-2xl border overflow-hidden ${isCurrent ? 'border-[#0D9488] shadow-sm' : 'border-gray-100'} bg-white`}>
      {/* Week header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        {/* Week number */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold ${
          isCurrent ? 'bg-[#0D9488] text-white' : 'bg-gray-100 text-gray-500'
        }`}>
          {week.n}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${phase.colour}`}>
              {phase.label}
            </span>
            {weekType.label && (
              <span className={`text-[10px] font-semibold ${weekType.colour}`}>{weekType.label}</span>
            )}
            {isCurrent && (
              <span className="text-[10px] font-bold text-[#0D9488]">← Current</span>
            )}
          </div>
          <div className="text-sm font-semibold text-gray-900 truncate">{week.title}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {week.kl[0]}–{week.kl[1]}km planned
            {totalSessions > 0 && ` · ${doneSessions}/${totalSessions} done`}
          </div>
        </div>

        {/* Progress for current week */}
        {isCurrent && totalSessions > 0 && (
          <div className="text-right flex-shrink-0">
            <div className="text-lg font-bold text-[#0D9488]">{doneSessions}</div>
            <div className="text-[10px] text-gray-400">/{totalSessions}</div>
          </div>
        )}

        <div className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Week note */}
      {open && week.note && (
        <div className="px-4 pb-2">
          <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 leading-relaxed">{week.note}</p>
        </div>
      )}

      {/* Day rows */}
      {open && (
        <div className="border-t border-gray-50">
          {week.days.map((day, dayI) => {
            // weekDates[dayI] is the exact ISO date for Mon(0)..Sun(6)
            const dateForDay = weekDates[dayI] ?? null
            return (
              <DayRow
                key={dayI}
                day={day}
                dayIndex={dayI}
                weekN={week.n}
                logs={logs}
                isToday={isCurrent && dayI === todayDayIndex}
                mealEntries={dateForDay ? (mealsByDate[dateForDay] ?? []) : []}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function PlanClient() {
  const { plan, weeks, currentWeek, loading, advanceWeek } = useActivePlan()
  const { logs, loading: logsLoading } = useTrainingLog(plan?.id ?? null)
  const [advancing, setAdvancing] = useState(false)
  const currentWeekRef = useRef<HTMLDivElement>(null)

  // Compute current week date range for meal plan
  const { start, end, weekDates } = useMemo(() => {
    if (!plan) {
      const t = new Date().toISOString().slice(0,10)
      return { start: t, end: t, weekDates: [t] }
    }
    // Week starts on Monday: plan.start_date + (current_week-1)*7 days
    const s = new Date(plan.start_date + 'T00:00:00')
    s.setDate(s.getDate() + (plan.current_week - 1) * 7)
    const dates: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(s)
      d.setDate(d.getDate() + i)
      dates.push(d.toISOString().slice(0, 10))
    }
    const e = new Date(s); e.setDate(e.getDate() + 6)
    return { start: s.toISOString().slice(0,10), end: e.toISOString().slice(0,10), weekDates: dates }
  }, [plan])

  const { byDate: mealsByDate } = useMealPlan(start, end)

  // Scroll to current week on load
  useEffect(() => {
    if (!loading && plan && currentWeekRef.current) {
      setTimeout(() => {
        currentWeekRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
    }
  }, [loading, plan])

  // Today's day index Mon=0..Sun=6
  const d = new Date().getDay()
  const todayDayIndex = d === 0 ? 6 : d - 1

  // Check if current week is fully done
  const weekComplete = currentWeek ? currentWeek.days.every((day, dayI) =>
    day.sessions.length === 0 || day.sessions.every((_, sessI) => logs[`${currentWeek.n}_${dayI}_${sessI}`]?.done)
  ) : false
  const canAdvance = weekComplete && plan && plan.current_week < plan.total_weeks

  async function handleAdvance() {
    if (!canAdvance) return
    setAdvancing(true)
    try { await advanceWeek() } finally { setAdvancing(false) }
  }

  if (loading || logsLoading) {
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
      <div className="min-h-screen bg-[#f8f8f6] pb-24 pt-16 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-base font-bold text-gray-900 mb-2">No active plan</h2>
          <a href="/onboarding" className="inline-block bg-[#0D9488] text-white px-6 py-3 rounded-xl text-sm font-semibold mt-4">
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
          <h1 className="text-lg font-bold text-gray-900">{plan.name}</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Week {plan.current_week} of {plan.total_weeks} · {weeks.length} weeks total
            {plan.race_date && ` · Race: ${new Date(plan.race_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0D9488] rounded-full transition-all"
              style={{ width: `${(plan.current_week / plan.total_weeks) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>Week 1</span>
            <span>{Math.round((plan.current_week / plan.total_weeks) * 100)}% complete</span>
            <span>Week {plan.total_weeks}</span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-3">

        {/* Week complete — advance prompt */}
        {canAdvance && (
          <div className="bg-emerald-50 rounded-2xl border border-emerald-100 px-4 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-emerald-700">Week {plan!.current_week} complete! 🎉</p>
              <p className="text-xs text-emerald-600 mt-0.5">Ready to move to Week {plan!.current_week + 1}?</p>
            </div>
            <button onClick={handleAdvance} disabled={advancing}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold disabled:opacity-50 flex-shrink-0">
              {advancing ? '…' : 'Next week →'}
            </button>
          </div>
        )}

        {weeks.map(week => (
          <WeekRow
            key={week.n}
            week={week}
            isCurrent={week.n === plan.current_week}
            logs={logs}
            todayDayIndex={todayDayIndex}
            weekRef={week.n === plan.current_week ? currentWeekRef : undefined}
            mealsByDate={week.n === plan.current_week ? mealsByDate : {}}
            weekDates={week.n === plan.current_week ? weekDates : []}
          />
        ))}
      </div>
    </div>
  )
}
