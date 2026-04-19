'use client'



function CalorieRing({ actual, target }: { actual: number; target: number }) {
  const pct = target > 0 ? Math.min(actual / target, 1) : 0
  const r = 34
  const circ = 2 * Math.PI * r
  const dash = pct * circ
  const colour = pct > 1.05 ? '#EF4444' : pct >= 0.9 ? '#10B981' : '#0D9488'

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20">
        <svg width="80" height="80" className="-rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#f3f4f6" strokeWidth="7" />
          <circle cx="40" cy="40" r={r} fill="none" stroke={colour} strokeWidth="7"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-black text-gray-900">{target > 0 ? Math.round(actual) : '—'}</span>
          <span className="text-[8px] text-gray-400">kcal</span>
        </div>
      </div>
      {target > 0 && (
        <span className="text-[9px] text-gray-400 mt-0.5">of {target}</span>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────


export default CalorieRing
