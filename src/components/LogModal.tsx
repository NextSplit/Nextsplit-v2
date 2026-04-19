'use client'

import { useState, useEffect } from 'react'
import { getSessionType, parseDet } from '@/lib/sessionUtils'
import { hapticLight } from '@/lib/haptics'
import SplitsDisplay from '@/components/SplitsDisplay'
import type { PlanSession, TrainingLog } from '@/types/database'

// ─── Session Log Modal ────────────────────────────────────────────────────────

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
    effort?: number; km?: number; notes?: string; duration_secs?: number; hr?: number; pace?: string
  }) => Promise<void>
}

function LogModal({ session, dayIndex, sessionIndex, weekN, existingLog, prefillDurationSecs, onClose, onSave }: LogModalProps) {
  const cfg = getSessionType(session.c)
  const [effort, setEffort] = useState(existingLog?.effort ?? 7)
  const [km, setKm] = useState(existingLog?.km ?? session.km ?? 0)
  const [notes, setNotes] = useState(existingLog?.notes ?? '')
  const [durationMins, setDurationMins] = useState(
    existingLog?.duration_secs
      ? Math.round(existingLog.duration_secs / 60)
      : prefillDurationSecs
        ? Math.round(prefillDurationSecs / 60)
        : 0
  )
  const [paceInput, setPaceInput] = useState(existingLog?.pace ?? '')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(!!existingLog)
  const [showDiscardWarning, setShowDiscardWarning] = useState(false)
  const [bottomInset, setBottomInset] = useState(0)

  // Dirty check — has the user changed anything from defaults?
  const isDirty = notes.trim() !== (existingLog?.notes ?? '') ||
    paceInput !== (existingLog?.pace ?? '') ||
    durationMins !== (existingLog?.duration_secs ? Math.round(existingLog.duration_secs / 60) : prefillDurationSecs ? Math.round(prefillDurationSecs / 60) : 0) ||
    (km !== (existingLog?.km ?? session.km ?? 0) && km > 0)

  function handleBackdropClick() {
    if (isDirty) {
      setShowDiscardWarning(true)
      return
    }
    onClose()
  }

  // Keyboard avoidance — lift modal when virtual keyboard appears
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    function onResize() {
      const keyboardH = window.innerHeight - vv!.height - vv!.offsetTop
      setBottomInset(Math.max(0, keyboardH))
    }
    vv.addEventListener('resize', onResize)
    vv.addEventListener('scroll', onResize)
    return () => {
      vv.removeEventListener('resize', onResize)
      vv.removeEventListener('scroll', onResize)
    }
  }, [])

  // Auto-calculate pace from km + duration when both set and pace is empty
  const autoPace = km > 0 && durationMins > 0 && !paceInput.trim()
    ? (() => {
        const paceSecs = (durationMins * 60) / km
        const m = Math.floor(paceSecs / 60)
        const s = Math.round(paceSecs % 60)
        return `${m}:${String(s).padStart(2, '0')}`
      })()
    : null

  // Auto-fill duration when pace is entered and duration is empty
  function handlePaceBlur() {
    if (!paceInput.trim() || durationMins > 0 || km <= 0) return
    const parts = paceInput.split(':')
    if (parts.length !== 2) return
    const totalSecs = (parseInt(parts[0]) * 60 + parseInt(parts[1])) * km
    if (!isNaN(totalSecs) && totalSecs > 0) setDurationMins(Math.round(totalSecs / 60))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({
        week_n: weekN,
        day_i: dayIndex,
        session_i: sessionIndex,
        done: true,
        effort,
        km: km > 0 ? km : undefined,
        notes: notes.trim() || undefined,
        duration_secs: durationMins > 0 ? durationMins * 60 : undefined,
        pace: paceInput.trim() || autoPace || undefined,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={handleBackdropClick}>
      <div
        className="w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col"
        style={{ marginBottom: bottomInset }}
        onClick={e => e.stopPropagation()}
      >
        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-6">
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        {/* Session type badge */}
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${cfg.colour} ${cfg.textColour} text-xs font-semibold mb-3`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-1">{session.n}</h2>
        {session.det && (() => {
          const { technical, rationale } = parseDet(session.det)
          return (
            <>
              <p className="text-sm text-gray-600 font-medium mb-2 leading-relaxed">{technical}</p>
              {rationale && (
                <div className="flex items-start gap-2 bg-teal-50 border border-teal-100 rounded-xl px-3 py-2.5 mb-4">
                  <span className="text-sm mt-0.5 flex-shrink-0">🧠</span>
                  <p className="text-xs text-teal-700 leading-relaxed">{rationale}</p>
                </div>
              )}
            </>
          )
        })()}

        {/* Effort slider */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-gray-700">Effort (RPE)</label>
            <span className="text-2xl font-bold text-[#0D9488]">{effort}<span className="text-sm text-gray-400">/10</span></span>
          </div>
          <input
            type="range" min={1} max={10} value={effort}
            onChange={e => setEffort(Number(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#0D9488]"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>Easy</span><span>Moderate</span><span>Max</span>
          </div>
        </div>

        {/* km input (only for running sessions) */}
        {session.km > 0 && (
          <div className="mb-5">
            <label className="text-sm font-semibold text-gray-700 block mb-2">Distance (km)</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setKm(prev => Math.max(0, Math.round((prev - 0.5) * 10) / 10))}
                className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center"
              >−</button>
              <div className="flex-1 text-center">
                <span className="text-3xl font-bold text-gray-900">{km.toFixed(1)}</span>
                <span className="text-sm text-gray-400 ml-1">km</span>
              </div>
              <button
                onClick={() => setKm(prev => Math.round((prev + 0.5) * 10) / 10)}
                className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center"
              >+</button>
            </div>
            {session.km > 0 && (
              <p className="text-[11px] text-gray-400 text-center mt-1">Planned: {session.km}km</p>
            )}
          </div>
        )}

        {/* Progressive disclosure — duration, pace, notes */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-2 text-xs font-semibold text-[#0D9488] mb-4"
        >
          <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          {expanded ? 'Less details' : 'Add more details'}
          {(durationMins > 0 || paceInput || notes) && !expanded && (
            <span className="text-[10px] text-gray-400 font-normal">· {[durationMins > 0 && `${durationMins}min`, paceInput && `${paceInput}/km`, notes && 'note'].filter(Boolean).join(' · ')}</span>
          )}
        </button>

        {expanded && (
          <>
        {/* Duration input */}
        <div className="mb-5">
          <label className="text-sm font-semibold text-gray-700 block mb-2">Duration (optional)</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDurationMins(prev => Math.max(0, prev - 5))}
              className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center"
            >−</button>
            <div className="flex-1 text-center">
              <span className="text-3xl font-bold text-gray-900">{durationMins}</span>
              <span className="text-sm text-gray-400 ml-1">min</span>
            </div>
            <button
              onClick={() => setDurationMins(prev => prev + 5)}
              className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center"
            >+</button>
          </div>
        </div>

        {/* Pace — running sessions only */}
        {session.km > 0 && (
          <div className="mb-5">
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Pace <span className="text-[10px] text-gray-400 font-normal">format: m:ss</span>
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={paceInput}
                onChange={e => setPaceInput(e.target.value)}
                onBlur={handlePaceBlur}
                placeholder={autoPace ? `Auto: ${autoPace}` : '5:30'}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0D9488] pr-14"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">/km</span>
            </div>
            {autoPace && !paceInput && (
              <p className="text-[10px] text-teal-600 mt-1">Auto-calculated from distance + duration: {autoPace}/km</p>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-gray-700 block mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="How did it feel? Any issues?"
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent"
          />
        </div>
          </>
        )}

        </div>{/* end scrollable area */}

        {/* Sticky actions */}
        <div className="px-6 pb-6 pt-3 border-t border-gray-50">
          {showDiscardWarning ? (
            <div className="mb-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-amber-800 mb-2">Discard your changes?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDiscardWarning(false)}
                  className="flex-1 py-2 rounded-lg border border-amber-200 text-xs font-semibold text-amber-700"
                >
                  Keep editing
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2 rounded-lg bg-amber-500 text-white text-xs font-bold"
                >
                  Discard
                </button>
              </div>
            </div>
          ) : null}
          <div className="flex gap-3">
            <button
              onClick={handleBackdropClick}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-[#0D9488] text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving…' : existingLog ? 'Update' : 'Log it ✓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Splits Display ───────────────────────────────────────────────────────────

// ─── Session Card ─────────────────────────────────────────────────────────────

interface SessionCardProps {
  session: PlanSession
  sessionIndex: number
  dayIndex: number
  weekN: number
  planId: string
  log: TrainingLog | null
  onTap: () => void
  onQuickDone: () => void
  onFocus: () => void
}

export default LogModal