'use client'

import { useState, useEffect } from 'react'
import type { PlanSession } from '@/types/database'

interface StravaActivity {
  id: number
  name: string
  type: string
  distance_km: number
  moving_time_secs: number
  elapsed_time_secs: number
  avg_pace_secs: number | null
  avg_hr: number | null
  date: string
  is_today: boolean
  splits: { km: number; pace_secs: number | null; hr: number | null }[]
}

function fmtTime(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`
  return `${m}:${s.toString().padStart(2,'0')}`
}

function fmtPace(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2,'0')}/km`
}

function matchScore(activity: StravaActivity, session: PlanSession): number {
  if (!session.km || session.km === 0) return 0
  const ratio = activity.distance_km / session.km
  // Within 15% = good match
  if (ratio >= 0.85 && ratio <= 1.15) return 90
  if (ratio >= 0.75 && ratio <= 1.25) return 60
  return 20
}

function inferEffort(activity: StravaActivity, session: PlanSession): number {
  // Use HR if available
  if (activity.avg_hr) {
    if (activity.avg_hr < 135) return 4
    if (activity.avg_hr < 150) return 6
    if (activity.avg_hr < 165) return 7
    if (activity.avg_hr < 175) return 8
    return 9
  }
  // Use pace vs planned
  if (activity.avg_pace_secs && session.km) {
    const type = session.c
    if (type === 'run-easy' && activity.avg_pace_secs < 330) return 7
    if (type === 'run-int' && activity.avg_pace_secs < 270) return 8
    return 6
  }
  return 7
}

// ─── Import Modal ─────────────────────────────────────────────────────────────

interface ImportModalProps {
  activity: StravaActivity
  session: PlanSession | null
  onConfirm: (effort: number, km: number, pace: string | null, duration_secs: number, hr: number | null) => Promise<void>
  onCancel: () => void
}

function ImportModal({ activity, session, onConfirm, onCancel }: ImportModalProps) {
  const suggestedEffort = session ? inferEffort(activity, session) : 7
  const [effort, setEffort] = useState(suggestedEffort)
  const [saving, setSaving] = useState(false)

  const pace = activity.avg_pace_secs ? fmtPace(activity.avg_pace_secs) : null
  const score = session ? matchScore(activity, session) : 0

  async function handleConfirm() {
    setSaving(true)
    try {
      await onConfirm(effort, activity.distance_km, pace, activity.moving_time_secs, activity.avg_hr)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
      <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl p-6 shadow-2xl">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        {/* Strava badge */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
          </div>
          <span className="text-sm font-bold text-gray-900">Import from Strava</span>
          {score >= 90 && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full ml-auto">
              ✓ Good match
            </span>
          )}
        </div>

        {/* Activity summary */}
        <div className="bg-orange-50 rounded-2xl p-4 mb-4">
          <div className="text-sm font-bold text-gray-900 mb-2">{activity.name}</div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-lg font-black text-orange-600">{activity.distance_km}</div>
              <div className="text-[10px] text-gray-500">km</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-black text-gray-900">{fmtTime(activity.moving_time_secs)}</div>
              <div className="text-[10px] text-gray-500">time</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-black text-gray-900">{pace ?? '—'}</div>
              <div className="text-[10px] text-gray-500">avg pace</div>
            </div>
          </div>
          {activity.avg_hr && (
            <div className="text-center mt-2">
              <span className="text-xs text-gray-500">❤️ {Math.round(activity.avg_hr)} bpm avg</span>
            </div>
          )}
        </div>

        {/* Splits */}
        {activity.splits.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-500 mb-2">Km splits</div>
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
              {activity.splits.slice(0, 12).map((split, i) => (
                <div key={i} className="flex-shrink-0 text-center bg-gray-50 rounded-lg px-2 py-1.5 min-w-[44px]">
                  <div className="text-[9px] text-gray-400">{i + 1}km</div>
                  <div className="text-[11px] font-bold text-gray-900">
                    {split.pace_secs ? fmtPace(split.pace_secs).replace('/km','') : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Effort adjust */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-gray-700">Effort</label>
            <span className="text-xl font-bold text-[var(--ns-forest)]">{effort}<span className="text-sm text-gray-400">/10</span></span>
          </div>
          <input
            type="range" min={1} max={10} value={effort}
            onChange={e => setEffort(Number(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[var(--ns-forest)]"
          />
          <p className="text-[10px] text-gray-400 mt-1">
            {activity.avg_hr ? `Estimated from HR (${Math.round(activity.avg_hr)}bpm)` : 'Adjust if needed'}
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-orange-500 text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Import ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Activity picker (if multiple recent) ─────────────────────────────────────

interface ActivityPickerProps {
  activities: StravaActivity[]
  session: PlanSession | null
  onSelect: (a: StravaActivity) => void
  onCancel: () => void
}

function ActivityPicker({ activities, session, onSelect, onCancel }: ActivityPickerProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
      <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl p-6">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <h2 className="text-base font-bold text-gray-900 mb-4">Recent Strava activities</h2>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {activities.map(a => {
            const score = session ? matchScore(a, session) : 0
            return (
              <button
                key={a.id}
                onClick={() => onSelect(a)}
                className="w-full flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 text-left"
              >
                <div>
                  <div className="text-sm font-semibold text-gray-900">{a.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {a.distance_km}km · {fmtTime(a.moving_time_secs)} · {a.date}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {a.is_today && (
                    <span className="text-[10px] font-bold text-[var(--ns-forest)] bg-teal-50 px-2 py-0.5 rounded-full">Today</span>
                  )}
                  {score >= 90 && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Match</span>
                  )}
                  <span className="text-gray-300">›</span>
                </div>
              </button>
            )
          })}
        </div>
        <button onClick={onCancel} className="w-full mt-4 py-3 text-sm text-gray-400 font-medium">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Main Strava Sync Button ──────────────────────────────────────────────────

interface Props {
  session: PlanSession | null
  weekN: number
  dayIndex: number
  sessionIndex: number
  planId: string
  onImported: (effort: number, km: number, pace: string | null, duration_secs: number, hr: number | null) => Promise<void>
}

export default function StravaSyncButton({ session, onImported }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'picking' | 'confirming' | 'error'>('idle')
  const [activities, setActivities] = useState<StravaActivity[]>([])
  const [selected, setSelected] = useState<StravaActivity | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    try {
      setConnected(localStorage.getItem('nextsplit_strava_connected') === 'true')
    } catch {}
  }, [])

  // Don't render at all if not connected
  if (!connected) return null

  async function handleSync() {
    setState('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/strava/sync')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sync failed')
      if (!data.activities?.length) {
        setErrorMsg('No recent activities found')
        setState('error')
        return
      }

      // Auto-select today's activity if there is one, otherwise show picker
      const todayActivity = data.activities.find((a: StravaActivity) => a.is_today)
      if (todayActivity) {
        setSelected(todayActivity)
        setState('confirming')
      } else {
        setActivities(data.activities)
        setState('picking')
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Sync failed')
      setState('error')
    }
  }

  function handleSelect(a: StravaActivity) {
    setSelected(a)
    setState('confirming')
  }

  async function handleConfirm(effort: number, km: number, pace: string | null, duration_secs: number, hr: number | null) {
    await onImported(effort, km, pace, duration_secs, hr)
    setState('idle')
    setSelected(null)
  }

  return (
    <>
      <button
        onClick={handleSync}
        disabled={state === 'loading'}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-full text-xs font-semibold text-orange-600 disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
        </svg>
        {state === 'loading' ? 'Syncing…' : 'Strava'}
      </button>

      {state === 'error' && (
        <div className="fixed bottom-28 left-4 right-4 max-w-lg mx-auto z-50">
          <div className="bg-red-900 text-white rounded-2xl px-4 py-3 text-sm text-center">
            {errorMsg}
          </div>
        </div>
      )}

      {state === 'picking' && (
        <ActivityPicker
          activities={activities}
          session={session}
          onSelect={handleSelect}
          onCancel={() => setState('idle')}
        />
      )}

      {state === 'confirming' && selected && (
        <ImportModal
          activity={selected}
          session={session}
          onConfirm={handleConfirm}
          onCancel={() => setState('idle')}
        />
      )}
    </>
  )
}
