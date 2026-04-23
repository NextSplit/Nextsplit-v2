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

// Session type colours — vivid, distinct, easy to read at a glance
const SESSION_COLOURS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  easy:     { bg: '#dcfce7', text: '#15803d', dot: '#22c55e', label: 'Easy Run' },
  tempo:    { bg: '#fef9c3', text: '#a16207', dot: '#eab308', label: 'Tempo' },
  interval: { bg: '#ffedd5', text: '#c2410c', dot: '#f97316', label: 'Intervals' },
  long:     { bg: '#dbeafe', text: '#1d4ed8', dot: '#3b82f6', label: 'Long Run' },
  recovery: { bg: '#f0fdf4', text: '#166534', dot: '#4ade80', label: 'Recovery' },
  gym:      { bg: '#ede9fe', text: '#6d28d9', dot: '#8b5cf6', label: 'Strength' },
  rest:     { bg: '#f3f4f6', text: '#6b7280', dot: '#9ca3af', label: 'Rest' },
  race:     { bg: '#fce7f3', text: '#be185d', dot: '#ec4899', label: 'Race' },
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
  const cfg      = getSessionType(session.c)
  const col      = getSessionColour(session.c)
  const done     = !!log?.done
  const [justDone, setJustDone] = useState(false)
  const [showXP, setShowXP]     = useState(false)
  const xp       = getSessionXP(session.c)
  const myPace   = !done ? getPersonalisedPace(session.c, personalisedPaces) : null

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
      className="rounded-2xl overflow-hidden transition-all active:scale-[0.99]"
      style={done
        ? { background: 'var(--color-surface)', border: '1px solid var(--color-border)', opacity: 0.75 }
        : { background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
      }
      onClick={onTap}
    >
      {/* Coloured top bar — session type identity */}
      <div className="h-1" style={{ background: col.dot, opacity: done ? 0.4 : 1 }} />

      <div className="flex items-start gap-3 p-4">
        {/* Session type icon + label */}
        <button
          onClick={e => { e.stopPropagation(); session.c?.startsWith('gym') ? onTap() : onFocus() }}
          className="flex flex-col items-center gap-1 flex-shrink-0 mt-0.5 active:scale-90 transition-transform"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: col.bg }}>
            {cfg.emoji}
          </div>
          <span className="text-[8px] font-bold uppercase tracking-wide"
            style={{ color: col.text }}>
            {session.c?.startsWith('gym') ? 'Track' : 'Focus'}
          </span>
        </button>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Type label + distance */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: col.text }}>
              {col.label}
            </span>
            {session.km > 0 && (
              <span className="font-data text-[11px] font-bold"
                style={{ color: 'var(--color-text-tertiary)' }}>
                {fmtKm(session.km)}
              </span>
            )}
          </div>

          {/* Session name — bold, prominent */}
          <p className="text-[15px] font-black leading-tight mb-1"
            style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
            {session.n}
          </p>

          {/* Technical detail */}
          {session.det && !done && (
            <p className="text-xs leading-relaxed line-clamp-2"
              style={{ color: 'var(--color-text-tertiary)' }}>
              {parseDet(session.det).technical}
            </p>
          )}

          {/* Personalised pace chip */}
          {myPace && !done && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: 'var(--ns-ember-light)', color: 'var(--ns-ember)' }}>
                ⚡ {myPace}
              </span>
              <span className="text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>
                your pace
              </span>
            </div>
          )}

          {/* Done stats */}
          {done && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[11px] font-black" style={{ color: '#16a34a' }}>
                ✓ {log?.effort ? `RPE ${log.effort}` : 'Done'}
              </span>
              {log?.km && <span className="text-[10px] font-data" style={{ color: 'var(--color-text-tertiary)' }}>{log.km}km</span>}
              {log?.duration_secs && <span className="text-[10px] font-data" style={{ color: 'var(--color-text-tertiary)' }}>{Math.round(log.duration_secs / 60)}min</span>}
              {log?.pace && <span className="text-[10px] font-data" style={{ color: 'var(--color-text-tertiary)' }}>{log.pace}/km</span>}
              {log?.hr && <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>♥ {log.hr}</span>}
              {log?.strava_id && <span className="text-[10px] font-bold" style={{ color: '#fc4c02' }}>⚡ Strava</span>}
            </div>
          )}

          {/* Strava splits */}
          {done && log?.splits && Array.isArray(log.splits) && log.splits.length > 0 && (
            <SplitsDisplay splits={log.splits as Array<{ distance: number; elapsed_time: number; moving_time: number; pace?: string }>} />
          )}
        </div>

        {/* Quick-done / action button */}
        <div className="relative flex-shrink-0">
          {/* XP float */}
          {showXP && (
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 pointer-events-none z-10 animate-xp-float">
              <span className="text-[10px] font-black rounded-full px-2 py-0.5 whitespace-nowrap font-data"
                style={{ background: 'var(--ns-track)', color: 'white', boxShadow: '0 2px 8px rgba(196,154,60,0.4)' }}>
                +{xp} XP
              </span>
            </div>
          )}

          {session.c?.startsWith('gym') && !done ? (
            <button
              onClick={e => { e.stopPropagation(); onTap() }}
              className="px-3 py-2 rounded-xl text-[11px] font-black text-white whitespace-nowrap active:scale-95 transition-transform"
              style={{ background: 'var(--ns-ember)' }}>
              Start →
            </button>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); handleQuickDoneWithAnim() }}
              className="w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={done
                ? { background: '#dcfce7', border: '2px solid #22c55e' }
                : { background: 'var(--ns-ember-light)', border: '2px solid rgba(232,93,38,0.3)' }
              }>
              {done ? (
                <svg className={`w-5 h-5 ${justDone ? 'animate-check-pop' : ''}`}
                  style={{ color: '#16a34a' }}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <div className="w-3 h-3 rounded-full"
                  style={{ background: 'var(--ns-ember)', opacity: 0.7 }} />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default SessionCard
