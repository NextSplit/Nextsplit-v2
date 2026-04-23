'use client'

import { useState, useEffect } from 'react'
import type { Race, TrainingLog } from '@/types/database'

interface Props {
  race: Race
  logs: Record<string, TrainingLog>
  planName: string
}

interface Brief {
  pacing: string
  fuelling: string
  taper: string
  mindset: string
  generatedAt: string
}

function fmtTime(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function PreRaceBrief({ race, logs, planName }: Props) {
  const [brief, setBrief] = useState<Brief | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)

  const cacheKey = `nextsplit_race_brief_${race.id}`
  const daysUntil = Math.ceil((new Date(race.race_date).getTime() - Date.now()) / 86400000)

  useEffect(() => {
    // Check cache first
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached) as Brief
        // Cache valid for 24h
        if (Date.now() - new Date(parsed.generatedAt).getTime() < 86400000) {
          setBrief(parsed)
          return
        }
      }
    } catch {}
    // Auto-generate if within 3 days
    if (daysUntil <= 3) generateBrief()
  }, [race.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function generateBrief() {
    setLoading(true)
    setError(null)

    try {
      // Summarise recent logs for context
      const logArr = Object.values(logs).filter(l => l.done && l.km && l.km > 0)
      const recentRuns = logArr
        .filter(l => l.pace)
        .sort((a, b) => new Date(b.logged_at ?? '').getTime() - new Date(a.logged_at ?? '').getTime())
        .slice(0, 10)

      // pace is stored as "m:ss" string — parse to seconds
      function parsePaceSecs(pace: string | null): number | null {
        if (!pace) return null
        const parts = pace.split(':')
        if (parts.length !== 2) return null
        return parseInt(parts[0]) * 60 + parseInt(parts[1])
      }

      const paceSecs = recentRuns.map(l => parsePaceSecs(l.pace)).filter((p): p is number => p !== null)
      const avgPaceSecs = paceSecs.length > 0
        ? paceSecs.reduce((s, p) => s + p, 0) / paceSecs.length
        : null

      const totalKmLast4Weeks = logArr
        .filter(l => l.logged_at && Date.now() - new Date(l.logged_at).getTime() < 28 * 86400000)
        .reduce((s, l) => s + (l.km ?? 0), 0)

      const context = {
        race_name: race.name,
        race_date: race.race_date,
        days_until: daysUntil,
        distance_label: race.distance_label ?? (race.distance_km != null ? `${race.distance_km}km` : 'Unknown distance'),
        distance_km: race.distance_km,
        goal_time: race.goal_time_secs ? fmtTime(race.goal_time_secs) : null,
        plan_name: planName,
        avg_recent_pace_per_km: avgPaceSecs ? `${Math.floor(avgPaceSecs / 60)}:${String(Math.round(avgPaceSecs % 60)).padStart(2, '0')}/km` : null,
        total_km_last_4_weeks: Math.round(totalKmLast4Weeks),
        total_sessions_logged: logArr.length,
      }

      const res = await fetch('/api/ai/pre-race-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      })

      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      const parsed = data.brief as Omit<Brief, 'generatedAt'>
      const result: Brief = { ...parsed, generatedAt: new Date().toISOString() }

      // Cache it
      try { localStorage.setItem(cacheKey, JSON.stringify(result)) } catch {}
      setBrief(result)
    } catch (e) {
      setError('Could not generate brief — try again')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const sections = [
    { icon: '⏱️', label: 'Pacing strategy', key: 'pacing' as const, colour: 'text-blue-800 bg-blue-50 border-blue-100' },
    { icon: '⚡', label: 'Race fuelling',    key: 'fuelling' as const, colour: 'text-amber-800 bg-amber-50 border-amber-100' },
    { icon: '😴', label: 'Taper notes',     key: 'taper' as const,    colour: 'text-[var(--color-surface-2)] bg-[var(--color-surface-2)] border-orange-50' },
    { icon: '🧠', label: 'Race mindset',    key: 'mindset' as const,  colour: 'text-emerald-800 bg-emerald-50 border-emerald-100' },
  ]

  return (
    <div className="bg-white rounded-2xl border border-[var(--ns-ember)] overflow-hidden shadow-sm">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <div className="w-9 h-9 rounded-xl bg-[var(--ns-ember)] flex items-center justify-center flex-shrink-0">
          <span className="text-lg">🏁</span>
        </div>
        <div className="flex-1">
          <div className="text-[10px] font-bold text-[var(--ns-ember)] uppercase tracking-wide">Race brief</div>
          <div className="text-sm font-bold text-gray-900 truncate">{race.name}</div>
          <div className="text-[10px] text-gray-400">
            {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
            {race.goal_time_secs && ` · Target ${fmtTime(race.goal_time_secs)}`}
          </div>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          {!brief && !loading && !error && (
            <div className="px-4 py-5 text-center">
              <p className="text-sm text-gray-500 mb-3">Get your personalised race brief — pacing plan, fuelling strategy, and taper advice based on your training.</p>
              <button
                onClick={generateBrief}
                className="px-5 py-2.5 bg-[var(--ns-ember)] text-white text-sm font-bold rounded-xl"
                aria-label="Generate race brief"
              >
                Generate my race brief
              </button>
            </div>
          )}

          {loading && (
            <div className="px-4 py-6 text-center">
              <div className="text-2xl mb-2 animate-pulse">🤔</div>
              <p className="text-sm text-gray-500">Analysing your training…</p>
              <div className="mt-3 space-y-2">
                {[1,2,3,4].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse mx-2" />)}
              </div>
            </div>
          )}

          {error && (
            <div className="px-4 py-4 text-center">
              <p className="text-sm text-red-500 mb-2">{error}</p>
              <button onClick={generateBrief} className="text-sm text-[var(--ns-ember)] font-semibold">Try again</button>
            </div>
          )}

          {brief && (
            <div className="p-3 space-y-2">
              {sections.map(({ icon, label, key, colour }) => (
                <div key={key} className={`rounded-xl border px-3 py-2.5 ${colour}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">{icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{brief[key]}</p>
                </div>
              ))}
              <button
                onClick={generateBrief}
                className="w-full text-center text-[10px] text-gray-400 py-1 hover:text-gray-600"
                aria-label="Regenerate race brief"
              >
                ↻ Regenerate
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
