'use client'

import { useEffect, useState } from 'react'

// PR G — Monday digest card on /coach dashboard.
//
// Reads from /api/coach/digest/recent which returns the most recent row
// from coach_digest_runs (BL-C4 cache). Renders:
//   · Header pill — period (e.g. 2026-W19) + relative delivered_at
//   · Headline — "X/Y on track · Z need a check-in"
//   · Per-athlete list — display_name + sessions_done/planned + km +
//     a coloured flag (on_track/behind/silent/no_plan)
//
// The cache is server-populated on Mondays via smart-notify; mid-week
// reads return last Monday's snapshot (no recompute). Empty state for
// new coaches whose first digest hasn't run yet.

interface AthleteSummary {
  athlete_id:       string
  display_name:     string
  sessions_done:    number
  sessions_planned: number
  total_km:         number
  missed_count:     number
  flag:             'on_track' | 'behind' | 'silent' | 'no_plan'
}

interface DigestPayload {
  coach_id:     string
  period:       string
  generated_at: string
  athletes:     AthleteSummary[]
  headline:     string
}

interface DigestRow {
  period:         string
  athlete_count:  number
  digest_payload: DigestPayload | null
  delivered_at:   string
}

const FLAG_STYLE: Record<AthleteSummary['flag'], { dot: string; label: string; tone: string }> = {
  on_track: { dot: '#00e676', label: 'On track',     tone: 'rgba(0,230,118,0.10)' },
  behind:   { dot: '#ffb800', label: 'Behind plan',  tone: 'rgba(255,184,0,0.10)' },
  silent:   { dot: '#ff3d6e', label: 'No log 7d',    tone: 'rgba(255,61,110,0.10)' },
  no_plan:  { dot: '#9aa4b8', label: 'No plan',      tone: 'rgba(154,164,184,0.10)' },
}

function timeAgo(iso: string): string {
  const ms   = Date.now() - new Date(iso).getTime()
  const hrs  = Math.floor(ms / 3_600_000)
  if (hrs < 1)  return 'just now'
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'yesterday'
  if (days < 7)   return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

export function MondayDigestCard() {
  const [digest, setDigest]   = useState<DigestRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/coach/digest/recent')
      .then(r => r.ok ? r.json() : { digest: null })
      .then(({ digest }) => { if (!cancelled) setDigest(digest as DigestRow | null) })
      .catch(() => { if (!cancelled) setDigest(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 animate-pulse"
        style={{ height: 92 }}
      />
    )
  }

  // Coach has had no digest yet (first Monday hasn't fired, or no athletes).
  // Skip rendering empty — the dashboard already has its own first-athlete
  // empty state, no need to double-stack.
  if (!digest || !digest.digest_payload) return null

  const payload = digest.digest_payload
  const athletes = payload.athletes ?? []

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--ns-violet)' }}>
            Monday digest · {payload.period}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
            {timeAgo(digest.delivered_at)}
          </p>
        </div>
        <p className="text-sm font-bold text-gray-900">{payload.headline}</p>
      </div>

      {athletes.length > 0 && (
        <>
          <div className={expanded ? '' : 'max-h-[180px] overflow-hidden'}>
            <ul>
              {athletes.map((a, i) => {
                const style = FLAG_STYLE[a.flag]
                return (
                  <li
                    key={a.athlete_id}
                    className="flex items-center gap-3 px-4 py-2.5"
                    style={{
                      background: i % 2 === 0 ? 'transparent' : 'var(--color-surface-2)',
                      borderTop: '1px solid var(--color-border)',
                    }}
                  >
                    <span
                      aria-hidden
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: style.dot, boxShadow: `0 0 0 4px ${style.tone}` }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{a.display_name}</p>
                      <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                        {a.sessions_done}/{a.sessions_planned} sessions · {a.total_km}km
                      </p>
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: style.tone, color: style.dot }}
                    >
                      {style.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
          {athletes.length > 3 && (
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              className="w-full px-4 py-2 text-[11px] font-bold border-t"
              style={{
                borderColor: 'var(--color-border)',
                color:       'var(--ns-violet)',
                background:  'var(--color-surface-2)',
              }}
            >
              {expanded ? 'Show less' : `Show all ${athletes.length} athletes`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
