'use client'

export function TrainStatsStrip({ weeklyKm, acwr, streak }: { weeklyKm: number; acwr: number | null; streak: number }) {
  const acwrColor = !acwr ? '#9ca3af'
    : acwr < 0.8  ? '#3b82f6'
    : acwr <= 1.3 ? '#22c55e'
    : acwr <= 1.5 ? '#f97316'
    : '#ef4444'

  return (
    <div className="flex gap-2">
      <div className="flex-1 rounded-xl py-3 text-center"
        style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)' }}>
        <p className="text-lg font-black" style={{ color: '#2563eb' }}>{weeklyKm.toFixed(1)}</p>
        <p className="text-[9px] mt-0.5 font-medium" style={{ color: 'var(--color-text-tertiary)' }}>km this week</p>
      </div>
      <div className="flex-1 rounded-xl py-3 text-center"
        style={{ background: `${acwrColor}10`, border: `1px solid ${acwrColor}30` }}>
        <p className="text-lg font-black" style={{ color: acwrColor }}>{acwr?.toFixed(2) ?? '—'}</p>
        <p className="text-[9px] mt-0.5 font-medium" style={{ color: 'var(--color-text-tertiary)' }}>ACWR load</p>
      </div>
      <div className="flex-1 rounded-xl py-3 text-center"
        style={{ background: streak > 0 ? 'rgba(255,77,109,0.08)' : 'rgba(156,163,175,0.06)', border: streak > 0 ? '1px solid rgba(255,77,109,0.2)' : '1px solid rgba(156,163,175,0.1)' }}>
        <p className="text-lg font-black" style={{ color: streak > 0 ? '#ff4d6d' : '#9ca3af' }}>{streak > 0 ? `🔥 ${streak}` : '—'}</p>
        <p className="text-[9px] mt-0.5 font-medium" style={{ color: 'var(--color-text-tertiary)' }}>day streak</p>
      </div>
    </div>
  )
}
