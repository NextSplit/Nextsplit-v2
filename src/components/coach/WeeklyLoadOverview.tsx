'use client'

import { RUNNER_CLASSES, type RunnerClassId } from '@/lib/rpg'
import type { AthleteStatus } from './types'

export function WeeklyLoadOverview({ athletes }: { athletes: AthleteStatus[] }) {
  return (
    <section>
      <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider px-1 mb-2">
        This week
      </p>
      <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4 space-y-3">
        {athletes.map(a => {
          const done  = a.sessions_done_week
          const total = a.sessions_total_week || 0
          const pct   = total > 0 ? (done / total) * 100 : 0
          const name  = a.display_name ?? (a.handle ? `@${a.handle}` : 'Athlete')
          const cls   = a.runner_class ? RUNNER_CLASSES[a.runner_class as RunnerClassId] : null
          return (
            <a key={a.athlete_id} href={`/coach/athlete/${a.athlete_id}`}
              className="flex items-center gap-3 group active:opacity-70">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                style={{ background: 'var(--ns-violet-light)' }}>
                {cls?.emoji ?? '🏃'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-gray-800 truncate group-hover:underline">{name}</p>
                  <p className="text-[10px] text-[var(--color-text-tertiary)] flex-shrink-0 ml-2">
                    {done}/{total || '?'} sessions
                  </p>
                </div>
                <div className="h-1.5 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      background: pct >= 100 ? '#10b981' : pct >= 60 ? 'var(--ns-violet)' : '#f59e0b',
                    }} />
                </div>
              </div>
              {a.acwr !== null && (
                <span className={`text-[10px] font-bold flex-shrink-0 px-1.5 py-0.5 rounded-lg ${
                  a.acwr > 1.3 ? 'bg-red-900/20 text-red-400' :
                  a.acwr < 0.8 ? 'bg-amber-900/20 text-amber-400' : 'bg-emerald-900/20 text-emerald-400'
                }`}>
                  {a.acwr.toFixed(1)}
                </span>
              )}
            </a>
          )
        })}
      </div>
    </section>
  )
}
