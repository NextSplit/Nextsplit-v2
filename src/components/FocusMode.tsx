'use client'

import { useEffect, useState, useRef } from 'react'
import { getSessionType, decodeHtml } from '@/lib/sessionUtils'
import type { PlanSession } from '@/types/database'

interface Props {
  session: PlanSession
  onClose: () => void
  onLog: (elapsedSecs?: number) => void
  isLogged: boolean
}

function formatElapsed(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

export default function FocusMode({ session, onClose, onLog, isLogged }: Props) {
  const cfg = getSessionType(session.c)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Lock scroll while focus mode is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Timer
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  function toggleTimer() {
    setRunning(r => !r)
  }

  function resetTimer() {
    setRunning(false)
    setElapsed(0)
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-4">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-sm text-[var(--color-text-tertiary)] font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.colour} ${cfg.textColour}`}>
          Focus mode
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 px-6 flex flex-col justify-center">
        {/* Emoji */}
        <div className={`w-20 h-20 rounded-3xl ${cfg.colour} flex items-center justify-center text-4xl mb-6`}>
          {cfg.emoji}
        </div>

        {/* Type */}
        <div className={`text-sm font-bold uppercase tracking-widest ${cfg.textColour} mb-2`}>
          {cfg.label}
        </div>

        {/* Name */}
        <h1 className="text-3xl font-black text-gray-900 leading-tight mb-3">
          {session.n}
        </h1>

        {/* km */}
        {session.km > 0 && (
          <div className="text-4xl font-black text-[var(--ns-ember)] mb-4">
            {session.km}<span className="text-xl font-bold text-[var(--color-text-tertiary)]">km</span>
          </div>
        )}

        {/* Detail */}
        {session.det && (
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-6">
            {decodeHtml(session.det)}
          </p>
        )}

        {/* Elapsed timer */}
        <div className="rounded-2xl p-5 text-center" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <div className="text-4xl font-black text-gray-900 font-mono mb-3 tabular-nums">
            {formatElapsed(elapsed)}
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={toggleTimer}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                running
                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                  : 'bg-[var(--ns-ember)] text-white'
              }`}
            >
              {running ? '⏸ Pause' : elapsed === 0 ? '▶ Start' : '▶ Resume'}
            </button>
            {elapsed > 0 && (
              <button
                onClick={resetTimer}
                className="px-4 py-2.5 rounded-xl text-sm font-bold bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)]"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom action */}
      <div className="px-6 pb-12 space-y-3 pt-4">
        {!isLogged ? (
          <button
            onClick={() => onLog(elapsed > 0 ? elapsed : undefined)}
            className="w-full py-4 bg-[var(--ns-ember)] text-white rounded-2xl text-base font-bold"
          >
            {elapsed > 0 ? `Log session (${formatElapsed(elapsed)})` : 'Log this session'}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="w-full py-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
              <span className="text-emerald-600 font-bold text-base">✓ Session logged</span>
              <p className="text-emerald-500 text-xs mt-0.5">Great work — it's on the board</p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3.5 bg-[var(--color-surface)] text-white rounded-2xl text-sm font-bold"
            >
              Done — back to Today
            </button>
          </div>
        )}
        <button
          onClick={onClose}
          className="w-full py-3 text-[var(--color-text-tertiary)] text-sm font-medium"
        >
          Close focus mode
        </button>
      </div>
    </div>
  )
}
