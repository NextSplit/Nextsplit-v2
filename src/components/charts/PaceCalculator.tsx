'use client'

import { useMemo, useState } from 'react'
import { useUnits, fmtDistance, secsPerKmToDisplay } from '@/lib/units'
import { secsToHMS, secsToMMSS } from '@/lib/sessionUtils'
import { logsArray, weeklyKm, calcACWR, paceToSecs, daysUntil, dayLabel, hmsToSecs, paceMinsPerKm, fmtRaceDate } from '@/lib/statsUtils'
import type { TrainingLog, PlanWeek } from '@/types/database'

function PaceCalculator() {
  const [mode, setMode] = useState<'time→pace'|'pace→time'>('time→pace')
  const [dist, setDist] = useState<number|''>(42.195)
  const [timeInput, setTimeInput] = useState('')
  const [paceInput, setPaceInput] = useState('')

  let result: string | null = null
  if (mode === 'time→pace' && timeInput && dist) {
    const s = hmsToSecs(timeInput); if (s > 0) result = paceMinsPerKm(s, Number(dist))
  }
  if (mode === 'pace→time' && paceInput && dist) {
    const ps = hmsToSecs(paceInput); if (ps > 0) result = secsToHMS(Math.round(ps * Number(dist)))
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-[var(--ns-forest)] to-[#0891B2] px-5 py-4">
        <div className="text-xs font-semibold text-orange-50 uppercase tracking-wide mb-1">Pace Calculator</div>
        <div className="text-white font-bold text-sm">Race time ↔ min/km pace</div>
      </div>
      <div className="p-5">
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          {(['time→pace','pace→time'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              {m === 'time→pace' ? 'Time → Pace' : 'Pace → Time'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {[{l:'5K',d:5},{l:'10K',d:10},{l:'HM',d:21.0975},{l:'Mar',d:42.195}].map(p => (
            <button key={p.l} onClick={() => setDist(p.d)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${dist === p.d ? 'bg-[var(--ns-ember)] text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}>
              {p.l}
            </button>
          ))}
          <input type="number" value={dist} onChange={e => setDist(e.target.value === '' ? '' : Number(e.target.value))} placeholder="km"
            className="w-16 border border-gray-200 rounded-full px-2.5 py-1 text-[11px] text-center focus:outline-none focus:ring-1 focus:ring-[var(--ns-ember)]" />
        </div>
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">
            {mode === 'time→pace' ? 'Race time (h:mm:ss or m:ss)' : 'Target pace (m:ss per km)'}
          </label>
          <input value={mode === 'time→pace' ? timeInput : paceInput}
            onChange={e => mode === 'time→pace' ? setTimeInput(e.target.value) : setPaceInput(e.target.value)}
            placeholder={mode === 'time→pace' ? 'e.g. 3:45:00' : 'e.g. 5:20'}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--ns-ember)]" />
        </div>
        {result && (
          <div className="bg-[var(--ns-ember-light)] border border-orange-50 rounded-xl px-4 py-3 text-center">
            <div className="text-[10px] text-[var(--ns-ember)] uppercase tracking-wide mb-0.5">{mode === 'time→pace' ? 'Average pace' : 'Finish time'}</div>
            <div className="text-2xl font-black text-[var(--ns-ember)]">{result}</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Wellness Trend ───────────────────────────────────────────────────────────

// ─── Wellness Dashboard ────────────────────────────────────────────────────────


export default PaceCalculator
