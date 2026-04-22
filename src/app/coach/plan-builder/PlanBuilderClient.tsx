'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SESSION_TYPES = [
  { code: 'run-easy',     label: 'Easy Run',    emoji: '🟢' },
  { code: 'run-tempo',    label: 'Tempo',       emoji: '🟡' },
  { code: 'run-interval', label: 'Intervals',   emoji: '🔴' },
  { code: 'run-long',     label: 'Long Run',    emoji: '🔵' },
  { code: 'run-recovery', label: 'Recovery',    emoji: '⚪' },
  { code: 'race',         label: 'Race',        emoji: '🏁' },
  { code: 'gym',          label: 'Gym',         emoji: '🏋️' },
  { code: 'cross',        label: 'Cross Train', emoji: '🚴' },
  { code: 'rest',         label: 'Rest',        emoji: '😴' },
]
const HR_ZONES = ['', 'Z1 (recovery)', 'Z2 (aerobic)', 'Z3 (tempo)', 'Z4 (threshold)', 'Z5 (VO2max)']
const PHASES   = ['base', 'build', 'peak', 'taper', 'race week']
const DAYS     = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Session {
  c: string; n: string; det: string; km: number | null
  pace_min: string; rpe: number | null; hr_zone: string
  sets: number | null; reps: number | null; rep_dist: string
  recovery: string; mandatory: boolean
}
interface WeekDay { d: string; sessions: Session[] }
interface Week { n: number; title: string; phase: string; targetKm: number; days: WeekDay[] }

function emptySession(code = 'run-easy'): Session {
  return { c: code, n: '', det: '', km: null, pace_min: '', rpe: null, hr_zone: '', sets: null, reps: null, rep_dist: '', recovery: '', mandatory: true }
}
function emptyWeek(n: number): Week {
  return { n, title: `Week ${n}`, phase: n <= 4 ? 'base' : n <= 8 ? 'build' : n <= 10 ? 'peak' : 'taper', targetKm: 40, days: DAYS.map(d => ({ d, sessions: [] })) }
}

function SessionCard({ session, onRemove, onEdit }: { session: Session; onRemove: () => void; onEdit: () => void }) {
  const type = SESSION_TYPES.find(t => t.code === session.c) ?? SESSION_TYPES[0]
  return (
    <div className="rounded-xl p-3 text-xs" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span>{type.emoji}</span>
          <span className="font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>{session.n || type.label}</span>
          {!session.mandatory && <span className="text-[9px] px-1 rounded" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-tertiary)' }}>optional</span>}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={onEdit} className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-tertiary)' }}>edit</button>
          <button onClick={onRemove} className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: '#e85d2615', color: '#e85d26' }}>×</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
        {session.km && <span>{session.km}km</span>}
        {session.pace_min && <span>@ {session.pace_min}/km</span>}
        {session.rpe && <span>RPE {session.rpe}</span>}
        {session.hr_zone && <span>{session.hr_zone}</span>}
        {session.sets && session.rep_dist && <span>{session.sets}× {session.rep_dist}</span>}
        {session.recovery && <span>rec: {session.recovery}</span>}
      </div>
      {session.det && <p className="mt-1 italic line-clamp-1" style={{ color: 'var(--color-text-tertiary)' }}>{session.det}</p>}
    </div>
  )
}

function SessionEditor({ session, onSave, onCancel }: { session: Session; onSave: (s: Session) => void; onCancel: () => void }) {
  const [s, setS] = useState<Session>(session)
  const isInterval = s.c === 'run-interval'
  const inp = "w-full px-3 py-2 rounded-xl text-sm outline-none"
  const inpStyle = { background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }
  const label = (t: string) => <p className="text-[10px] mb-1 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>{t}</p>
  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid #2b5c3f60' }}>
      <div className="flex flex-wrap gap-1.5">
        {SESSION_TYPES.map(t => (
          <button key={t.code} onClick={() => setS(p => ({ ...p, c: t.code }))}
            className="px-2 py-1 rounded-lg text-xs font-bold transition-all"
            style={{ background: s.c === t.code ? '#2b5c3f' : 'var(--color-surface-2)', color: s.c === t.code ? 'white' : 'var(--color-text-tertiary)' }}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>
      <input value={s.n} onChange={e => setS(p => ({ ...p, n: e.target.value }))} placeholder="Session name e.g. 10K Easy" className={inp} style={inpStyle} />
      <div className="grid grid-cols-2 gap-2">
        <div>{label('Distance (km)')}<input value={s.km ?? ''} onChange={e => setS(p => ({ ...p, km: e.target.value ? parseFloat(e.target.value) : null }))} type="number" min="0" step="0.1" placeholder="e.g. 10" className={inp} style={inpStyle} /></div>
        <div>{label('Target pace /km')}<input value={s.pace_min} onChange={e => setS(p => ({ ...p, pace_min: e.target.value }))} placeholder="e.g. 5:30" className={`${inp} font-data`} style={inpStyle} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>{label('RPE (1–10)')}<input value={s.rpe ?? ''} onChange={e => setS(p => ({ ...p, rpe: e.target.value ? parseInt(e.target.value) : null }))} type="number" min="1" max="10" placeholder="e.g. 6" className={inp} style={inpStyle} /></div>
        <div>{label('HR Zone')}<select value={s.hr_zone} onChange={e => setS(p => ({ ...p, hr_zone: e.target.value }))} className={inp} style={inpStyle}>{HR_ZONES.map(z => <option key={z} value={z}>{z || 'Not set'}</option>)}</select></div>
      </div>
      {isInterval && (
        <div className="grid grid-cols-3 gap-2">
          <div>{label('Sets')}<input value={s.sets ?? ''} onChange={e => setS(p => ({ ...p, sets: e.target.value ? parseInt(e.target.value) : null }))} type="number" min="1" placeholder="4" className={inp} style={inpStyle} /></div>
          <div>{label('Rep distance')}<input value={s.rep_dist} onChange={e => setS(p => ({ ...p, rep_dist: e.target.value }))} placeholder="400m" className={inp} style={inpStyle} /></div>
          <div>{label('Recovery')}<input value={s.recovery} onChange={e => setS(p => ({ ...p, recovery: e.target.value }))} placeholder="90s" className={inp} style={inpStyle} /></div>
        </div>
      )}
      <div>{label('Coach notes (shown to athlete)')}<textarea value={s.det} onChange={e => setS(p => ({ ...p, det: e.target.value }))} rows={2} placeholder="e.g. Keep HR below 140bpm. Conversational pace throughout." className="w-full px-3 py-2 rounded-xl text-sm resize-none outline-none" style={inpStyle} /></div>
      <div className="flex items-center justify-between">
        <div><p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>Mandatory session</p><p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>Optional sessions show as skippable</p></div>
        <button onClick={() => setS(p => ({ ...p, mandatory: !p.mandatory }))} className="w-10 h-6 rounded-full transition-all relative flex-shrink-0" style={{ background: s.mandatory ? '#2b5c3f' : 'var(--color-surface-2)' }}>
          <span className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: s.mandatory ? '1.25rem' : '0.25rem' }} />
        </button>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSave(s)} disabled={!s.n} className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: '#2b5c3f' }}>Save session</button>
        <button onClick={onCancel} className="px-4 py-3 rounded-xl text-sm border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}>Cancel</button>
      </div>
    </div>
  )
}

export default function PlanBuilderClient({ coachName }: { coachName: string }) {
  const router = useRouter()
  const [name, setName]         = useState('')
  const [distance, setDistance] = useState('Marathon')
  const [level, setLevel]       = useState('Intermediate')
  const [description, setDesc]  = useState('')
  const [price, setPrice]       = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [isTemplate, setIsTemplate] = useState(false)
  const [weeks, setWeeks]           = useState<Week[]>([emptyWeek(1)])
  const [activeWeek, setActiveWeek] = useState(0)
  const [activeDay, setActiveDay]   = useState(0)
  const [editingSession, setEditingSession] = useState<{ weekIdx: number; dayIdx: number; sessIdx: number | null } | null>(null)
  const [draftSession, setDraftSession]     = useState<Session>(emptySession())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [aiSuggesting, setAiSuggesting] = useState(false)
  const currentDay = weeks[activeWeek]?.days[activeDay]

  function openNewSession() { setDraftSession(emptySession()); setEditingSession({ weekIdx: activeWeek, dayIdx: activeDay, sessIdx: null }) }
  function openEditSession(si: number) { setDraftSession({ ...currentDay!.sessions[si] }); setEditingSession({ weekIdx: activeWeek, dayIdx: activeDay, sessIdx: si }) }

  function saveSession(s: Session) {
    if (!editingSession) return
    const { weekIdx, dayIdx, sessIdx } = editingSession
    setWeeks(prev => prev.map((w, wi) => wi !== weekIdx ? w : { ...w, days: w.days.map((d, di) => di !== dayIdx ? d : { ...d, sessions: sessIdx === null ? [...d.sessions, s] : d.sessions.map((e, si2) => si2 === sessIdx ? s : e) }) }))
    setEditingSession(null)
  }

  function removeSession(weekIdx: number, dayIdx: number, sessIdx: number) {
    setWeeks(prev => prev.map((w, wi) => wi !== weekIdx ? w : { ...w, days: w.days.map((d, di) => di !== dayIdx ? d : { ...d, sessions: d.sessions.filter((_, si) => si !== sessIdx) }) }))
  }

  async function aiSuggestWeek() {
    setAiSuggesting(true)
    try {
      const res  = await fetch('/api/ai/plan-suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: `You are an expert running coach. Return ONLY a JSON array of 7 objects for a ${level} ${distance} runner, week ${activeWeek + 1}, phase: ${weeks[activeWeek]?.phase}, target: ${weeks[activeWeek]?.targetKm}km. Format: [{day:string,sessions:[{c:"run-easy|run-tempo|run-interval|run-long|run-recovery|rest|gym|cross",n:string,det:string,km:number|null,pace_min:string,rpe:number|null,hr_zone:string,sets:number|null,rep_dist:string,recovery:string,mandatory:true}]}]. No markdown.` }) })
      const data = await res.json()
      const days = JSON.parse(data.response ?? data.result ?? '[]')
      if (!Array.isArray(days)) return
      setWeeks(prev => prev.map((w, wi) => wi !== activeWeek ? w : { ...w, days: days.map((d: { sessions?: Partial<Session>[] }, di: number) => ({ d: DAYS[di] ?? '', sessions: (d.sessions ?? []).map((s: Partial<Session>) => ({ c: s.c ?? 'run-easy', n: s.n ?? '', det: s.det ?? '', km: s.km ?? null, pace_min: s.pace_min ?? '', rpe: s.rpe ?? null, hr_zone: s.hr_zone ?? '', sets: s.sets ?? null, reps: null, rep_dist: s.rep_dist ?? '', recovery: s.recovery ?? '', mandatory: s.mandatory !== false })) })) }))
    } catch { /* silent */ } finally { setAiSuggesting(false) }
  }

  async function savePlan() {
    if (!name) return
    setSaving(true)
    try {
      const res = await fetch('/api/coach/plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, distance, level, description, price_gbp: price ? parseFloat(price) : null, is_public: isPublic, is_template: isTemplate, weeks_data: weeks, weeks_min: weeks.length, weeks_max: weeks.length }) })
      if (res.ok) { setSaved(true); setTimeout(() => router.push('/coach/squad'), 1500) }
    } finally { setSaving(false) }
  }

  const weekKm = weeks[activeWeek]?.days.reduce((sum, d) => sum + d.sessions.reduce((s2, s) => s2 + (s.km ?? 0), 0), 0) ?? 0
  const inp    = "w-full px-3 py-2.5 rounded-xl text-sm outline-none"
  const inpSty = { background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }

  return (
    <div className="min-h-screen pb-28" style={{ background: 'var(--color-bg)' }}>
      <div className="px-4 pt-14 pb-4 sticky top-0 z-40 border-b" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-black" style={{ color: 'var(--color-text-primary)' }}>Plan Builder</h1>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{coachName}</p>
          </div>
          <button onClick={savePlan} disabled={saving || !name} className="px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 active:scale-95" style={{ background: saved ? '#059669' : '#2b5c3f' }}>
            {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save plan'}
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Meta */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Plan details</p>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Plan name e.g. 16-Week Marathon Build" className={`${inp} font-bold`} style={inpSty} />
          <div className="grid grid-cols-2 gap-2">
            <select value={distance} onChange={e => setDistance(e.target.value)} className={inp} style={inpSty}>{['5K','10K','Half Marathon','Marathon','Ultra','Trail','Multi-distance'].map(d => <option key={d}>{d}</option>)}</select>
            <select value={level} onChange={e => setLevel(e.target.value)} className={inp} style={inpSty}>{['Beginner','Intermediate','Advanced','Elite'].map(l => <option key={l}>{l}</option>)}</select>
          </div>
          <textarea value={description} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Plan description — shown to athletes in marketplace" className="w-full px-3 py-2 rounded-xl text-sm resize-none outline-none" style={inpSty} />
          <div className="grid grid-cols-2 gap-2">
            <div><p className="text-[10px] mb-1 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Price (£) — blank=free</p><input value={price} onChange={e => setPrice(e.target.value)} type="number" min="0" placeholder="e.g. 29.99" className="w-full px-3 py-2 rounded-xl text-sm outline-none font-data" style={inpSty} /></div>
            <div className="space-y-2 pt-1">
              {[{label:'Public marketplace',val:isPublic,set:setIsPublic},{label:'Save as template',val:isTemplate,set:setIsTemplate}].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{item.label}</p>
                  <button onClick={() => item.set((p: boolean) => !p)} className="w-9 h-5 rounded-full transition-all relative" style={{ background: item.val ? '#2b5c3f' : 'var(--color-surface-2)' }}>
                    <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: item.val ? '1.1rem' : '0.2rem' }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weeks */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>{weeks.length} week{weeks.length !== 1 ? 's' : ''}</p>
            <button onClick={() => { setWeeks(prev => [...prev, emptyWeek(prev.length + 1)]); setActiveWeek(weeks.length) }} className="text-xs px-3 py-1.5 rounded-xl font-bold text-white" style={{ background: '#2b5c3f' }}>+ Week</button>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3">
            {weeks.map((w, i) => <button key={i} onClick={() => { setActiveWeek(i); setActiveDay(0) }} className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all" style={{ background: activeWeek === i ? '#2b5c3f' : 'var(--color-surface-2)', color: activeWeek === i ? 'white' : 'var(--color-text-tertiary)' }}>W{w.n}</button>)}
          </div>
          {weeks[activeWeek] && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><p className="text-[10px] mb-1 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Phase</p><select value={weeks[activeWeek].phase} onChange={e => setWeeks(prev => prev.map((w, i) => i === activeWeek ? { ...w, phase: e.target.value } : w))} className="w-full px-3 py-2 rounded-xl text-sm outline-none capitalize" style={inpSty}>{PHASES.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}</select></div>
                <div><p className="text-[10px] mb-1 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Target km</p><input type="number" value={weeks[activeWeek].targetKm} onChange={e => setWeeks(prev => prev.map((w, i) => i === activeWeek ? { ...w, targetKm: parseFloat(e.target.value) || 0 } : w))} className="w-full px-3 py-2 rounded-xl text-sm outline-none font-data" style={inpSty} /></div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--color-text-tertiary)' }}>Planned: {weekKm.toFixed(1)}km</span>
                <span style={{ color: weekKm > weeks[activeWeek].targetKm ? '#e85d26' : '#4ade80' }}>Target: {weeks[activeWeek].targetKm}km</span>
              </div>
              {weeks.length > 1 && <button onClick={() => { setWeeks(prev => prev.filter((_, idx) => idx !== activeWeek).map((w, idx) => ({ ...w, n: idx + 1 }))); setActiveWeek(Math.max(0, activeWeek - 1)) }} className="text-xs px-3 py-1.5 rounded-xl border" style={{ borderColor: '#e85d2640', color: '#e85d26' }}>Remove week</button>}
            </div>
          )}
        </div>

        {/* Day editor */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex gap-1 mb-4 overflow-x-auto">
            {DAYS.map((d, i) => {
              const cnt = weeks[activeWeek]?.days[i]?.sessions.length ?? 0
              return <button key={d} onClick={() => { setActiveDay(i); setEditingSession(null) }} className="flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl transition-all min-w-[44px]" style={{ background: activeDay === i ? '#2b5c3f' : 'var(--color-surface-2)', color: activeDay === i ? 'white' : 'var(--color-text-tertiary)' }}><span className="text-xs font-bold">{d}</span>{cnt > 0 && <span className="text-[9px] mt-0.5 opacity-80">{cnt}</span>}</button>
            })}
          </div>
          <div className="space-y-2 mb-3">
            {currentDay?.sessions.length === 0 && !editingSession && <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-tertiary)' }}>No sessions — add one below</p>}
            {currentDay?.sessions.map((s, si) => <SessionCard key={si} session={s} onRemove={() => removeSession(activeWeek, activeDay, si)} onEdit={() => openEditSession(si)} />)}
          </div>
          {editingSession && editingSession.weekIdx === activeWeek && editingSession.dayIdx === activeDay
            ? <SessionEditor session={draftSession} onSave={saveSession} onCancel={() => setEditingSession(null)} />
            : <div className="flex gap-2">
                <button onClick={openNewSession} className="flex-1 py-3 rounded-xl text-sm font-bold text-white active:scale-95" style={{ background: '#2b5c3f' }}>+ Add session</button>
                <button onClick={aiSuggestWeek} disabled={aiSuggesting} className="px-4 py-3 rounded-xl text-sm font-bold border active:scale-95 disabled:opacity-40" style={{ borderColor: '#c49a3c60', color: '#c49a3c' }}>{aiSuggesting ? '…' : '🧠 AI week'}</button>
              </div>}
        </div>
      </div>
    </div>
  )
}
