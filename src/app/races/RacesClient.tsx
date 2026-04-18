'use client'

import { useState } from 'react'
import { useRaces } from '@/hooks/useRaces'
import type { Race } from '@/types/database'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

function formatRaceDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  })
}

function paceMinsPerKm(timeSecs: number, distKm: number): string {
  if (!distKm || !timeSecs) return '—'
  const paceS = timeSecs / distKm
  const m = Math.floor(paceS / 60)
  const s = Math.round(paceS % 60)
  return `${m}:${String(s).padStart(2, '0')} /km`
}

const PRIORITY_CONFIG = {
  A: { label: 'A Race', colour: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-400' },
  B: { label: 'B Race', colour: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-400' },
  C: { label: 'C Race', colour: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-400' },
  training: { label: 'Training', colour: 'bg-gray-50 text-gray-600 border-gray-200', dot: 'bg-gray-300' },
}

const COMMON_DISTANCES = [
  { label: '5K', km: 5 },
  { label: '10K', km: 10 },
  { label: '10 Mile', km: 16.09 },
  { label: 'Half Marathon', km: 21.0975 },
  { label: 'Marathon', km: 42.195 },
  { label: '50K', km: 50 },
  { label: '50 Mile', km: 80.47 },
  { label: '100K', km: 100 },
  { label: '100 Mile', km: 160.93 },
]

// ─── Add Race Modal ───────────────────────────────────────────────────────────

function AddRaceModal({ onClose, onAdd }: {
  onClose: () => void
  onAdd: (params: Parameters<ReturnType<typeof useRaces>['addRace']>[0]) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [distKm, setDistKm] = useState<number | ''>('')
  const [distLabel, setDistLabel] = useState('')
  const [priority, setPriority] = useState<'A' | 'B' | 'C' | 'training'>('A')
  const [goalH, setGoalH] = useState('')
  const [goalM, setGoalM] = useState('')
  const [goalS, setGoalS] = useState('')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function applyPreset(km: number, label: string) {
    setDistKm(km)
    setDistLabel(label)
  }

  async function handleSave() {
    if (!name.trim() || !date) { setErr('Name and date are required'); return }
    setSaving(true)
    setErr('')
    try {
      const goalSecs = goalH || goalM || goalS
        ? (Number(goalH || 0) * 3600 + Number(goalM || 0) * 60 + Number(goalS || 0))
        : undefined
      await onAdd({
        name: name.trim(),
        race_date: date,
        distance_km: distKm !== '' ? Number(distKm) : undefined,
        distance_label: distLabel || undefined,
        priority,
        goal_time_secs: goalSecs && goalSecs > 0 ? goalSecs : undefined,
        location: location.trim() || undefined,
      })
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <h2 className="text-base font-bold text-gray-900 mb-5">Add Race</h2>

        {/* Name */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">Race name *</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. London Marathon 2027"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
        </div>

        {/* Date */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">Race date *</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
        </div>

        {/* Distance presets */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">Distance</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {COMMON_DISTANCES.map(d => (
              <button key={d.label} onClick={() => applyPreset(d.km, d.label)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                  distLabel === d.label
                    ? 'bg-[#0D9488] text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}>
                {d.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="number" value={distKm} onChange={e => { setDistKm(e.target.value === '' ? '' : Number(e.target.value)); setDistLabel('') }}
              placeholder="Custom km"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
            <span className="text-sm text-gray-400 self-center">km</span>
          </div>
        </div>

        {/* Priority */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">Priority</label>
          <div className="flex gap-2">
            {(['A', 'B', 'C', 'training'] as const).map(p => (
              <button key={p} onClick={() => setPriority(p)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  priority === p ? PRIORITY_CONFIG[p].colour : 'bg-white text-gray-500 border-gray-200'
                }`}>
                {p === 'training' ? 'Train' : p}
              </button>
            ))}
          </div>
        </div>

        {/* Goal time */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">Goal time (optional)</label>
          <div className="flex items-center gap-2">
            <input value={goalH} onChange={e => setGoalH(e.target.value)} placeholder="H"
              className="w-14 border border-gray-200 rounded-xl px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
            <span className="text-gray-400 text-sm">h</span>
            <input value={goalM} onChange={e => setGoalM(e.target.value)} placeholder="MM"
              className="w-14 border border-gray-200 rounded-xl px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
            <span className="text-gray-400 text-sm">m</span>
            <input value={goalS} onChange={e => setGoalS(e.target.value)} placeholder="SS"
              className="w-14 border border-gray-200 rounded-xl px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
            <span className="text-gray-400 text-sm">s</span>
          </div>
        </div>

        {/* Location */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">Location (optional)</label>
          <input value={location} onChange={e => setLocation(e.target.value)}
            placeholder="e.g. London, UK"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
        </div>

        {err && <p className="text-xs text-red-500 mb-3">{err}</p>}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[#0D9488] text-white text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : 'Add Race'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Log Result Modal ─────────────────────────────────────────────────────────

function LogResultModal({ race, onClose, onLog }: {
  race: Race
  onClose: () => void
  onLog: (secs: number) => Promise<void>
}) {
  const [h, setH] = useState('')
  const [m, setM] = useState('')
  const [s, setS] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const secs = Number(h || 0) * 3600 + Number(m || 0) * 60 + Number(s || 0)
    if (!secs) return
    setSaving(true)
    try {
      await onLog(secs)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const secs = Number(h || 0) * 3600 + Number(m || 0) * 60 + Number(s || 0)
  const pace = race.distance_km && secs ? paceMinsPerKm(secs, race.distance_km) : null
  const vsGoal = race.goal_time_secs && secs
    ? secs - race.goal_time_secs
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <h2 className="text-base font-bold text-gray-900 mb-1">Log result</h2>
        <p className="text-xs text-gray-400 mb-5">{race.name}</p>

        <div className="flex items-center gap-2 mb-4">
          <input value={h} onChange={e => setH(e.target.value)} placeholder="H"
            className="w-16 border border-gray-200 rounded-xl px-2 py-3 text-lg text-center font-bold focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
          <span className="text-gray-300 text-xl font-light">:</span>
          <input value={m} onChange={e => setM(e.target.value)} placeholder="MM"
            className="w-16 border border-gray-200 rounded-xl px-2 py-3 text-lg text-center font-bold focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
          <span className="text-gray-300 text-xl font-light">:</span>
          <input value={s} onChange={e => setS(e.target.value)} placeholder="SS"
            className="w-16 border border-gray-200 rounded-xl px-2 py-3 text-lg text-center font-bold focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
        </div>

        {pace && (
          <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between mb-5">
            <span className="text-xs text-gray-500">Avg pace</span>
            <span className="text-sm font-bold text-gray-900">{pace}</span>
          </div>
        )}
        {vsGoal !== null && (
          <div className={`rounded-xl px-4 py-3 flex items-center justify-between mb-5 ${
            vsGoal <= 0 ? 'bg-emerald-50' : 'bg-red-50'
          }`}>
            <span className="text-xs text-gray-500">vs goal</span>
            <span className={`text-sm font-bold ${vsGoal <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {vsGoal <= 0 ? `${secsToHMS(Math.abs(vsGoal))} under` : `${secsToHMS(vsGoal)} over`}
            </span>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !secs}
            className="flex-1 py-3 rounded-xl bg-[#0D9488] text-white text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : 'Save result'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Race Card ────────────────────────────────────────────────────────────────

function RaceCard({ race, onLogResult, onDelete }: {
  race: Race
  onLogResult: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const cfg = PRIORITY_CONFIG[race.priority]
  const days = daysUntil(race.race_date)
  const isPast = days < 0
  const isToday = days === 0

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all ${
      expanded ? 'border-gray-200 shadow-sm' : 'border-gray-100'
    }`}>
      <button className="w-full text-left p-4" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start gap-3">
          {/* Priority badge */}
          <div className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex-shrink-0 mt-0.5 ${cfg.colour}`}>
            {race.priority === 'training' ? 'TRN' : race.priority}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-gray-900 leading-tight mb-0.5">{race.name}</div>
            <div className="text-xs text-gray-400">
              {formatRaceDate(race.race_date)}
              {race.location && ` · ${race.location}`}
            </div>
            {race.distance_label && (
              <div className="text-[11px] text-gray-500 mt-0.5">{race.distance_label}</div>
            )}
          </div>

          {/* Days / result */}
          <div className="text-right flex-shrink-0">
            {race.actual_time_secs ? (
              <div>
                <div className="text-sm font-bold text-emerald-600">{secsToHMS(race.actual_time_secs)}</div>
                <div className="text-[10px] text-gray-400">result</div>
              </div>
            ) : isPast ? (
              <div className="text-xs text-gray-400 font-medium">Past</div>
            ) : isToday ? (
              <div>
                <div className="text-sm font-bold text-red-500">Today!</div>
              </div>
            ) : (
              <div>
                <div className="text-xl font-black text-[#0D9488]">{days}</div>
                <div className="text-[10px] text-gray-400">days</div>
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3">
          {/* Goal time + pace */}
          {(race.goal_time_secs || race.actual_time_secs) && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {race.goal_time_secs && (
                <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <div className="text-[10px] text-gray-400 mb-0.5">Goal</div>
                  <div className="text-sm font-bold text-gray-900">{secsToHMS(race.goal_time_secs)}</div>
                  {race.distance_km && (
                    <div className="text-[10px] text-gray-400 mt-0.5">{paceMinsPerKm(race.goal_time_secs, race.distance_km)}</div>
                  )}
                </div>
              )}
              {race.actual_time_secs && (
                <div className="bg-emerald-50 rounded-xl px-3 py-2.5">
                  <div className="text-[10px] text-emerald-600 mb-0.5">Result</div>
                  <div className="text-sm font-bold text-emerald-700">{secsToHMS(race.actual_time_secs)}</div>
                  {race.distance_km && (
                    <div className="text-[10px] text-emerald-500 mt-0.5">{paceMinsPerKm(race.actual_time_secs, race.distance_km)}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {race.notes && (
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">{race.notes}</p>
          )}

          <div className="flex gap-2">
            {!race.actual_time_secs && (
              <button onClick={onLogResult}
                className="flex-1 py-2 rounded-xl bg-[#0D9488] text-white text-xs font-semibold">
                Log result
              </button>
            )}
            <button onClick={onDelete}
              className="py-2 px-4 rounded-xl border border-red-200 text-red-500 text-xs font-semibold">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Pace Calculator ──────────────────────────────────────────────────────────

function PaceCalculator() {
  const [mode, setMode] = useState<'time→pace' | 'pace→time'>('time→pace')
  const [dist, setDist] = useState<number | ''>(42.195)
  const [timeInput, setTimeInput] = useState('')  // hh:mm:ss
  const [paceInput, setPaceInput] = useState('')  // m:ss

  let result: string | null = null

  if (mode === 'time→pace' && timeInput && dist) {
    const secs = hmsToSecs(timeInput)
    if (secs > 0) result = paceMinsPerKm(secs, Number(dist))
  }

  if (mode === 'pace→time' && paceInput && dist) {
    const paceSecs = hmsToSecs(paceInput)
    if (paceSecs > 0) {
      const totalSecs = Math.round(paceSecs * Number(dist))
      result = secsToHMS(totalSecs)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-[#0D9488] to-[#0891B2] px-5 py-4">
        <div className="text-xs font-semibold text-teal-100 uppercase tracking-wide mb-1">Pace Calculator</div>
        <div className="text-white font-bold text-sm">Race time ↔ min/km pace</div>
      </div>

      <div className="p-5">
        {/* Mode toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          <button onClick={() => setMode('time→pace')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'time→pace' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}>
            Time → Pace
          </button>
          <button onClick={() => setMode('pace→time')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'pace→time' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}>
            Pace → Time
          </button>
        </div>

        {/* Distance presets */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {[{ l: '5K', d: 5 }, { l: '10K', d: 10 }, { l: 'HM', d: 21.0975 }, { l: 'Mar', d: 42.195 }].map(p => (
            <button key={p.l} onClick={() => setDist(p.d)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                dist === p.d ? 'bg-[#0D9488] text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'
              }`}>
              {p.l}
            </button>
          ))}
          <input type="number" value={dist} onChange={e => setDist(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="km"
            className="w-16 border border-gray-200 rounded-full px-2.5 py-1 text-[11px] text-center focus:outline-none focus:ring-1 focus:ring-[#0D9488]" />
        </div>

        {mode === 'time→pace' ? (
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Race time (h:mm:ss or m:ss)</label>
            <input value={timeInput} onChange={e => setTimeInput(e.target.value)}
              placeholder="e.g. 3:45:00"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
          </div>
        ) : (
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Target pace (m:ss per km)</label>
            <input value={paceInput} onChange={e => setPaceInput(e.target.value)}
              placeholder="e.g. 5:20"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
          </div>
        )}

        {result && (
          <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 text-center">
            <div className="text-[10px] text-teal-600 uppercase tracking-wide mb-0.5">
              {mode === 'time→pace' ? 'Average pace' : 'Finish time'}
            </div>
            <div className="text-2xl font-black text-teal-700">{result}</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RacesClient() {
  const { upcoming, past, loading, addRace, logResult, deleteRace } = useRaces()
  const [showAdd, setShowAdd] = useState(false)
  const [logRace, setLogRace] = useState<Race | null>(null)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'pace'>('upcoming')

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Races</h1>
          <button onClick={() => setShowAdd(true)}
            className="w-8 h-8 rounded-full bg-[#0D9488] text-white flex items-center justify-center text-xl font-light leading-none">
            +
          </button>
        </div>
        {/* Tabs */}
        <div className="max-w-lg mx-auto flex gap-1 mt-3">
          {([['upcoming', `Upcoming${upcoming.length ? ` (${upcoming.length})` : ''}`],
             ['past', `Past${past.length ? ` (${past.length})` : ''}`],
             ['pace', 'Pace Calc']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex-1 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                activeTab === id ? 'bg-[#0D9488] text-white' : 'bg-gray-100 text-gray-500'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-3">

        {loading && (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
          </div>
        )}

        {/* Upcoming */}
        {!loading && activeTab === 'upcoming' && (
          <>
            {upcoming.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <div className="text-4xl mb-3">🏁</div>
                <p className="text-sm font-semibold text-gray-700">No upcoming races</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">Add your next race to track the countdown.</p>
                <button onClick={() => setShowAdd(true)}
                  className="inline-block bg-[#0D9488] text-white px-5 py-2.5 rounded-xl text-sm font-semibold">
                  Add a race
                </button>
              </div>
            ) : (
              upcoming.map(r => (
                <RaceCard key={r.id} race={r}
                  onLogResult={() => setLogRace(r)}
                  onDelete={() => deleteRace(r.id)} />
              ))
            )}
          </>
        )}

        {/* Past */}
        {!loading && activeTab === 'past' && (
          <>
            {past.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
                <p className="text-sm text-gray-400">No past races yet.</p>
              </div>
            ) : (
              [...past].reverse().map(r => (
                <RaceCard key={r.id} race={r}
                  onLogResult={() => setLogRace(r)}
                  onDelete={() => deleteRace(r.id)} />
              ))
            )}
          </>
        )}

        {/* Pace calc */}
        {activeTab === 'pace' && <PaceCalculator />}

      </div>

      {showAdd && (
        <AddRaceModal
          onClose={() => setShowAdd(false)}
          onAdd={async params => { await addRace(params) }}
        />
      )}

      {logRace && (
        <LogResultModal
          race={logRace}
          onClose={() => setLogRace(null)}
          onLog={async secs => { await logResult(logRace.id, secs) }}
        />
      )}
    </div>
  )
}
