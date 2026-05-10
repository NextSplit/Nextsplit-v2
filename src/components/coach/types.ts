// Shared types for the coach dashboard surface. Extracted from
// CoachDashboardClient.tsx during R2 god-component decomposition so
// athlete-card / weekly-load / stats-grid / filter-chips / parent
// can all reference the same shape without circular imports.

export interface AthleteStatus {
  athlete_id:          string
  display_name:        string | null
  handle:              string | null
  status:              'green' | 'amber' | 'red'
  flags:               string[]
  acwr:                number | null
  sessions_done_week:  number
  sessions_total_week: number
  last_active:         string | null
  avg_wellness:        number | null
  current_week:        number | null
  total_weeks:         number | null
  plan_name:           string | null
  runner_class:        string | null
  // P3.1 dashboard v2 additions
  streak_current?:     number
  days_since_message?: number | null
}

export type AthleteFilter = 'all' | 'red' | 'amber' | 'green' | 'inactive' | 'silent'

export const STATUS = {
  green: { dot: 'bg-emerald-400', ring: 'border-[var(--color-border-2)]', badge: 'bg-emerald-100 text-emerald-700', label: 'On track'  },
  amber: { dot: 'bg-amber-400',   ring: 'border-amber-300',               badge: 'bg-amber-100 text-amber-700',    label: 'Check in'  },
  red:   { dot: 'bg-red-400',     ring: 'border-red-300',                 badge: 'bg-red-100 text-red-700',        label: 'Needs you' },
} as const
