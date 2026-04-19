'use client'

import { useMemo, useState } from 'react'
import { useUnits, fmtDistance, secsPerKmToDisplay } from '@/lib/units'
import { secsToHMS, secsToMMSS } from '@/lib/sessionUtils'
import { logsArray, weeklyKm, calcACWR, paceToSecs, daysUntil, dayLabel, hmsToSecs, paceMinsPerKm, fmtRaceDate } from '@/lib/statsUtils'
import type { TrainingLog, PlanWeek } from '@/types/database'

function ACWRChart({ logs, weeks }: { logs: Record<string, TrainingLog>; weeks: PlanWeek[] }) {
  const data = useMemo(() => calcACWR(logsArray(logs), weeks), [logs, weeks])

  if (data.length < 2) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="text-sm font-bold text-gray-900 mb-1">Training Load (ACWR)</div>
        <p className="text-xs text-gray-400">Log at least 2 weeks of sessions to see your acute:chronic workload ratio.</p>
        <div className="mt-3 p-3 bg-green-50 rounded-xl">
          <p className="text-xs text-green-700 font-medium">Target zone: 0.8 – 1.3</p>
          <p className="text-xs text-green-600 mt-0.5">Below 0.8 = undertraining · Above 1.5 = injury risk</p>
        </div>
      </div>
    )
  }

  const maxAcwr = Math.max(...data.map(d => d.acwr), 1.5)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div className="text-sm font-bold text-gray-900">Training Load</div>
        <div className="text-xs text-gray-400">ACWR</div>
      </div>

      <div className="relative h-28">
        {/* Zone bands */}
        <div className="absolute inset-0 flex flex-col justify-end pointer-events-none">
          <div className="bg-red-50 opacity-60" style={{ height: `${(maxAcwr - 1.3) / maxAcwr * 100}%` }} />
          <div className="bg-green-50 opacity-60" style={{ height: `${0.5 / maxAcwr * 100}%` }} />
          <div className="bg-yellow-50 opacity-60" style={{ height: `${0.3 / maxAcwr * 100}%` }} />
        </div>

        {/* Bars */}
        <div className="absolute inset-0 flex items-end gap-1">
          {data.map((d, i) => {
            const h = (d.acwr / maxAcwr) * 100
            const colour = d.acwr > 1.3 ? 'bg-red-400' : d.acwr < 0.8 ? 'bg-yellow-400' : 'bg-[#0D9488]'
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className={`w-full rounded-t-md ${colour}`}
                  style={{ height: `${Math.max(h, 2)}%` }}
                />
                <div className="text-[8px] text-gray-400">W{d.week}</div>
              </div>
            )
          })}
        </div>

        {/* 1.3 line */}
        <div
          className="absolute left-0 right-0 border-t-2 border-dashed border-red-300"
          style={{ bottom: `${(1.3 / maxAcwr) * 100}%` }}
        >
          <span className="absolute right-0 -top-4 text-[9px] text-red-400 font-medium">1.3</span>
        </div>
        {/* 1.0 line */}
        <div
          className="absolute left-0 right-0 border-t border-dashed border-gray-300"
          style={{ bottom: `${(1.0 / maxAcwr) * 100}%` }}
        >
          <span className="absolute right-0 -top-4 text-[9px] text-gray-400">1.0</span>
        </div>
      </div>

      {data.length > 0 && (
        <div className="mt-3 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500">Current ACWR: </span>
            <span className={`text-sm font-bold ${
              data[data.length - 1].acwr > 1.3 ? 'text-red-500' :
              data[data.length - 1].acwr < 0.8 ? 'text-yellow-500' : 'text-[#0D9488]'
            }`}>
              {data[data.length - 1].acwr.toFixed(2)}
            </span>
          </div>
          <div className="text-[10px] text-gray-400">
            {data[data.length - 1].acwr > 1.3 ? '⚠️ High load' :
             data[data.length - 1].acwr < 0.8 ? '📉 Low load' : '✅ Good zone'}
          </div>
        </div>
      )}
    </div>
  )
}


export default ACWRChart
