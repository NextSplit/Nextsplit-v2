'use client'

import { useMemo } from 'react'
import type { TrainingLog } from '@/types/database'

interface Props {
  logs:    Record<string, TrainingLog>
  streak:  number
  acwr:    number | null
  weekN:   number
}

function calcWeeklyKm(logs: Record<string, TrainingLog>, weekN: number): number {
  return Object.values(logs)
    .filter(l => l.done && l.week_n === weekN && l.km)
    .reduce((a, l) => a + (l.km ?? 0), 0)
}

function acwrColour(acwr: number | null) {
  if (acwr === null) return { text: 'text-gray-400', bg: 'bg-gray-100', label: '—' }
  if (acwr > 1.5)   return { text: 'text-red-600',   bg: 'bg-red-100',   label: 'High risk' }
  if (acwr > 1.3)   return { text: 'text-amber-600', bg: 'bg-amber-100', label: 'Elevated' }
  if (acwr < 0.8)   return { text: 'text-blue-600',  bg: 'bg-blue-100',  label: 'Low' }
  return { text: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Optimal' }
}

export default function TodayProgressStrip({ logs, streak, acwr, weekN }: Props) {
  const weeklyKm = useMemo(() => calcWeeklyKm(logs, weekN), [logs, weekN])
  const acwrCfg  = acwrColour(acwr)

  const sessionsDone  = useMemo(() =>
    Object.values(logs).filter(l => l.done && l.week_n === weekN).length,
  [logs, weekN])

  const avgEffort = useMemo(() => {
    const withEffort = Object.values(logs).filter(l => l.done && l.week_n === weekN && l.effort)
    if (!withEffort.length) return null
    return Math.round(withEffort.reduce((a, l) => a + (l.effort ?? 0), 0) / withEffort.length * 10) / 10
  }, [logs, weekN])

  // Don't show if no data yet
  if (sessionsDone === 0 && streak === 0) return null

  return (
    <a href="/dashboard" className="block">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">This week</p>
          <span className="text-[10px] text-[var(--ns-ember)] font-semibold">Full stats →</span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 divide-x divide-gray-50 border-t border-gray-50">
          {/* Weekly km */}
          <div className="px-3 py-3 text-center">
            <p className="text-lg font-black text-gray-900">{Math.round(weeklyKm)}</p>
            <p className="text-[9px] text-gray-400 font-medium">km</p>
          </div>

          {/* Sessions */}
          <div className="px-3 py-3 text-center">
            <p className="text-lg font-black text-gray-900">{sessionsDone}</p>
            <p className="text-[9px] text-gray-400 font-medium">sessions</p>
          </div>

          {/* Streak */}
          <div className="px-3 py-3 text-center">
            <p className={`text-lg font-black ${streak >= 7 ? 'text-amber-500' : streak >= 3 ? 'text-orange-500' : 'text-gray-900'}`}>
              {streak > 0 ? `${streak}🔥` : '—'}
            </p>
            <p className="text-[9px] text-gray-400 font-medium">streak</p>
          </div>

          {/* ACWR */}
          <div className="px-3 py-3 text-center">
            <p className={`text-lg font-black ${acwrCfg.text}`}>
              {acwr?.toFixed(2) ?? '—'}
            </p>
            <p className="text-[9px] text-gray-400 font-medium">load</p>
          </div>
        </div>

        {/* ACWR context bar — only if we have data */}
        {acwr !== null && (
          <div className={`px-4 py-2 flex items-center gap-2 border-t border-gray-50 ${acwrCfg.bg}`}>
            <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  acwr > 1.3 ? 'bg-red-400' : acwr < 0.8 ? 'bg-blue-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, (acwr / 1.5) * 100)}%` }}
              />
            </div>
            <span className={`text-[10px] font-bold ${acwrCfg.text}`}>
              {acwrCfg.label} training load
            </span>
          </div>
        )}

        {/* Avg effort if available */}
        {avgEffort !== null && (
          <div className="px-4 py-2 border-t border-gray-50 flex items-center justify-between">
            <span className="text-[10px] text-gray-400">Avg effort this week</span>
            <div className="flex items-center gap-1.5">
              {[1,2,3,4,5,6,7,8,9,10].map(i => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    i <= Math.round(avgEffort)
                      ? avgEffort >= 8 ? 'bg-red-400' : avgEffort >= 6 ? 'bg-amber-400' : 'bg-emerald-400'
                      : 'bg-gray-100'
                  }`}
                />
              ))}
              <span className="text-[10px] font-bold text-gray-600 ml-1">{avgEffort}/10</span>
            </div>
          </div>
        )}
      </div>
    </a>
  )
}
