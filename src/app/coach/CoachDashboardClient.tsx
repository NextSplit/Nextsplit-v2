'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { CoachProfile } from '@/types/database'
import { RUNNER_CLASSES, type RunnerClassId } from '@/lib/rpg'
import { MondayDigestCard } from '@/components/coach/MondayDigestCard'
import { InviteModal } from '@/components/coach/InviteModal'
import { BroadcastModal } from '@/components/coach/BroadcastModal'
import { AthleteCard } from '@/components/coach/AthleteCard'
import { DashStatTile } from '@/components/coach/DashStatTile'
import type { AthleteStatus, AthleteFilter } from '@/components/coach/types'

export default function CoachDashboardClient({ coachProfile }: { coachProfile: CoachProfile }) {
  // OQ#2 = C — Coach-Pro gate. Server-side enforcement lives on each
  // gated API route; this is the cosmetic UI gate that hides the bulk
  // broadcast button for free Split Leaders so they don't tap into a 403.
  const cp = coachProfile as { is_coach_pro?: boolean | null; coach_pro_expires_at?: string | null }
  const isCoachPro = !!cp.is_coach_pro
    && (!cp.coach_pro_expires_at || new Date(cp.coach_pro_expires_at).getTime() > Date.now())

  const [athletes, setAthletes]       = useState<AthleteStatus[]>([])
  const [loading, setLoading]         = useState(true)
  const [showInvite, setShowInvite]   = useState(false)
  const [showBroadcast, setShowBroadcast] = useState(false)
  // P3.5 filter state — defaults to 'all', persisted in localStorage so the
  // coach's preferred view sticks across sessions.
  const [filter, setFilter] = useState<AthleteFilter>('all')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('nextsplit_coach_squad_filter') as AthleteFilter | null
      if (stored && ['all', 'red', 'amber', 'green', 'inactive', 'silent'].includes(stored)) {
        setFilter(stored)
      }
    } catch { /* localStorage unavailable */ }
  }, [])

  function applyFilter(next: AthleteFilter) {
    setFilter(next)
    try { localStorage.setItem('nextsplit_coach_squad_filter', next) } catch {}
  }

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/coach/squad-status')
      const data = await res.json()
      setAthletes(data.athletes ?? [])
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchStatus() }, [fetchStatus])

  // Filtered view — applied after fetch. 'inactive' = ≥7 days since last log;
  // 'silent' = coach hasn't messaged in ≥14 days OR never (P3.1 v2 amber flag).
  const filteredAthletes = athletes.filter(a => {
    if (filter === 'all')    return true
    if (filter === 'red')    return a.status === 'red'
    if (filter === 'amber')  return a.status === 'amber'
    if (filter === 'green')  return a.status === 'green'
    if (filter === 'inactive') {
      if (!a.last_active) return true
      const days = Math.floor((Date.now() - new Date(a.last_active).getTime()) / 86400000)
      return days >= 7
    }
    if (filter === 'silent') {
      return a.days_since_message === null || (a.days_since_message ?? 0) >= 14
    }
    return true
  })

  const needsAttention = filteredAthletes.filter(a => a.status !== 'green')
  const onTrack        = filteredAthletes.filter(a => a.status === 'green')
  const today          = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })

  const handleMessage = (athleteId: string) => {
    window.location.href = `/coach/athlete/${athleteId}?tab=message`
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: '#f8f8f6' }}>

      {/* Command centre header */}
      <div className="bg-white border-b border-[var(--color-border)] px-4 pt-12 pb-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-lg font-black text-gray-900">Dashboard</h1>
              <p className="text-xs text-[var(--color-text-tertiary)]">{today}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchStatus} className="text-[var(--color-text-tertiary)] text-lg px-1.5">↻</button>
              {athletes.length > 0 && isCoachPro && (
                <button
                  onClick={() => setShowBroadcast(true)}
                  className="text-[var(--color-text-secondary)] text-sm font-bold px-3 py-2 rounded-xl border border-[var(--color-border-2)] active:bg-gray-50"
                  title="Bulk broadcast (Coach-Pro)"
                >
                  📢
                </button>
              )}
              {athletes.length > 0 && !isCoachPro && (
                <a
                  href="/coach/settings#coach-pro"
                  className="text-[var(--color-text-tertiary)] text-sm font-bold px-3 py-2 rounded-xl border border-[var(--color-border-2)] active:bg-gray-50"
                  title="Bulk broadcast — upgrade to Coach-Pro"
                >
                  📢⭐
                </a>
              )}
              <button
                onClick={() => setShowInvite(true)}
                className="text-white text-sm font-bold px-4 py-2 rounded-xl active:scale-95"
                style={{ background: 'var(--ns-violet)' }}
              >
                + Invite
              </button>
            </div>
          </div>

          {/* At-a-glance strip */}
          {!loading && athletes.length > 0 && (
            <div className="flex items-center gap-3 mt-2">
              {needsAttention.length > 0 && (
                <span className="text-[11px] font-bold text-red-400 bg-red-900/20 px-2 py-1 rounded-lg">
                  {needsAttention.length} need{needsAttention.length === 1 ? 's' : ''} attention
                </span>
              )}
              {onTrack.length > 0 && (
                <span className="text-[11px] font-semibold text-emerald-600">
                  {onTrack.length} on track ✓
                </span>
              )}
              <span className="text-[11px] text-[var(--color-text-tertiary)] ml-auto">{athletes.length} athlete{athletes.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* P3.1 dashboard v2 — week-at-a-glance stats grid. Aggregates
          across the coach's full athlete list so the coach can see their
          collective output without drilling into each athlete card. */}
      {!loading && athletes.length > 0 && (
        <div className="max-w-lg mx-auto px-4 mt-3">
          <div className="grid grid-cols-4 gap-2">
            <DashStatTile
              label="Total"
              value={athletes.length}
              tone="neutral"
            />
            <DashStatTile
              label="Red"
              value={athletes.filter(a => a.status === 'red').length}
              tone="red"
            />
            <DashStatTile
              label="Silent"
              value={athletes.filter(a => a.days_since_message === null || (a.days_since_message ?? 0) >= 14).length}
              tone="amber"
              tip="No coach message in ≥14 days"
            />
            <DashStatTile
              label="Sessions/wk"
              value={athletes.reduce((s, a) => s + a.sessions_done_week, 0)}
              tone="green"
              tip="Done across all athletes this week"
            />
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-white rounded-2xl border border-[var(--color-border)] animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state — P3.7 first-athlete-by-day-7 milestone tracker.
            Shows days since coach signup. Tone progresses: warm copy 0-7d,
            urgent copy 8-14d, gentle reminder 15+d. coach.created_at is
            available via the coachProfile prop passed from /coach/page.tsx
            server. */}
        {!loading && athletes.length === 0 && (() => {
          const createdAt = (coachProfile as { created_at?: string | null }).created_at
          const daysSince = createdAt
            ? Math.floor((Date.now() - new Date(createdAt).getTime()) / (24 * 3600 * 1000))
            : null
          const goalCopy =
            daysSince === null            ? 'Start coaching'
            : daysSince <= 7              ? `Day ${daysSince + 1} · invite your first athlete this week`
            : daysSince <= 14             ? `${daysSince} days in — your first athlete is the hardest`
            :                               `${daysSince} days as a coach — first invite goes a long way`
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
                onClick={() => setShowInvite(true)}
                className="text-xs font-bold px-4 py-2 rounded-xl text-white"
                style={{ background: 'var(--ns-violet)' }}
              >
                Generate invite link →
              </button>
            </div>
          )
        })()}

        {/* P3.5 Filter chips — applied to the rendered athlete lists.
            Selection persists across sessions via localStorage. */}
        {!loading && athletes.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
            {([
              { id: 'all',      label: `All (${athletes.length})` },
              { id: 'red',      label: `Needs you (${athletes.filter(a => a.status === 'red').length})` },
              { id: 'amber',    label: `Check in (${athletes.filter(a => a.status === 'amber').length})` },
              { id: 'green',    label: `On track (${athletes.filter(a => a.status === 'green').length})` },
              { id: 'inactive', label: `Inactive 7d+` },
              { id: 'silent',   label: `Coach silent` },
            ] as const).map(chip => {
              const active = filter === chip.id
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => applyFilter(chip.id)}
                  aria-pressed={active}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors"
                  style={{
                    background: active ? 'var(--ns-ember)' : 'var(--color-surface)',
                    border:     `1px solid ${active ? 'var(--ns-ember)' : 'var(--color-border)'}`,
                    color:      active ? 'white' : 'var(--color-text-secondary)',
                  }}>
                  {chip.label}
                </button>
              )
            })}
          </div>
        )}

        {/* PR G — BL-C4 Monday digest card. Renders nothing until the
            cron has fired at least once for this coach. Sits above the
            athlete tiles so the headline + 7-day per-athlete summary is
            the first thing a coach sees on Monday morning. */}
        {!loading && athletes.length > 0 && <MondayDigestCard />}

        {/* NEEDS ATTENTION — top priority, always first */}
        {!loading && needsAttention.length > 0 && (
          <section>
            <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider px-1 mb-2">
              Needs attention ({needsAttention.length})
            </p>
            <div className="space-y-3">
              {needsAttention.map(athlete => (
                <AthleteCard key={athlete.athlete_id} athlete={athlete} onMessage={handleMessage} />
              ))}
            </div>
          </section>
        )}

        {/* ON TRACK — collapsed if any need attention, expanded if clean */}
        {!loading && onTrack.length > 0 && (
          <section>
            <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider px-1 mb-2">
              {needsAttention.length > 0 ? `On track (${onTrack.length})` : `All on track ✓`}
            </p>

            {needsAttention.length === 0 ? (
              /* Clean dashboard — no attention needed */
              <div className="bg-emerald-900/20 rounded-2xl px-4 py-4 flex items-center gap-3" style={{ border: "1px solid rgba(16,185,129,0.2)" }}>
                <span className="text-2xl">✓</span>
                <div>
                  <p className="text-sm font-bold text-emerald-800">All {onTrack.length} athletes on track</p>
                  <p className="text-xs text-emerald-600 mt-0.5">No action needed right now.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {onTrack.map(athlete => (
                  <AthleteCard key={athlete.athlete_id} athlete={athlete} onMessage={handleMessage} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* WEEKLY LOAD OVERVIEW */}
        {!loading && athletes.length > 0 && (
          <section>
            <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider px-1 mb-2">
              This week
            </p>
            <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4 space-y-3">
              {athletes.map(a => {
                const done  = a.sessions_done_week
                const total = a.sessions_total_week || 0
                const pct   = total > 0 ? (done / total) * 100 : 0
                const name  = a.display_name ?? (a.handle ? `@${a.handle}` : 'Athlete')
                const cls   = a.runner_class ? RUNNER_CLASSES[a.runner_class as RunnerClassId] : null
                return (
                  <a key={a.athlete_id} href={`/coach/athlete/${a.athlete_id}`}
                    className="flex items-center gap-3 group active:opacity-70">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: 'var(--ns-violet-light)' }}>
                      {cls?.emoji ?? '🏃'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-gray-800 truncate group-hover:underline">{name}</p>
                        <p className="text-[10px] text-[var(--color-text-tertiary)] flex-shrink-0 ml-2">
                          {done}/{total || '?'} sessions
                        </p>
                      </div>
                      <div className="h-1.5 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(pct, 100)}%`,
                            background: pct >= 100 ? '#10b981' : pct >= 60 ? 'var(--ns-violet)' : '#f59e0b',
                          }} />
                      </div>
                    </div>
                    {a.acwr !== null && (
                      <span className={`text-[10px] font-bold flex-shrink-0 px-1.5 py-0.5 rounded-lg ${
                        a.acwr > 1.3 ? 'bg-red-900/20 text-red-400' :
                        a.acwr < 0.8 ? 'bg-amber-900/20 text-amber-400' : 'bg-emerald-900/20 text-emerald-400'
                      }`}>
                        {a.acwr.toFixed(1)}
                      </span>
                    )}
                  </a>
                )
              })}
            </div>
          </section>
        )}

        {/* COACH TOOLS */}
        <section>
          <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider px-1 mb-2">Tools</p>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/coach/plan-builder"
              className="bg-white rounded-2xl border border-[var(--color-border)] p-3.5 space-y-1 active:bg-gray-50">
              <span className="text-xl">📋</span>
              <p className="text-sm font-bold text-gray-800">Plan Builder</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">Build plans for athletes</p>
            </Link>
            <Link href="/coach/marketplace"
              className="bg-white rounded-2xl border border-[var(--color-border)] p-3.5 space-y-1 active:bg-gray-50">
              <span className="text-xl">📚</span>
              <p className="text-sm font-bold text-gray-800">My Plans</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">Edit + publish + assign</p>
            </Link>
            <Link href="/coach/earnings"
              className="bg-white rounded-2xl border border-[var(--color-border)] p-3.5 space-y-1 active:bg-gray-50">
              <span className="text-xl">💰</span>
              <p className="text-sm font-bold text-gray-800">Earnings</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">Revenue & commission</p>
            </Link>
            <Link href="/coach/settings"
              className="bg-white rounded-2xl border border-[var(--color-border)] p-3.5 space-y-1 active:bg-gray-50">
              <span className="text-xl">⚙️</span>
              <p className="text-sm font-bold text-gray-800">Settings</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">Availability & capacity</p>
            </Link>
            <Link href="/marketplace"
              className="bg-white rounded-2xl border border-[var(--color-border)] p-3.5 space-y-1 active:bg-gray-50">
              <span className="text-xl">🏪</span>
              <p className="text-sm font-bold text-gray-800">Marketplace</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">Browse and publish plans</p>
            </Link>
            <button
              onClick={async () => {
                try {
                  await fetch('/api/coach/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier: 'professional' }) })
                } catch { /* ignore */ }
              }}
              className="bg-white rounded-2xl border border-[var(--color-border)] p-3.5 space-y-1 text-left active:bg-gray-50">
              <span className="text-xl">⚙️</span>
              <p className="text-sm font-bold text-gray-800">Coach Settings</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">Profile, credentials</p>
            </button>
          </div>
        </section>
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
      {showBroadcast && (
        <BroadcastModal
          onClose={() => setShowBroadcast(false)}
          athleteCount={filter === 'all' ? athletes.length : filteredAthletes.length}
          // P3.5 — when a filter is active, target only the filtered subset.
          // Backend /api/coach/broadcast accepts athlete_ids array (max 50).
          athleteIds={filter === 'all' ? undefined : filteredAthletes.map(a => a.athlete_id)}
          filterLabel={filter === 'all' ? undefined : filter}
        />
      )}
    </div>
  )
}
