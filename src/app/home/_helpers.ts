import type { PlanSession, PlanWeek, TrainingLog } from '@/types/database'

// Pure utilities lifted from HomeClient during R2 god-component decomp.
// No JSX, no React — kept as a non-tsx module so they can be reused by
// future Home tests / hooks without touching the client surface.

export function todayDayIndex() {
  const d = new Date().getDay()
  return d === 0 ? 6 : d - 1
}

export function getWeeklyKm(logs: TrainingLog[]): number {
  const mon = new Date()
  mon.setDate(mon.getDate() - (mon.getDay() === 0 ? 6 : mon.getDay() - 1))
  mon.setHours(0, 0, 0, 0)
  return logs
    .filter(l => l.done && new Date(l.created_at) >= mon)
    .reduce((s, l) => s + (l.km ?? 0), 0)
}

export function getTodaySessions(plan: { current_week: number; weeks_data: unknown } | null): PlanSession[] {
  if (!plan?.weeks_data) return []
  const weeks = plan.weeks_data as unknown as PlanWeek[]
  if (!Array.isArray(weeks)) return []
  const cw = weeks.find(w => w.n === plan.current_week)
  if (!cw) return []
  const dayI = todayDayIndex()
  return (cw.days?.[dayI]?.sessions ?? []).filter((s: PlanSession) => s.c && s.c !== 'rest')
}

export function getSessionColour(code: string | null | undefined) {
  const c = (code ?? '').toLowerCase()
  if (c.includes('tempo'))                           return '#ffb800'
  if (c.includes('interval') || c.includes('speed')) return '#ff7438'
  if (c.includes('long'))                            return '#4d8aff'
  if (c.includes('recovery'))                        return '#00e676'
  if (c.includes('gym') || c.includes('strength'))   return '#a855f7'
  if (c.includes('race'))                            return '#ff2d9e'
  return '#00e676'
}
