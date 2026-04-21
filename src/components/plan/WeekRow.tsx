'use client'

import { useState, useRef, useMemo, useCallback } from 'react'
import DayRow from '@/components/plan/DayRow'
import { getSessionType, fmtKm, decodeHtml, parseDet } from '@/lib/sessionUtils'
import { useGymLog } from '@/hooks/useGymLog'
import type { PlanWeek, PlanDay, PlanSession, TrainingLog } from '@/types/database'
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


function WeekRow({ week, status, logs, gymLogs, todayDayIndex, weekRef, onOpenDay }: {
  week: PlanWeek; status: 'completed' | 'current' | 'upcoming'
  logs: Record<string, TrainingLog>; gymLogs: Record<string, unknown>; todayDayIndex: number
  weekRef?: React.RefObject<HTMLDivElement | null>
  onOpenDay: (day: PlanDay, dayIndex: number) => void
}) {
  const isCurrent = status === 'current'
  const isCompleted = status === 'completed'
  const [open, setOpen] = useState(isCurrent)

  const phase = PHASE_LABELS[week.ph] ?? { label: week.ph, bg: 'bg-gray-100', text: 'text-gray-600' }
  const wtype = WEEK_TYPE[week.b] ?? null
  const realSessions = week.days.flatMap((d, dayI) => d.sessions.filter(s => s.c != null && s.c !== 'rest').map((_, sessI) => `${week.n}_${dayI}_${sessI}`))
  const totalSessions = realSessions.length
  const doneSessions = realSessions.filter(k => logs[k]?.done || !!gymLogs[k]).length
  const progress = totalSessions > 0 ? doneSessions / totalSessions : 0

  return (
    <div
      ref={weekRef}
      className={`rounded-2xl border overflow-hidden bg-white transition-all ${
        isCurrent ? 'border-[var(--ns-forest)] shadow-sm' : isCompleted ? 'border-gray-100 opacity-60' : 'border-gray-100'
      }`}
    >
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 p-4 text-left">
        {/* Badge */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${
          isCurrent ? 'bg-[var(--ns-forest)] text-white' : isCompleted ? 'bg-gray-100 text-gray-300' : 'bg-gray-100 text-gray-500'
        }`}>
          {isCompleted ? (
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : week.n}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${phase.bg} ${phase.text}`}>{phase.label}</span>
            {wtype && (
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${wtype.dot}`} />
                <span className={`text-[10px] font-semibold ${wtype.colour}`}>{wtype.label}</span>
              </div>
            )}
            {isCurrent && <span className="text-[10px] font-bold text-[var(--ns-forest)]">← Now</span>}
          </div>
          <div className={`text-sm font-semibold truncate ${isCompleted ? 'text-gray-400' : 'text-gray-900'}`}>{decodeHtml(week.title)}</div>
          <div className={`text-[10px] mt-0.5 ${isCompleted ? 'text-gray-300' : 'text-gray-400'}`}>
            {week.kl[0]}–{week.kl[1]}km · {doneSessions}/{totalSessions} done
          </div>
        </div>

        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          {isCurrent && totalSessions > 0 && (
            <div className="text-right">
              <span className="text-base font-bold text-[var(--ns-forest)] leading-none">{doneSessions}</span>
              <span className="text-[9px] text-gray-400">/{totalSessions}</span>
            </div>
          )}
          {isCompleted && progress > 0 && (
            <span className="text-[9px] text-gray-300">{Math.round(progress * 100)}%</span>
          )}
          <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''} ${isCompleted ? 'text-gray-200' : 'text-gray-400'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Progress bar */}
      {isCurrent && totalSessions > 0 && (
        <div className="px-4 pb-1">
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[var(--ns-forest)] rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      )}

      {/* Week note */}
      {open && week.note && (
        <div className="px-4 pb-2">
          <p className={`text-xs rounded-xl px-3 py-2 leading-relaxed ${isCompleted ? 'bg-gray-50 text-gray-400' : 'bg-amber-50 text-amber-700'}`}>
            {decodeHtml(week.note)}
          </p>
        </div>
      )}

      {/* Gym session summary — current week only */}
      {open && isCurrent && (() => {
        const gymSessionsThisWeek = week.days.flatMap((d, dayI) =>
          d.sessions
            .map((s, sessI) => ({ s, dayI, sessI }))
            .filter(({ s }) => s?.c?.startsWith('gym'))
        )
        if (gymSessionsThisWeek.length === 0) return null
        const gymDone = gymSessionsThisWeek.filter(({ dayI, sessI }) =>
          !!gymLogs[`${week.n}_${dayI}_${sessI}`]
        ).length
        return (
          <div className="mx-4 mb-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🏋️</span>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">Strength this week</span>
              <span className="ml-auto text-[11px] font-bold text-amber-700">{gymDone}/{gymSessionsThisWeek.length} done</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {gymSessionsThisWeek.map(({ s, dayI, sessI }) => {
                const isDone = !!gymLogs[`${week.n}_${dayI}_${sessI}`]
                const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                return (
                  <div key={`${dayI}_${sessI}`}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                      isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-amber-200 text-amber-700'
                    }`}>
                    {isDone && <span>✓</span>}
                    <span>{dayNames[dayI]} — {s.n}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Day rows */}
      {open && (
        <div className="border-t border-gray-50">
          {week.days.map((day, dayI) => (
            <DayRow
              key={dayI}
              day={day as PlanDay}
              dayIndex={dayI}
              weekN={week.n}
              logs={logs}
              gymLogs={gymLogs}
              isToday={isCurrent && dayI === todayDayIndex}
              isPast={isCompleted}
              onOpen={() => onOpenDay(day, dayI)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────────


export default WeekRow
