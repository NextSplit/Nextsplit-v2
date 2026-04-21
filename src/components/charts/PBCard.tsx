'use client'

import { useMemo, useState } from 'react'
import { useUnits, fmtDistance, secsPerKmToDisplay } from '@/lib/units'
import { secsToHMS, secsToMMSS } from '@/lib/sessionUtils'
import { logsArray, fmtPaceForUnits } from '@/lib/statsUtils'
import { computePersonalBests } from '@/lib/personalBests'
import type { TrainingLog, PlanWeek } from '@/types/database'

function PBCard({ logs }: { logs: Record<string, TrainingLog> }) {
  const pbs = useMemo(() => computePersonalBests(Object.values(logs)), [logs])
  const units = useUnits()
  const PB_SLOTS = ['5K', '10K', 'Half', 'Marathon']

  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🏆</span>
        <h3 className="text-sm font-bold text-gray-900">Personal Bests</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {PB_SLOTS.map(dist => {
          const pb = pbs.find(p => p.distance === dist)
          return (
            <div key={dist} className={`rounded-xl p-3 ${pb ? 'bg-[var(--ns-forest-light)] border border-teal-100' : 'bg-gray-50 border border-gray-100'}`}>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">{dist}</div>
              {pb ? (
                <>
                  <div className="text-lg font-black text-gray-900 leading-tight">{pb.timeStr}</div>
                  <div className="text-[10px] text-[var(--ns-forest)] font-medium">{fmtPaceForUnits(pb.pacePerKm, units)}</div>
                  <div className="text-[9px] text-gray-400 mt-0.5">Week {pb.weekN}</div>
                </>
              ) : (
                <div className="text-sm font-bold text-gray-300 mt-1">—</div>
              )}
            </div>
          )
        })}
      </div>
      {pbs.length === 0 && (
        <p className="text-xs text-gray-400 text-center mt-2">Log runs with pace to set personal bests</p>
      )}
    </div>
  )
}


export default PBCard
