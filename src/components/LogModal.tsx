'use client'
import InjuryFlag from '@/components/InjuryFlag'

import { useState, useEffect } from 'react'
import { getSessionType, getLogModalMode, parseDet } from '@/lib/sessionUtils'
import { hapticLight } from '@/lib/haptics'
import { useLogFormState } from './log-modal/useLogFormState'
import {
  EffortSlider, KmPicker, DurationPicker, PaceInput, NotesInput, DiscardWarning,
} from './log-modal/inputs'
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
  // Promise<unknown> so callers may return either void or TrainingLog | null
  // depending on which orchestrator owns the save. handleSave below awaits
  // and discards.
  onSave: (params: {
    week_n: number; day_i: number; session_i: number; done: boolean
    effort?: number; km?: number; notes?: string; duration_secs?: number
    hr?: number; pace?: string
  }) => Promise<unknown>
}

function LogModal({
  session, dayIndex, sessionIndex, weekN, existingLog,
  prefillDurationSecs, onClose, onSave,
}: LogModalProps) {
  const cfg  = getSessionType(session.c)
  const mode = getLogModalMode(session.c ?? '')

  // Form state — lifted into a hook so the comprehensive dirty-check covers
  // every field, not just notes/paceInput. Prerequisite for the L2 sub-
  // component split (council ux-designer R1).
  const form = useLogFormState({ session, existingLog, prefillDurationSecs })
  const {
    effort, setEffort,
    km, setKm,
    notes, setNotes,
    durationMins, setDurationMins,
    paceInput, setPaceInput,
    repsCompleted, setRepsCompleted,
    pacingFeel, setPacingFeel,
    feelRating, setFeelRating,
    showExtra, setShowExtra,
  } = form

  // UI / lifecycle state — stays at LogModal level.
  const [saving,             setSaving]             = useState(false)
  const [showDiscardWarning, setShowDiscardWarning] = useState(false)
  const [bottomInset,        setBottomInset]        = useState(0)
  const [saveError,          setSaveError]          = useState<string | null>(null)

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
    if (form.isDirty) { setShowDiscardWarning(true); return }
    onClose()
  }

  async function handleSave(done = true) {
    hapticLight()
    setSaving(true)
    setSaveError(null)
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed — please try again'
      setSaveError(msg)
    } finally { setSaving(false) }
  }

  const { technical, rationale } = parseDet(session.det ?? '')

  // ── REST DAY ───────────────────────────────────────────────────────────────
  if (mode === 'rest') {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} onClick={handleBackdropClick}>
        <div className="w-full max-w-lg mx-auto p-6 text-center mt-auto" style={{ background: "var(--color-surface)", borderRadius: "24px 24px 0 0", marginBottom: "calc(60px + env(safe-area-inset-bottom, 0px))" }} onClick={e => e.stopPropagation()}>
          <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'var(--color-border-2)' }} />
          <div className="text-4xl mb-3">😴</div>
          <h2 className="text-base font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Rest day</h2>
          <p className="text-sm text-[var(--color-text-tertiary)] mb-6 leading-relaxed">
            Your body is adapting today. Rest is training.
          </p>
          {saveError && (
            <div className="mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-left">
              <p className="text-xs font-semibold text-red-800 mb-0.5">Couldn’t save</p>
              <p className="text-xs text-red-700">{saveError}</p>
            </div>
          )}
          <button onClick={() => handleSave(true)} disabled={saving}
            className="w-full py-4 rounded-2xl text-sm font-bold text-white mb-2 disabled:opacity-50"
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
      <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} onClick={handleBackdropClick}>
        <div className="w-full max-w-lg mx-auto mt-auto"
          style={{ background: 'var(--color-surface)', borderRadius: "24px 24px 0 0", marginBottom: "calc(60px + env(safe-area-inset-bottom, 0px))" }} onClick={e => e.stopPropagation()}>
          <div className="p-6 pb-safe" style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--color-border-2)' }} />
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${cfg.colour} ${cfg.textColour} text-xs font-semibold mb-3`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
            </div>
            <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{session.n}</h2>
            {technical && <p className="text-sm text-[var(--color-text-tertiary)] mb-4 leading-relaxed">{technical}</p>}

            <DiscardWarning show={showDiscardWarning} onKeep={() => setShowDiscardWarning(false)} onDiscard={onClose} />

            {saveError && (
              <div className="mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-red-800 mb-0.5">Couldn’t save</p>
                <p className="text-xs text-red-700">{saveError}</p>
              </div>
            )}

            {/* One-tap done */}
            <button onClick={() => handleSave(true)} disabled={saving}
              className="w-full py-4 rounded-2xl text-base font-black text-white mb-3 active:scale-95 transition-all disabled:opacity-50"
              style={{ background: 'var(--ns-ember)' }}>
              {saving ? 'Logging…' : 'Done ✓'}
            </button>

            {/* Optional: add details */}
            <button onClick={() => setShowExtra(true)}
              className="w-full py-2.5 text-xs font-semibold text-[var(--color-text-tertiary)] underline">
              Add distance, pace, or notes
            </button>

            {/* Explicit Cancel — backdrop click alone is not discoverable */}
            <button onClick={handleBackdropClick}
              className="w-full py-2.5 mt-1 text-xs font-semibold text-[var(--color-text-tertiary)]">
              Cancel
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
      <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} onClick={handleBackdropClick}>
        <div className="w-full max-w-lg mx-auto flex flex-col mt-auto" style={{ background: "var(--color-surface)", borderRadius: "24px 24px 0 0", height: "calc(92dvh - 60px - env(safe-area-inset-bottom, 0px))", maxHeight: "calc(92dvh - 60px - env(safe-area-inset-bottom, 0px))", marginBottom: "calc(60px + env(safe-area-inset-bottom, 0px))" }} onClick={e => e.stopPropagation()}>
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
            {saveError && (
              <div className="mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-red-800 mb-0.5">Couldn’t save</p>
                <p className="text-xs text-red-700">{saveError}</p>
              </div>
            )}
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
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} onClick={handleBackdropClick}>
      <div className="w-full max-w-lg mx-auto flex flex-col mt-auto" style={{ background: "var(--color-surface)", borderRadius: "24px 24px 0 0", height: "calc(92dvh - 60px - env(safe-area-inset-bottom, 0px))", maxHeight: "calc(92dvh - 60px - env(safe-area-inset-bottom, 0px))", marginBottom: "calc(60px + env(safe-area-inset-bottom, 0px))" }} onClick={e => e.stopPropagation()}>
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


export default LogModal
