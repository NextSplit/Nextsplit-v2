// Small chart primitives used by AthleteDetailClient. Extracted in P1.0 / A1
// (council /council 2026-05-07). The full 4-section split (AthleteHeader /
// PlanHistorySection / TrainingLogTimeline / CommentsSection) was deferred —
// the parent file is 581 lines with tab state and message scheduling that
// would need careful state-prop plumbing to split safely without a local
// typecheck loop. This minimal extraction is the literal-file-split shape
// applied at L2 (LogModal/inputs.tsx) — pure presentational components, no
// behaviour change, ~30 lines removed from the parent.

export function Sparkline({ values, colour }: { values: number[]; colour: string }) {
  if (values.length < 2) return <span className="text-xs text-[var(--color-text-tertiary)]">—</span>
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 60
  const h = 24
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={colour} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function WeeklyACWRBar({ week, acwr }: { week: number; acwr: number }) {
  const colour = acwr > 1.3 ? '#ef4444' : acwr < 0.8 ? '#f59e0b' : '#8b5cf6'
  const height = Math.min(Math.round(acwr * 30), 60)
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex items-end" style={{ height: 60 }}>
        <div className="w-5 rounded-t-sm transition-all"
          style={{ height, background: colour, opacity: 0.85 }} />
      </div>
      <span className="text-[8px] text-[var(--color-text-tertiary)]">W{week}</span>
    </div>
  )
}
