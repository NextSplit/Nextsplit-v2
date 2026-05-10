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
          <button aria-label="Close" onClick={onRemove} className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: '#ff4d6d15', color: '#ff4d6d' }}>×</button>
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
    <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid #8b5cf660' }}>
      <div className="flex flex-wrap gap-1.5">
        {SESSION_TYPES.map(t => (
          <button key={t.code} onClick={() => setS(p => ({ ...p, c: t.code }))}
            className="px-2 py-1 rounded-lg text-xs font-bold transition-all"
            style={{ background: s.c === t.code ? '#8b5cf6' : 'var(--color-surface-2)', color: s.c === t.code ? 'white' : 'var(--color-text-tertiary)' }}>
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
        <button onClick={() => setS(p => ({ ...p, mandatory: !p.mandatory }))} className="w-10 h-6 rounded-full transition-all relative flex-shrink-0" style={{ background: s.mandatory ? '#8b5cf6' : 'var(--color-surface-2)' }}>
          <span className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: s.mandatory ? '1.25rem' : '0.25rem' }} />
        </button>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSave(s)} disabled={!s.n} className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: '#8b5cf6' }}>Save session</button>
        <button onClick={onCancel} className="px-4 py-3 rounded-xl text-sm border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}>Cancel</button>
      </div>
    </div>
  )
}

// P3.2 — initialTemplate prop wires the edit flow. PlanBuilderPage loads
// the template by ?edit=<uuid> and passes it here so the form pre-fills
// instead of opening blank. When set, savePlan() sends template_id which
// makes /api/coach/save-plan UPDATE rather than INSERT.
interface InitialTemplate {
  id:           string
  name:         string
  distance:     string
  level:        string
  description:  string | null
  price_gbp:    number | null
  is_public:    boolean
  weeks_data:   Week[] | null
}

export default function PlanBuilderClient({
  coachName, initialTemplate,
}: {
  coachName:        string
  initialTemplate?: InitialTemplate
}) {
  const router = useRouter()
  const editingTemplateId = initialTemplate?.id ?? null
  const [name, setName]         = useState(initialTemplate?.name ?? '')
  const [distance, setDistance] = useState(initialTemplate?.distance ?? 'Marathon')
  const [level, setLevel]       = useState(initialTemplate?.level ?? 'Intermediate')
  const [description, setDesc]  = useState(initialTemplate?.description ?? '')
  const [price, setPrice]       = useState(initialTemplate?.price_gbp != null ? String(initialTemplate.price_gbp) : '')
  const [isPublic, setIsPublic] = useState(initialTemplate?.is_public ?? true)
  const [isTemplate, setIsTemplate] = useState(false)
  const [weeks, setWeeks]           = useState<Week[]>(
    Array.isArray(initialTemplate?.weeks_data) && initialTemplate!.weeks_data!.length > 0
      ? initialTemplate!.weeks_data!
      : [emptyWeek(1)],
  )
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

  // P3.2 — assign-to-athlete state. After save, the coach can pick one of
  // their active athletes and the new template is materialised as a
  // user_plans row for that athlete. Server-gated to (template_author ===
  // caller) AND (active coach_athletes relationship).
  const [savedTemplateId, setSavedTemplateId] = useState<string | null>(null)
  const [showAssignSheet, setShowAssignSheet] = useState(false)
  const [coachAthletes, setCoachAthletes]     = useState<Array<{ athlete_id: string; display_name: string | null }>>([])
  const [assigning, setAssigning]             = useState<string | null>(null)
  const [assignError, setAssignError]         = useState<string | null>(null)
  // BL-C3 — coach must justify any plan change before it lands on the
  // athlete. Reason flows through to user_plans.meta.assigned_reason and
  // becomes the body of the lock-screen push, so a copy-pasted "ok" gets
  // the athlete's coach replaced for nothing. Min 10 chars matches API.
  const [pendingAthleteId, setPendingAthleteId] = useState<string | null>(null)
  const [assignReason, setAssignReason]         = useState('')

  async function loadCoachAthletes() {
    try {
      const res = await fetch('/api/coach/squad-status')
      const data = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCoachAthletes((data.athletes ?? []).map((a: any) => ({
        athlete_id:   a.athlete_id,
        display_name: a.display_name,
      })))
    } catch { /* non-blocking */ }
  }

  async function assignToAthlete(athlete_id: string) {
    if (!savedTemplateId) return
    if (!assignReason || assignReason.trim().length < 10) {
      setAssignError('Add a short reason (10+ characters) so your athlete knows why.')
      return
    }
    setAssigning(athlete_id)
    setAssignError(null)
    try {
      const res = await fetch('/api/coach/plans/assign', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          template_id: savedTemplateId,
          athlete_id,
          reason:      assignReason.trim(),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setAssignError(data.error ?? 'Failed to assign')
        return
      }
      setShowAssignSheet(false)
      setPendingAthleteId(null)
      setAssignReason('')
      setTimeout(() => router.push('/coach/squad'), 800)
    } catch {
      setAssignError('Network error — try again')
    } finally {
      setAssigning(null)
    }
  }

  async function savePlan() {
    if (!name) return
    setSaving(true)
    try {
      // P3.2: POST to /api/coach/save-plan — this endpoint exists and
      // handles both INSERT (no template_id) and UPDATE (template_id
      // present, with author_id safety check). Previous implementation
      // POSTed to /api/coach/plans which has no route handler (404'd).
      // template_id is sent ONLY when editing an existing plan; new
      // plans get inserted server-side.
      const body = {
        ...(editingTemplateId ? { template_id: editingTemplateId } : {}),
        name,
        distance,
        level,
        description,
        price_gbp:    price ? parseFloat(price) : null,
        is_public:    isPublic,
        weeks_data:   weeks,
        runs_per_week: weeks[0]?.days.reduce((s, d) => s + d.sessions.filter(ss => ss.c.startsWith('run')).length, 0) ?? 4,
        peak_km_week:  Math.max(...weeks.map(w => w.targetKm ?? 0), 0) || null,
        longest_run_km: Math.max(...weeks.flatMap(w => w.days.flatMap(d => d.sessions.map(s => s.km ?? 0))), 0) || null,
      }
      const res = await fetch('/api/coach/save-plan', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        setSaved(true)
        // Capture the template id (existing or new) so assign-to-athlete
        // can target it without an extra round-trip.
        const tmplId = (data?.plan?.id ?? editingTemplateId) as string | undefined
        if (tmplId) {
          setSavedTemplateId(tmplId)
          loadCoachAthletes()
        } else {
          // Fallback for unexpected response shape — bounce to dashboard.
          setTimeout(() => router.push('/coach'), 1500)
        }
      }
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
          <div className="flex items-center gap-2">
            {/* P3.2 — assign-to-athlete CTA, only after a successful save. */}
            {savedTemplateId && (
              <button
                onClick={() => setShowAssignSheet(true)}
                className="px-3 py-2.5 rounded-xl text-xs font-bold text-white active:scale-95"
                style={{ background: '#1e3a5f' }}>
                Assign →
              </button>
            )}
            <button
              onClick={savePlan}
              disabled={saving || !name}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 active:scale-95"
              style={{ background: saved ? '#059669' : '#8b5cf6' }}
              title={isPublic ? 'Will publish to the marketplace' : 'Saved privately — assign to athletes only'}
            >
              {saved
                ? '✓ Saved!'
                : saving
                  ? 'Saving…'
                  : editingTemplateId
                    ? (isPublic ? 'Update + publish' : 'Update plan')
                    : (isPublic ? 'Publish plan' : 'Save private')}
            </button>
          </div>
        </div>
      </div>

      {/* P3.2 — Assign-to-athlete bottom sheet. Lists the coach's active
          athletes and posts to /api/coach/plans/assign on tap. Server-side
          gates ownership + relationship, so the picker doesn't need to
          pre-filter. */}
      {showAssignSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => assigning === null && setShowAssignSheet(false)}>
          <div className="rounded-t-3xl p-6 max-w-lg w-full mx-auto"
            style={{ background: 'var(--color-surface)' }}
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4"
              style={{ background: 'var(--color-border-2)' }} />
            <h2 className="text-base font-black mb-1"
              style={{ color: 'var(--color-text-primary)' }}>
              Assign &ldquo;{name}&rdquo; to an athlete
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Their current active plan will be archived.
            </p>
            {coachAthletes.length === 0 ? (
              <p className="text-sm py-6 text-center"
                style={{ color: 'var(--color-text-tertiary)' }}>
                No active athletes yet. Invite one from /coach/squad.
              </p>
            ) : pendingAthleteId === null ? (
              // Step 1 — pick an athlete. Selection moves to the reason step.
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {coachAthletes.map(a => (
                  <button
                    key={a.athlete_id}
                    type="button"
                    onClick={() => { setPendingAthleteId(a.athlete_id); setAssignError(null) }}
                    disabled={assigning !== null}
                    className="w-full rounded-xl px-4 py-3 text-left flex items-center justify-between disabled:opacity-50"
                    style={{
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                    }}>
                    <span className="text-sm font-bold"
                      style={{ color: 'var(--color-text-primary)' }}>
                      {a.display_name ?? 'Athlete'}
                    </span>
                    <span className="text-xs"
                      style={{ color: 'var(--color-text-tertiary)' }}>
                      Next →
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              // Step 2 — BL-C3 mandatory reason. The athlete reads this on
              // their lock-screen as the push body, so concrete is better
              // than vague. We hint at that to nudge coach copy quality.
              <div className="space-y-3">
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  Assigning to{' '}
                  <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {coachAthletes.find(a => a.athlete_id === pendingAthleteId)?.display_name ?? 'Athlete'}
                  </span>
                  . Add a short reason — this is what they’ll see on their phone.
                </p>
                <textarea
                  value={assignReason}
                  onChange={e => setAssignReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="e.g. ACWR ran high last week — switching you to the recovery block."
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                />
                <div className="flex justify-between text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                  <span>{assignReason.trim().length} / 10 min · 500 max</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setPendingAthleteId(null); setAssignReason(''); setAssignError(null) }}
                    disabled={assigning !== null}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
                    style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => pendingAthleteId && assignToAthlete(pendingAthleteId)}
                    disabled={assigning !== null || assignReason.trim().length < 10}
                    className="flex-1 py-2.5 rounded-xl text-xs font-black text-white disabled:opacity-50"
                    style={{ background: '#8b5cf6' }}>
                    {assigning ? 'Assigning…' : 'Assign + send'}
                  </button>
                </div>
              </div>
            )}
            {assignError && (
              <p className="text-xs mt-3 px-2 py-1.5 rounded-lg"
                style={{ background: 'rgba(255,61,110,0.10)', color: '#ff3d6e' }}>
                {assignError}
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowAssignSheet(false)}
              disabled={assigning !== null}
              className="w-full mt-3 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
              Close
            </button>
          </div>
        </div>
      )}

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
                  <button onClick={() => item.set((p: boolean) => !p)} className="w-9 h-5 rounded-full transition-all relative" style={{ background: item.val ? '#8b5cf6' : 'var(--color-surface-2)' }}>
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
            <button onClick={() => { setWeeks(prev => [...prev, emptyWeek(prev.length + 1)]); setActiveWeek(weeks.length) }} className="text-xs px-3 py-1.5 rounded-xl font-bold text-white" style={{ background: '#8b5cf6' }}>+ Week</button>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3">
            {weeks.map((w, i) => <button key={i} onClick={() => { setActiveWeek(i); setActiveDay(0) }} className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all" style={{ background: activeWeek === i ? '#8b5cf6' : 'var(--color-surface-2)', color: activeWeek === i ? 'white' : 'var(--color-text-tertiary)' }}>W{w.n}</button>)}
          </div>
          {weeks[activeWeek] && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><p className="text-[10px] mb-1 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Phase</p><select value={weeks[activeWeek].phase} onChange={e => setWeeks(prev => prev.map((w, i) => i === activeWeek ? { ...w, phase: e.target.value } : w))} className="w-full px-3 py-2 rounded-xl text-sm outline-none capitalize" style={inpSty}>{PHASES.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}</select></div>
                <div><p className="text-[10px] mb-1 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Target km</p><input type="number" value={weeks[activeWeek].targetKm} onChange={e => setWeeks(prev => prev.map((w, i) => i === activeWeek ? { ...w, targetKm: parseFloat(e.target.value) || 0 } : w))} className="w-full px-3 py-2 rounded-xl text-sm outline-none font-data" style={inpSty} /></div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--color-text-tertiary)' }}>Planned: {weekKm.toFixed(1)}km</span>
                <span style={{ color: weekKm > weeks[activeWeek].targetKm ? '#ff4d6d' : '#4ade80' }}>Target: {weeks[activeWeek].targetKm}km</span>
              </div>
              {weeks.length > 1 && <button onClick={() => { setWeeks(prev => prev.filter((_, idx) => idx !== activeWeek).map((w, idx) => ({ ...w, n: idx + 1 }))); setActiveWeek(Math.max(0, activeWeek - 1)) }} className="text-xs px-3 py-1.5 rounded-xl border" style={{ borderColor: '#ff4d6d40', color: '#ff4d6d' }}>Remove week</button>}
            </div>
          )}
        </div>

        {/* Day editor */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex gap-1 mb-4 overflow-x-auto">
            {DAYS.map((d, i) => {
              const cnt = weeks[activeWeek]?.days[i]?.sessions.length ?? 0
              return <button key={d} onClick={() => { setActiveDay(i); setEditingSession(null) }} className="flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl transition-all min-w-[44px]" style={{ background: activeDay === i ? '#8b5cf6' : 'var(--color-surface-2)', color: activeDay === i ? 'white' : 'var(--color-text-tertiary)' }}><span className="text-xs font-bold">{d}</span>{cnt > 0 && <span className="text-[9px] mt-0.5 opacity-80">{cnt}</span>}</button>
            })}
          </div>
          <div className="space-y-2 mb-3">
            {currentDay?.sessions.length === 0 && !editingSession && <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-tertiary)' }}>No sessions — add one below</p>}
            {currentDay?.sessions.map((s, si) => <SessionCard key={si} session={s} onRemove={() => removeSession(activeWeek, activeDay, si)} onEdit={() => openEditSession(si)} />)}
          </div>
          {editingSession && editingSession.weekIdx === activeWeek && editingSession.dayIdx === activeDay
            ? <SessionEditor session={draftSession} onSave={saveSession} onCancel={() => setEditingSession(null)} />
            : <div className="flex gap-2">
                <button onClick={openNewSession} className="flex-1 py-3 rounded-xl text-sm font-bold text-white active:scale-95" style={{ background: '#8b5cf6' }}>+ Add session</button>
                <button onClick={aiSuggestWeek} disabled={aiSuggesting} className="px-4 py-3 rounded-xl text-sm font-bold border active:scale-95 disabled:opacity-40" style={{ borderColor: '#c49a3c60', color: '#c49a3c' }}>{aiSuggesting ? '…' : '🧠 AI week'}</button>
              </div>}
        </div>
      </div>
    </div>
  )
}
