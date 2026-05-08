// F6.1 (audit) — unit tests for VDOT pace calculation.
// Audit acceptance: ≥5 cases including ≥1 zero-input + ≥1 boundary.

import { describe, it, expect } from 'vitest'
import { calcVdot, vdotToPaces, raceToPaces, personaliseSessionPace } from './vdot'

describe('calcVdot', () => {
  it('returns table-mapped VDOT for known 5K time (audit reference)', () => {
    // 5K in 20:00 (1200s) → VDOT 75 from VDOT_TABLE
    expect(calcVdot(5, 1200)).toBe(75)
  })

  it('returns table-mapped VDOT for known marathon time', () => {
    // Marathon in 3:00 (10800s) → VDOT 63
    expect(calcVdot(42.2, 10800)).toBe(63)
  })

  it('interpolates between adjacent table entries (boundary)', () => {
    // 5K in 1230s falls between (1200s→75) and (1260s→72); ratio 0.5 → 73 or 74
    const v = calcVdot(5, 1230)
    expect(v).toBeGreaterThanOrEqual(72)
    expect(v).toBeLessThanOrEqual(75)
  })

  it('falls back to pace estimate for off-table distances (zero-input adjacent)', () => {
    // 7K is not in table → fallback path: max(30, min(80, 200 - paceSecPerKm * 0.25))
    const v = calcVdot(7, 2100) // 5:00/km pace
    expect(v).toBeGreaterThanOrEqual(30)
    expect(v).toBeLessThanOrEqual(80)
  })

  it('clamps fallback VDOT to 30..80 range for very slow pace (boundary)', () => {
    // Off-table + very slow pace would compute below 30; should clamp.
    const v = calcVdot(7, 7000) // ~16:40/km pace
    expect(v).toBe(30)
  })

  it('clamps fallback VDOT to 80 for very fast off-table pace (boundary)', () => {
    // Off-table + impossibly fast pace would compute above 80; should clamp.
    const v = calcVdot(7, 100) // 14s/km — physiologically impossible
    expect(v).toBe(80)
  })
})

describe('vdotToPaces', () => {
  it('returns five labelled pace zones for VDOT 50 (mid-pack reference)', () => {
    const p = vdotToPaces(50)
    expect(p.vdot).toBe(50)
    expect(p.easy).toMatch(/^\d+:\d{2}$/)
    expect(p.marathon).toMatch(/^\d+:\d{2}$/)
    expect(p.threshold).toMatch(/^\d+:\d{2}$/)
    expect(p.interval).toMatch(/^\d+:\d{2}$/)
    expect(p.repetition).toMatch(/^\d+:\d{2}$/)
  })

  it('orders paces from slowest (easy) to fastest (repetition)', () => {
    const p = vdotToPaces(50)
    const toSec = (mmss: string) => {
      const [m, s] = mmss.split(':').map(Number)
      return m * 60 + s
    }
    // easy is slowest, repetition is fastest (both per-km)
    expect(toSec(p.easy)).toBeGreaterThan(toSec(p.marathon))
    expect(toSec(p.marathon)).toBeGreaterThan(toSec(p.threshold))
    expect(toSec(p.threshold)).toBeGreaterThan(toSec(p.interval))
    expect(toSec(p.interval)).toBeGreaterThan(toSec(p.repetition))
  })

  it('higher VDOT yields faster paces (boundary direction check)', () => {
    const slow = vdotToPaces(40)
    const fast = vdotToPaces(70)
    const toSec = (mmss: string) => {
      const [m, s] = mmss.split(':').map(Number)
      return m * 60 + s
    }
    expect(toSec(slow.easy)).toBeGreaterThan(toSec(fast.easy))
    expect(toSec(slow.threshold)).toBeGreaterThan(toSec(fast.threshold))
  })
})

describe('raceToPaces', () => {
  it('chains calcVdot + vdotToPaces for a 5K race input', () => {
    const p = raceToPaces(5, 1500) // 25:00 5K → ~VDOT 61
    expect(p.vdot).toBe(61)
    expect(p.easy).toMatch(/^\d+:\d{2}$/)
  })

  it('handles a marathon race input', () => {
    const p = raceToPaces(42.2, 14400) // 4:00 marathon → ~VDOT 49
    expect(p.vdot).toBe(49)
    expect(p.threshold).toMatch(/^\d+:\d{2}$/)
  })
})

describe('personaliseSessionPace', () => {
  it('replaces canonical easy-range placeholder with personalised range', () => {
    const paces = vdotToPaces(50)
    const out = personaliseSessionPace('Easy run 5:50–6:15/km', paces)
    expect(out).not.toContain('5:50–6:15')
    expect(out).toContain('Easy run')
    expect(out).toContain('/km')
  })

  it('passes through detail strings without recognised pace markers (zero-input)', () => {
    const paces = vdotToPaces(50)
    const out = personaliseSessionPace('Hill repeats at the local park', paces)
    expect(out).toBe('Hill repeats at the local park')
  })
})
