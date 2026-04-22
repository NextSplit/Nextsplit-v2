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

function SessionCard({ session, log, onTap, onQuickDone, onFocus, personalisedPaces = null }: SessionCardProps) {
  const cfg = getSessionType(session.c)
  const done = !!log?.done
  const [justDone, setJustDone] = useState(false)
  const [showXP, setShowXP] = useState(false)
  const xp = getSessionXP(session.c)
  const myPace = !done ? getPersonalisedPace(session.c, personalisedPaces) : null

  function handleQuickDoneWithAnim() {
    if (!done) {
      setJustDone(true)
      setShowXP(true)
      setTimeout(() => setJustDone(false), 500)
      setTimeout(() => setShowXP(false), 950)
    }
    onQuickDone()
  }

  return (
    <div
      className={`rounded-2xl transition-all overflow-hidden`}
      style={done
        ? { background: 'var(--color-surface)', border: '1px solid rgba(74,222,128,0.2)', opacity: 0.8 }
        : { background: 'var(--color-surface)', border: '1px solid var(--color-border)' }
      }
    >
      {/* Coloured top accent bar */}
      <div className={`h-0.5 ${cfg.accent}`} style={{ opacity: done ? 0.4 : 1 }} />

      <div className="flex items-start gap-3 p-4" onClick={onTap}>
        {/* Session type icon */}
        <button
          onClick={e => { e.stopPropagation(); session.c?.startsWith('gym') ? onTap() : onFocus() }}
          className="flex flex-col items-center gap-1 flex-shrink-0 mt-0.5"
        >
          <div className={`w-10 h-10 rounded-xl ${cfg.colour} flex items-center justify-center text-lg active:scale-95 transition-transform shadow-sm`}>
            {cfg.emoji}
          </div>
          <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>
            {session.c?.startsWith('gym') ? 'Track' : 'Focus'}
          </span>
        </button>

        <div className="flex-1 min-w-0">
          {/* Label + distance row */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.textColour}`}>
              {cfg.label}
            </span>
            {session.km > 0 && (
              <span className="font-data text-[11px] font-bold" style={{ color: 'var(--color-text-tertiary)' }}>
                {fmtKm(session.km)}
              </span>
            )}
          </div>
          {/* Session name — larger, more weight */}
          <p className="text-[15px] font-black leading-tight mb-1" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
            {session.n}
          </p>
          {/* Technical detail */}
          {session.det && !done && (
            <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--color-text-tertiary)' }}>
              {parseDet(session.det).technical}
            </p>
          )}
          {/* Personalised pace chip */}
          {myPace && !done && (
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(43,92,63,0.2)', color: 'var(--ns-forest)' }}>
                ⚡ {myPace}
              </span>
              <span className="text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>your pace</span>
            </div>
          )}
          {/* Done state — compact stats row */}
          {done && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[11px] font-black" style={{ color: '#4ade80' }}>
                ✓ {log?.effort ? `RPE ${log.effort}` : 'Done'}
              </span>
              {log?.km && <span className="text-[10px] font-data" style={{ color: 'var(--color-text-tertiary)' }}>{log.km}km</span>}
              {log?.duration_secs && <span className="text-[10px] font-data" style={{ color: 'var(--color-text-tertiary)' }}>{Math.round(log.duration_secs / 60)}min</span>}
              {log?.pace && <span className="text-[10px] font-data" style={{ color: 'var(--color-text-tertiary)' }}>{log.pace}/km</span>}
              {log?.hr && <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>♥ {log.hr}</span>}
              {log?.notes && <span className="text-[10px] italic truncate max-w-[120px]" style={{ color: 'var(--color-text-tertiary)' }}>{log.notes}</span>}
              {log?.strava_id && <span className="text-[10px] font-bold" style={{ color: '#fc4c02' }}>⚡ Strava</span>}
            </div>
          )}
          {/* Strava splits — shown when imported */}
          {done && log?.splits && Array.isArray(log.splits) && log.splits.length > 0 && (
            <SplitsDisplay splits={log.splits as Array<{ distance: number; elapsed_time: number; moving_time: number; pace?: string }> } />
          )}
        </div>

        {/* Quick-done / gym start / edit button — with XP float */}
        <div className="relative flex-shrink-0">
          {showXP && (
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 pointer-events-none z-10 animate-xp-float">
              <span className="text-[10px] font-black rounded-full px-2 py-0.5 whitespace-nowrap font-data"
                style={{ background: 'var(--ns-track)', color: 'white', boxShadow: '0 2px 8px rgba(196,154,60,0.4)' }}>
                +{xp} XP
              </span>
            </div>
          )}
          {session.c?.startsWith('gym') && !done ? (
            // Gym sessions get a "Start" pill instead of quick-done circle
            <button
              onClick={e => { e.stopPropagation(); onTap() }}
              className="px-3 py-2 rounded-xl text-white text-[11px] font-black whitespace-nowrap active:scale-95 transition-transform"
              style={{ background: 'var(--ns-ember)' }}
            >
              Start →
            </button>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); handleQuickDoneWithAnim() }}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={done
                ? { background: 'rgba(74,222,128,0.2)', border: '2px solid #4ade80' }
                : { background: 'rgba(232,93,38,0.1)', border: '2px solid rgba(232,93,38,0.4)' }
              }
            >
              {done ? (
                <svg
                  className={`w-5 h-5 ${justDone ? 'animate-check-pop' : ''}`}
                  style={{ color: '#4ade80' }}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--ns-ember)', opacity: 0.6 }} />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Today Component ─────────────────────────────────────────────────────

export default SessionCard