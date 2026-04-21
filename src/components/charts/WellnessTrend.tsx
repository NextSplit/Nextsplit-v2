'use client'

import { useMemo, useState } from 'react'
import { useUnits, fmtDistance, secsPerKmToDisplay } from '@/lib/units'
import { secsToHMS, secsToMMSS } from '@/lib/sessionUtils'
import { logsArray, dayLabel } from '@/lib/statsUtils'
import type { TrainingLog, PlanWeek } from '@/types/database'
import { useWellness } from '@/hooks/useWellness'
import { readinessScore } from '@/lib/wellness'

function trendBadge(delta: number) {
  if (delta > 0) return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">↑ +{delta}</span>
  if (delta < 0) return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500">↓ {delta}</span>
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">→ Stable</span>
}

function MiniSparkline({ values, max, colour }: { values: number[]; max: number; colour: string }) {
  return (
    <div className="flex items-end gap-0.5 h-8 flex-1">
      {values.map((v, i) => (
        <div key={i} className="flex-1 flex items-end" style={{ height: '100%' }}>
          <div
            className={`w-full rounded-t-sm ${colour} ${i === values.length - 1 ? 'opacity-100' : 'opacity-50'}`}
            style={{ height: `${Math.max((v / max) * 100, 10)}%` }}
          />
        </div>
      ))}
    </div>
  )
}

function WellnessTrend() {
  const { recent, loading } = useWellness()
  const [activeMetric, setActiveMetric] = useState<'readiness' | 'sleep' | 'soreness' | 'mood'>('readiness')

  const daily = recent.filter(l => l.log_type === 'daily')
  const last14 = [...daily].reverse().slice(-14)

  if (loading || last14.length < 2) return null

  const scores      = last14.map(l => readinessScore(l.sleep ?? 3, l.soreness ?? 2, l.mood ?? 4))
  const sleepVals   = last14.map(l => l.sleep ?? 3)
  const sorenessVals = last14.map(l => 6 - (l.soreness ?? 2)) // invert: low soreness = good
  const moodVals    = last14.map(l => l.mood ?? 4)
  const labels      = last14.map(l => dayLabel(l.log_date))

  const metrics = {
    readiness: { values: scores,       max: 10, label: 'Readiness', colour: 'bg-[var(--ns-forest)]', unit: '/10' },
    sleep:     { values: sleepVals,    max: 5,  label: 'Sleep',     colour: 'bg-indigo-400', unit: '/5' },
    soreness:  { values: sorenessVals, max: 5,  label: 'Freshness', colour: 'bg-amber-400',  unit: '/5' },
    mood:      { values: moodVals,     max: 5,  label: 'Mood',      colour: 'bg-violet-400', unit: '/5' },
  }

  const m = metrics[activeMetric]
  const avg = Math.round(m.values.reduce((a, b) => a + b, 0) / m.values.length * 10) / 10
  const delta = Math.round(m.values[m.values.length - 1] - m.values[0])

  // Weekly averages (last 4 weeks)
  const weeklyAvgs = Array.from({ length: 4 }, (_, wi) => {
    const weekLogs = daily.filter(l => {
      const daysAgo = Math.floor((Date.now() - new Date(l.log_date).getTime()) / 86400000)
      return daysAgo >= wi * 7 && daysAgo < (wi + 1) * 7
    })
    if (weekLogs.length === 0) return null
    const vals = weekLogs.map(l => readinessScore(l.sleep ?? 3, l.soreness ?? 2, l.mood ?? 4))
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10
  }).reverse()

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-gray-900">Wellness</div>
          <div className="text-xs text-gray-400 mt-0.5">Last {last14.length} days</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-black text-gray-900">{avg}<span className="text-xs text-gray-400 font-normal">{m.unit}</span></span>
          {trendBadge(delta)}
        </div>
      </div>

      {/* Metric tabs */}
      <div className="flex px-5 gap-1 mb-3">
        {(Object.keys(metrics) as Array<keyof typeof metrics>).map(key => (
          <button
            key={key}
            onClick={() => setActiveMetric(key)}
            className={`flex-1 py-1 rounded-lg text-[10px] font-semibold transition-all ${
              activeMetric === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {metrics[key].label}
          </button>
        ))}
      </div>

      {/* Main sparkline */}
      <div className="px-5 pb-1">
        <div className="flex items-end gap-1 h-16">
          {m.values.map((v, i) => {
            const pct = (v / m.max) * 100
            const isLatest = i === m.values.length - 1
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full flex items-end" style={{ height: '48px' }}>
                  <div
                    className={`w-full rounded-t-sm transition-all ${
                      isLatest ? m.colour :
                      pct >= 70 ? 'bg-emerald-200' :
                      pct >= 50 ? 'bg-amber-200' : 'bg-red-200'
                    }`}
                    style={{ height: `${Math.max(pct, 6)}%` }}
                  />
                </div>
                <span className="text-[8px] text-gray-300">{labels[i]}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Weekly summary row */}
      <div className="border-t border-gray-50 px-5 py-3 grid grid-cols-4 gap-2">
        {weeklyAvgs.map((avg, i) => (
          <div key={i} className="text-center">
            <div className={`text-sm font-bold ${avg === null ? 'text-gray-200' : avg >= 7 ? 'text-emerald-600' : avg >= 5 ? 'text-amber-500' : 'text-red-400'}`}>
              {avg ?? '—'}
            </div>
            <div className="text-[9px] text-gray-400">{i === 3 ? 'This wk' : i === 2 ? 'Last wk' : `${(3 - i) * 7}d ago`}</div>
          </div>
        ))}
      </div>

      {/* Mini breakdown when viewing readiness */}
      {activeMetric === 'readiness' && last14.length > 0 && (() => {
        const latest = last14[last14.length - 1]
        return (
          <div className="border-t border-gray-50 px-5 py-3 grid grid-cols-3 gap-3">
            {[
              { label: 'Sleep', val: latest.sleep ?? 3, max: 5, colour: 'bg-indigo-300' },
              { label: 'Freshness', val: 6 - (latest.soreness ?? 2), max: 5, colour: 'bg-amber-300' },
              { label: 'Mood', val: latest.mood ?? 4, max: 5, colour: 'bg-violet-300' },
            ].map(({ label, val, max, colour }) => (
              <div key={label}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] text-gray-400">{label}</span>
                  <span className="text-[9px] font-bold text-gray-600">{val}/{max}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${colour} rounded-full`} style={{ width: `${(val / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}

// ─── Weight Trend ──────────────────────────────────────────────────────────────

export default WellnessTrend
