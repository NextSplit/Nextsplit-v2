'use client'

import React from 'react'
import { fmtKm, getSessionType } from '@/lib/sessionUtils'
import { getSessionXP } from '@/lib/rpg'
import type { PlanSession, TrainingLog } from '@/types/database'
import { getCol } from './_helpers'

export function TodaySessionCard({
  session, log, onTap, onQuickLog,
}: {
  session: PlanSession
  log: TrainingLog | null
  onTap: () => void
  onQuickLog: () => void
}) {
  const col   = getCol(session.c)
  const done  = !!log?.done
  const xp    = getSessionXP(session.c)
  const cfg   = getSessionType(session.c)
  const isGym = session.c?.startsWith('gym')

  if (done) {
    return (
      <div className="rounded-2xl p-4 flex items-center gap-3 opacity-60"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        onClick={onTap}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ background: 'var(--color-surface-2)' }}>{cfg.emoji}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{col.label}</p>
          <p className="text-sm font-black" style={{ color: 'var(--color-text-secondary)' }}>{session.n}</p>
          {log && <p className="text-xs mt-0.5" style={{ color: '#16a34a' }}>✓ Done{log.km ? ` · ${log.km}km` : ''}{log.effort ? ` · RPE ${log.effort}` : ''}</p>}
        </div>
        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#dcfce7', border: '2px solid #22c55e' }}>
          <svg className="w-4 h-4" style={{ color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className="ns-session-card rounded-2xl overflow-hidden active:scale-[0.99] transition-all cursor-pointer"
      data-type={session.c?.split('_')[0] ?? 'easy'}
      style={{ background: col.gradient, boxShadow: `0 4px 20px ${col.dot}30` }}
      onClick={onTap}>
      <div className="flex">
        <div className="w-1.5 flex-shrink-0 ns-card-bar" style={{ background: 'rgba(255,255,255,0.3)' }} />
        <div className="flex-1 p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            {cfg.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {col.label}{session.km > 0 ? ` · ${fmtKm(session.km)}` : ''}
            </p>
            <p className="text-base font-black text-white leading-tight" style={{ letterSpacing: '-0.01em' }}>{session.n}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>+{xp} XP</p>
          </div>
          {isGym ? (
            <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); onTap() }}
              className="rounded-xl px-4 py-2.5 text-sm font-black text-white flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.25)' }}>
              Start →
            </button>
          ) : (
            <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); onQuickLog() }}
              className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)' }}>
              <div className="w-3 h-3 rounded-full bg-white" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
