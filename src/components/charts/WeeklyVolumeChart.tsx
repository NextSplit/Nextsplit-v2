'use client'

import { useMemo, useState } from 'react'
import { useUnits, fmtDistance, secsPerKmToDisplay } from '@/lib/units'
import { secsToHMS, secsToMMSS } from '@/lib/sessionUtils'
import { logsArray, weeklyKm, calcACWR, paceToSecs, daysUntil, dayLabel, hmsToSecs, paceMinsPerKm, fmtRaceDate } from '@/lib/statsUtils'
import type { TrainingLog, PlanWeek } from '@/types/database'

function WeeklyVolumeChart({ logs, weeks }: { logs: Record<string, TrainingLog>; weeks: PlanWeek[] }) {
  const km = weeklyKm(logsArray(logs))
  const recentWeeks = weeks.slice(-8)
  const maxKm = Math.max(...recentWeeks.map(w => Math.max(km[w.n] ?? 0, w.kl[0])), 1)

  if (recentWeeks.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--color-border)] p-5">
        <div className="text-sm font-bold text-gray-900 mb-1">Weekly Volume</div>
        <div className="text-xs text-[var(--color-text-tertiary)]">No weeks to show yet</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-[var(--color-border)] p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div className="text-sm font-bold text-gray-900">Weekly Volume</div>
        <div className="text-xs text-[var(--color-text-tertiary)]">last 8 weeks</div>
      </div>

      <div className="flex items-end gap-1.5 h-28">
        {recentWeeks.map(week => {
          const actual = km[week.n] ?? 0
          const planned = week.kl[0]
          const actualH = (actual / maxKm) * 100
          const plannedH = (planned / maxKm) * 100
          const isCurrent = week.b !== 'd' // not a deload

          return (
            <div key={week.n} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full relative flex items-end" style={{ height: '88px' }}>
                {/* Planned bar (ghost) */}
                <div
                  className="absolute bottom-0 w-full rounded-t-lg bg-[var(--color-surface-2)]"
                  style={{ height: `${plannedH}%` }}
                />
                {/* Actual bar */}
                {actual > 0 && (
                  <div
                    className={`absolute bottom-0 w-full rounded-t-lg transition-all ${
                      week.b === 'd' ? 'bg-orange-300' : week.b === 'r' ? 'bg-yellow-400' : 'bg-[var(--ns-ember)]'
                    }`}
                    style={{ height: `${actualH}%` }}
                  />
                )}
              </div>
              <div className="text-[9px] text-[var(--color-text-tertiary)]">W{week.n}</div>
              {actual > 0 && (
                <div className="text-[9px] font-semibold text-[var(--color-text-secondary)]">{Math.round(actual)}</div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-3 mt-3">
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm bg-[var(--ns-ember)]" />
          <span className="text-[10px] text-[var(--color-text-tertiary)]">Logged</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm bg-[var(--color-surface-2)]" />
          <span className="text-[10px] text-[var(--color-text-tertiary)]">Planned</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm bg-orange-300" />
          <span className="text-[10px] text-[var(--color-text-tertiary)]">Deload</span>
        </div>
      </div>
    </div>
  )
}


export default WeeklyVolumeChart
