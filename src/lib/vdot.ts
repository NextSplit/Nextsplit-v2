/**
 * VDOT Pace Calculations — Phase C2
 *
 * Based on Jack Daniels' Running Formula.
 * Takes a recent race result, computes VDOT score,
 * then derives training paces for each zone.
 *
 * Used during plan activation to personalise session paces.
 */

// ─── VDOT lookup table (simplified, race time → VDOT) ────────────────────────

// [distance_km, time_secs, vdot]
const VDOT_TABLE: [number, number, number][] = [
  // 5K
  [5, 1200, 75], [5, 1260, 72], [5, 1320, 69], [5, 1380, 66],
  [5, 1440, 63], [5, 1500, 61], [5, 1560, 58], [5, 1620, 56],
  [5, 1680, 54], [5, 1740, 52], [5, 1800, 50], [5, 1860, 48],
  [5, 1920, 47], [5, 1980, 45], [5, 2040, 44], [5, 2100, 43],
  [5, 2160, 41], [5, 2220, 40], [5, 2280, 39], [5, 2400, 37],
  // 10K
  [10, 2400, 73], [10, 2520, 70], [10, 2640, 67], [10, 2760, 64],
  [10, 2880, 62], [10, 3000, 59], [10, 3120, 57], [10, 3240, 55],
  [10, 3360, 53], [10, 3480, 51], [10, 3600, 50], [10, 3720, 48],
  [10, 3840, 46], [10, 3960, 45], [10, 4080, 43], [10, 4200, 42],
  [10, 4320, 41], [10, 4440, 40], [10, 4800, 37],
  // Half marathon
  [21.1, 4800, 72], [21.1, 5100, 68], [21.1, 5400, 65], [21.1, 5700, 62],
  [21.1, 6000, 59], [21.1, 6300, 57], [21.1, 6600, 54], [21.1, 6900, 52],
  [21.1, 7200, 50], [21.1, 7500, 48], [21.1, 7800, 46], [21.1, 8100, 44],
  [21.1, 8400, 43], [21.1, 8700, 41], [21.1, 9000, 40],
  // Marathon
  [42.2, 9000, 72], [42.2, 9600, 69], [42.2, 10200, 66], [42.2, 10800, 63],
  [42.2, 11400, 60], [42.2, 12000, 58], [42.2, 12600, 55], [42.2, 13200, 53],
  [42.2, 13800, 51], [42.2, 14400, 49], [42.2, 15000, 47], [42.2, 15600, 45],
  [42.2, 16200, 44], [42.2, 16800, 42], [42.2, 17400, 41], [42.2, 18000, 40],
]

export interface TrainingPaces {
  easy:       string  // /km
  marathon:   string  // /km
  threshold:  string  // /km
  interval:   string  // /km (400m rep pace)
  repetition: string  // /km (200m rep pace)
  vdot:       number
}

function secsToMMSS(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.round(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function mmssToSecs(pace: string): number {
  const [m, s] = pace.split(':').map(Number)
  return m * 60 + s
}

/**
 * Given a race result, return VDOT score via lookup + interpolation.
 */
export function calcVdot(distanceKm: number, timeSecs: number): number {
  // Find the closest distance bracket in the table
  const closest = VDOT_TABLE
    .filter(([d]) => d === distanceKm)
    .sort((a, b) => Math.abs(a[1] - timeSecs) - Math.abs(b[1] - timeSecs))

  if (closest.length === 0) {
    // Fallback: estimate from pace
    const paceSecPerKm = timeSecs / distanceKm
    return Math.max(30, Math.min(80, Math.round(200 - paceSecPerKm * 0.25)))
  }

  // Interpolate between nearest two
  if (closest.length >= 2) {
    const [, t1, v1] = closest[0]
    const [, t2, v2] = closest[1]
    if (t1 !== t2) {
      const ratio = (timeSecs - t1) / (t2 - t1)
      return Math.round(v1 + ratio * (v2 - v1))
    }
  }

  return closest[0][2]
}

/**
 * Given VDOT, return training paces for each zone.
 * Based on Daniels' pace tables (simplified).
 */
export function vdotToPaces(vdot: number): TrainingPaces {
  // These are approximate pace multipliers relative to VO2max pace
  // VO2max pace (I-pace) ≈ 60-70s faster per km than marathon pace
  // All in seconds per km

  // Estimate race paces from VDOT
  // Empirically: VDOT ≈ 0.8 × (distance / time) × correction
  // Inverse: approx 5K time from VDOT
  const approx5kSecs = (300 / (vdot * 0.014)) * 60

  const intervalPaceSecPerKm  = approx5kSecs / 5          // 5K race pace
  const thresholdPaceSecPerKm = intervalPaceSecPerKm * 1.07 // ~7% slower
  const marathonPaceSecPerKm  = intervalPaceSecPerKm * 1.18 // ~18% slower
  const easyPaceSecPerKm      = intervalPaceSecPerKm * 1.35  // ~35% slower
  const repPaceSecPerKm       = intervalPaceSecPerKm * 0.93  // ~7% faster

  return {
    easy:       secsToMMSS(easyPaceSecPerKm),
    marathon:   secsToMMSS(marathonPaceSecPerKm),
    threshold:  secsToMMSS(thresholdPaceSecPerKm),
    interval:   secsToMMSS(intervalPaceSecPerKm),
    repetition: secsToMMSS(repPaceSecPerKm),
    vdot,
  }
}

/**
 * Convenience: given any recent race, compute full training paces.
 */
export function raceToPaces(distanceKm: number, timeSecs: number): TrainingPaces {
  const vdot = calcVdot(distanceKm, timeSecs)
  return vdotToPaces(vdot)
}

/**
 * Replace generic pace markers in session detail strings with
 * personalised paces from the athlete's VDOT.
 *
 * Example: "Easy run 5:50–6:15/km" → "Easy run 5:45–6:05/km"
 * (when athlete's easy pace from VDOT is 5:45/km)
 */
export function personaliseSessionPace(detail: string, paces: TrainingPaces): string {
  // Replace generic pace ranges with personalised values
  const easyRange = `${paces.easy}–${secsToMMSS(mmssToSecs(paces.easy) + 30)}/km`
  const tempoDisplay = `${paces.threshold}/km`
  const intDisplay   = `${paces.interval}/km`

  return detail
    .replace(/5:50[–-]6:(?:15|20|30)\/km/g, easyRange)
    .replace(/5:45[–-]6:(?:15|20|30)\/km/g, easyRange)
    .replace(/6:00[–-]6:(?:30|45)\/km/g, easyRange)
    .replace(/4:45[–-]5:(?:00|05|10)\/km/g, tempoDisplay)
    .replace(/4:30[–-]4:(?:45|50)\/km/g, tempoDisplay)
    .replace(/5K race pace/gi, `${intDisplay} (5K race pace)`)
}
