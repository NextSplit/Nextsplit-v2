'use client'

import type { PlanSession, PlanWeek, TrainingLog } from '@/types/database'

interface Props {
  week:         PlanWeek
  logs:         Record<string, TrainingLog>
  onClose:      () => void
  onSessionTap: (params: { session: PlanSession; dayI: number; sessI: number; weekN: number }) => void
}

export function WeekDetailSheet({ week, logs, onClose, onSessionTap }: Props) {
  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl overflow-hidden max-h-[80vh] overflow-y-auto"
        style={{ background: 'var(--color-surface)', boxShadow: '0 -8px 40px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--color-border-2)' }} />
        </div>
        <div className="px-5 pt-2 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white"
              style={{
                background: (() => {
                  const c: Record<string, string> = { k: '#4d8aff', d: '#f97316', p: '#ef4444', r: '#ff2d9e' }
                  return c[week.b ?? 'k'] ?? '#4d8aff'
                })(),
              }}>
              {week.n}
            </div>
            <div className="flex-1">
              <p className="text-base font-black" style={{ color: 'var(--color-text-primary)' }}>
                {week.title || `Week ${week.n}`}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                {week.b === 'k' ? 'Build' : week.b === 'd' ? 'Deload' : week.b === 'p' ? 'Peak' : 'Race'} week
                {week.note ? ` · ${week.note}` : ''}
              </p>
            </div>
            <button onClick={onClose} aria-label="Close"
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)' }}>×</button>
          </div>
        </div>
        <div className="px-5 py-4 space-y-3 pb-24">
          {week.days.map((day, di) => {
            const sessions = day.sessions?.filter(s => s.c && s.c !== 'rest') ?? []
            if (!sessions.length && day.d) return (
              <div key={di} className="flex items-center gap-3">
                <p className="text-xs font-black w-8 uppercase" style={{ color: 'var(--color-text-tertiary)' }}>{day.d}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Rest day</p>
              </div>
            )
            return sessions.map((sess, si) => {
              const done = logs[`${week.n}_${di}_${si}`]?.done
              const colMap: Record<string, string> = { easy: '#00e676', tempo: '#ffb800', interval: '#f97316', long: '#4d8aff', recovery: '#00e676', gym: '#a855f7', race: '#ff2d9e' }
              const c = (sess.c ?? '').toLowerCase()
              const col = c.includes('tempo') ? colMap.tempo
                : c.includes('interval')      ? colMap.interval
                : c.includes('long')          ? colMap.long
                : c.includes('gym')           ? colMap.gym
                : c.includes('race')          ? colMap.race
                : colMap.easy
              return (
                <div key={`${di}-${si}`} className="flex items-center gap-3">
                  <p className="text-xs font-black w-8 uppercase" style={{ color: 'var(--color-text-tertiary)' }}>
                    {si === 0 ? day.d : ''}
                  </p>
                  <button
                    onClick={() => onSessionTap({ session: sess, dayI: di, sessI: si, weekN: week.n })}
                    className="flex-1 rounded-xl px-3 py-2.5 text-left"
                    style={{
                      background: done ? 'rgba(0,230,118,0.08)' : `${col}10`,
                      border:     `1px solid ${done ? '#00e676' : col}30`,
                    }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col }} />
                      <p className="text-xs font-bold flex-1" style={{ color: 'var(--color-text-primary)' }}>{sess.n}</p>
                      {sess.km > 0 && <p className="text-xs" style={{ color: col }}>{sess.km}km</p>}
                      {done && <span className="text-xs" style={{ color: '#00e676' }}>✓</span>}
                    </div>
                  </button>
                </div>
              )
            })
          })}
        </div>
      </div>
    </div>
  )
}
