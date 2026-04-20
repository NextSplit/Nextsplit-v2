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


// ── Race day simulation ───────────────────────────────────────────────────────

const RIEGEL_EXP = 1.06

/** Riegel race time prediction: project a time from one distance to another */
export function riegelProject(timeSecs: number, fromKm: number, toKm: number): number {
  return timeSecs * Math.pow(toKm / fromKm, RIEGEL_EXP)
}

export const RACE_DISTANCES: { label: string; km: number }[] = [
  { label: '5K',           km: 5      },
  { label: '10K',          km: 10     },
  { label: 'Half Marathon', km: 21.095 },
  { label: 'Marathon',     km: 42.195 },
]

interface RacePrediction {
  distance:    string
  km:          number
  pessimistic: string   // +5% on pace
  realistic:   string   // base projection
  optimistic:  string   // -5% on pace
  pacePerKm:   string
}

function secsToHMS(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.round(secs % 60)
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${m}:${String(s).padStart(2,'0')}`
}

/**
 * Compute race predictions from logged sessions.
 * Uses the best effort easy/tempo run pace over the last 8 weeks,
 * applies Riegel projection to all standard distances,
 * and adds ±5% band for optimistic/pessimistic.
 */
export function computeRacePredictions(
  logs: TrainingLog[],
  targetDistanceKm?: number
): { predictions: RacePrediction[]; basedOn: string | null; confidence: 'high' | 'medium' | 'low' } {
  // Find best recent pace from completed runs (last 8 weeks)
  const eightWeeksAgo = new Date(Date.now() - 56 * 24 * 3600 * 1000)
  const recentRuns = logs.filter(l =>
    l.done && l.km && l.km >= 3 && l.pace &&
    new Date(l.logged_at) >= eightWeeksAgo
  ).sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())

  if (recentRuns.length === 0) {
    return { predictions: [], basedOn: null, confidence: 'low' }
  }

  // Best pace = fastest pace from longest recent runs (weight towards longer efforts)
  // Use pace from runs ≥5km, or best available
  const qualifyingRuns = recentRuns.filter(l => (l.km ?? 0) >= 5)
  const sourceLogs     = qualifyingRuns.length >= 2 ? qualifyingRuns : recentRuns

  // Convert paces to secs/km, find best (fastest = lowest secs)
  const paced = sourceLogs
    .filter(l => l.pace)
    .map(l => {
      const parts = l.pace!.split(':').map(Number)
      const secsPerKm = parts[0] * 60 + (parts[1] ?? 0)
      return { secsPerKm, km: l.km!, logged_at: l.logged_at }
    })
    .filter(l => l.secsPerKm > 0 && l.secsPerKm < 600) // sanity: faster than 10min/km

  if (paced.length === 0) return { predictions: [], basedOn: null, confidence: 'low' }

  // Use median of best 3 paces (more robust than single best)
  const sorted    = [...paced].sort((a, b) => a.secsPerKm - b.secsPerKm)
  const top       = sorted.slice(0, Math.min(3, sorted.length))
  const medianSPK = top.reduce((a, b) => a + b.secsPerKm, 0) / top.length

  // Representative source distance for Riegel (avg of top runs)
  const avgKm     = top.reduce((a, b) => a + b.km, 0) / top.length
  const baseTimeSecs = medianSPK * avgKm

  const confidence: 'high' | 'medium' | 'low' =
    recentRuns.length >= 8 ? 'high' : recentRuns.length >= 4 ? 'medium' : 'low'

  const basedOn = new Date(paced[0].logged_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short'
  })

  const distances = targetDistanceKm
    ? RACE_DISTANCES.filter(d => d.km <= targetDistanceKm * 1.5)
    : RACE_DISTANCES

  const predictions: RacePrediction[] = distances.map(dist => {
    const projected   = riegelProject(baseTimeSecs, avgKm, dist.km)
    const pessimistic = projected * 1.05
    const optimistic  = projected * 0.95
    const pacePerKm   = projected / dist.km
    const paceStr     = `${Math.floor(pacePerKm / 60)}:${String(Math.round(pacePerKm % 60)).padStart(2,'0')}`

    return {
      distance:    dist.label,
      km:          dist.km,
      pessimistic: secsToHMS(pessimistic),
      realistic:   secsToHMS(projected),
      optimistic:  secsToHMS(optimistic),
      pacePerKm:   paceStr,
    }
  })

  return { predictions, basedOn, confidence }
}
