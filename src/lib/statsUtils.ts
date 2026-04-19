/**
 * Shared stats utilities for the Coach tab.
 * Used by StatsClient and the extracted chart components.
 */

import type { TrainingLog, PlanWeek } from '@/types/database'

export function logsArray(logs: Record<string, TrainingLog>): TrainingLog[] {
  return Object.values(logs)
}

export function weeklyKm(logs: TrainingLog[]): Record<number, number> {
  const out: Record<number, number> = {}
  for (const log of logs) {
    if (log.done && log.km && log.week_n != null) {
      out[log.week_n] = (out[log.week_n] ?? 0) + log.km
    }
  }
  return out
}

export function calcACWR(
  logs: TrainingLog[],
  weeks: PlanWeek[]
): { week: number; acwr: number; acute: number; chronic: number }[] {
  const km = weeklyKm(logs)
  return weeks.map((w, i) => {
    const acute = km[w.n] ?? 0
    const chronicWeeks = weeks.slice(Math.max(0, i - 3), i)
    const chronic = chronicWeeks.length > 0
      ? chronicWeeks.reduce((s, cw) => s + (km[cw.n] ?? 0), 0) / chronicWeeks.length
      : 0
    return { week: w.n, acwr: chronic > 0 ? Math.round((acute / chronic) * 100) / 100 : 0, acute, chronic }
  }).filter(d => d.acute > 0 || d.chronic > 0)
}

export function paceToSecs(pace: string): number {
  if (!pace) return 0
  const parts = pace.split(':').map(Number)
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

export function daysUntil(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - now.getTime()) / 86_400_000)
}

export function dayLabel(logDate: string): string {
  const d = new Date(logDate + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
}

export function hmsToSecs(str: string): number {
  const parts = str.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

export function paceMinsPerKm(timeSecs: number, distKm: number): string {
  if (!distKm || !timeSecs) return '—'
  const paceS = timeSecs / distKm
  const m = Math.floor(paceS / 60)
  const s = Math.round(paceS % 60)
  return `${m}:${s.toString().padStart(2, '0')}/km`
}

export function fmtRaceDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

export function fmtPaceForUnits(pacePerKm: string, units: 'km' | 'miles'): string {
  if (!pacePerKm) return ''
  if (units === 'km') return `${pacePerKm}/km`
  const [m, s] = pacePerKm.split(':').map(Number)
  if (isNaN(m) || isNaN(s)) return pacePerKm
  const secsPerMi = (m * 60 + s) * 1.60934
  const mm = Math.floor(secsPerMi / 60)
  const ss = Math.round(secsPerMi % 60)
  return `${mm}:${String(ss).padStart(2, '0')}/mi`
}

