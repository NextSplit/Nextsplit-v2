'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SESSION_TYPES = [
  { code: 'run-easy',    label: 'Easy Run',     emoji: '🟢' },
  { code: 'run-tempo',   label: 'Tempo Run',    emoji: '🟡' },
  { code: 'run-interval',label: 'Intervals',    emoji: '🔴' },
  { code: 'run-long',    label: 'Long Run',     emoji: '🔵' },
  { code: 'run-recovery',label: 'Recovery',     emoji: '⚪' },
  { code: 'gym',         label: 'Gym Session',  emoji: '🏋️' },
  { code: 'rest',        label: 'Rest Day',     emoji: '😴' },
  { code: 'cross',       label: 'Cross Train',  emoji: '🚴' },
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Session {
  c: string; n: string; det: string; km: number | null
}

interface WeekDay {
  d: string; sessions: Session[]
}

interface Week {
  n: number; title: string; phase: string; targetKm: number; days: WeekDay[]
}

function emptyWeek(n: number): Week {
  return {
    n,
    title: `Week ${n}`,
    phase: n <= 4 ? 'base' : n <= 8 ? 'build' : n <= 10 ? 'peak' : 'taper',
    targetKm: 40,
    days: DAYS.map(d => ({ d, sessions: [] })),
  }
}

function SessionPill({ session, onRemove }: { session: Session; onRemove: () => void }) {
  const type = SESSION_TYPES.find(t => t.code === session.c) ?? SESSION_TYPES[0]
  return (
    <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-2 py-1 text-xs">
      <span>{type.emoji}</span>
      <span className="font-medium text-slate-700 truncate max-w-[80px]">{session.n}</span>
      {session.km && <span className="text-slate-400">{session.km}k</span>}
      <button onClick={onRemove} className="text-slate-300 hover:text-red-400 ml-1">×</button>
    </div>
  )
}

export default function PlanBuilderClient({ coachName }: { coachName: string }) {
  const router = useRouter()

  // Plan meta
  const [name, setName]           = useState('')
  const [distance, setDistance]   = useState('Marathon')
  const [level, setLevel]         = useState('Intermediate')
  const [description, setDesc]    = useState('')
  const [price, setPrice]         = useState('')
  const [isPublic, setIsPublic]   = useState(true)

  // Weeks
  const [weeks, setWeeks]         = useState<Week[]>([emptyWeek(1)])
  const [activeWeek, setActiveWeek] = useState(0)
  const [activeDay, setActiveDay] = useState(0)

  // Session being added
  const [addingCode, setAddingCode] = useState(SESSION_TYPES[0].code)
  const [addingName, setAddingName] = useState('')
  const [addingDet, setAddingDet]  = useState('')
  const [addingKm, setAddingKm]   = useState('')

  // AI suggestion
  const [aiSuggesting, setAiSuggesting] = useState(false)

  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)

  const addWeek = () => {
    setWeeks(prev => [...prev, emptyWeek(prev.length + 1)])
    setActiveWeek(weeks.length)
  }

  const removeWeek = (i: number) => {
    setWeeks(prev => prev.filter((_, idx) => idx !== i).map((w, idx) => ({ ...w, n: idx + 1 })))
    setActiveWeek(Math.max(0, activeWeek - 1))
  }

  const addSession = () => {
    if (!addingName) return
    const session: Session = {
      c:   addingCode,
      n:   addingName,
      det: addingDet,
      km:  addingKm ? parseFloat(addingKm) : null,
    }
    setWeeks(prev => {
      const updated = [...prev]
      updated[activeWeek] = {
        ...updated[activeWeek],
        days: updated[activeWeek].days.map((day, i) =>
          i === activeDay ? { ...day, sessions: [...day.sessions, session] } : day
        ),
      }
      return updated
    })
    setAddingName('')
    setAddingDet('')
    setAddingKm('')
  }

  const removeSession = (weekIdx: number, dayIdx: number, sessIdx: number) => {
    setWeeks(prev => {
      const updated = [...prev]
      updated[weekIdx] = {
        ...updated[weekIdx],
        days: updated[weekIdx].days.map((day, i) =>
          i === dayIdx ? { ...day, sessions: day.sessions.filter((_, j) => j !== sessIdx) } : day
        ),
      }
      return updated
    })
  }

  const aiSuggestWeek = async () => {
    setAiSuggesting(true)
    try {
      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Suggest a week of training for a ${level.toLowerCase()} ${distance} runner. Week ${activeWeek + 1} of ${weeks.length}. Phase: ${weeks[activeWeek]?.phase}. Target: ${weeks[activeWeek]?.targetKm}km. Reply with a JSON array of 7 days, each with: {day: "Mon", sessions: [{c: "run-easy|run-tempo|run-interval|run-long|gym|rest", n: "name", det: "brief instruction", km: number|null}]}. No text, just JSON.`
        }),
      })
      const data = await res.json()
      // Try to parse AI response as week structure
      try {
        const content = data.response ?? data.message ?? ''
        const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const parsed  = JSON.parse(cleaned)
        if (Array.isArray(parsed)) {
          setWeeks(prev => {
            const updated = [...prev]
            updated[activeWeek] = {
              ...updated[activeWeek],
              days: DAYS.map((d, i) => ({
                d,
                sessions: (parsed[i]?.sessions ?? []) as Session[],
              })),
            }
            return updated
          })
        }
      } catch { /* ignore parse errors */ }
    } finally {
      setAiSuggesting(false)
    }
  }

  const save = async (publish: boolean) => {
    if (!name) return
    setSaving(true)
    try {
      const res = await fetch('/api/coach/save-plan', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name, distance, level, description,
          weeks_data: weeks,
          price_gbp:  price ? parseFloat(price) : null,
          is_public:  publish ? isPublic : false,
          runs_per_week: 4,
        }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => router.push('/coach/squad'), 1500)
      }
    } finally {
      setSaving(false)
    }
  }

  const currentWeek = weeks[activeWeek]
  const currentDay  = currentWeek?.days[activeDay]

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 pt-12 pb-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-black text-slate-900">Plan Builder</h1>
            <p className="text-xs text-slate-400">{coachName}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => save(false)} disabled={!name || saving}
              className="px-3 py-2 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl disabled:opacity-40">
              Save draft
            </button>
            <button onClick={() => save(true)} disabled={!name || saving}
              className="px-3 py-2 bg-teal-500 text-white text-xs font-bold rounded-xl disabled:opacity-40 active:scale-95">
              {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Publish →'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* Plan meta */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plan details</p>

          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Plan name e.g. Sub-4 Marathon 16 Weeks"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400" />

          <div className="grid grid-cols-2 gap-3">
            <select value={distance} onChange={e => setDistance(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400 bg-white">
              {['5K', '10K', 'Half Marathon', 'Marathon', '50K', '100K', 'Ultra'].map(d => <option key={d}>{d}</option>)}
            </select>
            <select value={level} onChange={e => setLevel(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400 bg-white">
              {['Beginner', 'Intermediate', 'Advanced', 'Elite'].map(l => <option key={l}>{l}</option>)}
            </select>
          </div>

          <textarea value={description} onChange={e => setDesc(e.target.value)} rows={2}
            placeholder="Describe the plan — who it's for, what makes it different…"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400 resize-none" />

          <div className="flex items-center gap-3">
            <input value={price} onChange={e => setPrice(e.target.value)} type="number" min="0"
              placeholder="Price £ (0 = free)"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400" />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="rounded" />
              Public
            </label>
          </div>
        </div>

        {/* Week selector */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{weeks.length} weeks</p>
            <button onClick={addWeek} className="text-xs text-teal-600 font-bold">+ Add week</button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {weeks.map((w, i) => (
              <button key={i} onClick={() => { setActiveWeek(i); setActiveDay(0) }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  activeWeek === i ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-slate-600 border-slate-200'
                }`}>
                W{w.n}
              </button>
            ))}
          </div>

          {/* Week config */}
          {currentWeek && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex gap-2">
                <input
                  value={currentWeek.title}
                  onChange={e => setWeeks(prev => prev.map((w, i) => i === activeWeek ? { ...w, title: e.target.value } : w))}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400"
                  placeholder="Week title" />
                <select
                  value={currentWeek.phase}
                  onChange={e => setWeeks(prev => prev.map((w, i) => i === activeWeek ? { ...w, phase: e.target.value } : w))}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none bg-white">
                  {['base', 'build', 'peak', 'taper', 'race'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={currentWeek.targetKm}
                  onChange={e => setWeeks(prev => prev.map((w, i) => i === activeWeek ? { ...w, targetKm: parseFloat(e.target.value) || 0 } : w))}
                  type="number" min="0"
                  className="w-20 px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400"
                  placeholder="km" />
                <span className="text-xs text-slate-400">target km this week</span>
                <button onClick={aiSuggestWeek} disabled={aiSuggesting}
                  className="ml-auto text-xs bg-teal-50 border border-teal-200 text-teal-700 px-3 py-1.5 rounded-lg font-bold disabled:opacity-50">
                  {aiSuggesting ? '✨ Generating…' : '✨ AI suggest week'}
                </button>
              </div>
              {weeks.length > 1 && (
                <button onClick={() => removeWeek(activeWeek)}
                  className="text-xs text-red-400 hover:text-red-600">
                  Remove week {currentWeek.n}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Day selector + sessions */}
        {currentWeek && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
            {/* Day tabs */}
            <div className="flex gap-1">
              {DAYS.map((d, i) => {
                const hasSessions = currentWeek.days[i]?.sessions.length > 0
                return (
                  <button key={d} onClick={() => setActiveDay(i)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold relative transition-all ${
                      activeDay === i ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'
                    }`}>
                    {d.slice(0, 2)}
                    {hasSessions && (
                      <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-teal-400" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Current day sessions */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400">{DAYS[activeDay]}</p>
              {currentDay?.sessions.length === 0 && (
                <p className="text-xs text-slate-300 italic">No sessions — add one below or use AI suggest</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {currentDay?.sessions.map((s, si) => (
                  <SessionPill key={si} session={s} onRemove={() => removeSession(activeWeek, activeDay, si)} />
                ))}
              </div>
            </div>

            {/* Add session */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Add session</p>
              <div className="flex flex-wrap gap-1.5">
                {SESSION_TYPES.map(t => (
                  <button key={t.code} onClick={() => setAddingCode(t.code)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      addingCode === t.code ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'
                    }`}>
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
              <input value={addingName} onChange={e => setAddingName(e.target.value)}
                placeholder="Session name e.g. 10K Easy Run"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400" />
              <textarea value={addingDet} onChange={e => setAddingDet(e.target.value)} rows={2}
                placeholder="Coaching instruction e.g. Keep HR below 140bpm, conversational pace…"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400 resize-none" />
              <div className="flex gap-2">
                <input value={addingKm} onChange={e => setAddingKm(e.target.value)} type="number" min="0"
                  placeholder="km (optional)"
                  className="w-24 px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400" />
                <button onClick={addSession} disabled={!addingName}
                  className="flex-1 bg-teal-500 text-white py-2 rounded-xl text-sm font-bold disabled:opacity-40 active:scale-95">
                  Add to {DAYS[activeDay]} →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
