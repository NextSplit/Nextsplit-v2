'use client'

interface Props {
  coachCreatedAt: string | null | undefined
  onInvite:       () => void
}

// P3.7 first-athlete-by-day-7 milestone tracker. Shows days since coach
// signup. Tone progresses: warm copy 0-7d, urgent copy 8-14d, gentle
// reminder 15+d.
export function DashboardEmptyState({ coachCreatedAt, onInvite }: Props) {
  const daysSince = coachCreatedAt
    ? Math.floor((Date.now() - new Date(coachCreatedAt).getTime()) / (24 * 3600 * 1000))
    : null
  const goalCopy =
    daysSince === null  ? 'Start coaching'
    : daysSince <= 7    ? `Day ${daysSince + 1} · invite your first athlete this week`
    : daysSince <= 14   ? `${daysSince} days in — your first athlete is the hardest`
    :                     `${daysSince} days as a coach — first invite goes a long way`

  return (
    <div className="bg-white rounded-2xl border border-[var(--color-border)] p-8 text-center">
      <div className="text-4xl mb-3">👥</div>
      <p
        className="text-[10px] font-black uppercase tracking-widest mb-2"
        style={{ color: daysSince !== null && daysSince > 7 ? '#d97706' : 'var(--ns-violet)' }}
      >
        {goalCopy}
      </p>
      <h3 className="text-sm font-bold text-gray-900 mb-1">No athletes yet</h3>
      <p className="text-xs text-[var(--color-text-tertiary)] mb-4">
        Each invite link is single-use and expires in 7 days. Generate one to share.
      </p>
      <button
        onClick={onInvite}
        className="text-xs font-bold px-4 py-2 rounded-xl text-white"
        style={{ background: 'var(--ns-violet)' }}
      >
        Generate invite link →
      </button>
    </div>
  )
}
