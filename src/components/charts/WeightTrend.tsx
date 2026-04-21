'use client'

import { useMemo, useState } from 'react'
import { useUnits, fmtDistance, secsPerKmToDisplay } from '@/lib/units'
import { secsToHMS, secsToMMSS } from '@/lib/sessionUtils'
import { logsArray, weeklyKm, calcACWR, paceToSecs, daysUntil, dayLabel, hmsToSecs, paceMinsPerKm, fmtRaceDate } from '@/lib/statsUtils'
import type { TrainingLog, PlanWeek } from '@/types/database'
import { useWellness } from '@/hooks/useWellness'

function WeightTrend() {
  const { recent, loading } = useWellness()

  const weightLogs = recent
    .filter(l => l.weight_kg != null && l.weight_kg > 0)
    .map(l => ({ date: l.log_date, kg: l.weight_kg! }))
    .reverse()

  if (loading || weightLogs.length < 2) return null

  const weights = weightLogs.map(l => l.kg)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const range = max - min || 1
  const latest = weights[weights.length - 1]
  const first = weights[0]
  const delta = Math.round((latest - first) * 10) / 10
  const labels = weightLogs.map(l => dayLabel(l.date))

  // Simple linear trend line
  const n = weights.length
  const xMean = (n - 1) / 2
  const yMean = weights.reduce((a, b) => a + b, 0) / n
  const slope = weights.reduce((acc, y, i) => acc + (i - xMean) * (y - yMean), 0) /
    weights.reduce((acc, _, i) => acc + Math.pow(i - xMean, 2), 0)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-bold text-gray-900">Body weight</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {latest}kg · {weightLogs.length} entries
          </div>
        </div>
        <div className="text-right">
          <div className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            Math.abs(delta) < 0.3 ? 'bg-gray-100 text-gray-500' :
            delta < 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
          }`}>
            {delta > 0 ? `↑ +${delta}kg` : delta < 0 ? `↓ ${delta}kg` : '→ Stable'}
          </div>
          <div className="text-[9px] text-gray-400 mt-0.5">vs {weightLogs.length} days ago</div>
        </div>
      </div>

      {/* Weight chart */}
      <div className="relative h-20">
        <svg viewBox={`0 0 ${n * 20} 60`} className="w-full h-full" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 0.5, 1].map(pct => (
            <line key={pct} x1="0" y1={60 - pct * 52} x2={n * 20} y2={60 - pct * 52}
              stroke="#f3f4f6" strokeWidth="1" />
          ))}
          {/* Trend line */}
          <line
            x1="0"
            y1={60 - ((weights[0] + slope * 0 - min) / range) * 52}
            x2={n * 20}
            y2={60 - ((weights[0] + slope * (n - 1) - min) / range) * 52}
            stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="4,3"
          />
          {/* Weight line */}
          <polyline
            points={weights.map((w, i) => `${i * 20 + 10},${60 - ((w - min) / range) * 52}`).join(' ')}
            fill="none" stroke="var(--ns-forest)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
          />
          {/* Dots */}
          {weights.map((w, i) => (
            <circle key={i} cx={i * 20 + 10} cy={60 - ((w - min) / range) * 52}
              r={i === weights.length - 1 ? 3.5 : 2}
              fill={i === weights.length - 1 ? 'var(--ns-forest)' : '#CCFBF1'}
              stroke="var(--ns-forest)" strokeWidth="1.5"
            />
          ))}
        </svg>
      </div>

      {/* Min/max labels */}
      <div className="flex justify-between text-[9px] text-gray-400 mt-1">
        <span>{labels[0]}</span>
        <span>{min}–{max}kg range</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

// ─── Personal Bests Card ──────────────────────────────────────────────────────

export default WeightTrend
