'use client'

interface Props {
  today:                string
  athletesCount:        number
  needsAttentionCount:  number
  onTrackCount:         number
  isCoachPro:           boolean
  loading:              boolean
  onInvite:             () => void
  onBroadcast:          () => void
  onRefresh:            () => void
}

export function DashboardHeader({
  today, athletesCount, needsAttentionCount, onTrackCount, isCoachPro, loading,
  onInvite, onBroadcast, onRefresh,
}: Props) {
  return (
    <div className="bg-white border-b border-[var(--color-border)] px-4 pt-12 pb-4 sticky top-0 z-40">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-lg font-black text-gray-900">Dashboard</h1>
            <p className="text-xs text-[var(--color-text-tertiary)]">{today}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onRefresh} className="text-[var(--color-text-tertiary)] text-lg px-1.5">↻</button>
            {athletesCount > 0 && isCoachPro && (
              <button
                onClick={onBroadcast}
                className="text-[var(--color-text-secondary)] text-sm font-bold px-3 py-2 rounded-xl border border-[var(--color-border-2)] active:bg-gray-50"
                title="Bulk broadcast (Coach-Pro)"
              >
                📢
              </button>
            )}
            {athletesCount > 0 && !isCoachPro && (
              <a
                href="/coach/settings#coach-pro"
                className="text-[var(--color-text-tertiary)] text-sm font-bold px-3 py-2 rounded-xl border border-[var(--color-border-2)] active:bg-gray-50"
                title="Bulk broadcast — upgrade to Coach-Pro"
              >
                📢⭐
              </a>
            )}
            <button
              onClick={onInvite}
              className="text-white text-sm font-bold px-4 py-2 rounded-xl active:scale-95"
              style={{ background: 'var(--ns-violet)' }}
            >
              + Invite
            </button>
          </div>
        </div>

        {!loading && athletesCount > 0 && (
          <div className="flex items-center gap-3 mt-2">
            {needsAttentionCount > 0 && (
              <span className="text-[11px] font-bold text-red-400 bg-red-900/20 px-2 py-1 rounded-lg">
                {needsAttentionCount} need{needsAttentionCount === 1 ? 's' : ''} attention
              </span>
            )}
            {onTrackCount > 0 && (
              <span className="text-[11px] font-semibold text-emerald-600">
                {onTrackCount} on track ✓
              </span>
            )}
            <span className="text-[11px] text-[var(--color-text-tertiary)] ml-auto">
              {athletesCount} athlete{athletesCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
