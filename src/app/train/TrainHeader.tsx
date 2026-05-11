'use client'

import DarkModeToggle from '@/components/DarkModeToggle'
import { decodeHtml } from '@/lib/sessionUtils'

interface Props {
  plan:         { name: string; current_week: number; total_weeks: number; race_date?: string | null } | null
  planTab:      'plan' | 'fuel'
  onTabChange:  (t: 'plan' | 'fuel') => void
  onAddSession: () => void
}

export function TrainHeader({ plan, planTab, onTabChange, onAddSession }: Props) {
  return (
    <div className="sticky top-0 z-40 border-b"
      style={{
        background: 'var(--color-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderColor: 'var(--color-border)',
      }}>
      <div className="max-w-lg mx-auto px-4 pt-12 pb-3">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-xl font-black tracking-tight"
              style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
              {plan ? decodeHtml(plan.name) : 'Train'}
            </h1>
            {plan && (
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                Week {plan.current_week} of {plan.total_weeks}
                {plan.race_date && (() => {
                  const days = Math.ceil((new Date(plan.race_date).getTime() - Date.now()) / 86400000)
                  return days > 0 ? ` · ${days}d 🏁` : null
                })()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {plan && (
              <button onClick={onAddSession}
                className="text-xs font-bold px-3 py-1.5 rounded-lg"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
                + Add
              </button>
            )}
            <DarkModeToggle />
          </div>
        </div>
        {plan && (
          <div className="h-1 rounded-full overflow-hidden mt-2" style={{ background: 'var(--color-surface-2)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(plan.current_week / plan.total_weeks) * 100}%`, background: 'linear-gradient(90deg,#2563eb,#1d4ed8)' }} />
          </div>
        )}
      </div>

      {plan && (
        <div className="max-w-lg mx-auto px-4 flex border-t" style={{ borderColor: 'var(--color-border)' }}>
          {(['plan', 'fuel'] as const).map(t => (
            <button key={t} onClick={() => onTabChange(t)}
              className="flex-1 py-2.5 text-xs font-bold border-b-2 transition-all"
              style={{
                borderBottomColor: planTab === t ? 'var(--ns-cobalt)' : 'transparent',
                color: planTab === t ? 'var(--ns-cobalt)' : 'var(--color-text-tertiary)',
              }}>
              {t === 'plan' ? '📋 Training Plan' : '🥗 Fuel'}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
