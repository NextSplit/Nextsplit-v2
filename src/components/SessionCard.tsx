'use client'

import { useState } from 'react'
import { getSessionType, fmtKm, parseDet } from '@/lib/sessionUtils'
import { getSessionXP } from '@/lib/rpg'
import type { PaceZones } from '@/lib/paceZones'
import { getPersonalisedPace } from '@/lib/paceZones'
import SplitsDisplay from '@/components/SplitsDisplay'
import type { PlanSession, TrainingLog } from '@/types/database'

interface SessionCardProps {
  personalisedPaces?: PaceZones | null
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

// Light mode: full vivid gradient card, white text (Option C)
// Dark mode:  rgba tint on dark surface, coloured text (Option A)
// Switching between them is handled purely by CSS vars + .dark class on <html>
const SESSION_COLOURS: Record<string, {
  gradient: string  // full-colour gradient for light mode
  tint: string      // subtle rgba for dark mode
  border: string    // dark mode border
  glow: string      // shadow colour
  dot: string       // the vivid colour — icons, dots, dark text
  label: string
}> = {
  easy:     { gradient: 'linear-gradient(135deg,#16a34a,#15803d)', tint: 'rgba(34,197,94,0.10)',   border: 'rgba(34,197,94,0.25)',   glow: 'rgba(34,197,94,0.25)',   dot: '#22c55e', label: 'Easy Run'  },
  tempo:    { gradient: 'linear-gradient(135deg,#ca8a04,#a16207)', tint: 'rgba(234,179,8,0.10)',   border: 'rgba(234,179,8,0.25)',   glow: 'rgba(234,179,8,0.25)',   dot: '#eab308', label: 'Tempo'     },
  interval: { gradient: 'linear-gradient(135deg,#ea580c,#c2410c)', tint: 'rgba(249,115,22,0.10)',  border: 'rgba(249,115,22,0.25)',  glow: 'rgba(249,115,22,0.25)',  dot: '#f97316', label: 'Intervals' },
  long:     { gradient: 'linear-gradient(135deg,#2563eb,#1d4ed8)', tint: 'rgba(59,130,246,0.10)',  border: 'rgba(59,130,246,0.25)',  glow: 'rgba(59,130,246,0.25)',  dot: '#3b82f6', label: 'Long Run'  },
  recovery: { gradient: 'linear-gradient(135deg,#059669,#047857)', tint: 'rgba(74,222,128,0.10)',  border: 'rgba(74,222,128,0.25)',  glow: 'rgba(74,222,128,0.20)',  dot: '#4ade80', label: 'Recovery'  },
  gym:      { gradient: 'linear-gradient(135deg,#7c3aed,#6d28d9)', tint: 'rgba(139,92,246,0.10)',  border: 'rgba(139,92,246,0.25)',  glow: 'rgba(139,92,246,0.25)',  dot: '#8b5cf6', label: 'Strength'  },
  rest:     { gradient: 'linear-gradient(135deg,#6b7280,#4b5563)', tint: 'rgba(156,163,175,0.08)', border: 'rgba(156,163,175,0.15)', glow: 'rgba(156,163,175,0.10)', dot: '#9ca3af', label: 'Rest'      },
  race:     { gradient: 'linear-gradient(135deg,#db2777,#be185d)', tint: 'rgba(236,72,153,0.10)',  border: 'rgba(236,72,153,0.25)',  glow: 'rgba(236,72,153,0.25)',  dot: '#ec4899', label: 'Race'      },
}

function getSessionColour(code: string | null | undefined) {
  if (!code) return SESSION_COLOURS.easy
  const c = code.toLowerCase()
  if (c.includes('tempo')) return SESSION_COLOURS.tempo
  if (c.includes('interval') || c.includes('speed')) return SESSION_COLOURS.interval
  if (c.includes('long')) return SESSION_COLOURS.long
  if (c.includes('recovery') || c.includes('recover')) return SESSION_COLOURS.recovery
  if (c.includes('gym') || c.includes('strength')) return SESSION_COLOURS.gym
  if (c.includes('rest')) return SESSION_COLOURS.rest
  if (c.includes('race')) return SESSION_COLOURS.race
  return SESSION_COLOURS.easy
}

function SessionCard({ session, log, onTap, onQuickDone, onFocus, personalisedPaces = null }: SessionCardProps) {
  const cfg    = getSessionType(session.c)
  const col    = getSessionColour(session.c)
  const done   = !!log?.done
  const [justDone, setJustDone] = useState(false)
  const [showXP, setShowXP]     = useState(false)
  const xp     = getSessionXP(session.c)
  const myPace = !done ? getPersonalisedPace(session.c, personalisedPaces) : null
  const isGym  = session.c?.startsWith('gym')

  function handleQuickDoneWithAnim() {
    if (!done) {
      setJustDone(true); setShowXP(true)
      setTimeout(() => setJustDone(false), 500)
      setTimeout(() => setShowXP(false), 950)
    }
    onQuickDone()
  }

  // ── Done state — same in both modes ──────────────────────────────────────
  if (done) {
    return (
      <div className="rounded-2xl overflow-hidden transition-all active:scale-[0.99] opacity-55 cursor-pointer"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        onClick={onTap}>
        <div className="flex">
          <div className="w-1 flex-shrink-0" style={{ background: 'var(--color-border-2)' }} />
          <div className="flex-1 flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: 'var(--color-surface-2)' }}>
              {cfg.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-black leading-tight"
                style={{ color: 'var(--color-text-secondary)', letterSpacing: '-0.01em' }}>
                {session.n}
              </p>
              {log && (
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[11px] font-black" style={{ color: '#16a34a' }}>
                    ✓ {log.effort ? `RPE ${log.effort}` : 'Done'}
                  </span>
                  {log.km && <span className="text-[10px] font-data" style={{ color: 'var(--color-text-tertiary)' }}>{log.km}km</span>}
                  {log.duration_secs && <span className="text-[10px] font-data" style={{ color: 'var(--color-text-tertiary)' }}>{Math.round(log.duration_secs / 60)}min</span>}
                  {log.pace && <span className="text-[10px] font-data" style={{ color: 'var(--color-text-tertiary)' }}>{log.pace}/km</span>}
                  {log.strava_id && <span className="text-[10px] font-bold" style={{ color: '#fc4c02' }}>⚡ Strava</span>}
                </div>
              )}
              {log?.splits && Array.isArray(log.splits) && log.splits.length > 0 && (
                <SplitsDisplay splits={log.splits as Array<{ distance: number; elapsed_time: number; moving_time: number; pace?: string }>} />
              )}
            </div>
            <button onClick={e => { e.stopPropagation(); handleQuickDoneWithAnim() }}
              className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${justDone ? 'animate-check-pop' : ''}`}
              style={{ background: '#dcfce7', border: '2px solid #22c55e' }}>
              <svg className="w-5 h-5" style={{ color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Active session ────────────────────────────────────────────────────────
  // data-mode attribute lets CSS in globals.css switch between Option C (light) and Option A (dark)
  return (
    <div
      className="rounded-2xl overflow-hidden transition-all active:scale-[0.99] cursor-pointer ns-session-card"
      data-type={session.c?.split('_')[0] ?? 'easy'}
      style={{
        // Light: full colour gradient. Dark (.dark class on html): overridden to tint in globals.css
        background: col.gradient,
        boxShadow: `0 2px 16px ${col.glow}`,
      }}
      onClick={onTap}
    >
      <div className="flex">
        {/* Left bar — white translucent in light, vivid in dark */}
        <div className="w-1.5 flex-shrink-0 ns-card-bar"
          style={{ background: 'rgba(255,255,255,0.3)' }} />

        <div className="flex-1 flex items-start gap-3 p-4">

          {/* Icon + focus label */}
          <button
            onClick={e => { e.stopPropagation(); isGym ? onTap() : onFocus() }}
            className="flex flex-col items-center gap-1 flex-shrink-0 mt-0.5 active:scale-90 transition-transform"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg ns-card-icon"
              style={{ background: 'rgba(255,255,255,0.2)' }}>
              {cfg.emoji}
            </div>
            <span className="text-[8px] font-bold uppercase tracking-wide ns-card-sublabel"
              style={{ color: 'rgba(255,255,255,0.75)' }}>
              {isGym ? 'Track' : 'Focus'}
            </span>
          </button>

          {/* Text content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest ns-card-type"
                style={{ color: 'rgba(255,255,255,0.85)' }}>
                {col.label}
              </span>
              {session.km > 0 && (
                <span className="font-data text-[11px] font-bold ns-card-km"
                  style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {fmtKm(session.km)}
                </span>
              )}
            </div>

            <p className="text-[15px] font-black leading-tight mb-1 ns-card-title"
              style={{ color: 'white', letterSpacing: '-0.01em' }}>
              {session.n}
            </p>

            {session.det && (
              <p className="text-xs leading-relaxed line-clamp-2 ns-card-detail"
                style={{ color: 'rgba(255,255,255,0.7)' }}>
                {parseDet(session.det).technical}
              </p>
            )}

            {myPace && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full ns-card-pace"
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                  ⚡ {myPace}
                </span>
                <span className="text-[9px] ns-card-pace-sub"
                  style={{ color: 'rgba(255,255,255,0.6)' }}>
                  your pace
                </span>
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="relative flex-shrink-0">
            {showXP && (
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 pointer-events-none z-10 animate-xp-float">
                <span className="text-[10px] font-black rounded-full px-2 py-0.5 whitespace-nowrap font-data"
                  style={{ background: 'var(--ns-track)', color: 'white', boxShadow: '0 2px 8px rgba(196,154,60,0.4)' }}>
                  +{xp} XP
                </span>
              </div>
            )}

            {isGym ? (
              <button onClick={e => { e.stopPropagation(); onTap() }}
                className="px-3 py-2 rounded-xl text-[11px] font-black whitespace-nowrap active:scale-95 transition-transform"
                style={{ background: 'rgba(255,255,255,0.25)', color: 'white' }}>
                Start →
              </button>
            ) : (
              <button onClick={e => { e.stopPropagation(); handleQuickDoneWithAnim() }}
                className="w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 ns-card-done-btn"
                style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)' }}>
                <div className="w-3 h-3 rounded-full" style={{ background: 'white' }} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SessionCard
