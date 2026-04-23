'use client'

import { useState } from 'react'
import { fmtKm, decodeHtml, parseDet } from '@/lib/sessionUtils'
import type { PlanDay, PlanSession, TrainingLog } from '@/types/database'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const SESSION_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  easy:     { bg: '#dcfce7', text: '#15803d', dot: '#22c55e', label: 'Easy Run' },
  tempo:    { bg: '#fef9c3', text: '#a16207', dot: '#eab308', label: 'Tempo' },
  interval: { bg: '#ffedd5', text: '#c2410c', dot: '#f97316', label: 'Intervals' },
  long:     { bg: '#dbeafe', text: '#1d4ed8', dot: '#3b82f6', label: 'Long Run' },
  recovery: { bg: '#f0fdf4', text: '#166534', dot: '#4ade80', label: 'Recovery' },
  gym:      { bg: '#ede9fe', text: '#6d28d9', dot: '#8b5cf6', label: 'Strength' },
  rest:     { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: 'Rest' },
}

function getStyle(code: string | null | undefined) {
  if (!code) return SESSION_STYLE.easy
  const c = code.toLowerCase()
  if (c.includes('tempo')) return SESSION_STYLE.tempo
  if (c.includes('interval') || c.includes('speed')) return SESSION_STYLE.interval
  if (c.includes('long')) return SESSION_STYLE.long
  if (c.includes('recovery')) return SESSION_STYLE.recovery
  if (c.includes('gym') || c.includes('strength')) return SESSION_STYLE.gym
  if (c.includes('rest')) return SESSION_STYLE.rest
  return SESSION_STYLE.easy
}

interface Props {
  day: PlanDay
  dayIndex: number
  weekN: number
  logs: Record<string, TrainingLog>
  gymLogs: Record<string, unknown>
  isToday: boolean
  isPast: boolean
  isOpen: boolean
  onToggle: () => void
  onLog: (session: PlanSession, dayIndex: number, sessIndex: number, weekN: number) => void
}

export default function InlineDayRow({ day, dayIndex, weekN, logs, gymLogs, isToday, isPast, isOpen, onToggle, onLog }: Props) {
  const [openSessionIdx, setOpenSessionIdx] = useState<number | null>(null)

  const realSessions = day.sessions.filter(s => s.c && s.c !== 'rest')
  const doneSessions = realSessions.filter((_, i) => {
    const key = `${weekN}_${dayIndex}_${i}`
    return logs[key]?.done || !!gymLogs[key]
  }).length
  const allDone = realSessions.length > 0 && doneSessions === realSessions.length
  const isRestDay = realSessions.length === 0

  const dayName = DAY_NAMES[dayIndex] ?? `Day ${dayIndex + 1}`

  return (
    <div className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>

      {/* Day header row — tap to expand */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        style={{
          background: isToday ? 'rgba(232,93,38,0.04)' : 'transparent',
        }}
      >
        {/* Day name */}
        <div className="w-10 flex-shrink-0">
          <p className="text-xs font-black uppercase tracking-wide"
            style={{ color: isToday ? 'var(--ns-ember)' : 'var(--color-text-tertiary)' }}>
            {dayName}
          </p>
          {isToday && (
            <p className="text-[8px] font-bold" style={{ color: 'var(--ns-ember)' }}>Today</p>
          )}
        </div>

        {/* Session summary — at a glance */}
        <div className="flex-1 min-w-0">
          {isRestDay ? (
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Rest day</p>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {realSessions.map((s, i) => {
                const style = getStyle(s.c)
                const key = `${weekN}_${dayIndex}_${i}`
                const done = logs[key]?.done || !!gymLogs[key]
                return (
                  <span key={i}
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: done ? '#dcfce7' : style.bg,
                      color: done ? '#15803d' : style.text,
                      opacity: done && !isOpen ? 0.7 : 1,
                    }}>
                    {done && <span>✓</span>}
                    {style.label}
                    {s.km > 0 && <span className="font-data">{fmtKm(s.km)}</span>}
                  </span>
                )
              })}
            </div>
          )}
        </div>

        {/* Right — done count + chevron */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!isRestDay && (
            <span className="text-[10px] font-data font-bold"
              style={{ color: allDone ? '#16a34a' : 'var(--color-text-tertiary)' }}>
              {doneSessions}/{realSessions.length}
            </span>
          )}
          {!isRestDay && (
            <span className="text-sm transition-transform duration-200"
              style={{
                color: 'var(--color-text-tertiary)',
                display: 'inline-block',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}>
              ↓
            </span>
          )}
        </div>
      </button>

      {/* Expanded day — sessions + nutrition inline */}
      {isOpen && !isRestDay && (
        <div className="px-4 pb-4 space-y-2" style={{ background: 'var(--color-bg)' }}>



          {/* Sessions */}
          {realSessions.map((session, sessIdx) => {
            const key = `${weekN}_${dayIndex}_${sessIdx}`
            const log = logs[key]
            const done = log?.done || !!gymLogs[key]
            const style = getStyle(session.c)
            const detail = session.det ? parseDet(session.det) : null
            const isSessionOpen = openSessionIdx === sessIdx

            return (
              <div key={sessIdx}
                className="rounded-xl overflow-hidden"
                style={{
                  background: 'var(--color-surface)',
                  border: `1px solid ${done ? '#bbf7d0' : 'var(--color-border)'}`,
                }}>

                {/* Session header */}
                <button
                  onClick={() => setOpenSessionIdx(isSessionOpen ? null : sessIdx)}
                  className="w-full flex items-center gap-3 p-3 text-left"
                >
                  <div className="w-1.5 h-8 rounded-full flex-shrink-0"
                    style={{ background: done ? '#22c55e' : style.dot }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest mb-0.5"
                      style={{ color: style.text }}>
                      {style.label}{session.km > 0 ? ` · ${fmtKm(session.km)}` : ''}
                    </p>
                    <p className="text-sm font-bold leading-tight"
                      style={{ color: 'var(--color-text-primary)' }}>
                      {decodeHtml(session.n ?? '')}
                    </p>
                  </div>
                  {done ? (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: '#dcfce7' }}>
                      <span className="text-sm" style={{ color: '#16a34a' }}>✓</span>
                    </div>
                  ) : (
                    <span className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                      {isSessionOpen ? '↑' : '→'}
                    </span>
                  )}
                </button>

                {/* Session detail — tap to expand */}
                {isSessionOpen && (
                  <div className="px-4 pb-4 border-t space-y-3"
                    style={{ borderColor: 'var(--color-border)' }}>

                    {/* Technical detail */}
                    {detail?.technical && (
                      <p className="text-xs leading-relaxed pt-3"
                        style={{ color: 'var(--color-text-secondary)' }}>
                        {detail.technical}
                      </p>
                    )}

                    {/* Rationale / coach notes */}
                    {detail?.rationale && (
                      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
                        style={{ background: 'var(--ns-track-light)', border: '1px solid rgba(196,154,60,0.2)' }}>
                        <span className="text-sm flex-shrink-0">👟</span>
                        <p className="text-xs leading-relaxed" style={{ color: '#92400e' }}>
                          <span className="font-bold">Splity · </span>{detail.rationale}
                        </p>
                      </div>
                    )}

                    {/* Log button */}
                    <button
                      onClick={() => onLog(session, dayIndex, sessIdx, weekN)}
                      className="w-full py-2.5 rounded-xl text-sm font-black text-white active:scale-95 transition-all"
                      style={{ background: done ? 'var(--color-surface-2)' : 'var(--ns-ember)', color: done ? 'var(--color-text-secondary)' : 'white' }}>
                      {done ? 'Edit log →' : 'Log this session →'}
                    </button>

                    {/* Show log data if done */}
                    {done && log && (
                      <div className="flex gap-3 flex-wrap">
                        {log.km && <span className="text-[11px] font-data font-bold" style={{ color: 'var(--ns-forest)' }}>{log.km}km</span>}
                        {log.duration_secs && <span className="text-[11px] font-data" style={{ color: 'var(--color-text-tertiary)' }}>{Math.round(log.duration_secs / 60)}min</span>}
                        {log.pace && <span className="text-[11px] font-data" style={{ color: 'var(--color-text-tertiary)' }}>{log.pace}/km</span>}
                        {log.effort && <span className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>RPE {log.effort}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Nutrition for the day */}
          {day.nut && day.nut.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] font-black uppercase tracking-widest mb-2"
                style={{ color: 'var(--color-text-tertiary)' }}>
                Nutrition
              </p>
              <div className="space-y-1.5">
                {day.nut.map((n, i) => (
                  <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-xl"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <span className="text-sm flex-shrink-0">
                      {n.cat === 'hydration' ? '💧' : n.cat === 'fuel' ? '⚡' : n.cat === 'macro' ? '📊' : '🍽️'}
                    </span>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                      {n.d}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
