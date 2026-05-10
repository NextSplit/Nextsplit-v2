'use client'

import { useState, useEffect, useCallback } from 'react'
import type { CoachProfile } from '@/types/database'
import { MondayDigestCard } from '@/components/coach/MondayDigestCard'
import { InviteModal } from '@/components/coach/InviteModal'
import { BroadcastModal } from '@/components/coach/BroadcastModal'
import { AthleteCard } from '@/components/coach/AthleteCard'
import { DashboardHeader } from '@/components/coach/DashboardHeader'
import { DashboardStatsGrid } from '@/components/coach/DashboardStatsGrid'
import { DashboardEmptyState } from '@/components/coach/DashboardEmptyState'
import { AthleteFilterChips } from '@/components/coach/AthleteFilterChips'
import { WeeklyLoadOverview } from '@/components/coach/WeeklyLoadOverview'
import { CoachToolsGrid } from '@/components/coach/CoachToolsGrid'
import type { AthleteStatus, AthleteFilter } from '@/components/coach/types'

export default function CoachDashboardClient({ coachProfile }: { coachProfile: CoachProfile }) {
  // OQ#2 = C — Coach-Pro gate. Server-side enforcement lives on each
  // gated API route; this is the cosmetic UI gate that hides the bulk
  // broadcast button for free Split Leaders so they don't tap into a 403.
  const cp = coachProfile as { is_coach_pro?: boolean | null; coach_pro_expires_at?: string | null; created_at?: string | null }
  const isCoachPro = !!cp.is_coach_pro
    && (!cp.coach_pro_expires_at || new Date(cp.coach_pro_expires_at).getTime() > Date.now())

  const [athletes, setAthletes]           = useState<AthleteStatus[]>([])
  const [loading, setLoading]             = useState(true)
  const [showInvite, setShowInvite]       = useState(false)
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

  const applyFilter = (next: AthleteFilter) => {
    setFilter(next)
    try { localStorage.setItem('nextsplit_coach_squad_filter', next) } catch {}
  }

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/coach/squad-status')
      const data = await res.json()
      setAthletes(data.athletes ?? [])
    } finally { setLoading(false) }
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
      return Math.floor((Date.now() - new Date(a.last_active).getTime()) / 86400000) >= 7
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

      <DashboardHeader
        today={today}
        athletesCount={athletes.length}
        needsAttentionCount={needsAttention.length}
        onTrackCount={onTrack.length}
        isCoachPro={isCoachPro}
        loading={loading}
        onInvite={() => setShowInvite(true)}
        onBroadcast={() => setShowBroadcast(true)}
        onRefresh={fetchStatus}
      />

      {!loading && athletes.length > 0 && <DashboardStatsGrid athletes={athletes} />}

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-white rounded-2xl border border-[var(--color-border)] animate-pulse" />
            ))}
          </div>
        )}

        {!loading && athletes.length === 0 && (
          <DashboardEmptyState
            coachCreatedAt={cp.created_at}
            onInvite={() => setShowInvite(true)}
          />
        )}

        {!loading && athletes.length > 0 && (
          <AthleteFilterChips athletes={athletes} filter={filter} onChange={applyFilter} />
        )}

        {/* PR G — BL-C4 Monday digest card. Renders nothing until the cron
            has fired at least once for this coach. Sits above the athlete
            tiles so the headline + 7-day per-athlete summary is the first
            thing a coach sees on Monday morning. */}
        {!loading && athletes.length > 0 && <MondayDigestCard />}

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

        {!loading && onTrack.length > 0 && (
          <section>
            <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider px-1 mb-2">
              {needsAttention.length > 0 ? `On track (${onTrack.length})` : `All on track ✓`}
            </p>
            {needsAttention.length === 0 ? (
              <div className="bg-emerald-900/20 rounded-2xl px-4 py-4 flex items-center gap-3"
                style={{ border: '1px solid rgba(16,185,129,0.2)' }}>
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

        {!loading && athletes.length > 0 && <WeeklyLoadOverview athletes={athletes} />}

        <CoachToolsGrid />
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
