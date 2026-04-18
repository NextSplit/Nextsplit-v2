// ─── Personal Bests ───────────────────────────────────────────────────────────
// Derived from training_logs that have km + pace logged.
// We extract time from pace × km rather than storing a separate table.

export interface PersonalBest {
  distance: string
  distanceKm: number
  timeStr: string   // e.g. "22:14"
  pacePerKm: string // e.g. "4:26"
  weekN: number
  loggedAt: string
  isNew?: boolean
}

export const PB_DISTANCES = [
  { label: '5K',        km: 5 },
  { label: '10K',       km: 10 },
  { label: 'Half',      km: 21.0975 },
  { label: 'Marathon',  km: 42.195 },
]

// Tolerance: within ±10% of target distance counts
const TOLERANCE = 0.10

function paceToSecs(pace: string): number {
  if (!pace) return 0
  const parts = pace.split(':')
  if (parts.length !== 2) return 0
  return parseInt(parts[0]) * 60 + parseInt(parts[1])
}

function secsToHMS(totalSecs: number): string {
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = Math.round(totalSecs % 60)
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${m}:${String(s).padStart(2,'0')}`
}

export function computePersonalBests(
  logs: Array<{ km: number | null; pace: string | null; week_n: number; logged_at: string; done: boolean }>
): PersonalBest[] {
  const pbs: PersonalBest[] = []

  for (const dist of PB_DISTANCES) {
    // Find all logs that are roughly this distance
    const candidates = logs.filter(l =>
      l.done &&
      l.km != null &&
      l.pace != null &&
      Math.abs(l.km - dist.km) / dist.km <= TOLERANCE
    )

    if (candidates.length === 0) continue

    // Find fastest (lowest total time = pace × km)
    let bestLog: (typeof candidates)[0] | null = null
    let bestSecs = Infinity

    for (const log of candidates) {
      const paceSecs = paceToSecs(log.pace!)
      if (paceSecs <= 0) continue
      const totalSecs = paceSecs * log.km!
      if (totalSecs < bestSecs) {
        bestSecs = totalSecs
        bestLog = log
      }
    }

    if (!bestLog || bestSecs === Infinity) continue

    const paceSecs = paceToSecs(bestLog.pace!)
    const exactKm = bestLog.km!

    pbs.push({
      distance: dist.label,
      distanceKm: dist.km,
      timeStr: secsToHMS(paceSecs * exactKm),
      'pacePerKm': bestLog.pace!,
      weekN: bestLog.week_n,
      loggedAt: bestLog.logged_at,
    })
  }

  return pbs
}

/** Check if a new log is a PB for any distance category */
export function checkNewPB(
  newLog: { km: number | null; pace: string | null; week_n: number; logged_at: string; done: boolean },
  existingPBs: PersonalBest[]
): PersonalBest | null {
  if (!newLog.done || !newLog.km || !newLog.pace) return null
  const paceSecs = paceToSecs(newLog.pace)
  if (paceSecs <= 0) return null

  for (const dist of PB_DISTANCES) {
    if (Math.abs(newLog.km - dist.km) / dist.km > TOLERANCE) continue

    const newSecs = paceSecs * newLog.km
    const existing = existingPBs.find(pb => pb.distance === dist.label)

    // It's a PB if no existing record or faster than existing
    if (!existing) {
      return {
        distance: dist.label,
        distanceKm: dist.km,
        timeStr: secsToHMS(newSecs),
        'pacePerKm': newLog.pace,
        weekN: newLog.week_n,
        loggedAt: newLog.logged_at,
        isNew: true,
      }
    }

    // Compare against existing PB
    const existingSecs = paceToSecs(existing['pacePerKm']) * existing.distanceKm
    if (newSecs < existingSecs) {
      return {
        distance: dist.label,
        distanceKm: dist.km,
        timeStr: secsToHMS(newSecs),
        'pacePerKm': newLog.pace,
        weekN: newLog.week_n,
        loggedAt: newLog.logged_at,
        isNew: true,
      }
    }
  }

  return null
}
