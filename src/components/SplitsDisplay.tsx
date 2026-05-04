'use client'

import { useState } from 'react'
import { secsToMMSS } from '@/lib/sessionUtils'


export default function SplitsDisplay({ splits }: {
  splits: Array<{ distance: number; elapsed_time: number; moving_time: number; pace?: string }>
}) {
  const [open, setOpen] = useState(false)
  if (splits.length === 0) return null

  const withPace = splits.map((s, i) => {
    const distKm = s.distance / 1000
    const paceSecs = distKm > 0 ? s.moving_time / distKm : 0
    return { ...s, distKm, paceSecs, lapNum: i + 1 }
  })
  const paces = withPace.map(s => s.paceSecs).filter(p => p > 0)
  const minPace = Math.min(...paces)
  const maxPace = Math.max(...paces)

  return (
    <div className="mt-2">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="flex items-center gap-1 text-[10px] text-orange-500 font-semibold"
      >
        <svg viewBox="0 0 24 24" fill="#f97316" className="w-3 h-3">
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
        </svg>
        {open ? 'Hide' : 'Show'} splits ({splits.length} laps)
      </button>
      {open && (
        <div className="mt-2 space-y-1" onClick={e => e.stopPropagation()}>
          {withPace.map(s => {
            const pctFromFastest = maxPace > minPace ? (s.paceSecs - minPace) / (maxPace - minPace) : 0
            const barColour = pctFromFastest < 0.33 ? 'bg-emerald-400' : pctFromFastest < 0.66 ? 'bg-amber-400' : 'bg-red-400'
            return (
              <div key={s.lapNum} className="flex items-center gap-2">
                <span className="text-[9px] text-[var(--color-text-tertiary)] w-6 shrink-0">km {s.lapNum}</span>
                <div className="flex-1 h-1.5 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
                  <div className={`h-full ${barColour} rounded-full`} style={{ width: `${Math.max(20, (1 - pctFromFastest) * 100)}%` }} />
                </div>
                <span className="text-[9px] font-mono text-[var(--color-text-secondary)] w-12 text-right shrink-0">
                  {s.paceSecs > 0 ? secsToMMSS(s.paceSecs) + '/km' : '—'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
