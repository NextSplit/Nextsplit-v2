'use client'

import type { AthleteStatus, AthleteFilter } from './types'

interface Props {
  athletes: AthleteStatus[]
  filter:   AthleteFilter
  onChange: (next: AthleteFilter) => void
}

// P3.5 Filter chips — applied to the rendered athlete lists. Selection
// persists across sessions via localStorage (parent owns persistence).
export function AthleteFilterChips({ athletes, filter, onChange }: Props) {
  const chips = [
    { id: 'all'      as const, label: `All (${athletes.length})` },
    { id: 'red'      as const, label: `Needs you (${athletes.filter(a => a.status === 'red').length})` },
    { id: 'amber'    as const, label: `Check in (${athletes.filter(a => a.status === 'amber').length})` },
    { id: 'green'    as const, label: `On track (${athletes.filter(a => a.status === 'green').length})` },
    { id: 'inactive' as const, label: `Inactive 7d+` },
    { id: 'silent'   as const, label: `Coach silent` },
  ]
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
      {chips.map(chip => {
        const active = filter === chip.id
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onChange(chip.id)}
            aria-pressed={active}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors"
            style={{
              background: active ? 'var(--ns-ember)' : 'var(--color-surface)',
              border:     `1px solid ${active ? 'var(--ns-ember)' : 'var(--color-border)'}`,
              color:      active ? 'white' : 'var(--color-text-secondary)',
            }}>
            {chip.label}
          </button>
        )
      })}
    </div>
  )
}
