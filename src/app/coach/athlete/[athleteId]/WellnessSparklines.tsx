'use client'

import { Sparkline } from './charts'

// BL-X3 — extracted from AthleteDetailClient. Wellness trend strip:
// 30-day sparklines for Sleep / Soreness / Mood with rolling averages.
// Renders nothing when there's < 4 wellness logs (the "trend" doesn't
// look like a trend yet — same gate as the original inline block).

interface Props {
  sleepVals:    number[]
  sorenessVals: number[]
  moodVals:     number[]
  wellnessCount: number   // for the >3 gate; passed in to avoid threading wellness[] through
}

function avg(xs: number[]): string {
  return xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : '—'
}

export function WellnessSparklines({ sleepVals, sorenessVals, moodVals, wellnessCount }: Props) {
  if (wellnessCount <= 3) return null

  const items = [
    { label: 'Sleep',    values: sleepVals,    colour: '#6366f1' },
    { label: 'Soreness', values: sorenessVals, colour: '#f59e0b' },
    { label: 'Mood',     values: moodVals,     colour: '#10b981' },
  ]

  return (
    <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4">
      <p className="text-xs font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3">
        Wellness trend (30 days)
      </p>
      <div className="grid grid-cols-3 gap-4">
        {items.map(w => (
          <div key={w.label} className="text-center">
            <p className="text-[10px] text-[var(--color-text-tertiary)] mb-1">{w.label}</p>
            <Sparkline values={w.values} colour={w.colour} />
            <p className="text-xs font-bold text-gray-700 mt-1">{avg(w.values)}/5</p>
          </div>
        ))}
      </div>
    </div>
  )
}
