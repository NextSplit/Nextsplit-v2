/**
 * Personalised pace zones derived from the user's actual training data.
 *
 * Approach: derive a "reference 5K pace" from logged runs using the Riegel
 * formula (same as predictRaceTime), then calculate zones from that.
 *
 * Zone structure based on Jack Daniels' VDOT system:
 *   Easy:      reference + 60–90s/km  (conversational, recovery)
 *   Long:      reference + 60–90s/km  (same as easy)
 *   Marathon:  reference + 30–45s/km  (comfortably hard)
 *   Threshold: reference + 10–20s/km  (lactate threshold, 1hr race pace)
 *   Interval:  reference pace          (5K race effort)
 */

export interface PaceZones {
  easy:      { min: string; max: string }  // e.g. 5:45–6:10/km
  long:      { min: string; max: string }
  marathon:  { min: string; max: string }
  threshold: { min: string; max: string }
  interval:  { min: string; max: string }
  derivedFrom: string   // e.g. "your recent 10km pace"
  confidence: 'high' | 'medium' | 'low'
}

function secsToMMSS(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.round(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function paceStr(secsPerKm: number): string {
  return secsToMMSS(secsPerKm) + '/km'
}

/** Riegel projection: t2 = t1 × (d2/d1)^1.06 */
function riegelProject(timeSecsAtDist: number, fromKm: number, toKm: number): number {
  return timeSecsAtDist * Math.pow(toKm / fromKm, 1.06)
}

export interface LogEntry {
  done: boolean
  km: number | null
  pace: string | null  // "M:SS" format
}

function paceToSecs(pace: string | null): number {
  if (!pace) return 0
  const parts = pace.split(':').map(Number)
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

/**
 * Derive personalised pace zones from a user's training logs.
 * Returns null if insufficient data (<3 runs with pace data).
 */
export function derivePaceZones(logs: LogEntry[]): PaceZones | null {
  // Collect runs with valid pace + distance data
  const runs = logs
    .filter(l => l.done && l.km && l.km >= 3 && l.pace && paceToSecs(l.pace) > 0)
    .map(l => ({
      km: l.km!,
      paceSecs: paceToSecs(l.pace!),
      timeSecs: paceToSecs(l.pace!) * l.km!,
    }))
    .sort((a, b) => b.km - a.km)  // longest runs first

  if (runs.length < 3) return null

  // Find the best (fastest) pace effort per distance band
  // Use longest run with good effort as the reference
  const bands = [
    { label: 'marathon', km: 42.195 },
    { label: 'half marathon', km: 21.1 },
    { label: '10km', km: 10 },
    { label: '5km', km: 5 },
  ]

  let refPace5KSecs: number | null = null
  let derivedFrom = 'your recent runs'
  let confidence: PaceZones['confidence'] = 'low'

  // Try to find a run close to each distance band and project to 5K
  for (const band of bands) {
    const bandRuns = runs.filter(r => r.km >= band.km * 0.8 && r.km <= band.km * 1.3)
    if (bandRuns.length === 0) continue

    // Take the fastest pace run in this band
    const best = bandRuns.reduce((a, b) => a.paceSecs < b.paceSecs ? a : b)

    // Project to 5K pace using Riegel
    const projected5KTime = riegelProject(best.timeSecs, best.km, 5)
    const projected5KPace = projected5KTime / 5

    refPace5KSecs = projected5KPace
    derivedFrom = `your recent ${band.label} pace`
    confidence = band.km >= 10 ? 'high' : band.km >= 5 ? 'medium' : 'low'
    break
  }

  // Fallback: use average of best short runs
  if (!refPace5KSecs) {
    const shortRuns = runs.filter(r => r.km >= 3 && r.km <= 8)
    if (shortRuns.length === 0) return null
    const avg = shortRuns.reduce((a, b) => a + b.paceSecs, 0) / shortRuns.length
    refPace5KSecs = avg
    derivedFrom = 'your recent easy runs'
    confidence = 'low'
  }

  // Calculate zones from 5K reference pace
  const ref = refPace5KSecs  // secs/km at 5K effort

  return {
    easy: {
      min: paceStr(Math.round(ref + 75)),
      max: paceStr(Math.round(ref + 100)),
    },
    long: {
      min: paceStr(Math.round(ref + 80)),
      max: paceStr(Math.round(ref + 110)),
    },
    marathon: {
      min: paceStr(Math.round(ref + 35)),
      max: paceStr(Math.round(ref + 50)),
    },
    threshold: {
      min: paceStr(Math.round(ref + 8)),
      max: paceStr(Math.round(ref + 18)),
    },
    interval: {
      min: paceStr(Math.round(ref - 5)),
      max: paceStr(Math.round(ref + 5)),
    },
    derivedFrom,
    confidence,
  }
}

/**
 * Get the personalised pace for a specific session type.
 * Returns null if no zones available (falls back to plan paces).
 */
export function getPersonalisedPace(
  sessionCode: string | null | undefined,
  zones: PaceZones | null
): string | null {
  if (!zones || !sessionCode) return null

  if (sessionCode === 'run-easy') return `${zones.easy.min}–${zones.easy.max}`
  if (sessionCode === 'run-long') return `${zones.long.min}–${zones.long.max}`
  if (sessionCode === 'run-mp')   return `${zones.marathon.min}–${zones.marathon.max}`
  if (sessionCode === 'run-tempo') return `${zones.threshold.min}–${zones.threshold.max}`
  if (sessionCode === 'run-int')  return `${zones.interval.min}–${zones.interval.max}`

  return null
}
