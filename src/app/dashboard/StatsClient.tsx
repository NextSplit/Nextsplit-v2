'use client'

import { useMemo, useState } from 'react'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useTrainingLog } from '@/hooks/useTrainingLog'
import { useRaces } from '@/hooks/useRaces'
import CoachingCard from '@/components/CoachingCard'
import type { PlanWeek, TrainingLog, Race } from '@/types/database'

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

// ─── Helpers shared with Races/Pace ──────────────────────────────────────────

function secsToHMS(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function hmsToSecs(str: string): number {
  const parts = str.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

function paceMinsPerKm(timeSecs: number, distKm: number): string {
  if (!distKm || !timeSecs) return '—'
  const paceS = timeSecs / distKm
  const m = Math.floor(paceS / 60)
  const s = Math.round(paceS % 60)
  return `${m}:${String(s).padStart(2, '0')} /km`
}

// ─── Race Calendar section ────────────────────────────────────────────────────

const PRIORITY_CFG = {
  A: { label: 'A Race', colour: 'bg-red-50 text-red-700 border-red-200' },
  B: { label: 'B Race', colour: 'bg-orange-50 text-orange-700 border-orange-200' },
  C: { label: 'C Race', colour: 'bg-blue-50 text-blue-700 border-blue-200' },
  training: { label: 'Training', colour: 'bg-gray-50 text-gray-600 border-gray-200' },
}

function daysUntilRace(dateStr: string): number {
  const t = new Date(dateStr); const now = new Date()
  t.setHours(0,0,0,0); now.setHours(0,0,0,0)
  return Math.ceil((t.getTime() - now.getTime()) / 86400000)
}

function fmtRaceDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', year:'numeric' })
}

const COMMON_DISTANCES = [
  { label: '5K', km: 5 }, { label: '10K', km: 10 }, { label: '10 Mile', km: 16.09 },
  { label: 'Half Marathon', km: 21.0975 }, { label: 'Marathon', km: 42.195 },
  { label: '50K', km: 50 }, { label: '50 Mile', km: 80.47 },
  { label: '100K', km: 100 }, { label: '100 Mile', km: 160.93 },
]

function AddRaceModal({ onClose, onAdd }: {
  onClose: () => void
  onAdd: (p: { name: string; race_date: string; distance_km?: number; distance_label?: string; priority: 'A'|'B'|'C'|'training'; goal_time_secs?: number; location?: string }) => Promise<void>
}) {
  const [name, setName] = useState(''); const [date, setDate] = useState('')
  const [distKm, setDistKm] = useState<number|''>(''); const [distLabel, setDistLabel] = useState('')
  const [priority, setPriority] = useState<'A'|'B'|'C'|'training'>('A')
  const [goalH, setGoalH] = useState(''); const [goalM, setGoalM] = useState(''); const [goalS, setGoalS] = useState('')
  const [location, setLocation] = useState(''); const [saving, setSaving] = useState(false); const [err, setErr] = useState('')

  async function handleSave() {
    if (!name.trim() || !date) { setErr('Name and date are required'); return }
    setSaving(true); setErr('')
    try {
      const goalSecs = (goalH || goalM || goalS)
        ? (Number(goalH||0)*3600 + Number(goalM||0)*60 + Number(goalS||0)) : undefined
      await onAdd({ name: name.trim(), race_date: date, distance_km: distKm !== '' ? Number(distKm) : undefined,
        distance_label: distLabel || undefined, priority,
        goal_time_secs: goalSecs && goalSecs > 0 ? goalSecs : undefined, location: location.trim() || undefined })
      onClose()
    } catch(e) { setErr(e instanceof Error ? e.message : 'Failed') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <h2 className="text-base font-bold text-gray-900 mb-5">Add Race</h2>
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">Race name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. London Marathon 2027"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
        </div>
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">Race date *</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
        </div>
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">Distance</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {COMMON_DISTANCES.map(d => (
              <button key={d.label} onClick={() => { setDistKm(d.km); setDistLabel(d.label) }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${distLabel === d.label ? 'bg-[#0D9488] text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}>
                {d.label}
              </button>
            ))}
          </div>
          <input type="number" value={distKm} onChange={e => { setDistKm(e.target.value === '' ? '' : Number(e.target.value)); setDistLabel('') }}
            placeholder="Custom km"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
        </div>
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">Priority</label>
          <div className="flex gap-2">
            {(['A','B','C','training'] as const).map(p => (
              <button key={p} onClick={() => setPriority(p)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${priority === p ? PRIORITY_CFG[p].colour : 'bg-white text-gray-500 border-gray-200'}`}>
                {p === 'training' ? 'Train' : p}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">Goal time (optional)</label>
          <div className="flex items-center gap-2">
            {[['H', goalH, setGoalH], ['MM', goalM, setGoalM], ['SS', goalS, setGoalS]].map(([ph, val, set]) => (
              <input key={ph as string} value={val as string} onChange={e => (set as (v:string)=>void)(e.target.value)} placeholder={ph as string}
                className="w-14 border border-gray-200 rounded-xl px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
            ))}
          </div>
        </div>
        <div className="mb-5">
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">Location (optional)</label>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. London, UK"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
        </div>
        {err && <p className="text-xs text-red-500 mb-3">{err}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-[#0D9488] text-white text-sm font-semibold disabled:opacity-50">{saving ? 'Saving…' : 'Add Race'}</button>
        </div>
      </div>
    </div>
  )
}

function LogResultModal({ race, onClose, onLog }: { race: Race; onClose: () => void; onLog: (secs: number) => Promise<void> }) {
  const [h, setH] = useState(''); const [m, setM] = useState(''); const [s, setS] = useState(''); const [saving, setSaving] = useState(false)
  const totalSecs = Number(h||0)*3600 + Number(m||0)*60 + Number(s||0)
  const pace = race.distance_km && totalSecs ? paceMinsPerKm(totalSecs, race.distance_km) : null
  const vsGoal = race.goal_time_secs && totalSecs ? totalSecs - race.goal_time_secs : null

  async function handleSave() {
    if (!totalSecs) return; setSaving(true)
    try { await onLog(totalSecs); onClose() } finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <h2 className="text-base font-bold text-gray-900 mb-1">Log result</h2>
        <p className="text-xs text-gray-400 mb-5">{race.name}</p>
        <div className="flex items-center gap-2 mb-4">
          {[['H', h, setH], ['MM', m, setM], ['SS', s, setS]].map(([ph, val, set]) => (
            <input key={ph as string} value={val as string} onChange={e => (set as (v:string)=>void)(e.target.value)} placeholder={ph as string}
              className="w-16 border border-gray-200 rounded-xl px-2 py-3 text-lg text-center font-bold focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
          ))}
        </div>
        {pace && <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between mb-3"><span className="text-xs text-gray-500">Avg pace</span><span className="text-sm font-bold text-gray-900">{pace}</span></div>}
        {vsGoal !== null && (
          <div className={`rounded-xl px-4 py-3 flex items-center justify-between mb-5 ${vsGoal <= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <span className="text-xs text-gray-500">vs goal</span>
            <span className={`text-sm font-bold ${vsGoal <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{vsGoal <= 0 ? `${secsToHMS(Math.abs(vsGoal))} under` : `${secsToHMS(vsGoal)} over`}</span>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
          <button onClick={handleSave} disabled={saving || !totalSecs} className="flex-1 py-3 rounded-xl bg-[#0D9488] text-white text-sm font-semibold disabled:opacity-50">{saving ? 'Saving…' : 'Save result'}</button>
        </div>
      </div>
    </div>
  )
}

function RaceCard({ race, onLogResult, onDelete }: { race: Race; onLogResult: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = PRIORITY_CFG[race.priority]
  const days = daysUntilRace(race.race_date)

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all ${expanded ? 'border-gray-200 shadow-sm' : 'border-gray-100'}`}>
      <button className="w-full text-left p-4" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start gap-3">
          <div className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex-shrink-0 mt-0.5 ${cfg.colour}`}>{race.priority === 'training' ? 'TRN' : race.priority}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-gray-900 leading-tight mb-0.5">{race.name}</div>
            <div className="text-xs text-gray-400">{fmtRaceDate(race.race_date)}{race.location && ` · ${race.location}`}</div>
            {race.distance_label && <div className="text-[11px] text-gray-500 mt-0.5">{race.distance_label}</div>}
          </div>
          <div className="text-right flex-shrink-0">
            {race.actual_time_secs ? (
              <div><div className="text-sm font-bold text-emerald-600">{secsToHMS(race.actual_time_secs)}</div><div className="text-[10px] text-gray-400">result</div></div>
            ) : days < 0 ? <div className="text-xs text-gray-400 font-medium">Past</div>
              : days === 0 ? <div className="text-sm font-bold text-red-500">Today!</div>
              : <div><div className="text-xl font-black text-[#0D9488]">{days}</div><div className="text-[10px] text-gray-400">days</div></div>}
          </div>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3">
          {(race.goal_time_secs || race.actual_time_secs) && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {race.goal_time_secs && (
                <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <div className="text-[10px] text-gray-400 mb-0.5">Goal</div>
                  <div className="text-sm font-bold text-gray-900">{secsToHMS(race.goal_time_secs)}</div>
                  {race.distance_km && <div className="text-[10px] text-gray-400 mt-0.5">{paceMinsPerKm(race.goal_time_secs, race.distance_km)}</div>}
                </div>
              )}
              {race.actual_time_secs && (
                <div className="bg-emerald-50 rounded-xl px-3 py-2.5">
                  <div className="text-[10px] text-emerald-600 mb-0.5">Result</div>
                  <div className="text-sm font-bold text-emerald-700">{secsToHMS(race.actual_time_secs)}</div>
                  {race.distance_km && <div className="text-[10px] text-emerald-500 mt-0.5">{paceMinsPerKm(race.actual_time_secs, race.distance_km)}</div>}
                </div>
              )}
            </div>
          )}
          {race.notes && <p className="text-xs text-gray-500 mb-3 leading-relaxed">{race.notes}</p>}
          <div className="flex gap-2">
            {!race.actual_time_secs && <button onClick={onLogResult} className="flex-1 py-2 rounded-xl bg-[#0D9488] text-white text-xs font-semibold">Log result</button>}
            <button onClick={onDelete} className="py-2 px-4 rounded-xl border border-red-200 text-red-500 text-xs font-semibold">Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}

function RacesSection() {
  const { upcoming, past, loading, addRace, logResult, deleteRace } = useRaces()
  const [showAdd, setShowAdd] = useState(false)
  const [logRace, setLogRace] = useState<Race | null>(null)
  const [view, setView] = useState<'upcoming'|'past'>('upcoming')
  const shown = view === 'upcoming' ? upcoming : [...past].reverse()

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['upcoming','past'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${view === v ? 'bg-[#0D9488] text-white' : 'bg-white border border-gray-200 text-gray-500'}`}>
              {v === 'upcoming' ? `Upcoming${upcoming.length ? ` (${upcoming.length})` : ''}` : `Past${past.length ? ` (${past.length})` : ''}`}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)}
          className="w-8 h-8 rounded-full bg-[#0D9488] text-white flex items-center justify-center text-xl font-light leading-none">+</button>
      </div>

      {loading && [1,2].map(i => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}

      {!loading && shown.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <div className="text-4xl mb-3">🏁</div>
          <p className="text-sm font-semibold text-gray-700">{view === 'upcoming' ? 'No upcoming races' : 'No past races'}</p>
          {view === 'upcoming' && <p className="text-xs text-gray-400 mt-1 mb-4">Add your next race to track the countdown.</p>}
          {view === 'upcoming' && <button onClick={() => setShowAdd(true)} className="inline-block bg-[#0D9488] text-white px-5 py-2.5 rounded-xl text-sm font-semibold">Add a race</button>}
        </div>
      )}

      {shown.map(r => (
        <RaceCard key={r.id} race={r} onLogResult={() => setLogRace(r)} onDelete={() => deleteRace(r.id)} />
      ))}

      {showAdd && <AddRaceModal onClose={() => setShowAdd(false)} onAdd={async p => { await addRace(p) }} />}
      {logRace && <LogResultModal race={logRace} onClose={() => setLogRace(null)} onLog={async secs => { await logResult(logRace.id, secs) }} />}
    </>
  )
}

// ─── Pace Calculator ──────────────────────────────────────────────────────────

function PaceCalculator() {
  const [mode, setMode] = useState<'time→pace'|'pace→time'>('time→pace')
  const [dist, setDist] = useState<number|''>(42.195)
  const [timeInput, setTimeInput] = useState('')
  const [paceInput, setPaceInput] = useState('')

  let result: string | null = null
  if (mode === 'time→pace' && timeInput && dist) {
    const s = hmsToSecs(timeInput); if (s > 0) result = paceMinsPerKm(s, Number(dist))
  }
  if (mode === 'pace→time' && paceInput && dist) {
    const ps = hmsToSecs(paceInput); if (ps > 0) result = secsToHMS(Math.round(ps * Number(dist)))
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-[#0D9488] to-[#0891B2] px-5 py-4">
        <div className="text-xs font-semibold text-teal-100 uppercase tracking-wide mb-1">Pace Calculator</div>
        <div className="text-white font-bold text-sm">Race time ↔ min/km pace</div>
      </div>
      <div className="p-5">
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          {(['time→pace','pace→time'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              {m === 'time→pace' ? 'Time → Pace' : 'Pace → Time'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {[{l:'5K',d:5},{l:'10K',d:10},{l:'HM',d:21.0975},{l:'Mar',d:42.195}].map(p => (
            <button key={p.l} onClick={() => setDist(p.d)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${dist === p.d ? 'bg-[#0D9488] text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}>
              {p.l}
            </button>
          ))}
          <input type="number" value={dist} onChange={e => setDist(e.target.value === '' ? '' : Number(e.target.value))} placeholder="km"
            className="w-16 border border-gray-200 rounded-full px-2.5 py-1 text-[11px] text-center focus:outline-none focus:ring-1 focus:ring-[#0D9488]" />
        </div>
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">
            {mode === 'time→pace' ? 'Race time (h:mm:ss or m:ss)' : 'Target pace (m:ss per km)'}
          </label>
          <input value={mode === 'time→pace' ? timeInput : paceInput}
            onChange={e => mode === 'time→pace' ? setTimeInput(e.target.value) : setPaceInput(e.target.value)}
            placeholder={mode === 'time→pace' ? 'e.g. 3:45:00' : 'e.g. 5:20'}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
        </div>
        {result && (
          <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 text-center">
            <div className="text-[10px] text-teal-600 uppercase tracking-wide mb-0.5">{mode === 'time→pace' ? 'Average pace' : 'Finish time'}</div>
            <div className="text-2xl font-black text-teal-700">{result}</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function StatsClient() {
  const { plan, weeks, loading: planLoading } = useActivePlan()
  const { logs, loading: logsLoading } = useTrainingLog(plan?.id ?? null)
  const [activeTab, setActiveTab] = useState<'stats'|'races'|'pace'>('stats')

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

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 sticky top-0 z-40">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-900">Stats</h1>
            {plan && <span className="text-xs text-gray-400">{plan.name}</span>}
          </div>
          <div className="flex gap-1">
            {([['stats','📊 Stats'],['races','🏁 Races'],['pace','⏱ Pace']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex-1 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${activeTab === id ? 'bg-[#0D9488] text-white' : 'bg-gray-100 text-gray-500'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Stats tab */}
        {activeTab === 'stats' && (
          <>
            {!plan ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <div className="text-5xl mb-4">📊</div>
                <h2 className="text-base font-bold text-gray-900 mb-2">No active plan</h2>
                <p className="text-sm text-gray-400 mb-5">Choose a plan to start tracking your stats.</p>
                <a href="/onboarding" className="inline-block bg-[#0D9488] text-white px-6 py-3 rounded-xl text-sm font-semibold">Choose a plan →</a>
              </div>
            ) : (
              <>
                {plan.race_date && <RaceCountdown raceDate={plan.race_date} planName={plan.name} />}
                <CoachingCard />
                <SessionSummary logs={logs} weeks={weeks} />
                <WeeklyVolumeChart logs={logs} weeks={weeks} />
                <ACWRChart logs={logs} weeks={weeks} />
                <PaceTrend logs={logs} />
              </>
            )}
          </>
        )}

        {/* Races tab */}
        {activeTab === 'races' && <RacesSection />}

        {/* Pace tab */}
        {activeTab === 'pace' && <PaceCalculator />}

      </div>
    </div>
  )
}
