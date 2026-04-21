import { describe, it, expect } from 'vitest'
import { calcACWR, paceToSecs, paceMinsPerKm } from '@/lib/statsUtils'
import type { TrainingLog, PlanWeek } from '@/types/database'

// Helper to build minimal training logs
function mkLog(week_n: number, km: number): TrainingLog {
  return {
    id: `log-${week_n}-${km}`,
    user_id: 'user-1',
    plan_id: 'plan-1',
    week_n,
    day_n: 0,
    day_i: 0,
    session_i: 0,
    done: true,
    km,
    pace: null,
    duration_secs: null,
    effort: null,
    hr: null,
    splits: null,
    strava_id: null,
    notes: null,
    logged_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as unknown as TrainingLog
}

function mkWeek(n: number): PlanWeek {
  return { n, days: [] } as unknown as PlanWeek
}

describe('calcACWR', () => {
  it('returns empty array for no logs', () => {
    const weeks = [mkWeek(1), mkWeek(2), mkWeek(3), mkWeek(4)]
    const result = calcACWR([], weeks)
    expect(result).toHaveLength(0)
  })

  it('returns 0 ACWR when no chronic load (week 1)', () => {
    const logs  = [mkLog(1, 30)]
    const weeks = [mkWeek(1), mkWeek(2)]
    const result = calcACWR(logs, weeks)
    expect(result[0].acwr).toBe(0)
    expect(result[0].acute).toBe(30)
  })

  it('calculates ACWR correctly — balanced load', () => {
    // 3 weeks at 40km each, then 40km = ACWR 1.0
    const logs  = [mkLog(1, 40), mkLog(2, 40), mkLog(3, 40), mkLog(4, 40)]
    const weeks = [mkWeek(1), mkWeek(2), mkWeek(3), mkWeek(4)]
    const result = calcACWR(logs, weeks)
    const week4  = result.find(r => r.week === 4)
    expect(week4?.acwr).toBe(1.0)
  })

  it('flags high ACWR when acute load spikes', () => {
    // 3 weeks at 20km, sudden 40km = ACWR 2.0
    const logs  = [mkLog(1, 20), mkLog(2, 20), mkLog(3, 20), mkLog(4, 40)]
    const weeks = [mkWeek(1), mkWeek(2), mkWeek(3), mkWeek(4)]
    const result = calcACWR(logs, weeks)
    const week4  = result.find(r => r.week === 4)
    expect(week4?.acwr).toBeGreaterThan(1.3)
    expect(week4?.acwr).toBe(2.0)
  })

  it('flags low ACWR when athlete detrains', () => {
    // 3 weeks at 40km, then 10km = ACWR 0.25
    const logs  = [mkLog(1, 40), mkLog(2, 40), mkLog(3, 40), mkLog(4, 10)]
    const weeks = [mkWeek(1), mkWeek(2), mkWeek(3), mkWeek(4)]
    const result = calcACWR(logs, weeks)
    const week4  = result.find(r => r.week === 4)
    expect(week4?.acwr).toBeLessThan(0.8)
  })

  it('handles multiple sessions in same week', () => {
    // Two logs in week 1 = 30km total
    const logs  = [mkLog(1, 20), mkLog(1, 10), mkLog(2, 30)]
    const weeks = [mkWeek(1), mkWeek(2)]
    const result = calcACWR(logs, weeks)
    const week1  = result.find(r => r.week === 1)
    expect(week1?.acute).toBe(30)
  })
})

describe('paceToSecs', () => {
  it('converts 5:30 to 330 seconds', () => {
    expect(paceToSecs('5:30')).toBe(330)
  })

  it('converts 4:00 to 240 seconds', () => {
    expect(paceToSecs('4:00')).toBe(240)
  })

  it('returns 0 for empty string', () => {
    expect(paceToSecs('')).toBe(0)
  })

  it('handles single digit seconds', () => {
    expect(paceToSecs('6:05')).toBe(365)
  })
})

describe('paceMinsPerKm', () => {
  it('calculates pace correctly — 30 min for 6km = 5:00/km', () => {
    expect(paceMinsPerKm(1800, 6)).toBe('5:00/km')
  })

  it('returns — for zero distance', () => {
    expect(paceMinsPerKm(1800, 0)).toBe('—')
  })

  it('returns — for zero time', () => {
    expect(paceMinsPerKm(0, 6)).toBe('—')
  })
})
