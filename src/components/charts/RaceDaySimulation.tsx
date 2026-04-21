'use client'

import { useMemo, useState } from 'react'
import { computeRacePredictions, RACE_DISTANCES } from '@/lib/statsUtils'
import type { TrainingLog } from '@/types/database'

interface Props {
  logs:              Record<string, TrainingLog>
  targetDistanceKm?: number  // from the user's plan race distance
  raceDate?:         string
}

const CONFIDENCE_CONFIG = {
  high:   { label: 'High confidence',   colour: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  medium: { label: 'Medium confidence', colour: 'text-amber-600 bg-amber-50 border-amber-200'       },
  low:    { label: 'Low confidence',    colour: 'text-gray-500 bg-[#f8f8f6] border-gray-200'        },
}

export default function RaceDaySimulation({ logs, targetDistanceKm, raceDate }: Props) {
  const logsArr = useMemo(() => Object.values(logs), [logs])
  const [focusKm, setFocusKm] = useState<number>(targetDistanceKm ?? 42.195)

  const { predictions, basedOn, confidence } = useMemo(
    () => computeRacePredictions(logsArr, undefined),
    [logsArr]
  )

  const focusPred = predictions.find(p => p.km === focusKm) ?? predictions[predictions.length - 1]

  if (predictions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center space-y-2">
        <div className="text-3xl">🔮</div>
        <p className="text-sm font-bold text-gray-800">Race day simulation</p>
        <p className="text-xs text-gray-400 leading-relaxed">
          Log at least 3 runs with pace data to see your predicted finish times across all distances.
        </p>
      </div>
    )
  }

  const cfgConf = CONFIDENCE_CONFIG[confidence]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">🔮 Race day simulation</p>
            {basedOn && (
              <p className="text-[10px] text-gray-400 mt-0.5">Based on sessions to {basedOn}</p>
            )}
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${cfgConf.colour}`}>
            {cfgConf.label}
          </span>
        </div>
      </div>

      {/* Distance selector */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto border-b border-gray-50">
        {RACE_DISTANCES.map(d => (
          <button
            key={d.km}
            onClick={() => setFocusKm(d.km)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
              focusKm === d.km
                ? 'bg-[var(--ns-forest)] text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Main prediction — focus distance */}
      {focusPred && (
        <div className="px-4 py-5 text-center space-y-1 border-b border-gray-50">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            {focusPred.distance} prediction
          </p>
          <p className="text-4xl font-black text-gray-900 tracking-tight">
            {focusPred.realistic}
          </p>
          <p className="text-xs text-gray-400">
            at {focusPred.pacePerKm}/km average pace
          </p>
          {/* Pessimistic / Optimistic range */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <div className="text-center">
              <p className="text-sm font-bold text-red-500">{focusPred.pessimistic}</p>
              <p className="text-[9px] text-gray-400">tough day</p>
            </div>
            <div className="w-px h-8 bg-gray-100" />
            <div className="text-center">
              <p className="text-sm font-bold text-[var(--ns-forest)] text-lg font-black">{focusPred.realistic}</p>
              <p className="text-[9px] text-gray-400">expected</p>
            </div>
            <div className="w-px h-8 bg-gray-100" />
            <div className="text-center">
              <p className="text-sm font-bold text-emerald-500">{focusPred.optimistic}</p>
              <p className="text-[9px] text-gray-400">best day</p>
            </div>
          </div>
        </div>
      )}

      {/* All distances summary */}
      <div className="divide-y divide-gray-50">
        {predictions.map(p => (
          <button
            key={p.km}
            onClick={() => setFocusKm(p.km)}
            className={`w-full flex items-center justify-between px-4 py-3 transition-all ${
              focusKm === p.km ? 'bg-[var(--ns-forest-light)]' : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold w-24 text-left ${focusKm === p.km ? 'text-[var(--ns-forest)]' : 'text-gray-700'}`}>
                {p.distance}
              </span>
              <span className="text-[10px] text-gray-400">{p.pacePerKm}/km</span>
            </div>
            <div className="flex items-center gap-3 text-right">
              <span className="text-[10px] text-red-400">{p.pessimistic}</span>
              <span className={`text-sm font-black ${focusKm === p.km ? 'text-[var(--ns-forest)]' : 'text-gray-800'}`}>
                {p.realistic}
              </span>
              <span className="text-[10px] text-emerald-500">{p.optimistic}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Footer note */}
      <div className="px-4 py-3 bg-gray-50">
        <p className="text-[10px] text-gray-400 leading-relaxed text-center">
          Riegel formula · predictions improve with more logged sessions · assumes race-day conditions
        </p>
      </div>
    </div>
  )
}
