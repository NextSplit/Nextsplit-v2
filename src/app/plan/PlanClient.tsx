'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import React from 'react'
import { useRouter } from 'next/navigation'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useTrainingLog } from '@/hooks/useTrainingLog'
import { useMealPlan } from '@/hooks/useMealPlan'
import { getSessionType, fmtKm, decodeHtml, parseDet } from '@/lib/sessionUtils'
import AdaptiveSuggestions from '@/components/AdaptiveSuggestions'
import DarkModeToggle from '@/components/DarkModeToggle'
import { useToast } from '@/components/Toast'
import { hapticLight } from '@/lib/haptics'
import { useGymLog } from '@/hooks/useGymLog'
import type { PlanWeek, PlanDay, PlanSession, TrainingLog } from '@/types/database'
import LogModal from '@/components/LogModal'
import DayDrawer from '@/components/plan/DayDrawer'
import DayRow from '@/components/plan/DayRow'
import WeekRow from '@/components/plan/WeekRow'

const PHASE_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  p1: { label: 'Phase 1', bg: 'bg-[var(--ns-forest-light)]',   text: 'text-teal-800'   },
  p2: { label: 'Phase 2', bg: 'bg-violet-100', text: 'text-violet-800' },
  tr: { label: 'Travel',  bg: 'bg-amber-100',  text: 'text-amber-800'  },
}

const WEEK_TYPE: Record<string, { label: string; colour: string; dot: string }> = {
  k: { label: 'Build',  colour: 'text-blue-600',   dot: 'bg-blue-400'   },
  d: { label: 'Deload', colour: 'text-orange-500', dot: 'bg-orange-400' },
  p: { label: 'Peak',   colour: 'text-red-600',    dot: 'bg-red-400'    },
  r: { label: 'Race',   colour: 'text-yellow-600', dot: 'bg-yellow-400' },
}

const NUT_CAT: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  hydration: { bg: 'bg-blue-50',   text: 'text-blue-800',   border: 'border-blue-200',   icon: '💧' },
  food:      { bg: 'bg-green-50',  text: 'text-green-800',  border: 'border-green-200',  icon: '🍽️' },
  fuel:      { bg: 'bg-amber-50',  text: 'text-amber-800',  border: 'border-amber-200',  icon: '⚡' },
  info:      { bg: 'bg-gray-50',   text: 'text-gray-600',   border: 'border-gray-200',   icon: 'ℹ️' },
  macro:     { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', icon: '📊' },
}

// ─── Day Drawer ─────────────────────────────────────────────────────────────────


export default function PlanClient() {
  const router = useRouter()
  const { plan, weeks, currentWeek, loading, advanceWeek } = useActivePlan()
  const { logs, logSession } = useTrainingLog(plan?.id ?? null)
  const { gymLogs } = useGymLog(plan?.id ?? null)
  const { success: toastSuccess, error: toastError } = useToast()
  const [advancing, setAdvancing] = useState(false)
  const [viewMode, setViewMode] = useState<'active' | 'full'>('active')
  const [completedExpanded, setCompletedExpanded] = useState(false)
  const [phaseFilter, setPhaseFilter] = useState<string>('all')
  const [drawerDay, setDrawerDay] = useState<{ day: PlanDay; dayIndex: number; weekN: number; weekTitle: string } | null>(null)
  const [logModal, setLogModal] = useState<{ session: PlanSession; dayIndex: number; sessI: number; weekN: number } | null>(null)
  const currentWeekRef = useRef<HTMLDivElement>(null)

  const { start, end } = useMemo(() => {
    if (!plan) { const t = new Date().toISOString().slice(0,10); return { start: t, end: t } }
    const s = new Date(plan.start_date + 'T00:00:00')
    s.setDate(s.getDate() + (plan.current_week - 1) * 7)
    const e = new Date(s); e.setDate(e.getDate() + 6)
    return { start: s.toISOString().slice(0,10), end: e.toISOString().slice(0,10) }
  }, [plan])

  useMealPlan(start, end) // keep meal plan hook warm

  useEffect(() => {
    if (!loading && plan && currentWeekRef.current) {
      setTimeout(() => currentWeekRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300)
    }
  }, [loading, plan])

  const todayDayIndex = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1 })()
  const [planTab, setPlanTab] = useState<'plan' | 'fuel'>('plan')

  const { completedWeeks, currentWeekObj, upcomingWeeks, availablePhases } = useMemo(() => {
    if (!plan) return { completedWeeks: [] as PlanWeek[], currentWeekObj: null, upcomingWeeks: [] as PlanWeek[], availablePhases: [] as string[] }
    const cw = plan.current_week
    return {
      completedWeeks: [...weeks.filter(w => w.n < cw)].reverse(),
      currentWeekObj: weeks.find(w => w.n === cw) ?? null,
      upcomingWeeks: weeks.filter(w => w.n > cw),
      availablePhases: [...new Set(weeks.map(w => w.ph))],
    }
  }, [weeks, plan])

  const filterWeek = useCallback((w: PlanWeek) => phaseFilter === 'all' || w.ph === phaseFilter, [phaseFilter])

  const weekComplete = currentWeekObj ? currentWeekObj.days.every((day, dayI) => {
    const real = day.sessions.filter(s => s.c != null && s.c !== 'rest')
    return real.length === 0 || real.every((_, sessI) => {
      const key = `${currentWeekObj.n}_${dayI}_${sessI}`
      return logs[key]?.done || !!gymLogs[key]
    })
  }) : false
  const canAdvance = weekComplete && plan && plan.current_week < plan.total_weeks

  async function handleAdvance() {
    if (!canAdvance) return
    setAdvancing(true)
    try {
      await advanceWeek()
      toastSuccess(`Week ${plan!.current_week + 1} started!`)
    } catch {
      toastError('Failed to advance week — try again')
    } finally {
      setAdvancing(false)
    }
  }

  function openDay(week: PlanWeek, day: PlanDay, dayIndex: number) {
    setDrawerDay({ day: day as PlanDay, dayIndex, weekN: week.n, weekTitle: decodeHtml(week.title) })
  }

  async function handleSaveLog(params: {
    week_n: number; day_i: number; session_i: number; done: boolean
    effort?: number; km?: number; notes?: string; duration_secs?: number; pace?: string
  }) {
    if (!plan) return
    try {
      await logSession({ plan_id: plan.id, ...params })
      hapticLight()
      toastSuccess('Session logged ✓')
    } catch {
      toastError('Failed to save — check your connection')
    }
    setLogModal(null)
  }

  function handleLogSession(weekN: number, dayI: number, sessI: number) {
    if (!plan) return
    const week = weeks.find(w => w.n === weekN)
    const session = week?.days[dayI]?.sessions[sessI]
    if (!session) return
    // Gym sessions go to live tracker, not the log modal
    if (session.c?.startsWith('gym')) {
      router.push(`/gym/live/${weekN}/${dayI}/${sessI}`)
      return
    }
    setLogModal({ session, dayIndex: dayI, sessI, weekN })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] pb-24 pt-16">
        <div className="max-w-lg mx-auto px-4 space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
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
          <a href="/onboarding" className="inline-block bg-[var(--ns-forest)] text-white px-6 py-3 rounded-xl text-sm font-semibold mt-4">Choose a plan →</a>
        </div>
      </div>
    )
  }

  const weeksRemaining = upcomingWeeks.length + 1

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-24">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 sticky top-0 z-40">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900 truncate">{decodeHtml(plan.name)}</h1>
            <DarkModeToggle />
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Week {plan.current_week} of {plan.total_weeks}
            {plan.race_date && ` · Race: ${new Date(plan.race_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
          </p>
          <div className="mt-2.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[var(--ns-forest)] rounded-full transition-all" style={{ width: `${(plan.current_week / plan.total_weeks) * 100}%` }} />
          </div>
          <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
            <span>Week 1</span>
            <span>{Math.round((plan.current_week / plan.total_weeks) * 100)}% complete</span>
            <span>Week {plan.total_weeks}</span>
          </div>
        </div>
      </div>

      {/* Plan | Fuel tab switcher */}
      <div className="bg-white border-b border-gray-100 px-4 pt-2 pb-0">
        <div className="max-w-lg mx-auto flex">
          {(['plan', 'fuel'] as const).map(t => (
            <button key={t} onClick={() => setPlanTab(t)}
              className={`flex-1 py-2.5 text-xs font-bold capitalize border-b-2 transition-all ${
                planTab === t ? 'border-[var(--ns-forest)] text-[var(--ns-forest)]' : 'border-transparent text-slate-400'
              }`}>
              {t === 'plan' ? '📋 Training Plan' : '🥗 Fuel'}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className={`bg-white border-b border-gray-100 px-4 py-2.5 ${planTab === 'fuel' ? 'hidden' : ''}`}>
        <div className="max-w-lg mx-auto flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-xl p-0.5 flex-shrink-0">
            {(['active', 'full'] as const).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${viewMode === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                {mode === 'active' ? `Active (${weeksRemaining})` : 'Full plan'}
              </button>
            ))}
          </div>
          {/* Phase filter */}
          {availablePhases.length > 1 && (
            <div className="flex gap-1 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
              {['all', ...availablePhases].map(ph => (
                <button key={ph} onClick={() => setPhaseFilter(ph)}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${phaseFilter === ph ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {ph === 'all' ? 'All' : (PHASE_LABELS[ph]?.label ?? ph)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">

        {/* Advance prompt */}
        {canAdvance && (
          <div className="bg-emerald-50 rounded-2xl border border-emerald-100 px-4 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-emerald-700">Week {plan.current_week} complete! 🎉</p>
              <p className="text-xs text-emerald-600 mt-0.5">Ready for Week {plan.current_week + 1}?</p>
            </div>
            <button onClick={handleAdvance} disabled={advancing}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold disabled:opacity-50 flex-shrink-0">
              {advancing ? '…' : 'Next week →'}
            </button>
          </div>
        )}

        {/* Adaptive coaching suggestions */}
        <AdaptiveSuggestions
          weeks={weeks}
          logs={logs}
          gymLogs={gymLogs}
          currentWeek={plan.current_week}
          planId={plan.id}
        />

        {/* ── ACTIVE VIEW ── */}
        {viewMode === 'active' && (
          <>
            {/* Completed accordion */}
            {completedWeeks.filter(filterWeek).length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
                <button onClick={() => setCompletedExpanded(e => !e)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                  <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-400">{completedWeeks.filter(filterWeek).length} weeks completed</div>
                    <div className="text-[10px] text-gray-300">Tap to review past weeks</div>
                  </div>
                  <svg className={`w-4 h-4 text-gray-300 transition-transform ${completedExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {completedExpanded && (
                  <div className="border-t border-gray-50 px-3 pb-3 pt-2 space-y-2">
                    {completedWeeks.filter(filterWeek).map(week => (
                      <WeekRow key={week.n} week={week} status="completed" logs={logs} gymLogs={gymLogs} todayDayIndex={-1}
                        onOpenDay={(day, di) => openDay(week, day, di)} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Current */}
            {currentWeekObj && filterWeek(currentWeekObj) && (
              <WeekRow week={currentWeekObj} status="current" logs={logs} gymLogs={gymLogs} todayDayIndex={todayDayIndex}
                weekRef={currentWeekRef} onOpenDay={(day, di) => openDay(currentWeekObj, day, di)} />
            )}

            {/* Upcoming */}
            {upcomingWeeks.filter(filterWeek).map(week => (
              <WeekRow key={week.n} week={week} status="upcoming" logs={logs} gymLogs={gymLogs} todayDayIndex={-1}
                onOpenDay={(day, di) => openDay(week, day, di)} />
            ))}
          </>
        )}

        {/* ── FULL VIEW ── */}
        {viewMode === 'full' && weeks.filter(filterWeek).map(week => {
          const status = week.n < plan.current_week ? 'completed' : week.n === plan.current_week ? 'current' : 'upcoming'
          return (
            <WeekRow key={week.n} week={week} status={status} logs={logs} gymLogs={gymLogs}
              todayDayIndex={status === 'current' ? todayDayIndex : -1}
              weekRef={status === 'current' ? currentWeekRef : undefined}
              onOpenDay={(day, di) => openDay(week, day, di)} />
          )
        })}
      </div>

      {/* Day drawer */}
      {drawerDay && (
        <DayDrawer
          day={drawerDay.day}
          dayIndex={drawerDay.dayIndex}
          weekN={drawerDay.weekN}
          weekTitle={drawerDay.weekTitle}
          logs={logs}
          gymLogs={gymLogs}
          isToday={drawerDay.weekN === plan.current_week && drawerDay.dayIndex === todayDayIndex}
          isPast={drawerDay.weekN < plan.current_week}
          onClose={() => setDrawerDay(null)}
          onLogSession={handleLogSession}
        />
      )}

      {/* Log modal — opens when tapping Log in drawer or day row */}
      {logModal && plan && (
        <LogModal
          session={logModal.session}
          dayIndex={logModal.dayIndex}
          sessionIndex={logModal.sessI}
          weekN={logModal.weekN}
          planId={plan.id}
          existingLog={logs[`${logModal.weekN}_${logModal.dayIndex}_${logModal.sessI}`] ?? null}
          onClose={() => setLogModal(null)}
          onSave={handleSaveLog}
        />
      )}
    </div>
  )
}

