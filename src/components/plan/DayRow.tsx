'use client'

import { useState, useRef, useMemo } from 'react'
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


function DayRow({ day, dayIndex, weekN, logs, gymLogs, isToday, isPast, onOpen }: {
  day: PlanDay; dayIndex: number; weekN: number
  logs: Record<string, TrainingLog>; gymLogs: Record<string, unknown>; isToday: boolean; isPast: boolean
  onOpen: () => void
}) {
  const realSessions = day.sessions.filter(s => s.c != null && s.c !== 'rest')
  const done = realSessions.filter((_, i) => {
    const key = `${weekN}_${dayIndex}_${i}`
    return logs[key]?.done || !!gymLogs[key]
  }).length
  const allDone = realSessions.length > 0 && done === realSessions.length
  const isRest = realSessions.length === 0

  return (
    <button
      onClick={onOpen}
      className={`w-full px-4 py-2.5 border-b border-gray-50 last:border-0 text-left flex items-center gap-3 active:bg-gray-50 transition-colors ${isToday ? 'bg-[var(--ns-forest-light)]/50' : ''}`}
    >
      <div className="w-9 flex-shrink-0 text-center">
        <div className={`text-xs font-bold ${isToday ? 'text-[var(--ns-forest)]' : isPast ? 'text-gray-300' : 'text-gray-400'}`}>{day.d}</div>
        {isToday && <div className="w-1.5 h-1.5 bg-[var(--ns-forest)] rounded-full mx-auto mt-0.5" />}
      </div>

      <div className="flex-1 min-w-0">
        {isRest ? (
          <span className="text-[11px] text-gray-300 italic">Rest</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {realSessions.map((s, i) => {
              const cfg = getSessionType(s.c)
              const isDone = !!logs[`${weekN}_${dayIndex}_${i}`]?.done || !!gymLogs[`${weekN}_${dayIndex}_${i}`]
              const name = decodeHtml(s.n)
              return (
                <div key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${isDone ? 'bg-emerald-100 text-emerald-700' : `${cfg.colour} ${cfg.textColour}`} ${isPast && !isDone ? 'opacity-40' : ''}`}>
                  <span className={`w-1 h-1 rounded-full ${isDone ? 'bg-emerald-500' : cfg.dot}`} />
                  {name.length > 18 ? name.slice(0, 18) + '…' : name}
                  {s.km > 0 && <span className="opacity-60 ml-0.5">{fmtKm(s.km)}</span>}
                </div>
              )
            })}
          </div>
        )}
        {/* Sleep hint — only on upcoming days */}
        {day.sleep && !isPast && !isToday && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[9px]">😴</span>
            <span className="text-[9px] text-gray-300 truncate">{day.sleep}</span>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 flex items-center gap-1.5">
        {allDone ? (
          <div className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : !isRest && (
          <span className="text-[9px] text-gray-300">{done}/{realSessions.length}</span>
        )}
        <svg className="w-3 h-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}

// ─── Week Row ───────────────────────────────────────────────────────────────────


export default DayRow
