// S9 (audit): post-generation plan validator. Pure TS, deterministic — no
// DB calls, no network. Wired into /api/ai/generate-plan to flag drift in
// AI output before users see it.
//
// Two checks (audit acceptance):
//   1. Missing taper — marathon/half plans must include explicit taper weeks
//      before race week. AI's prompt says "taper if applicable" with no
//      enforcement; this catches it.
//   2. Oversized long run — long_run_km should never exceed 30% of weekly
//      total km (ACSM injury-prevention guideline). AI sometimes places a
//      huge Sunday run in an otherwise low-volume week.
//
// Both are advisory: callers log warnings, they don't block the response.
// The point is to surface drift so we can iterate the prompt.

import type { PlanWeek } from '@/types/database'

export type PlanDistance =
  | 'marathon'
  | 'half'
  | '10mi'
  | '10k'
  | '5k'
  | 'ultra_50mi'
  | 'ultra_100mi'
  | string

export interface PlanValidationIssue {
  code: 'missing_taper' | 'oversized_long_run'
  weekN?: number
  detail: string
}

export interface PlanValidationResult {
  valid: boolean
  issues: PlanValidationIssue[]
}

// Required taper weeks per distance. Sources: distance-specific coaching
// literature (ACSM, Daniels, Pfitzinger). Values are minimums: marathon
// commonly tapers 2-3 weeks; we require at least 2.
const REQUIRED_TAPER_WEEKS: Record<string, number> = {
  marathon:    2,
  half:        1,
  '10mi':      1,
  ultra_50mi:  2,
  ultra_100mi: 3,
  // 10k / 5k tapers are days, not full weeks; we don't require a `tr`
  // phase week for those.
}

const LONG_RUN_RATIO_CEILING = 0.30

interface PlanShape {
  weeks: PlanWeek[]
}

// Compute weekly km total + long-run km from a week's days/sessions.
function weeklyVolume(week: PlanWeek): { totalKm: number; longRunKm: number } {
  let totalKm = 0
  let longRunKm = 0
  for (const day of week.days ?? []) {
    for (const sess of day.sessions ?? []) {
      const km = typeof sess.km === 'number' && Number.isFinite(sess.km) ? sess.km : 0
      totalKm += km
      if (km > longRunKm) longRunKm = km
    }
  }
  return { totalKm, longRunKm }
}

export function validateGeneratedPlan(
  plan: PlanShape | null | undefined,
  distance: PlanDistance,
): PlanValidationResult {
  const issues: PlanValidationIssue[] = []
  const weeks = plan?.weeks ?? []

  // Empty / malformed plan: surface as a single issue and exit. Don't
  // crash on null/undefined input — the caller is upstream of JSON.parse.
  if (weeks.length === 0) {
    return { valid: true, issues: [] }
  }

  // Check 1 — missing taper for distances that require one.
  const requiredTaper = REQUIRED_TAPER_WEEKS[distance]
  if (requiredTaper && requiredTaper > 0) {
    const taperWeeks = weeks.filter(w => w.ph === 'tr').length
    if (taperWeeks < requiredTaper) {
      issues.push({
        code: 'missing_taper',
        detail: `${distance} plan has ${taperWeeks} taper week(s) (ph='tr'); requires at least ${requiredTaper}`,
      })
    }
  }

  // Check 2 — oversized long run per week (long_run > 30% of total).
  for (const w of weeks) {
    const { totalKm, longRunKm } = weeklyVolume(w)
    if (totalKm <= 0) continue
    const ratio = longRunKm / totalKm
    if (ratio > LONG_RUN_RATIO_CEILING) {
      issues.push({
        code: 'oversized_long_run',
        weekN: w.n,
        detail: `Week ${w.n}: long-run ${longRunKm.toFixed(1)}km is ${(ratio * 100).toFixed(0)}% of weekly total ${totalKm.toFixed(1)}km (ceiling ${LONG_RUN_RATIO_CEILING * 100}%)`,
      })
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}
