'use client'

import { useMemo } from 'react'
import Splity, { type SplityMood } from '@/components/Splity'
import type { TrainingLog } from '@/types/database'

interface Props {
  logs:      TrainingLog[]
  weeklyKm:  number
  targetKm:  number
  streak:    number
  planName?: string
  nextWeekNote?: string
  onDismiss: () => void
}

export default function WeeklySummaryCard({ logs, weeklyKm, targetKm, streak, planName, nextWeekNote, onDismiss }: Props) {
  const stats = useMemo(() => {
    const mon = new Date()
    mon.setDate(mon.getDate() - (mon.getDay() === 0 ? 6 : mon.getDay() - 1))
    mon.setHours(0, 0, 0, 0)
    const weekLogs = logs.filter(l => l.done && new Date(l.created_at) >= mon)
    const sessions = weekLogs.length
    const avgEffort = sessions > 0
      ? Math.round(weekLogs.filter(l => l.effort).reduce((s, l) => s + (l.effort ?? 0), 0) / weekLogs.filter(l => l.effort).length)
      : 0
    return { sessions, avgEffort }
  }, [logs])

  const pct   = targetKm > 0 ? Math.min(weeklyKm / targetKm, 1) : 0
  const mood: SplityMood  = pct >= 1 ? 'celebrating' : pct >= 0.7 ? 'happy' : pct >= 0.4 ? 'idle' : 'worried'
  const colour = pct >= 1 ? '#00e676' : pct >= 0.7 ? '#ffb800' : pct >= 0.4 ? '#4d8aff' : '#ff3d6e'

  const message = pct >= 1
    ? "Smashed it! Perfect week 🎉"
    : pct >= 0.7
      ? "Strong week. Keep building 💪"
      : pct >= 0.4
        ? "Good start — let's push more next week"
        : "Light week — Splity believes in you 👟"

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-end justify-end p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onDismiss}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{
          background: `linear-gradient(145deg, #080b14, #0d1120)`,
          border: `3px solid ${colour}`,
          boxShadow: `0 0 0 1px ${colour}15, 0 -8px 40px ${colour}20`,
        }}>

        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center gap-3">
          <Splity size={52} mood={mood} animate />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: colour }}>
              Weekly wrap
            </p>
            <p className="text-base font-black leading-tight" style={{ color: 'white', letterSpacing: '-0.02em' }}>
              {message}
            </p>
          </div>
        </div>

        {/* Km progress */}
        <div className="px-5 pb-4">
          <div className="flex justify-between text-xs mb-2">
            <span className="font-black" style={{ color: colour, fontSize: 28, letterSpacing: '-0.03em', lineHeight: 1 }}>
              {weeklyKm.toFixed(1)}<span className="text-base ml-1" style={{ color: 'rgba(255,255,255,0.5)' }}>km</span>
            </span>
            <span className="text-xs self-end mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              of {targetKm}km target
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${pct * 100}%`,
                background: `linear-gradient(90deg, ${colour}, ${colour}cc)`,
                boxShadow: `0 0 8px ${colour}60`,
              }} />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 px-5 pb-4">
          {[
            { value: stats.sessions, label: 'sessions', colour: '#4d8aff' },
            { value: streak > 0 ? `🔥${streak}` : '—', label: 'day streak', colour: '#ffb800' },
            { value: stats.avgEffort > 0 ? stats.avgEffort : '—', label: 'avg RPE', colour: '#a855f7' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl py-3 text-center"
              style={{ background: `${s.colour}10`, border: `2px solid ${s.colour}30` }}>
              <p className="text-xl font-black" style={{ color: s.colour }}>{s.value}</p>
              <p className="text-[9px] font-bold uppercase mt-0.5" style={{ color: `${s.colour}70` }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Next week preview */}
        {nextWeekNote && (
          <div className="mx-5 mb-4 rounded-2xl px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.08)' }}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1"
              style={{ color: 'var(--color-text-tertiary)' }}>Next week</p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{nextWeekNote}</p>
          </div>
        )}

        {/* Dismiss */}
        <div className="px-5 pb-5">
          <button onClick={onDismiss}
            className="w-full py-3.5 rounded-2xl font-black text-sm"
            style={{ background: colour, color: '#0a0e1a', boxShadow: `0 4px 16px ${colour}50` }}>
            Let&apos;s go next week 💪
          </button>
        </div>
      </div>
    </div>
  )
}
