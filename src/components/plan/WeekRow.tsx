'use client'

import { useState } from 'react'
import { fmtKm, decodeHtml } from '@/lib/sessionUtils'
import type { PlanWeek, PlanDay, PlanSession, TrainingLog } from '@/types/database'
import InlineDayRow from './InlineDayRow'

const WEEK_TYPE: Record<string, { label: string; color: string }> = {
  k: { label: 'Build',  color: '#3b82f6' },
  d: { label: 'Deload', color: '#f97316' },
  p: { label: 'Peak',   color: '#ef4444' },
  r: { label: 'Race',   color: '#ec4899' },
}

const SESSION_DOT: Record<string, string> = {
  easy:     '#22c55e',
  tempo:    '#eab308',
  interval: '#f97316',
  long:     '#3b82f6',
  recovery: '#4ade80',
  gym:      '#8b5cf6',
  rest:     '#6b7280',
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

  const allSessions = week.days.flatMap((d, di) =>
    d.sessions.filter(s => s.c && s.c !== 'rest').map((s, si) => ({ s, di, si }))
  )
  const doneSessions = allSessions.filter(({ di, si }) => {
    const key = `${week.n}_${di}_${si}`
    return logs[key]?.done || !!gymLogs[key]
  }).length
  const totalSessions = allSessions.length
  const sessionDots = allSessions.slice(0, 8).map(({ s }) => ({
    dot: getSessionDot(s.c),
    label: getSessionLabel(s.c, s.n ?? ''),
    km: s.km,
  }))
  const weeklyKm = allSessions.reduce((sum, { s }) => sum + (s.km ?? 0), 0)
  const allDone = totalSessions > 0 && doneSessions === totalSessions

  // Current week: bold cobalt card with left accent
  // Completed: green-tinted, reduced opacity
  // Upcoming: standard surface
  const cardStyle = isCurrent
    ? {
        background: 'rgba(37,99,235,0.12)',
        border: '2px solid #2563eb',
        boxShadow: '0 4px 20px rgba(37,99,235,0.2)',
      }
    : isCompleted
    ? {
        background: 'rgba(34,197,94,0.06)',
        border: '1.5px solid rgba(34,197,94,0.2)',
        opacity: 0.75,
      }
    : {
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
      }

  return (
    <div ref={weekRef} className="rounded-2xl overflow-hidden transition-all" style={cardStyle}>

      {/* Bold left accent bar on current week */}
      <div className="flex">
        {isCurrent && (
          <div className="w-1.5 flex-shrink-0" style={{ background: '#2563eb' }} />
        )}

        <div className="flex-1">
          {/* Week header */}
          <button
            onClick={() => setOpen(o => !o)}
            className="w-full flex items-center gap-3 px-4 py-4 text-left"
          >
            {/* Week number badge */}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm"
              style={{
                background: isCurrent ? '#2563eb' : isCompleted ? 'rgba(34,197,94,0.15)' : 'var(--color-surface-2)',
                color: isCurrent ? 'white' : isCompleted ? '#22c55e' : 'var(--color-text-secondary)',
              }}>
              {isCompleted ? '✓' : week.n}
            </div>

            {/* Week title + type */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-black truncate"
                  style={{ color: isCurrent ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
                  {decodeHtml(week.title)}
                </span>
                {wtype && (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: `${wtype.color}20`, color: wtype.color, border: `1px solid ${wtype.color}40` }}>
                    {wtype.label}
                  </span>
                )}
                {isCurrent && (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: '#2563eb', color: 'white' }}>
                    Current
                  </span>
                )}
              </div>

              {/* Session dot pills — bold and visible */}
              {!open && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {sessionDots.map((dot, i) => (
                    <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                      style={{ background: `${dot.dot}18`, border: `1px solid ${dot.dot}40` }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: dot.dot }} />
                      <span className="text-[9px] font-bold" style={{ color: dot.dot }}>
                        {dot.label}{dot.km ? ` ${fmtKm(dot.km)}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Progress + chevron */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {totalSessions > 0 && (
                <span className="text-[12px] font-black"
                  style={{ color: allDone ? '#22c55e' : isCurrent ? '#2563eb' : 'var(--color-text-tertiary)' }}>
                  {doneSessions}/{totalSessions}
                </span>
              )}
              {weeklyKm > 0 && (
                <span className="text-[10px] font-data" style={{ color: 'var(--color-text-tertiary)' }}>
                  {Math.round(weeklyKm)}km
                </span>
              )}
              <span className="text-base transition-transform duration-200 inline-block"
                style={{
                  color: isCurrent ? '#2563eb' : 'var(--color-text-tertiary)',
                  transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                }}>↓</span>
            </div>
          </button>

          {/* Expanded day rows */}
          {open && (
            <div className="border-t" style={{ borderColor: isCurrent ? 'rgba(37,99,235,0.2)' : 'var(--color-border)' }}>
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
      </div>
    </div>
  )
}
