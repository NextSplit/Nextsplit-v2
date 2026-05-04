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

  // Keyboard avoidance — use visualViewport when available
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const onResize = () => {
      // Only apply inset if keyboard is likely open (viewport shrunk significantly)
      const shrinkage = window.innerHeight - vv.height
      setBottomInset(shrinkage > 150 ? Math.max(0, shrinkage - vv.offsetTop) : 0)
    }
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
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} onClick={handleBackdropClick}>
        <div className="w-full max-w-lg mx-auto p-6 text-center mt-auto" style={{ background: "var(--color-surface)", borderRadius: "24px 24px 0 0" }} onClick={e => e.stopPropagation()}>
          <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'var(--color-border-2)' }} />
          <div className="text-4xl mb-3">😴</div>
          <h2 className="text-base font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Rest day</h2>
          <p className="text-sm text-[var(--color-text-tertiary)] mb-6 leading-relaxed">
            Your body is adapting today. Rest is training.
          </p>
          <button onClick={() => handleSave(true)}
            className="w-full py-4 rounded-2xl text-sm font-bold text-white mb-2"
            style={{ background: 'var(--ns-ember)' }}>
            {saving ? 'Logging…' : 'Log rest day ✓'}
          </button>
          <button onClick={onClose} className="w-full py-3 text-sm text-[var(--color-text-tertiary)]">Cancel</button>
        </div>
      </div>
    )
  }

  // ── ONE-TAP (Easy runs) ────────────────────────────────────────────────────
  if (mode === 'one-tap' && !existingLog) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} onClick={handleBackdropClick}>
        <div className="w-full max-w-lg mx-auto mt-auto"
          style={{ background: 'var(--color-surface)', borderRadius: "24px 24px 0 0" }} onClick={e => e.stopPropagation()}>
          <div className="p-6 pb-safe" style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--color-border-2)' }} />
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${cfg.colour} ${cfg.textColour} text-xs font-semibold mb-3`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
            </div>
            <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{session.n}</h2>
            {technical && <p className="text-sm text-[var(--color-text-tertiary)] mb-4 leading-relaxed">{technical}</p>}

            {/* One-tap done */}
            <button onClick={() => handleSave(true)}
              className="w-full py-4 rounded-2xl text-base font-black text-white mb-3 active:scale-95 transition-all"
              style={{ background: 'var(--ns-ember)' }}>
              {saving ? 'Logging…' : 'Done ✓'}
            </button>

            {/* Optional: add details */}
            <button onClick={() => setShowExtra(true)}
              className="w-full py-2.5 text-xs font-semibold text-[var(--color-text-tertiary)] underline">
              Add distance, pace, or notes
            </button>
          </div>

          {/* Expanded details — same as standard but collapsed by default */}
          {showExtra && (
<div className="px-6 pt-4 space-y-4 border-t" style={{ borderColor: "var(--color-border)", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px) + 0.75rem)" }}>
              <KmPicker km={km} setKm={setKm} planned={session.km} />
              <DurationPicker mins={durationMins} setMins={setDurationMins} />
              <PaceInput paceInput={paceInput} setPaceInput={setPaceInput} autoPace={autoPace} onBlur={handlePaceBlur} showKm={session.km > 0} />
              <NotesInput notes={notes} setNotes={setNotes} />
              <button onClick={() => handleSave(true)} disabled={saving}
                className="w-full py-3 rounded-2xl text-sm font-bold text-white"
                style={{ background: 'var(--ns-ember)' }}>
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
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} onClick={handleBackdropClick}>
        <div className="w-full max-w-lg mx-auto flex flex-col mt-auto" style={{ background: "var(--color-surface)", borderRadius: "24px 24px 0 0", height: "92dvh", maxHeight: "92dvh" }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 pt-4 pb-2 flex-shrink-0">
            <div className="w-10 h-1 rounded-full" style={{ background: 'var(--color-border-2)' }} />
            <button aria-label="Close" onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-light"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)' }}>
              ×
            </button>
          </div>
          <div className="overflow-y-auto flex-1 px-6 pt-2 pb-4 space-y-5" style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>

            <div>
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${cfg.colour} ${cfg.textColour} text-xs font-semibold mb-2`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
              </div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{session.n}</h2>
              {technical && <p className="text-sm text-[var(--color-text-tertiary)] mt-1 leading-relaxed">{technical}</p>}
              {rationale && (
                <div className="flex items-start gap-2 bg-[var(--ns-ember-light)] border border-[var(--ns-ember)]20 rounded-xl px-3 py-2.5 mt-2">
                  <span className="text-sm mt-0.5">🧠</span>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--ns-ember)' }}>{rationale}</p>
                </div>
              )}
              {/* Strava import hint */}
              <div className="flex items-center gap-2 mt-2 px-1">
                <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                  🔗 Ran with Strava? Use the{' '}
                  <span className="font-bold" style={{ color: '#fc4c02' }}>⚡ Strava</span>
                  {' '}button on Today to import your activity automatically.
                </span>
              </div>
            </div>

            {/* Reps completed — intervals key question */}
            {targetReps && (
              <div>
                <label className="text-sm font-bold block mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Reps completed <span className="text-[var(--color-text-tertiary)] font-normal">of {targetReps}</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {Array.from({ length: targetReps }, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setRepsCompleted(n)}
                      className="w-10 h-10 rounded-xl text-sm font-bold border-2 transition-all"
                      style={repsCompleted === n
                        ? { background: 'var(--ns-ember)', color: 'white', borderColor: 'var(--ns-ember)' }
                        : { background: 'white', color: '#374151', borderColor: '#e5e7eb' }}>
                      {n}
                    </button>
                  ))}
                </div>
                {repsCompleted === targetReps && (
                  <p className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--ns-ember)' }}>
                    Full session — +15 XP bonus ✓
                  </p>
                )}
              </div>
            )}

            {/* Effort */}
            <EffortSlider effort={effort} setEffort={setEffort} />

            {/* Pacing feel — intervals specific */}
            <div>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--color-text-primary)' }}>How did the pacing feel?</label>
              <div className="flex gap-2">
                {(['too-easy', 'spot-on', 'too-hard'] as const).map(opt => (
                  <button key={opt} onClick={() => setPacingFeel(opt)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all"
                    style={pacingFeel === opt
                      ? { background: 'var(--ns-ember)', color: 'white', borderColor: 'var(--ns-ember)' }
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
              className="text-xs font-semibold text-[var(--color-text-tertiary)] underline">
              {showExtra ? 'Hide' : 'Add duration + pace'}
            </button>
            {showExtra && (
              <div className="space-y-4">
                <DurationPicker mins={durationMins} setMins={setDurationMins} />
                <PaceInput paceInput={paceInput} setPaceInput={setPaceInput} autoPace={autoPace} onBlur={handlePaceBlur} showKm={session.km > 0} />
              </div>
            )}
          </div>

  <div className="px-6 pt-3 border-t" style={{ borderColor: "var(--color-border)", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px) + 0.75rem)" }}>
            <DiscardWarning show={showDiscardWarning} onKeep={() => setShowDiscardWarning(false)} onDiscard={onClose} />
            <div className="flex gap-3">
              <button onClick={handleBackdropClick}
                className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                Cancel
              </button>
              <button onClick={() => handleSave(true)} disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: 'var(--ns-ember)' }}>
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
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} onClick={handleBackdropClick}>
      <div className="w-full max-w-lg mx-auto flex flex-col mt-auto" style={{ background: "var(--color-surface)", borderRadius: "24px 24px 0 0", height: "92dvh", maxHeight: "92dvh" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-4 pb-2 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--color-border-2)' }} />
          <button aria-label="Close" onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-light"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)' }}>
            ×
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 pt-2 pb-4 space-y-5" style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>

          <div>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${cfg.colour} ${cfg.textColour} text-xs font-semibold mb-2`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
            </div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{session.n}</h2>
            {technical && <p className="text-sm text-[var(--color-text-tertiary)] mt-1 leading-relaxed">{technical}</p>}
            {rationale && (
              <div className="flex items-start gap-2 bg-[var(--ns-ember-light)] rounded-xl px-3 py-2.5 mt-2">
                <span className="text-sm mt-0.5">🧠</span>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--ns-ember)' }}>{rationale}</p>
              </div>
            )}
          </div>

          {/* Distance */}
          {session.km > 0 && <KmPicker km={km} setKm={setKm} planned={session.km} />}

          {/* Feel — 1-5 for standard sessions */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>How did it feel?</label>
              <span className="text-sm font-bold text-[var(--color-text-tertiary)]">{
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
                    ? { background: 'var(--ns-ember)', color: 'white', borderColor: 'var(--ns-ember)' }
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
            className="text-xs font-semibold text-[var(--color-text-tertiary)] underline">
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

<div className="px-6 pt-3 border-t" style={{ borderColor: "var(--color-border)", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px) + 0.75rem)" }}>
          <DiscardWarning show={showDiscardWarning} onKeep={() => setShowDiscardWarning(false)} onDiscard={onClose} />
          <div className="flex gap-3">
            <button onClick={handleBackdropClick}
              className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
              Cancel
            </button>
            <button onClick={() => handleSave(true)} disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: 'var(--ns-ember)' }}>
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
        <label className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Effort (RPE)</label>
        <span className="text-2xl font-bold" style={{ color: 'var(--ns-ember)' }}>
          {effort}<span className="text-sm text-[var(--color-text-tertiary)]">/10</span>
        </span>
      </div>
      <input type="range" min={1} max={10} value={effort}
        onChange={e => setEffort(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[var(--ns-cyan)]" />
      <div className="flex justify-between text-[10px] text-[var(--color-text-tertiary)] mt-1">
        <span>Easy</span><span>Moderate</span><span>Max</span>
      </div>
    </div>
  )
}

function KmPicker({ km, setKm, planned }: { km: number; setKm: (n: number) => void; planned?: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Distance</label>
        {planned && planned > 0 && (
          <button onClick={() => setKm(planned)}
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--ns-ember-light)', color: 'var(--ns-ember)' }}>
            Use planned {planned}km
          </button>
        )}
      </div>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          min="0"
          max="200"
          value={km || ''}
          onChange={e => {
            const v = parseFloat(e.target.value)
            setKm(isNaN(v) ? 0 : Math.round(v * 10) / 10)
          }}
          placeholder={planned ? `${planned}` : '0.0'}
          className="w-full rounded-xl px-4 py-3 text-lg font-data font-bold focus:outline-none focus:ring-2"
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold"
          style={{ color: 'var(--color-text-tertiary)' }}>km</span>
      </div>
    </div>
  )
}

function DurationPicker({ mins, setMins }: { mins: number; setMins: (n: number) => void }) {
  return (
    <div>
      <label className="text-sm font-bold block mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
        Time <span className="text-[10px] font-normal" style={{ color: 'var(--color-text-tertiary)' }}>minutes</span>
      </label>
      <div className="relative">
        <input
          type="number"
          inputMode="numeric"
          min="0"
          max="600"
          value={mins || ''}
          onChange={e => {
            const v = parseInt(e.target.value)
            setMins(isNaN(v) ? 0 : Math.max(0, v))
          }}
          placeholder="0"
          className="w-full rounded-xl px-4 py-3 text-lg font-data font-bold focus:outline-none focus:ring-2"
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold"
          style={{ color: 'var(--color-text-tertiary)' }}>min</span>
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
      <label className="text-sm font-bold block mb-2" style={{ color: 'var(--color-text-primary)' }}>
        Pace <span className="text-[10px] text-[var(--color-text-tertiary)] font-normal">format: m:ss</span>
      </label>
      <div className="relative">
        <input type="text" inputMode="decimal" value={paceInput}
          onChange={e => setPaceInput(e.target.value)} onBlur={onBlur}
          placeholder={autoPace ? `Auto: ${autoPace}` : '5:30'}
          className="w-full border border-[var(--color-border-2)] rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--ns-ember)] pr-14" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-tertiary)]">/km</span>
      </div>
      {autoPace && !paceInput && (
        <p className="text-[10px] mt-1" style={{ color: 'var(--ns-ember)' }}>Auto: {autoPace}/km</p>
      )}
    </div>
  )
}

function NotesInput({ notes, setNotes, placeholder }: { notes: string; setNotes: (s: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-sm font-bold block mb-2" style={{ color: 'var(--color-text-primary)' }}>Notes</label>
      <textarea value={notes} onChange={e => setNotes(e.target.value)}
        placeholder={placeholder ?? 'How did it feel? Any issues?'} rows={2}
        className="w-full border border-[var(--color-border-2)] rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-[var(--color-text-tertiary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--ns-ember)]" />
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
