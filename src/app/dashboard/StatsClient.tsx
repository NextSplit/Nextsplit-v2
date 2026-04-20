'use client'

import { useMemo, useState } from 'react'
import ProGate from '@/components/ProGate'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useTrainingLog } from '@/hooks/useTrainingLog'
import { useRaces } from '@/hooks/useRaces'
import { computeStreak, computeConsistency, predictRaceTime } from '@/lib/streak'
import { computePersonalBests } from '@/lib/personalBests'
import { secsToHMS } from '@/lib/sessionUtils'
import { logsArray, daysUntil, paceToSecs, paceMinsPerKm, hmsToSecs } from '@/lib/statsUtils'
import CoachingCard from '@/components/CoachingCard'
import PreRaceBrief from '@/components/PreRaceBrief'
import DarkModeToggle from '@/components/DarkModeToggle'
import { useUnits, fmtDistance, secsPerKmToDisplay } from '@/lib/units'
import { useToast } from '@/components/Toast'
import { db } from '@/lib/supabase/db'
import type { PlanWeek, TrainingLog, Race } from '@/types/database'
import RaceCountdown from '@/components/charts/RaceCountdown'
import WeeklyVolumeChart from '@/components/charts/WeeklyVolumeChart'
import ACWRChart from '@/components/charts/ACWRChart'
import PaceTrend from '@/components/charts/PaceTrend'
import SessionSummary from '@/components/charts/SessionSummary'
import PaceCalculator from '@/components/charts/PaceCalculator'
import WellnessTrend from '@/components/charts/WellnessTrend'
import WeightTrend from '@/components/charts/WeightTrend'
import PBCard from '@/components/charts/PBCard'
import TrainingZones from '@/components/charts/TrainingZones'

const PRIORITY_CFG = {
  A: { label: 'A Race', colour: 'bg-red-50 text-red-700 border-red-200' },
  B: { label: 'B Race', colour: 'bg-orange-50 text-orange-700 border-orange-200' },
  C: { label: 'C Race', colour: 'bg-blue-50 text-blue-700 border-blue-200' },
  training: { label: 'Training', colour: 'bg-gray-50 text-gray-600 border-gray-200' },
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
            min={new Date().toISOString().split('T')[0]}
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
  const [confirmDelete, setConfirmDelete] = useState(false)
  const cfg = PRIORITY_CFG[race.priority]
  const days = daysUntil(race.race_date)

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
            {!race.actual_time_secs && (
              <button onClick={onLogResult}
                className="flex-1 py-2 rounded-xl bg-[#0D9488] text-white text-xs font-semibold">
                Log result
              </button>
            )}
            {confirmDelete ? (
              <div className="flex gap-2 flex-1">
                <button onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-500 text-xs font-semibold">
                  Cancel
                </button>
                <button onClick={() => { setConfirmDelete(false); onDelete() }}
                  className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-bold">
                  Delete
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="py-2 px-4 rounded-xl border border-red-200 text-red-500 text-xs font-semibold">
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function RacesSection() {
  const { upcoming, past, loading, addRace, logResult, deleteRace } = useRaces()
  const { success: toastSuccess, error: toastError } = useToast()
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
        <RaceCard key={r.id} race={r} onLogResult={() => setLogRace(r)}
          onDelete={async () => {
            try { await deleteRace(r.id); toastSuccess('Race removed') }
            catch { toastError('Failed to delete race') }
          }} />
      ))}

      {showAdd && (
        <AddRaceModal onClose={() => setShowAdd(false)} onAdd={async p => {
          try { await addRace(p); toastSuccess('Race added!'); setShowAdd(false) }
          catch { toastError('Failed to add race — check your connection') }
        }} />
      )}
      {logRace && (
        <LogResultModal race={logRace} onClose={() => setLogRace(null)} onLog={async secs => {
          try { await logResult(logRace.id, secs); toastSuccess('Result logged!') }
          catch { toastError('Failed to save result') }
        }} />
      )}
    </>
  )
}

// ─── Training Zones ───────────────────────────────────────────────────────────


export default function StatsClient() {
  const { plan, weeks, loading: planLoading } = useActivePlan()
  const { logs, loading: logsLoading } = useTrainingLog(plan?.id ?? null)
  const { upcoming: upcomingRaces } = useRaces()
  const [activeTab, setActiveTab] = useState<'stats'|'races'|'pace'>('stats')
  const units = useUnits()

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
            <h1 className="text-lg font-bold text-gray-900">Coach</h1>
            <div className="flex items-center gap-2">
              {plan && <span className="text-xs text-gray-400">{plan.name}</span>}
              <DarkModeToggle />
            </div>
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
                <div className="text-5xl mb-4">🧠</div>
                <h2 className="text-base font-bold text-gray-900 mb-2">Your coach is ready</h2>
                <p className="text-sm text-gray-400 mb-5 leading-relaxed">Start a training plan and your AI coach will analyse your sessions, spot patterns, and give you weekly insights.</p>
                <a href="/onboarding" className="inline-block bg-[#0D9488] text-white px-6 py-3 rounded-xl text-sm font-semibold">Choose a plan →</a>
              </div>
            ) : (
              <>
                {/* Early-weeks guidance card */}
                {(() => {
                  const doneSessions = Object.values(logs).filter(l => l.done).length
                  if (plan.current_week <= 4 && doneSessions < 4) {
                    return (
                      <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl border border-teal-100 p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">🌱</span>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-teal-800 mb-1">Building your baseline</p>
                            <p className="text-xs text-teal-700 leading-relaxed">
                              Log {Math.max(0, 4 - doneSessions)} more session{doneSessions === 3 ? '' : 's'} to unlock ACWR, pace trend, and training zones.
                            </p>
                            {doneSessions > 0 && (
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-teal-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-teal-400 rounded-full" style={{ width: `${(doneSessions / 4) * 100}%` }} />
                                </div>
                                <span className="text-[10px] font-semibold text-teal-600">{doneSessions}/4</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}
                {plan.race_date && <RaceCountdown raceDate={plan.race_date} planName={plan.name} />}
                {/* Multi-distance race predictor */}
                {(() => {
                  const allLogs = logsArray(logs)
                  const DISTANCES = [
                    { label: '5K', km: 5 },
                    { label: '10K', km: 10 },
                    { label: 'Half', km: 21.0975 },
                    { label: 'Marathon', km: 42.195 },
                  ]
                  const predictions = DISTANCES.map(d => ({
                    ...d,
                    prediction: predictRaceTime(d.km, allLogs, plan.current_week)
                  })).filter(d => d.prediction !== null)
                  if (predictions.length === 0) return null

                  // Highlight the plan's target distance if detectable
                  const planKm = plan.goal?.toLowerCase().includes('marathon') && !plan.goal?.toLowerCase().includes('half') ? 42.195
                    : plan.goal?.toLowerCase().includes('half') ? 21.0975
                    : plan.goal?.toLowerCase().includes('10k') ? 10
                    : plan.goal?.toLowerCase().includes('5k') ? 5
                    : plan.name?.toLowerCase().includes('marathon') && !plan.name?.toLowerCase().includes('half') ? 42.195
                    : plan.name?.toLowerCase().includes('half') ? 21.0975
                    : plan.name?.toLowerCase().includes('10k') ? 10
                    : plan.name?.toLowerCase().includes('5k') ? 5
                    : null

                  return (
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-900">Race predictions</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Based on your logged runs · Riegel formula</p>
                        </div>
                        {plan.race_date && daysUntil(plan.race_date) > 0 && (
                          <span className="text-[10px] text-gray-400">{daysUntil(plan.race_date)}d to go</span>
                        )}
                      </div>
                      <div className="divide-y divide-gray-50">
                        {predictions.map(({ label, km, prediction }) => {
                          if (!prediction) return null
                          const isTarget = planKm !== null && Math.abs(km - planKm) < 1
                          const confColour = prediction.confidence === 'high' ? 'text-emerald-500'
                            : prediction.confidence === 'medium' ? 'text-amber-500' : 'text-gray-300'
                          return (
                            <div key={label} className={`px-4 py-3 flex items-center justify-between ${isTarget ? 'bg-teal-50/50' : ''}`}>
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${isTarget ? 'bg-[#0D9488] text-white' : 'bg-gray-100 text-gray-500'}`}>
                                  {label}
                                </div>
                                <div>
                                  <div className="text-sm font-black text-gray-900">{prediction.predictedTimeStr}</div>
                                  <div className="text-[10px] text-gray-400">{prediction.predictedPaceStr} · {prediction.basisLabel}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`text-[9px] font-bold uppercase ${confColour}`}>
                                  {prediction.confidence}
                                </span>
                                {isTarget && <div className="text-[9px] text-teal-600 font-semibold">your goal</div>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="px-4 py-2 border-t border-gray-50">
                        <p className="text-[9px] text-gray-300">Log more runs with pace data to improve accuracy</p>
                      </div>
                    </div>
                  )
                })()}
                {/* Pre-race brief — shown when next race is within 7 days */}
                {(() => {
                  const nextRace = upcomingRaces[0]
                  if (!nextRace) return null
                  const days = daysUntil(nextRace.race_date)
                  if (days > 7 || days < 0) return null
                  return (
                    <PreRaceBrief
                      race={nextRace}
                      logs={logs}
                      planName={plan?.name ?? ''}
                    />
                  )
                })()}
                <CoachingCard />
                <PBCard logs={logs} />
                <WeeklyVolumeChart logs={logs} weeks={weeks} />
                <ProGate feature="acwr_chart" preview>
                  <ACWRChart logs={logs} weeks={weeks} />
                </ProGate>
                <ProGate feature="pace_trends" preview>
                  <PaceTrend logs={logs} />
                </ProGate>
                <SessionSummary logs={logs} weeks={weeks} />
                <ProGate feature="wellness_trends" preview>
                  <WellnessTrend />
                </ProGate>
                <WeightTrend />
              </>
            )}
          </>
        )}

        {/* Races tab */}
        {activeTab === 'races' && <RacesSection />}

        {/* Pace tab */}
        {activeTab === 'pace' && (
          <>
            <TrainingZones logs={logs} />
            <PaceCalculator />
          </>
        )}

      </div>
    </div>
  )
}

