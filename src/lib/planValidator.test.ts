import { describe, it, expect } from 'vitest'
import { validateGeneratedPlan } from './planValidator'
import type { PlanWeek } from '@/types/database'

// Helper — build a minimal week with one or more sessions.
function week(n: number, ph: string, sessionsPerDay: Array<Array<number>>): PlanWeek {
  const days = sessionsPerDay.map((kms, i) => ({
    d: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i] ?? 'Mon',
    dt: `2026-05-${String(i + 1).padStart(2, '0')}`,
    sleep: null,
    times: [],
    sessions: kms.map(km => ({ c: 'easy', n: 'Easy run', det: '', km })),
    nut: [],
  }))
  return {
    n,
    ph,
    s: '',
    e: '',
    title: `Week ${n}`,
    b: 'd',
    kl: [0, 0],
    note: '',
    days,
  }
}

describe('validateGeneratedPlan', () => {
  describe('zero-input + boundary', () => {
    it('returns valid for null plan (audit zero-input)', () => {
      const r = validateGeneratedPlan(null, 'marathon')
      expect(r.valid).toBe(true)
      expect(r.issues).toEqual([])
    })

    it('returns valid for undefined plan', () => {
      const r = validateGeneratedPlan(undefined, 'marathon')
      expect(r.valid).toBe(true)
      expect(r.issues).toEqual([])
    })

    it('returns valid for empty weeks array', () => {
      const r = validateGeneratedPlan({ weeks: [] }, 'marathon')
      expect(r.valid).toBe(true)
    })

    it('skips long-run check for weeks with zero total km (boundary)', () => {
      // Days exist but no sessions → total = 0 → divide-by-zero guard hit.
      const w = week(1, 'p1', [[], [], [], [], [], [], []])
      const r = validateGeneratedPlan({ weeks: [w] }, '5k')
      expect(r.issues.find(i => i.code === 'oversized_long_run')).toBeUndefined()
    })
  })

  describe('missing taper', () => {
    it('flags marathon plan without taper week', () => {
      const weeks: PlanWeek[] = Array.from({ length: 16 }, (_, i) => week(i + 1, 'p1', [[5]]))
      const r = validateGeneratedPlan({ weeks }, 'marathon')
      expect(r.valid).toBe(false)
      expect(r.issues.some(i => i.code === 'missing_taper')).toBe(true)
    })

    it('passes marathon plan with 2 taper weeks', () => {
      const weeks: PlanWeek[] = [
        ...Array.from({ length: 14 }, (_, i) => week(i + 1, 'p1', [[5]])),
        week(15, 'tr', [[3]]),
        week(16, 'tr', [[2]]),
      ]
      const r = validateGeneratedPlan({ weeks }, 'marathon')
      expect(r.issues.some(i => i.code === 'missing_taper')).toBe(false)
    })

    it('does not require taper for 5k plans (distance-specific exemption)', () => {
      const weeks: PlanWeek[] = Array.from({ length: 9 }, (_, i) => week(i + 1, 'p1', [[3]]))
      const r = validateGeneratedPlan({ weeks }, '5k')
      expect(r.issues.some(i => i.code === 'missing_taper')).toBe(false)
    })

    it('flags half marathon plan without taper', () => {
      const weeks: PlanWeek[] = Array.from({ length: 12 }, (_, i) => week(i + 1, 'p1', [[5]]))
      const r = validateGeneratedPlan({ weeks }, 'half')
      expect(r.issues.some(i => i.code === 'missing_taper')).toBe(true)
    })
  })

  describe('oversized long run', () => {
    it('flags week where long-run > 30% of total', () => {
      // total = 5+5+5+5+5+5+25 = 55; long_run = 25; ratio = 45%
      const w = week(8, 'p2', [[5], [5], [5], [5], [5], [5], [25]])
      const r = validateGeneratedPlan({ weeks: [w] }, 'marathon')
      const issue = r.issues.find(i => i.code === 'oversized_long_run')
      expect(issue).toBeDefined()
      expect(issue?.weekN).toBe(8)
    })

    it('passes week where long-run = 30% of total exactly (boundary)', () => {
      // total = 5+5+5+5+5+5+10 = 40; long_run = 10; ratio = 25%
      const w = week(8, 'p2', [[5], [5], [5], [5], [5], [5], [10]])
      const r = validateGeneratedPlan({ weeks: [w] }, 'marathon')
      expect(r.issues.find(i => i.code === 'oversized_long_run')).toBeUndefined()
    })

    it('flags multiple weeks independently with weekN tagged', () => {
      // w1 — 6 days of 5km easy + 1 long of 10km = 40km total, 25% long-run ratio (ok)
      const w1 = week(3, 'p1', [[5], [5], [5], [5], [5], [5], [10]])
      // w2 — same easy days but a 25km long-run = 55km total, 45% ratio (flag)
      const w2 = week(4, 'p1', [[5], [5], [5], [5], [5], [5], [25]])
      const r = validateGeneratedPlan({ weeks: [w1, w2] }, 'marathon')
      const flags = r.issues.filter(i => i.code === 'oversized_long_run')
      expect(flags).toHaveLength(1)
      expect(flags[0].weekN).toBe(4)
    })
  })

  describe('combined', () => {
    it('reports both kinds of issue at once', () => {
      const w1 = week(1, 'p1', [[5], [5], [5], [5], [5], [5], [25]])  // oversized
      const w2 = week(2, 'p1', [[5]])  // ok size, but no taper for marathon
      const r = validateGeneratedPlan({ weeks: [w1, w2] }, 'marathon')
      expect(r.valid).toBe(false)
      expect(r.issues.some(i => i.code === 'oversized_long_run')).toBe(true)
      expect(r.issues.some(i => i.code === 'missing_taper')).toBe(true)
    })

    it('returns valid:true when no issues found', () => {
      // 6 easy days @5km + 10km long = 40km, ratio 25% (ok).
      const w1 = week(1, 'p1', [[5], [5], [5], [5], [5], [5], [10]])
      // Taper week with multiple sessions so the long-run ratio also passes.
      // 4 easy days @3km + 1 long @5km = 17km, ratio 29% (just under ceiling).
      const w2 = week(2, 'tr', [[3], [3], [3], [3], [], [], [5]])
      const r = validateGeneratedPlan({ weeks: [w1, w2] }, 'half')
      expect(r.valid).toBe(true)
      expect(r.issues).toEqual([])
    })
  })
})
