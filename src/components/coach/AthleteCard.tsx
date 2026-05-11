'use client'

import { RUNNER_CLASSES, type RunnerClassId } from '@/lib/rpg'
import type { AthleteStatus } from './types'
import { STATUS } from './types'

export function AthleteCard({ athlete, onMessage }: { athlete: AthleteStatus; onMessage: (id: string) => void }) {
  const cfg       = STATUS[athlete.status]
  const name      = athlete.display_name ?? (athlete.handle ? `@${athlete.handle}` : 'Athlete')
  const daysSince = athlete.last_active
    ? Math.floor((new Date().getTime() - new Date(athlete.last_active).getTime()) / (24 * 3600 * 1000))
    : null

  // Character class — spec: "coach sees athletes as characters in the dashboard"
  const cls = athlete.runner_class
    ? RUNNER_CLASSES[athlete.runner_class as RunnerClassId]
    : null

  return (
    <div className={`bg-white rounded-2xl border-2 overflow-hidden ${cfg.ring}`}>
      <a href={`/coach/athlete/${athlete.athlete_id}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-[#f8f8f6]">
        <div className="relative shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${cls ? '' : 'bg-[var(--color-surface-2)]'}`}
            style={cls ? { background: cls.bg.replace('bg-', '') + '20', border: `2px solid ${cls.colour}40` } : {}}>
            {cls ? cls.emoji : '🏃'}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${cfg.dot}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-900 truncate">{name}</p>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${cfg.badge}`}>
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {athlete.plan_name && (
              <p className="text-xs text-[var(--color-text-tertiary)] truncate">
                {athlete.plan_name} · W{athlete.current_week}/{athlete.total_weeks}
              </p>
            )}
            {cls && (
              <>
                {athlete.plan_name && <span className="text-[10px] text-gray-300">·</span>}
                <span className="text-[10px] text-[var(--color-text-tertiary)] shrink-0">{cls.name}</span>
              </>
            )}
          </div>
        </div>

        <span className="text-gray-300 text-lg shrink-0">›</span>
      </a>

      {/* Stats strip — P3.1 v2 split into two rows: training + comms. */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-[var(--color-border)]">
        <div className="px-3 py-2 text-center">
          <p className="text-xs font-black text-gray-800">
            {athlete.sessions_done_week}/{athlete.sessions_total_week || '?'}
          </p>
          <p className="text-[9px] text-[var(--color-text-tertiary)]">sessions</p>
        </div>
        <div className={`px-3 py-2 text-center ${
          athlete.acwr === null ? '' :
          athlete.acwr > 1.3 ? 'bg-red-900/20' :
          athlete.acwr < 0.8 ? 'bg-amber-900/20' : 'bg-emerald-900/20'
        }`}>
          <p className={`text-xs font-black ${
            athlete.acwr === null ? 'text-[var(--color-text-tertiary)]' :
            athlete.acwr > 1.3 ? 'text-red-700' :
            athlete.acwr < 0.8 ? 'text-amber-700' : 'text-emerald-700'
          }`}>
            {athlete.acwr?.toFixed(2) ?? '—'}
          </p>
          <p className="text-[9px] text-[var(--color-text-tertiary)]">ACWR</p>
        </div>
        <div className="px-3 py-2 text-center">
          <p className="text-xs font-black text-gray-800">
            {daysSince === null ? '—' : daysSince === 0 ? 'Today' : `${daysSince}d`}
          </p>
          <p className="text-[9px] text-[var(--color-text-tertiary)]">last active</p>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-[var(--color-border)]">
        <div className="px-3 py-2 text-center">
          <p className={`text-xs font-black ${
            (athlete.streak_current ?? 0) >= 7 ? 'text-amber-700' :
            (athlete.streak_current ?? 0) >= 3 ? 'text-emerald-700' :
            'text-gray-800'
          }`}>
            {athlete.streak_current && athlete.streak_current > 0
              ? `🔥 ${athlete.streak_current}d`
              : '—'}
          </p>
          <p className="text-[9px] text-[var(--color-text-tertiary)]">streak</p>
        </div>
        <div className={`px-3 py-2 text-center ${
          athlete.days_since_message === null ? 'bg-amber-900/10' :
          athlete.days_since_message !== undefined && athlete.days_since_message >= 14 ? 'bg-amber-900/10' :
          ''
        }`}>
          <p className={`text-xs font-black ${
            athlete.days_since_message === null ? 'text-amber-700' :
            athlete.days_since_message !== undefined && athlete.days_since_message >= 14 ? 'text-amber-700' :
            'text-gray-800'
          }`}>
            {athlete.days_since_message === null
              ? 'Never'
              : athlete.days_since_message === 0
              ? 'Today'
              : athlete.days_since_message !== undefined
              ? `${athlete.days_since_message}d`
              : '—'}
          </p>
          <p className="text-[9px] text-[var(--color-text-tertiary)]">since msg</p>
        </div>
      </div>

      {athlete.flags.length > 0 && (
        <div className="px-4 pb-3 pt-1 space-y-1">
          {athlete.flags.map(f => (
            <div key={f} className="flex items-center gap-2 text-xs text-amber-400 bg-amber-900/20 rounded-lg px-2.5 py-1.5">
              <span>{f}</span>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 pb-3 flex gap-2">
        <button
          onClick={() => onMessage(athlete.athlete_id)}
          className="flex-1 bg-[var(--color-surface-2)] text-gray-700 text-xs font-semibold py-2 rounded-xl active:bg-[var(--color-surface-3)]"
        >
          💬 Message
        </button>
        <a
          href={`/coach/athlete/${athlete.athlete_id}`}
          className="flex-1 bg-[var(--ns-violet-light)] text-[var(--ns-violet)] text-xs font-semibold py-2 rounded-xl text-center active:bg-[var(--ns-violet-light)]"
        >
          📊 View data
        </a>
      </div>
    </div>
  )
}
