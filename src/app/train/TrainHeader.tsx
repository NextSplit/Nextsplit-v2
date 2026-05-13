'use client'

import DarkModeToggle from '@/components/DarkModeToggle'
import { AppHeader } from '@/components/AppHeader'
import { decodeHtml } from '@/lib/sessionUtils'

// PR H4 — /train header now renders through the shared AppHeader.
// The week progress bar + plan/fuel tab strip live in AppHeader's
// bottomSlot. plan-less state (no plan yet) collapses to a single
// title row with no bottom slot.

interface Props {
  plan:         { name: string; current_week: number; total_weeks: number; race_date?: string | null } | null
  planTab:      'plan' | 'fuel'
  onTabChange:  (t: 'plan' | 'fuel') => void
  onAddSession: () => void
}

export function TrainHeader({ plan, planTab, onTabChange, onAddSession }: Props) {
  const subtitle = plan
    ? `Week ${plan.current_week} of ${plan.total_weeks}` + (plan.race_date ? (() => {
        const days = Math.ceil((new Date(plan.race_date!).getTime() - Date.now()) / 86400000)
        return days > 0 ? ` · ${days}d 🏁` : ''
      })() : '')
    : undefined

  return (
    <AppHeader
      title={plan ? decodeHtml(plan.name) : 'Train'}
      subtitle={subtitle}
      rightSlot={
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
      }
      bottomSlot={plan ? (
        <div className="space-y-2">
          {/* Plan-progress bar */}
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(plan.current_week / plan.total_weeks) * 100}%`,
                background: 'linear-gradient(90deg,#2563eb,#1d4ed8)',
              }} />
          </div>
          {/* Plan/Fuel tab strip */}
          <div className="flex border-t" style={{ borderColor: 'var(--color-border)' }}>
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
        </div>
      ) : undefined}
    />
  )
}
