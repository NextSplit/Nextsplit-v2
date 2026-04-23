'use client'

import { useMemo, useState } from 'react'
import { useUnits, fmtDistance, secsPerKmToDisplay } from '@/lib/units'
import { secsToHMS, secsToMMSS } from '@/lib/sessionUtils'
import { logsArray, weeklyKm, calcACWR, paceToSecs, daysUntil, dayLabel, hmsToSecs, paceMinsPerKm, fmtRaceDate } from '@/lib/statsUtils'
import type { TrainingLog, PlanWeek } from '@/types/database'

function PaceTrend({ logs }: { logs: Record<string, TrainingLog> }) {
  const units = useUnits()
  const paceData = useMemo(() => {
    return logsArray(logs)
      .filter(l => l.done && l.pace && l.km && l.km >= 3)
      .map(l => ({ week: l.week_n, pace: paceToSecs(l.pace!), km: l.km! }))
      .sort((a, b) => a.week - b.week)
      .slice(-10)
  }, [logs])

  if (paceData.length < 2) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="text-sm font-bold text-gray-900 mb-1">Pace Trend</div>
        <p className="text-xs text-gray-400">Log runs with a pace to see your trend. Lower is faster.</p>
      </div>
    )
  }

  const maxPace = Math.max(...paceData.map(d => d.pace))
  const minPace = Math.min(...paceData.map(d => d.pace))
  const range = maxPace - minPace || 30

  // Simple SVG polyline
  const w = 280
  const h = 80
  const points = paceData.map((d, i) => {
    const x = (i / (paceData.length - 1)) * w
    const y = h - ((d.pace - minPace) / range) * h
    return `${x},${y}`
  }).join(' ')

  const latest = paceData[paceData.length - 1]
  const first = paceData[0]
  const improving = latest.pace < first.pace

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-sm font-bold text-gray-900">Pace Trend</div>
        <div className={`text-xs font-semibold ${improving ? 'text-[var(--ns-ember)]' : 'text-orange-500'}`}>
          {improving ? '↗ Getting faster' : '↘ Slower recently'}
        </div>
      </div>

      <svg viewBox={`-4 -4 ${w + 8} ${h + 8}`} className="w-full" style={{ height: '80px' }}>
        <polyline
          points={points}
          fill="none"
          stroke="var(--ns-cyan)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {paceData.map((d, i) => {
          const x = (i / (paceData.length - 1)) * w
          const y = h - ((d.pace - minPace) / range) * h
          return <circle key={i} cx={x} cy={y} r="3" fill="var(--ns-cyan)" />
        })}
      </svg>

      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>Slow ({secsPerKmToDisplay(maxPace, units)})</span>
        <span>Fast ({secsPerKmToDisplay(minPace, units)})</span>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        Latest: <span className="font-semibold text-gray-900">{secsPerKmToDisplay(latest.pace, units)}</span>
        <span className="text-gray-400"> · {fmtDistance(latest.km, units)}</span>
      </div>
    </div>
  )
}


export default PaceTrend
