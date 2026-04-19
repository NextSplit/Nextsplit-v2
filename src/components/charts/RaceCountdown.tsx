'use client'

import { useMemo, useState } from 'react'
import { useUnits, fmtDistance, secsPerKmToDisplay } from '@/lib/units'
import { secsToHMS, secsToMMSS } from '@/lib/sessionUtils'
import { logsArray, weeklyKm, calcACWR, paceToSecs, daysUntil, dayLabel, hmsToSecs, paceMinsPerKm, fmtRaceDate } from '@/lib/statsUtils'
import type { TrainingLog, PlanWeek } from '@/types/database'

function RaceCountdown({ raceDate, planName }: { raceDate: string; planName: string }) {
  const days = daysUntil(raceDate)
  const weeks = Math.floor(days / 7)
  const remaining = days % 7

  const urgency = days <= 14 ? 'text-red-500' : days <= 42 ? 'text-orange-500' : 'text-[#0D9488]'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-[#0D9488] to-[#0891B2] px-5 py-4">
        <div className="text-xs font-semibold text-teal-100 uppercase tracking-wide mb-1">Race Day</div>
        <div className="text-white font-bold text-base">{planName}</div>
        <div className="text-teal-100 text-xs mt-0.5">{fmtRaceDate(raceDate)}</div>
      </div>
      <div className="px-5 py-4 flex items-center justify-between">
        <div>
          <div className={`text-4xl font-black ${urgency}`}>{days}</div>
          <div className="text-xs text-gray-400 mt-0.5">days to go</div>
        </div>
        <div className="text-right">
          {weeks > 0 && (
            <div className="text-sm font-semibold text-gray-700">
              {weeks}w {remaining}d
            </div>
          )}
          <div className="text-xs text-gray-400 mt-0.5">
            {days <= 0 ? '🏁 Race day!' : days === 1 ? 'Tomorrow!' : 'remaining'}
          </div>
        </div>
        <div className="w-16 h-16 relative">
          <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F0FDFA" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.9" fill="none"
              stroke="#0D9488" strokeWidth="3"
              strokeDasharray={`${Math.max(0, Math.min(100, (1 - Math.max(days, 0) / Math.max(daysUntil(raceDate) + days, 1)) * 100))} 100`}
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}


export default RaceCountdown
