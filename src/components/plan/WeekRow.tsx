'use client'

import { useState, useRef } from 'react'
import { fmtKm, decodeHtml } from '@/lib/sessionUtils'
import type { PlanWeek, PlanDay, PlanSession, TrainingLog } from '@/types/database'
import InlineDayRow from './InlineDayRow'

const WEEK_TYPE: Record<string, { label: string; color: string }> = {
  k: { label: 'Build',  color: '#3b82f6' },
  d: { label: 'Deload', color: '#f97316' },
  p: { label: 'Peak',   color: '#ef4444' },
  r: { label: 'Race',   color: '#eab308' },
}

const SESSION_DOT: Record<string, string> = {
  easy:     '#22c55e',
  tempo:    '#eab308',
  interval: '#f97316',
  long:     '#3b82f6',
  recovery: '#4ade80',
  gym:      '#8b5cf6',
  rest:     '#d1d5db',
}

function getSessionDot(code: string | null | undefined): string {
  if (!code) return SESSION_DOT.easy
  const c = code.toLowerCase()
  if (c.includes('tempo')) return SESSION_DOT.tempo
  if (c.includes('interval') || c.includes('speed')) return SESSION_DOT.interval
  if (c.includes('long')) return SESSION_DOT.long
  if (c.includes('recovery')) return SESSION_DOT.recovery
  if (c.includes('gym') || c.includes('strength')) return SESSION_DOT.gym
  if (c.includes('rest')) return SESSION_DOT.rest
  return SESSION_DOT.easy
}

function getSessionLabel(code: string | null | undefined, name: string): string {
  if (!code) return name
  const c = code.toLowerCase()
  if (c.includes('tempo')) return 'Tempo'
  if (c.includes('interval') || c.includes('speed')) return 'Intervals'
  if (c.includes('long')) return 'Long Run'
  if (c.includes('recovery')) return 'Recovery'
  if (c.includes('gym') || c.includes('strength')) return 'Strength'
  if (c.includes('rest')) return 'Rest'
  return 'Easy Run'
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface WeekRowProps {
  week: PlanWeek
  status: 'completed' | 'current' | 'upcoming'
  logs: Record<string, TrainingLog>
  gymLogs: Record<string, unknown>
  todayDayIndex: number
  weekRef?: React.RefObject<HTMLDivElement | null>
  planId: string
  onLog: (session: PlanSession, dayIndex: number, sessIndex: number, weekN: number) => void
}

export default function WeekRow({ week, status, logs, gymLogs, todayDayIndex, weekRef, planId, onLog }: WeekRowProps) {
  const isCurrent   = status === 'current'
  const isCompleted = status === 'completed'
  const [open, setOpen] = useState(isCurrent)
  const [openDayIdx, setOpenDayIdx] = useState<number | null>(isCurrent ? todayDayIndex : null)

  const wtype = WEEK_TYPE[week.b] ?? null

  // Count sessions for summary dots
  const allSessions = week.days.flatMap((d, di) =>
    d.sessions.filter(s => s.c && s.c !== 'rest').map((s, si) => ({ s, di, si }))
  )
  const doneSessions = allSessions.filter(({ di, si }) => {
    const key = `${week.n}_${di}_${si}`
    return logs[key]?.done || !!gymLogs[key]
  }).length
  const totalSessions = allSessions.length

  // Session type dot summary for collapsed week header
  const sessionDots = allSessions.slice(0, 7).map(({ s }) => ({
    dot: getSessionDot(s.c),
    label: getSessionLabel(s.c, s.n ?? ''),
    km: s.km,
  }))

  // Total weekly km
  const weeklyKm = allSessions.reduce((sum, { s }) => sum + (s.km ?? 0), 0)

  return (
    <div
      ref={weekRef}
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: isCurrent ? 'rgba(37,99,235,0.10)' : isCompleted ? 'rgba(34,197,94,0.08)' : 'var(--color-surface)',
        border: `1.5px solid ${isCurrent ? 'var(--ns-cobalt)' : isCompleted ? 'rgba(34,197,94,0.35)' : 'var(--color-border)'}`,
        boxShadow: isCurrent ? '0 2px 12px rgba(37,99,235,0.1)' : 'none',
      }}
    >
      {/* Week header — tap to expand/collapse */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        style={{ background: 'transparent' }}
      >
        {/* Week number badge */}
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm"
          style={{
            background: isCurrent ? 'var(--ns-cobalt)' : isCompleted ? 'var(--color-surface-2)' : 'var(--color-surface-2)',
            color:      isCurrent ? 'white'           : isCompleted ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
          }}>
          {week.n}
        </div>

        {/* Week info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-bold truncate"
              style={{ color: 'var(--color-text-primary)' }}>
              {decodeHtml(week.title)}
            </span>
            {wtype && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: `${wtype.color}18`, color: wtype.color }}>
                {wtype.label}
              </span>
            )}
            {isCurrent && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: 'var(--ns-cobalt)', color: 'white' }}>
                Current
              </span>
            )}
          </div>
          {/* Session type dots — at-a-glance week summary */}
          {!open && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {sessionDots.map((dot, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: dot.dot }} />
                  <span className="text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>
                    {dot.label}{dot.km ? ` ${fmtKm(dot.km)}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right — progress + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {totalSessions > 0 && (
            <span className="text-[11px] font-data font-bold"
              style={{ color: doneSessions === totalSessions ? '#16a34a' : isCurrent ? 'var(--ns-cobalt)' : 'var(--color-text-tertiary)' }}>
              {doneSessions}/{totalSessions}
            </span>
          )}
          {weeklyKm > 0 && (
            <span className="text-[10px] font-data"
              style={{ color: 'var(--color-text-tertiary)' }}>
              {Math.round(weeklyKm)}km
            </span>
          )}
          <span className="text-base transition-transform duration-200"
            style={{
              color: 'var(--color-text-tertiary)',
              display: 'inline-block',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}>
            ↓
          </span>
        </div>
      </button>

      {/* Expanded — day rows */}
      {open && (
        <div className="border-t" style={{ borderColor: 'var(--color-border)' }}>
          {week.days.map((day, dayIndex) => (
            <InlineDayRow
              key={dayIndex}
              day={day}
              dayIndex={dayIndex}
              weekN={week.n}
              logs={logs}
              gymLogs={gymLogs}
              isToday={isCurrent && dayIndex === todayDayIndex}
              isPast={isCompleted || (isCurrent && dayIndex < todayDayIndex)}
              isOpen={openDayIdx === dayIndex}
              onToggle={() => setOpenDayIdx(openDayIdx === dayIndex ? null : dayIndex)}
              onLog={onLog}
            />
          ))}
        </div>
      )}
    </div>
  )
}
