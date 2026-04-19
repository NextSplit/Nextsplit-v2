'use client'

import { useMemo, useState } from 'react'
import { useUnits, fmtDistance, secsPerKmToDisplay } from '@/lib/units'
import { secsToHMS, secsToMMSS } from '@/lib/sessionUtils'
import { logsArray, weeklyKm, calcACWR, paceToSecs, daysUntil, dayLabel, hmsToSecs, paceMinsPerKm, fmtRaceDate } from '@/lib/statsUtils'
import type { TrainingLog, PlanWeek } from '@/types/database'

function TrainingZones({ logs }: { logs: Record<string, TrainingLog> }) {
  // Estimate threshold pace from tempo/interval sessions
  const thresholdPaces = logsArray(logs)
    .filter(l => l.done && l.pace && (l.week_n !== undefined))
    .map(l => paceToSecs(l.pace!))
    .filter(p => p > 0)

  if (thresholdPaces.length === 0) return null

  const avgPace = thresholdPaces.reduce((a, b) => a + b, 0) / thresholdPaces.length
  // Estimate threshold as ~90% of average logged pace (heuristic)
  const threshPace = Math.round(avgPace * 0.9)

  const zones = [
    { zone: 1, name: 'Easy / Recovery', paceMin: threshPace + 90, paceMax: threshPace + 150, colour: 'bg-blue-100 text-blue-700', effort: '60–70%' },
    { zone: 2, name: 'Aerobic base', paceMin: threshPace + 45, paceMax: threshPace + 90, colour: 'bg-green-100 text-green-700', effort: '70–80%' },
    { zone: 3, name: 'Tempo / LT1', paceMin: threshPace + 15, paceMax: threshPace + 45, colour: 'bg-yellow-100 text-yellow-700', effort: '80–87%' },
    { zone: 4, name: 'Threshold / LT2', paceMin: Math.max(60, threshPace - 15), paceMax: threshPace + 15, colour: 'bg-orange-100 text-orange-700', effort: '87–92%' },
    { zone: 5, name: 'VO2 max / Intervals', paceMin: Math.max(30, threshPace - 60), paceMax: Math.max(60, threshPace - 15), colour: 'bg-red-100 text-red-700', effort: '92–100%' },
  ]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-sm font-bold text-gray-900">Training Zones</div>
        <div className="text-[10px] text-gray-400">estimated from your paces</div>
      </div>
      <p className="text-xs text-gray-400 mb-4">Based on {thresholdPaces.length} logged runs · adjust to your HR zones if possible</p>
      <div className="space-y-2">
        {zones.map(z => (
          <div key={z.zone} className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${z.colour}`}>
              Z{z.zone}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-800">{z.name}</div>
              <div className="text-[10px] text-gray-400">{z.effort} max HR</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs font-mono text-gray-700">
                {secsToMMSS(z.paceMin)}–{secsToMMSS(z.paceMax)}
              </div>
              <div className="text-[10px] text-gray-400">/km</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Pace Calculator ──────────────────────────────────────────────────────────


export default TrainingZones
