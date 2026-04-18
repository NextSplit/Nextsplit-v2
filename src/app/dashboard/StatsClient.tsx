'use client'

import { useMemo } from 'react'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useTrainingLog } from '@/hooks/useTrainingLog'
import CoachingCard from '@/components/CoachingCard'
import type { PlanWeek, TrainingLog } from '@/types/database'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatRaceDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

/** Get all logs as array */
function logsArray(logs: Record<string, TrainingLog>): TrainingLog[] {
  return Object.values(logs)
}

/** km logged per week number */
function weeklyKm(logs: TrainingLog[]): Record<number, number> {
  const out: Record<number, number> = {}
  for (const log of logs) {
    if (log.done && log.km) {
      out[log.week_n] = (out[log.week_n] ?? 0) + log.km
    }
  }
  return out
}

/** ACWR: 7-day acute / 28-day chronic. Returns per-week values. */
function calcACWR(logs: TrainingLog[], weeks: PlanWeek[]): { week: number; acwr: number; acute: number; chronic: number }[] {
  const km = weeklyKm(logs)
  const result = []
  const weekNums = weeks.map(w => w.n).sort((a, b) => a - b)

  for (let i = 0; i < weekNums.length; i++) {
    const w = weekNums[i]
    const acute = (km[w] ?? 0) + (km[weekNums[i - 1]] ?? 0) / 2  // simple 7-day proxy
    const chronicWeeks = weekNums.slice(Math.max(0, i - 3), i + 1)
    const chronic = chronicWeeks.length > 0
      ? chronicWeeks.reduce((a, n) => a + (km[n] ?? 0), 0) / Math.max(chronicWeeks.length, 1)
      : 0

    if (acute > 0 || chronic > 0) {
      result.push({ week: w, acwr: chronic > 0 ? acute / chronic : 0, acute, chronic })
    }
  }
  return result.slice(-8) // last 8 weeks
}

/** Pace strings like "5:30" → seconds */
function paceToSecs(pace: string): number {
  const parts = pace.split(':')
  if (parts.length !== 2) return 0
  return parseInt(parts[0]) * 60 + parseInt(parts[1])
}

function secsToMMSS(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.round(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RaceCountdown({ raceDate, planName }: { raceDate: string; planName: string }) {
  const days = daysUntil(raceDate)
  const weeks = Math.floor(days / 7)
  const remaining = days % 7

  const urgency = days <= 14 ? 'text-red-500' : days <= 42 ? 'text-orange-500' : 'text-[#0D9488]'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-[#0D9488] to-[#0891B2] px-5 py-4">
        <div className="text-xs font-semibold text-teal-100 uppercase tracking-wide mb-1">Race Day</div>
        <div className="text-white font-bold text-base">{planName}</div>
        <div className="text-teal-100 text-xs mt-0.5">{formatRaceDate(raceDate)}</div>
      </div>
      <div className="px-5 py-4 flex items-center justify-between">
        <div>
          <div className={`text-4xl font-black ${urgency}`}>{days}</div>
          <div className="text-xs text-gray-400 mt-0.5">days to go</div>
        </div>
        <div className="text-right">
          {weeks > 0 && (
            <div className="text-sm font-semibold text-gray-700">
              {weeks}w {remaining}d
            </div>
          )}
          <div className="text-xs text-gray-400 mt-0.5">
            {days <= 0 ? '🏁 Race day!' : days === 1 ? 'Tomorrow!' : 'remaining'}
          </div>
        </div>
        <div className="w-16 h-16 relative">
          <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F0FDFA" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.9" fill="none"
              stroke="#0D9488" strokeWidth="3"
              strokeDasharray={`${Math.max(0, Math.min(100, (1 - days / 365) * 100))} 100`}
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}

function WeeklyVolumeChart({ logs, weeks }: { logs: Record<string, TrainingLog>; weeks: PlanWeek[] }) {
  const km = weeklyKm(logsArray(logs))
  const recentWeeks = weeks.slice(-8)
  const maxKm = Math.max(...recentWeeks.map(w => Math.max(km[w.n] ?? 0, w.kl[0])), 1)

  if (recentWeeks.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="text-sm font-bold text-gray-900 mb-1">Weekly Volume</div>
        <div className="text-xs text-gray-400">No weeks to show yet</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div className="text-sm font-bold text-gray-900">Weekly Volume</div>
        <div className="text-xs text-gray-400">last 8 weeks</div>
      </div>

      <div className="flex items-end gap-1.5 h-28">
        {recentWeeks.map(week => {
          const actual = km[week.n] ?? 0
          const planned = week.kl[0]
          const actualH = (actual / maxKm) * 100
          const plannedH = (planned / maxKm) * 100
          const isCurrent = week.b !== 'd' // not a deload

          return (
            <div key={week.n} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full relative flex items-end" style={{ height: '88px' }}>
                {/* Planned bar (ghost) */}
                <div
                  className="absolute bottom-0 w-full rounded-t-lg bg-gray-100"
                  style={{ height: `${plannedH}%` }}
                />
                {/* Actual bar */}
                {actual > 0 && (
                  <div
                    className={`absolute bottom-0 w-full rounded-t-lg transition-all ${
                      week.b === 'd' ? 'bg-orange-300' : week.b === 'r' ? 'bg-yellow-400' : 'bg-[#0D9488]'
                    }`}
                    style={{ height: `${actualH}%` }}
                  />
                )}
              </div>
              <div className="text-[9px] text-gray-400">W{week.n}</div>
              {actual > 0 && (
                <div className="text-[9px] font-semibold text-gray-600">{Math.round(actual)}</div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-3 mt-3">
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm bg-[#0D9488]" />
          <span className="text-[10px] text-gray-400">Logged</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm bg-gray-100" />
          <span className="text-[10px] text-gray-400">Planned</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm bg-orange-300" />
          <span className="text-[10px] text-gray-400">Deload</span>
        </div>
      </div>
    </div>
  )
}

function ACWRChart({ logs, weeks }: { logs: Record<string, TrainingLog>; weeks: PlanWeek[] }) {
  const data = useMemo(() => calcACWR(logsArray(logs), weeks), [logs, weeks])

  if (data.length < 2) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="text-sm font-bold text-gray-900 mb-1">Training Load (ACWR)</div>
        <p className="text-xs text-gray-400">Log at least 2 weeks of sessions to see your acute:chronic workload ratio.</p>
        <div className="mt-3 p-3 bg-green-50 rounded-xl">
          <p className="text-xs text-green-700 font-medium">Target zone: 0.8 – 1.3</p>
          <p className="text-xs text-green-600 mt-0.5">Below 0.8 = undertraining · Above 1.5 = injury risk</p>
        </div>
      </div>
    )
  }

  const maxAcwr = Math.max(...data.map(d => d.acwr), 1.5)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div className="text-sm font-bold text-gray-900">Training Load</div>
        <div className="text-xs text-gray-400">ACWR</div>
      </div>

      <div className="relative h-28">
        {/* Zone bands */}
        <div className="absolute inset-0 flex flex-col justify-end pointer-events-none">
          <div className="bg-red-50 opacity-60" style={{ height: `${(maxAcwr - 1.3) / maxAcwr * 100}%` }} />
          <div className="bg-green-50 opacity-60" style={{ height: `${0.5 / maxAcwr * 100}%` }} />
          <div className="bg-yellow-50 opacity-60" style={{ height: `${0.3 / maxAcwr * 100}%` }} />
        </div>

        {/* Bars */}
        <div className="absolute inset-0 flex items-end gap-1">
          {data.map((d, i) => {
            const h = (d.acwr / maxAcwr) * 100
            const colour = d.acwr > 1.3 ? 'bg-red-400' : d.acwr < 0.8 ? 'bg-yellow-400' : 'bg-[#0D9488]'
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className={`w-full rounded-t-md ${colour}`}
                  style={{ height: `${Math.max(h, 2)}%` }}
                />
                <div className="text-[8px] text-gray-400">W{d.week}</div>
              </div>
            )
          })}
        </div>

        {/* 1.3 line */}
        <div
          className="absolute left-0 right-0 border-t-2 border-dashed border-red-300"
          style={{ bottom: `${(1.3 / maxAcwr) * 100}%` }}
        >
          <span className="absolute right-0 -top-4 text-[9px] text-red-400 font-medium">1.3</span>
        </div>
        {/* 1.0 line */}
        <div
          className="absolute left-0 right-0 border-t border-dashed border-gray-300"
          style={{ bottom: `${(1.0 / maxAcwr) * 100}%` }}
        >
          <span className="absolute right-0 -top-4 text-[9px] text-gray-400">1.0</span>
        </div>
      </div>

      {data.length > 0 && (
        <div className="mt-3 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500">Current ACWR: </span>
            <span className={`text-sm font-bold ${
              data[data.length - 1].acwr > 1.3 ? 'text-red-500' :
              data[data.length - 1].acwr < 0.8 ? 'text-yellow-500' : 'text-[#0D9488]'
            }`}>
              {data[data.length - 1].acwr.toFixed(2)}
            </span>
          </div>
          <div className="text-[10px] text-gray-400">
            {data[data.length - 1].acwr > 1.3 ? '⚠️ High load' :
             data[data.length - 1].acwr < 0.8 ? '📉 Low load' : '✅ Good zone'}
          </div>
        </div>
      )}
    </div>
  )
}

function PaceTrend({ logs }: { logs: Record<string, TrainingLog> }) {
  const paceData = useMemo(() => {
    return logsArray(logs)
      .filter(l => l.done && l.pace && l.km && l.km >= 5)
      .map(l => ({ week: l.week_n, pace: paceToSecs(l.pace!), km: l.km! }))
      .sort((a, b) => a.week - b.week)
      .slice(-10)
  }, [logs])

  if (paceData.length < 2) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="text-sm font-bold text-gray-900 mb-1">Pace Trend</div>
        <p className="text-xs text-gray-400">Log runs with a pace to see your trend. Lower is faster.</p>
      </div>
    )
  }

  const maxPace = Math.max(...paceData.map(d => d.pace))
  const minPace = Math.min(...paceData.map(d => d.pace))
  const range = maxPace - minPace || 30

  // Simple SVG polyline
  const w = 280
  const h = 80
  const points = paceData.map((d, i) => {
    const x = (i / (paceData.length - 1)) * w
    const y = h - ((d.pace - minPace) / range) * h
    return `${x},${y}`
  }).join(' ')

  const latest = paceData[paceData.length - 1]
  const first = paceData[0]
  const improving = latest.pace < first.pace

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-sm font-bold text-gray-900">Pace Trend</div>
        <div className={`text-xs font-semibold ${improving ? 'text-[#0D9488]' : 'text-orange-500'}`}>
          {improving ? '↗ Getting faster' : '↘ Slower recently'}
        </div>
      </div>

      <svg viewBox={`-4 -4 ${w + 8} ${h + 8}`} className="w-full" style={{ height: '80px' }}>
        <polyline
          points={points}
          fill="none"
          stroke="#0D9488"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {paceData.map((d, i) => {
          const x = (i / (paceData.length - 1)) * w
          const y = h - ((d.pace - minPace) / range) * h
          return <circle key={i} cx={x} cy={y} r="3" fill="#0D9488" />
        })}
      </svg>

      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>Slow ({secsToMMSS(maxPace)}/km)</span>
        <span>Fast ({secsToMMSS(minPace)}/km)</span>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        Latest: <span className="font-semibold text-gray-900">{secsToMMSS(latest.pace)}/km</span>
        <span className="text-gray-400"> · {latest.km}km</span>
      </div>
    </div>
  )
}

function SessionSummary({ logs, weeks }: { logs: Record<string, TrainingLog>; weeks: PlanWeek[] }) {
  const all = logsArray(logs)
  const done = all.filter(l => l.done)
  const totalKm = done.reduce((a, l) => a + (l.km ?? 0), 0)
  const totalSessions = done.length

  // Total planned sessions
  const plannedTotal = weeks.reduce((a, w) =>
    a + w.days.reduce((b, d) => b + d.sessions.length, 0), 0)

  const avgEffort = done.filter(l => l.effort).length > 0
    ? done.filter(l => l.effort).reduce((a, l) => a + l.effort!, 0) / done.filter(l => l.effort).length
    : 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="text-sm font-bold text-gray-900 mb-4">Plan Summary</div>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="text-2xl font-black text-[#0D9488]">{Math.round(totalKm)}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">km logged</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-black text-gray-900">{totalSessions}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">sessions done</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-black text-gray-900">
            {avgEffort > 0 ? avgEffort.toFixed(1) : '—'}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">avg effort</div>
        </div>
      </div>
      {plannedTotal > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
            <span>{totalSessions} of {plannedTotal} sessions</span>
            <span>{Math.round((totalSessions / plannedTotal) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0D9488] rounded-full"
              style={{ width: `${Math.min((totalSessions / plannedTotal) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Stats Component ─────────────────────────────────────────────────────

export default function StatsClient() {
  const { plan, weeks, loading: planLoading } = useActivePlan()
  const { logs, loading: logsLoading } = useTrainingLog(plan?.id ?? null)

  const loading = planLoading || logsLoading

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] pb-24 pt-16">
        <div className="max-w-lg mx-auto px-4 space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] pb-24 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-base font-bold text-gray-900 mb-2">No active plan</h2>
          <p className="text-sm text-gray-400 mb-5">Choose a plan to start tracking your stats.</p>
          <a href="/onboarding" className="inline-block bg-[#0D9488] text-white px-6 py-3 rounded-xl text-sm font-semibold">
            Choose a plan →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-bold text-gray-900">Stats</h1>
          <p className="text-xs text-gray-400 mt-0.5">{plan.name}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Race countdown */}
        {plan.race_date && (
          <RaceCountdown raceDate={plan.race_date} planName={plan.name} />
        )}

        {/* AI Coaching */}
        <CoachingCard />

        {/* Summary stats */}
        <SessionSummary logs={logs} weeks={weeks} />

        {/* Weekly volume */}
        <WeeklyVolumeChart logs={logs} weeks={weeks} />

        {/* ACWR */}
        <ACWRChart logs={logs} weeks={weeks} />

        {/* Pace trend */}
        <PaceTrend logs={logs} />

      </div>
    </div>
  )
}
