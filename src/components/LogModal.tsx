'use client'

import { useState, useEffect } from 'react'
import { getSessionType, getLogModalMode, parseDet } from '@/lib/sessionUtils'
import { hapticLight } from '@/lib/haptics'
import type { PlanSession, TrainingLog } from '@/types/database'

interface LogModalProps {
  session: PlanSession
  dayIndex: number
  sessionIndex: number
  weekN: number
  planId: string
  existingLog: TrainingLog | null
  prefillDurationSecs?: number
  onClose: () => void
  onSave: (params: {
    week_n: number; day_i: number; session_i: number; done: boolean
    effort?: number; km?: number; notes?: string; duration_secs?: number
    hr?: number; pace?: string
  }) => Promise<void>
}

function LogModal({
  session, dayIndex, sessionIndex, weekN, existingLog,
  prefillDurationSecs, onClose, onSave,
}: LogModalProps) {
  const cfg  = getSessionType(session.c)
  const mode = getLogModalMode(session.c ?? '')

  const [effort, setEffort]           = useState(existingLog?.effort ?? 7)
  const [km, setKm]                   = useState(existingLog?.km ?? session.km ?? 0)
  const [notes, setNotes]             = useState(existingLog?.notes ?? '')
  const [durationMins, setDurationMins] = useState(
    existingLog?.duration_secs ? Math.round(existingLog.duration_secs / 60)
    : prefillDurationSecs       ? Math.round(prefillDurationSecs / 60) : 0
  )
  const [paceInput, setPaceInput]     = useState(existingLog?.pace ?? '')
  const [repsCompleted, setRepsCompleted] = useState<number | null>(null)
  const [pacingFeel, setPacingFeel]   = useState<'too-easy' | 'spot-on' | 'too-hard' | null>(null)
  const [feelRating, setFeelRating]   = useState<number>(3) // 1-5 for standard mode
  const [saving, setSaving]           = useState(false)
  const [showDiscardWarning, setShowDiscardWarning] = useState(false)
  const [bottomInset, setBottomInset] = useState(0)
  const [showExtra, setShowExtra]     = useState(!!existingLog)

  // Extract rep count from session name e.g. "8 × 400m" → 8
  const targetReps = (() => {
    const m = session.n?.match(/^(\d+)\s*[×x]/i)
    return m ? parseInt(m[1]) : null
  })()

  // Keyboard avoidance
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const onResize = () => setBottomInset(Math.max(0, window.innerHeight - vv!.height - vv!.offsetTop))
    vv.addEventListener('resize', onResize)
    vv.addEventListener('scroll', onResize)
    return () => { vv.removeEventListener('resize', onResize); vv.removeEventListener('scroll', onResize) }
  }, [])

  const autoPace = km > 0 && durationMins > 0 && !paceInput.trim()
    ? (() => {
        const s = (durationMins * 60) / km
        return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
      })()
    : null

  function handlePaceBlur() {
    if (!paceInput.trim() || durationMins > 0 || km <= 0) return
    const parts = paceInput.split(':')
    if (parts.length !== 2) return
    const secs = (parseInt(parts[0]) * 60 + parseInt(parts[1])) * km
    if (!isNaN(secs) && secs > 0) setDurationMins(Math.round(secs / 60))
  }

  function handleBackdropClick() {
    const dirty = notes.trim() !== (existingLog?.notes ?? '') || paceInput !== (existingLog?.pace ?? '')
    if (dirty) { setShowDiscardWarning(true); return }
    onClose()
  }

  async function handleSave(done = true) {
    hapticLight()
    setSaving(true)
    try {
      await onSave({
        week_n:       weekN,
        day_i:        dayIndex,
        session_i:    sessionIndex,
        done,
        effort,
        km:           km > 0 ? km : undefined,
        notes:        notes.trim() || (pacingFeel ? `Pacing: ${pacingFeel.replace('-', ' ')}` : undefined) || undefined,
        duration_secs: durationMins > 0 ? durationMins * 60 : undefined,
        pace:         paceInput.trim() || autoPace || undefined,
      })
      onClose()
    } finally { setSaving(false) }
  }

  const { technical, rationale } = parseDet(session.det ?? '')

  // ── REST DAY ───────────────────────────────────────────────────────────────
  if (mode === 'rest') {
    return (
      <div className="fixed inset-0 z-50 flex items-end" onClick={handleBackdropClick}>
        <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl p-6 text-center"
          style={{ marginBottom: bottomInset }} onClick={e => e.stopPropagation()}>
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
          <div className="text-4xl mb-3">😴</div>
          <h2 className="text-base font-bold text-gray-900 mb-1">Rest day</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Your body is adapting today. Rest is training.
          </p>
          <button onClick={() => handleSave(true)}
            className="w-full py-4 rounded-2xl text-sm font-bold text-white mb-2"
            style={{ background: 'var(--ns-forest)' }}>
            {saving ? 'Logging…' : 'Log rest day ✓'}
          </button>
          <button onClick={onClose} className="w-full py-3 text-sm text-gray-400">Cancel</button>
        </div>
      </div>
    )
  }

  // ── ONE-TAP (Easy runs) ────────────────────────────────────────────────────
  if (mode === 'one-tap' && !existingLog) {
    return (
      <div className="fixed inset-0 z-50 flex items-end" onClick={handleBackdropClick}>
        <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl"
          style={{ marginBottom: bottomInset }} onClick={e => e.stopPropagation()}>
          <div className="p-6">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${cfg.colour} ${cfg.textColour} text-xs font-semibold mb-3`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">{session.n}</h2>
            {technical && <p className="text-sm text-gray-500 mb-4 leading-relaxed">{technical}</p>}

            {/* One-tap done */}
            <button onClick={() => handleSave(true)}
              className="w-full py-4 rounded-2xl text-base font-black text-white mb-3 active:scale-95 transition-all"
              style={{ background: 'var(--ns-forest)' }}>
              {saving ? 'Logging…' : 'Done ✓'}
            </button>

            {/* Optional: add details */}
            <button onClick={() => setShowExtra(true)}
              className="w-full py-2.5 text-xs font-semibold text-gray-400 underline">
              Add distance, pace, or notes
            </button>
          </div>

          {/* Expanded details — same as standard but collapsed by default */}
          {showExtra && (
            <div className="px-6 pb-6 border-t border-gray-50 pt-4 space-y-4">
              <KmPicker km={km} setKm={setKm} planned={session.km} />
              <DurationPicker mins={durationMins} setMins={setDurationMins} />
              <PaceInput paceInput={paceInput} setPaceInput={setPaceInput} autoPace={autoPace} onBlur={handlePaceBlur} showKm={session.km > 0} />
              <NotesInput notes={notes} setNotes={setNotes} />
              <button onClick={() => handleSave(true)} disabled={saving}
                className="w-full py-3 rounded-2xl text-sm font-bold text-white"
                style={{ background: 'var(--ns-forest)' }}>
                {saving ? 'Saving…' : 'Log it ✓'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── FULL DEBRIEF (Intervals + Race) ───────────────────────────────────────
  if (mode === 'full-debrief') {
    return (
      <div className="fixed inset-0 z-50 flex items-end" onClick={handleBackdropClick}>
        <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col"
          style={{ marginBottom: bottomInset }} onClick={e => e.stopPropagation()}>
          <div className="overflow-y-auto flex-1 px-6 pt-6 pb-2 space-y-5">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />

            <div>
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${cfg.colour} ${cfg.textColour} text-xs font-semibold mb-2`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
              </div>
              <h2 className="text-lg font-bold text-gray-900">{session.n}</h2>
              {technical && <p className="text-sm text-gray-500 mt-1 leading-relaxed">{technical}</p>}
              {rationale && (
                <div className="flex items-start gap-2 bg-[var(--ns-forest-light)] border border-[var(--ns-forest)]20 rounded-xl px-3 py-2.5 mt-2">
                  <span className="text-sm mt-0.5">🧠</span>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--ns-forest)' }}>{rationale}</p>
                </div>
              )}
            </div>

            {/* Reps completed — intervals key question */}
            {targetReps && (
              <div>
                <label className="text-sm font-bold text-gray-800 block mb-2">
                  Reps completed <span className="text-gray-400 font-normal">of {targetReps}</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {Array.from({ length: targetReps }, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setRepsCompleted(n)}
                      className="w-10 h-10 rounded-xl text-sm font-bold border-2 transition-all"
                      style={repsCompleted === n
                        ? { background: 'var(--ns-forest)', color: 'white', borderColor: 'var(--ns-forest)' }
                        : { background: 'white', color: '#374151', borderColor: '#e5e7eb' }}>
                      {n}
                    </button>
                  ))}
                </div>
                {repsCompleted === targetReps && (
                  <p className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--ns-forest)' }}>
                    Full session — +15 XP bonus ✓
                  </p>
                )}
              </div>
            )}

            {/* Effort */}
            <EffortSlider effort={effort} setEffort={setEffort} />

            {/* Pacing feel — intervals specific */}
            <div>
              <label className="text-sm font-bold text-gray-800 block mb-2">How did the pacing feel?</label>
              <div className="flex gap-2">
                {(['too-easy', 'spot-on', 'too-hard'] as const).map(opt => (
                  <button key={opt} onClick={() => setPacingFeel(opt)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all"
                    style={pacingFeel === opt
                      ? { background: 'var(--ns-forest)', color: 'white', borderColor: 'var(--ns-forest)' }
                      : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }}>
                    {opt === 'too-easy' ? '😌 Easy' : opt === 'spot-on' ? '✓ Spot on' : '🔥 Hard'}
                  </button>
                ))}
              </div>
            </div>

            {/* Distance */}
            {session.km > 0 && <KmPicker km={km} setKm={setKm} planned={session.km} />}

            {/* Notes */}
            <NotesInput notes={notes} setNotes={setNotes} placeholder="Observations, how reps felt, any issues..." />

            {/* Extra: duration + pace */}
            <button onClick={() => setShowExtra(e => !e)}
              className="text-xs font-semibold text-gray-400 underline">
              {showExtra ? 'Hide' : 'Add duration + pace'}
            </button>
            {showExtra && (
              <div className="space-y-4">
                <DurationPicker mins={durationMins} setMins={setDurationMins} />
                <PaceInput paceInput={paceInput} setPaceInput={setPaceInput} autoPace={autoPace} onBlur={handlePaceBlur} showKm={session.km > 0} />
              </div>
            )}
          </div>

          <div className="px-6 pb-6 pt-3 border-t border-gray-50">
            <DiscardWarning show={showDiscardWarning} onKeep={() => setShowDiscardWarning(false)} onDiscard={onClose} />
            <div className="flex gap-3">
              <button onClick={handleBackdropClick}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">
                Cancel
              </button>
              <button onClick={() => handleSave(true)} disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: 'var(--ns-forest)' }}>
                {saving ? 'Saving…' : existingLog ? 'Update' : 'Log it ✓'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── STANDARD (Tempo, Long, MP, default) ────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={handleBackdropClick}>
      <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col"
        style={{ marginBottom: bottomInset }} onClick={e => e.stopPropagation()}>
        <div className="overflow-y-auto flex-1 px-6 pt-6 pb-2 space-y-5">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />

          <div>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${cfg.colour} ${cfg.textColour} text-xs font-semibold mb-2`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
            </div>
            <h2 className="text-lg font-bold text-gray-900">{session.n}</h2>
            {technical && <p className="text-sm text-gray-500 mt-1 leading-relaxed">{technical}</p>}
            {rationale && (
              <div className="flex items-start gap-2 bg-[var(--ns-forest-light)] rounded-xl px-3 py-2.5 mt-2">
                <span className="text-sm mt-0.5">🧠</span>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--ns-forest)' }}>{rationale}</p>
              </div>
            )}
          </div>

          {/* Distance */}
          {session.km > 0 && <KmPicker km={km} setKm={setKm} planned={session.km} />}

          {/* Feel — 1-5 for standard sessions */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-bold text-gray-800">How did it feel?</label>
              <span className="text-sm font-bold text-gray-500">{
                feelRating === 1 ? '😩 Rough' :
                feelRating === 2 ? '😕 Hard' :
                feelRating === 3 ? '😐 OK' :
                feelRating === 4 ? '🙂 Good' : '😊 Great'
              }</span>
            </div>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => { setFeelRating(n); setEffort(n * 2) }}
                  className="flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all"
                  style={feelRating === n
                    ? { background: 'var(--ns-forest)', color: 'white', borderColor: 'var(--ns-forest)' }
                    : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Notes — optional */}
          <NotesInput notes={notes} setNotes={setNotes} />

          {/* Progressive disclosure — duration + pace */}
          <button onClick={() => setShowExtra(e => !e)}
            className="text-xs font-semibold text-gray-400 underline">
            {showExtra ? 'Less detail' : 'Add duration + pace'}
            {(durationMins > 0 || paceInput) && !showExtra && (
              <span className="ml-1 font-normal">
                · {[durationMins > 0 && `${durationMins}min`, paceInput && `${paceInput}/km`].filter(Boolean).join(' · ')}
              </span>
            )}
          </button>
          {showExtra && (
            <div className="space-y-4">
              <DurationPicker mins={durationMins} setMins={setDurationMins} />
              <PaceInput paceInput={paceInput} setPaceInput={setPaceInput} autoPace={autoPace} onBlur={handlePaceBlur} showKm={session.km > 0} />
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-3 border-t border-gray-50">
          <DiscardWarning show={showDiscardWarning} onKeep={() => setShowDiscardWarning(false)} onDiscard={onClose} />
          <div className="flex gap-3">
            <button onClick={handleBackdropClick}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">
              Cancel
            </button>
            <button onClick={() => handleSave(true)} disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: 'var(--ns-forest)' }}>
              {saving ? 'Saving…' : existingLog ? 'Update' : 'Log it ✓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function EffortSlider({ effort, setEffort }: { effort: number; setEffort: (n: number) => void }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-bold text-gray-800">Effort (RPE)</label>
        <span className="text-2xl font-bold" style={{ color: 'var(--ns-forest)' }}>
          {effort}<span className="text-sm text-gray-400">/10</span>
        </span>
      </div>
      <input type="range" min={1} max={10} value={effort}
        onChange={e => setEffort(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[var(--ns-forest)]" />
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>Easy</span><span>Moderate</span><span>Max</span>
      </div>
    </div>
  )
}

function KmPicker({ km, setKm, planned }: { km: number; setKm: (n: number) => void; planned?: number }) {
  return (
    <div>
      <label className="text-sm font-bold text-gray-800 block mb-2">Distance (km)</label>
      <div className="flex items-center gap-3">
        <button onClick={() => setKm(Math.max(0, Math.round((km - 0.5) * 10) / 10))}
          className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center">−</button>
        <div className="flex-1 text-center">
          <span className="font-data text-3xl text-gray-900">{km.toFixed(1)}</span>
          <span className="text-sm text-gray-400 ml-1">km</span>
        </div>
        <button onClick={() => setKm(Math.round((km + 0.5) * 10) / 10)}
          className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center">+</button>
      </div>
      {planned && planned > 0 && (
        <p className="text-[11px] text-gray-400 text-center mt-1">Planned: {planned}km</p>
      )}
    </div>
  )
}

function DurationPicker({ mins, setMins }: { mins: number; setMins: (n: number) => void }) {
  return (
    <div>
      <label className="text-sm font-bold text-gray-800 block mb-2">Duration (optional)</label>
      <div className="flex items-center gap-3">
        <button onClick={() => setMins(Math.max(0, mins - 5))}
          className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center">−</button>
        <div className="flex-1 text-center">
          <span className="font-data text-3xl text-gray-900">{mins}</span>
          <span className="text-sm text-gray-400 ml-1">min</span>
        </div>
        <button onClick={() => setMins(mins + 5)}
          className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center">+</button>
      </div>
    </div>
  )
}

function PaceInput({ paceInput, setPaceInput, autoPace, onBlur, showKm }: {
  paceInput: string; setPaceInput: (s: string) => void
  autoPace: string | null; onBlur: () => void; showKm: boolean
}) {
  if (!showKm) return null
  return (
    <div>
      <label className="text-sm font-bold text-gray-800 block mb-2">
        Pace <span className="text-[10px] text-gray-400 font-normal">format: m:ss</span>
      </label>
      <div className="relative">
        <input type="text" inputMode="decimal" value={paceInput}
          onChange={e => setPaceInput(e.target.value)} onBlur={onBlur}
          placeholder={autoPace ? `Auto: ${autoPace}` : '5:30'}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--ns-forest)] pr-14" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">/km</span>
      </div>
      {autoPace && !paceInput && (
        <p className="text-[10px] mt-1" style={{ color: 'var(--ns-forest)' }}>Auto: {autoPace}/km</p>
      )}
    </div>
  )
}

function NotesInput({ notes, setNotes, placeholder }: { notes: string; setNotes: (s: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-sm font-bold text-gray-800 block mb-2">Notes</label>
      <textarea value={notes} onChange={e => setNotes(e.target.value)}
        placeholder={placeholder ?? 'How did it feel? Any issues?'} rows={2}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--ns-forest)]" />
    </div>
  )
}

function DiscardWarning({ show, onKeep, onDiscard }: { show: boolean; onKeep: () => void; onDiscard: () => void }) {
  if (!show) return null
  return (
    <div className="mb-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
      <p className="text-xs font-semibold text-amber-800 mb-2">Discard your changes?</p>
      <div className="flex gap-2">
        <button onClick={onKeep} className="flex-1 py-2 rounded-lg border border-amber-200 text-xs font-semibold text-amber-700">Keep editing</button>
        <button onClick={onDiscard} className="flex-1 py-2 rounded-lg bg-amber-500 text-white text-xs font-bold">Discard</button>
      </div>
    </div>
  )
}

export default LogModal
