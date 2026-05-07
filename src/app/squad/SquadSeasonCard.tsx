'use client'

// P3.10 Squad seasons (light) — surfaces the previous-month trophy and
// the current-month running totals on /squad. The snapshot is written
// by the smart-notify cron on the 1st of every month
// (snapshot_squad_seasons_for_month RPC); this component just reads.
//
// Renders nothing if the squad has no completed-month seasons yet
// (newly-created squads): better empty state than an awkward "0 km" card.

import { useEffect, useState } from 'react'
import { useSupabase } from '@/hooks/useSupabase'

interface SeasonRow {
  squad_id:        string
  period:          string  // YYYY-MM
  total_km:        number
  total_sessions:  number
  active_members:  number
  goal_hit:        boolean
  goal_type:       string | null
  goal_value:      number | null
  top_runner_id:   string | null
  top_runner_km:   number | null
  top_runner_name: string | null
}

interface Props {
  squadId: string
}

function formatPeriod(period: string): string {
  // YYYY-MM → "April 2026"
  try {
    const [y, m] = period.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  } catch {
    return period
  }
}

export default function SquadSeasonCard({ squadId }: Props) {
  const supabase = useSupabase()
  const [lastSeason, setLastSeason] = useState<SeasonRow | null>(null)
  const [currentMonthKm, setCurrentMonthKm] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = supabase as any

      // Last completed season — exclude the current month so a snapshot that
      // happens to fire mid-month doesn't mask the in-flight numbers.
      const now = new Date()
      const currentPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`

      const [{ data: seasonData }, { data: kmData }] = await Promise.all([
        s.from('squad_seasons')
          .select(`
            squad_id, period, total_km, total_sessions, active_members,
            goal_hit, goal_type, goal_value, top_runner_id, top_runner_km,
            profiles:top_runner_id ( display_name )
          `)
          .eq('squad_id', squadId)
          .eq('season_type', 'month')
          .neq('period', currentPeriod)
          .order('period', { ascending: false })
          .limit(1)
          .maybeSingle(),
        s.rpc('squad_monthly_km', { p_squad_id: squadId }),
      ])

      if (cancelled) return

      if (seasonData) {
        const rawProfiles = (seasonData as { profiles?: { display_name?: string } | null }).profiles
        setLastSeason({
          squad_id:        seasonData.squad_id,
          period:          seasonData.period,
          total_km:        Number(seasonData.total_km ?? 0),
          total_sessions:  seasonData.total_sessions ?? 0,
          active_members:  seasonData.active_members ?? 0,
          goal_hit:        !!seasonData.goal_hit,
          goal_type:       seasonData.goal_type ?? null,
          goal_value:      seasonData.goal_value ?? null,
          top_runner_id:   seasonData.top_runner_id ?? null,
          top_runner_km:   seasonData.top_runner_km !== null ? Number(seasonData.top_runner_km) : null,
          top_runner_name: rawProfiles?.display_name ?? null,
        })
      } else {
        setLastSeason(null)
      }

      setCurrentMonthKm(typeof kmData === 'number' ? kmData : (kmData ? Number(kmData) : 0))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [supabase, squadId])

  if (loading) return null
  // No previous season yet — skip rather than render an empty trophy. The
  // current-month progress is already visible in the leaderboard row.
  if (!lastSeason && currentMonthKm === null) return null

  return (
    <div className="px-4 mt-6">
      <h2 className="text-sm font-black mb-3" style={{ color: 'var(--color-text-secondary)' }}>
        Seasons
      </h2>

      {/* Last completed month — trophy */}
      {lastSeason && (
        <div className="rounded-2xl px-4 py-4 mb-2"
          style={{
            background: lastSeason.goal_hit ? 'rgba(255,184,0,0.10)' : 'var(--color-surface)',
            border: `1px solid ${lastSeason.goal_hit ? 'rgba(255,184,0,0.45)' : 'var(--color-border)'}`,
          }}>
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0" aria-hidden="true">
              {lastSeason.goal_hit ? '🏆' : '📅'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>
                {formatPeriod(lastSeason.period)}
                {lastSeason.goal_hit && (
                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wide"
                    style={{ color: 'var(--ns-amber)' }}>
                    Goal hit
                  </span>
                )}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                <span className="font-bold">{Math.round(lastSeason.total_km)}km</span>
                {' · '}
                <span>{lastSeason.total_sessions} sessions</span>
                {' · '}
                <span>{lastSeason.active_members} active</span>
              </p>
              {lastSeason.top_runner_name && lastSeason.top_runner_km !== null && (
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
                  Top runner — <span className="font-bold">{lastSeason.top_runner_name}</span>
                  {' · '}{Math.round(lastSeason.top_runner_km)}km
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Current month — progress */}
      {currentMonthKm !== null && (
        <div className="rounded-2xl px-4 py-3"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-[10px] font-black uppercase tracking-widest"
            style={{ color: 'var(--color-text-tertiary)' }}>
            This month so far
          </p>
          <p className="text-2xl font-black mt-1" style={{ color: 'var(--color-text-primary)' }}>
            {Math.round(currentMonthKm)}<span className="text-sm font-bold ml-1"
              style={{ color: 'var(--color-text-secondary)' }}>km</span>
          </p>
        </div>
      )}
    </div>
  )
}
