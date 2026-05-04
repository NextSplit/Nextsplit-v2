'use client'

import { useState, useCallback } from 'react'
import { useActivePlan } from '@/hooks/useActivePlan'
import type { PlanWeek, PlanSession } from '@/types/database'

interface StravaActivity {
  id:               number
  name:             string
  type:             string
  distance_km:      number
  moving_time_secs: number
  avg_pace_secs:    number | null
  avg_hr:           number | null
  date:             string
  is_today:         boolean
  strava_id?:       number
}

interface Props {
  onImported?: () => void
}

function fmtPace(secs: number | null): string {
  if (!secs) return ''
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}/km`
}

// Try to match a Strava activity to today's plan session
function matchToPlan(
  activity: StravaActivity,
  plan: { id: string; current_week: number; weeks_data: unknown } | null
): { week_n: number; day_i: number; session_i: number; plan_id: string } | null {
  if (!plan?.weeks_data || activity.type !== 'Run') return null
  const weeks = plan.weeks_data as PlanWeek[]
  const cw = weeks.find(w => w.n === plan.current_week)
  if (!cw) return null

  // Find the day matching the activity date
  const actDate = activity.date
  for (let di = 0; di < cw.days.length; di++) {
    const day = cw.days[di]
    if (!day.dt || !day.dt.startsWith(actDate.slice(0, 10))) continue
    const sessions = (day.sessions ?? []) as PlanSession[]
    for (let si = 0; si < sessions.length; si++) {
      const sess = sessions[si]
      if (!sess.c || sess.c === 'rest') continue
      // Match by km proximity (within 20%)
      const diff = Math.abs((sess.km ?? 0) - activity.distance_km)
      if (diff < (sess.km ?? 5) * 0.3) {
        return { week_n: plan.current_week, day_i: di, session_i: si, plan_id: plan.id }
      }
    }
  }
  return null
}

export default function StravaSyncButton({ onImported }: Props) {
  const [loading, setLoading]       = useState(false)
  const [activities, setActivities] = useState<StravaActivity[] | null>(null)
  const [importing, setImporting]   = useState<number | null>(null)
  const [imported, setImported]     = useState<Set<number>>(new Set())
  const [error, setError]           = useState<string | null>(null)
  const { plan }                    = useActivePlan()

  const fetchActivities = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/strava/sync')
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 404) setError('Connect Strava first in Account settings')
        else setError(data.error ?? 'Failed to fetch')
        return
      }
      setActivities(data.activities ?? [])
    } catch {
      setError('Failed to connect to Strava')
    } finally {
      setLoading(false)
    }
  }, [])

  async function importActivity(activity: StravaActivity) {
    setImporting(activity.id)
    try {
      const match = matchToPlan(activity, plan as Parameters<typeof matchToPlan>[1])
      const res = await fetch('/api/strava/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strava_id:     activity.id,
          km:            activity.distance_km,
          duration_secs: activity.moving_time_secs,
          avg_pace_secs: activity.avg_pace_secs,
          avg_hr:        activity.avg_hr,
          name:          activity.name,
          activity_date: activity.date,
          ...match,
        }),
      })
      const data = await res.json()
      if (!res.ok && res.status !== 409) throw new Error(data.error)
      setImported(prev => new Set([...prev, activity.id]))
      onImported?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(null)
    }
  }

  // Not yet loaded — show sync button
  if (!activities) {
    return (
      <div>
        {error && (
          <p className="text-xs mb-2 px-3 py-1.5 rounded-xl"
            style={{ color: '#ff3d6e', background: 'rgba(255,61,110,0.1)', border: '1px solid rgba(255,61,110,0.3)' }}>
            {error}
          </p>
        )}
        <button
          onClick={fetchActivities}
          disabled={loading}
          className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2"
          style={{ background: '#fc4c02', color: 'white', boxShadow: '0 4px 16px rgba(252,76,2,0.4)' }}>
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Fetching…
            </>
          ) : (
            <>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="white">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
              Sync from Strava
            </>
          )}
        </button>
      </div>
    )
  }

  // Activities loaded
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--color-text-tertiary)' }}>
          Recent Strava activities
        </p>
        <button onClick={() => setActivities(null)}
          className="text-xs font-bold" style={{ color: 'var(--color-text-tertiary)' }}>
          ← Back
        </button>
      </div>

      {activities.length === 0 && (
        <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-tertiary)' }}>
          No recent activities found
        </p>
      )}

      {activities.map(act => {
        const isImported = imported.has(act.id)
        const isImporting = importing === act.id
        const match = matchToPlan(act, plan as Parameters<typeof matchToPlan>[1])

        return (
          <div key={act.id} className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--color-surface)', border: '2px solid var(--color-border-2)' }}>
            <div className="px-4 py-3 flex items-center gap-3">
              {/* Activity icon */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: act.is_today ? 'rgba(255,61,110,0.15)' : 'rgba(252,76,2,0.12)',
                         border: `2px solid ${act.is_today ? 'rgba(255,61,110,0.4)' : 'rgba(252,76,2,0.3)'}` }}>
                <span className="text-lg">{act.type === 'Run' ? '🏃' : '🚴'}</span>
              </div>

              {/* Activity info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {act.name}
                  {act.is_today && (
                    <span className="ml-2 text-[9px] font-black px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(255,61,110,0.2)', color: '#ff3d6e' }}>TODAY</span>
                  )}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-bold" style={{ color: '#4d8aff' }}>
                    {act.distance_km}km
                  </span>
                  {act.avg_pace_secs && (
                    <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                      · {fmtPace(act.avg_pace_secs)}
                    </span>
                  )}
                  {act.avg_hr && (
                    <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                      · ❤️ {act.avg_hr}bpm
                    </span>
                  )}
                </div>
                {match && !isImported && (
                  <p className="text-[10px] mt-0.5" style={{ color: '#00e676' }}>
                    ✓ Matches today&apos;s plan session
                  </p>
                )}
              </div>

              {/* Import button */}
              <button
                onClick={() => importActivity(act)}
                disabled={isImported || isImporting}
                className="flex-shrink-0 px-3 py-2 rounded-xl font-black text-xs"
                style={isImported
                  ? { background: 'rgba(0,230,118,0.12)', color: '#00e676', border: '2px solid rgba(0,230,118,0.3)' }
                  : { background: '#fc4c02', color: 'white', boxShadow: '0 2px 8px rgba(252,76,2,0.3)',
                      opacity: isImporting ? 0.7 : 1 }}>
                {isImported ? '✓ Done' : isImporting ? '…' : 'Import'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
