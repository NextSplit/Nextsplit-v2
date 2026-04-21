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
      className={`rounded-3xl border-l-4 transition-all min-h-[88px] ${cfg.accent} overflow-hidden`}
      style={done
        ? { background: 'rgba(16,185,129,0.08)', borderRightColor: 'transparent', borderTopColor: 'transparent', borderBottomColor: 'transparent' }
        : { background: 'var(--color-surface)', borderRightColor: 'transparent', borderTopColor: 'transparent', borderBottomColor: 'transparent' }
      }
    >
      <div className="flex items-start gap-3 p-5" onClick={onTap}>
        {/* Type indicator — tap for focus mode (gym: tap routes to live tracker) */}
        <button
          onClick={e => { e.stopPropagation(); session.c?.startsWith('gym') ? onTap() : onFocus() }}
          className={`flex flex-col items-center gap-0.5 flex-shrink-0`}
        >
          <div className={`w-11 h-11 rounded-xl ${cfg.colour} flex items-center justify-center text-xl active:scale-95 transition-transform`}>
            {cfg.emoji}
          </div>
          <span className="text-[8px] text-gray-400 font-medium">
            {session.c?.startsWith('gym') ? 'Track' : 'Focus'}
          </span>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.textColour}`}>
              {cfg.label}
            </span>
            {session.km > 0 && (
              <span className="text-[10px] text-gray-400">{fmtKm(session.km)}</span>
            )}
          </div>
          <p className="text-base font-bold text-gray-900 leading-tight">{session.n}</p>
          {session.det && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">
              {parseDet(session.det).technical}
            </p>
          )}
          {myPace && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] text-[var(--ns-forest)] font-semibold">You: {myPace}</span>
              <span className="text-[9px] text-gray-300">personalised</span>
            </div>
          )}
          {done && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[11px] text-emerald-600 font-bold">
                ✓ Done{log?.effort ? ` · RPE ${log.effort}` : ''}
              </span>
              {log?.km && <span className="text-[10px] text-gray-400 font-data">{log.km}km</span>}
              {log?.duration_secs && <span className="text-[10px] text-gray-400 font-data">{Math.round(log.duration_secs / 60)}min</span>}
              {log?.pace && <span className="text-[10px] text-gray-400 font-data">{log.pace}/km</span>}
              {log?.hr && <span className="text-[10px] text-gray-400">♥ {log.hr}</span>}
              {log?.notes && <span className="text-[10px] text-gray-400 italic truncate max-w-[100px]">{log.notes}</span>}
              {log?.strava_id && <span className="text-[10px] text-orange-500 font-semibold">⚡ Strava</span>}
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
              <span className="text-[11px] font-black bg-white rounded-full px-1.5 py-0.5 shadow-md whitespace-nowrap font-data">
                +{xp} XP
              </span>
            </div>
          )}
          {session.c?.startsWith('gym') && !done ? (
            // Gym sessions get a "Start" pill instead of quick-done circle
            <button
              onClick={e => { e.stopPropagation(); onTap() }}
              className="px-3 py-2 rounded-xl bg-amber-500 text-white text-[11px] font-bold whitespace-nowrap active:scale-95 transition-transform"
            >
              Start →
            </button>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); handleQuickDoneWithAnim() }}
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                done
                  ? 'border-emerald-400 bg-emerald-400'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {done ? (
                <svg
                  className={`w-5 h-5 text-white ${justDone ? 'animate-check-pop' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <div className="w-3 h-3 rounded-full border-2 border-gray-300" />
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