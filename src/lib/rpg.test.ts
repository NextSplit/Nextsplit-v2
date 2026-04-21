import { describe, it, expect } from 'vitest'
import {
  getSessionXP,
  computeXPBonus,
  getLevelForXP,
  computeRunnerClass,
  getWarmingUpPhase,
  SESSION_XP,
} from '@/lib/rpg'
import type { ClassifyInput } from '@/lib/rpg'

// ─── XP ──────────────────────────────────────────────────────────────────────

describe('getSessionXP', () => {
  it('returns correct base XP per session type', () => {
    expect(getSessionXP('run-easy')).toBe(10)
    expect(getSessionXP('run-tempo')).toBe(20)
    expect(getSessionXP('run-int')).toBe(25)
    expect(getSessionXP('run-long')).toBe(40)
    expect(getSessionXP('run-race')).toBe(100)
    expect(getSessionXP('rest')).toBe(5)
  })

  it('returns 10 for unknown session codes', () => {
    expect(getSessionXP('unknown-type')).toBe(10)
    expect(getSessionXP('')).toBe(10)
  })

  it('all defined session types have positive XP', () => {
    Object.values(SESSION_XP).forEach(xp => {
      expect(xp).toBeGreaterThan(0)
    })
  })
})

describe('computeXPBonus', () => {
  const baseCtx = {
    sessionCode: 'run-int',
    loggedAt: new Date().toISOString(),
    streakDays: 5,
  }

  it('awards +15 when all interval reps completed', () => {
    const { bonus, reasons } = computeXPBonus({ ...baseCtx, allRepsCompleted: true })
    expect(bonus).toBeGreaterThanOrEqual(15)
    expect(reasons.some(r => r.includes('all reps'))).toBe(true)
  })

  it('awards +10 for interval effort 8-9/10', () => {
    const { bonus } = computeXPBonus({ ...baseCtx, effortRating: 8 })
    expect(bonus).toBeGreaterThanOrEqual(10)
  })

  it('awards +50 for race PB', () => {
    const { bonus, reasons } = computeXPBonus({
      sessionCode: 'run-race',
      loggedAt: new Date().toISOString(),
      streakDays: 1,
      isRacePB: true,
    })
    expect(bonus).toBeGreaterThanOrEqual(50)
    expect(reasons.some(r => r.includes('personal best'))).toBe(true)
  })

  it('awards +25 for race goal achieved (no PB)', () => {
    const { bonus } = computeXPBonus({
      sessionCode: 'run-race',
      loggedAt: new Date().toISOString(),
      streakDays: 1,
      isRacePB: false,
      raceGoalAchieved: true,
    })
    expect(bonus).toBeGreaterThanOrEqual(25)
  })

  it('awards +20 for long run personal distance record', () => {
    const { bonus } = computeXPBonus({
      sessionCode: 'run-long',
      loggedAt: new Date().toISOString(),
      streakDays: 1,
      isPersonalRecord: true,
    })
    expect(bonus).toBeGreaterThanOrEqual(20)
  })

  it('awards +5 for streak milestone days (7, 14, 30)', () => {
    for (const streakDays of [7, 14, 30]) {
      const { bonus, reasons } = computeXPBonus({ ...baseCtx, streakDays })
      expect(bonus).toBeGreaterThanOrEqual(5)
      expect(reasons.some(r => r.includes('streak'))).toBe(true)
    }
  })

  it('no bonus for non-milestone streak', () => {
    const { bonus } = computeXPBonus({ ...baseCtx, streakDays: 5 })
    // No reps/PB/streak bonus — should be 0
    expect(bonus).toBe(0)
  })

  it('awards +5 if logged within 2 hours', () => {
    const now = new Date()
    const twoHoursAgo = new Date(now.getTime() - 1.5 * 3600 * 1000).toISOString()
    const { bonus, reasons } = computeXPBonus({
      ...baseCtx,
      sessionStartedAt: twoHoursAgo,
    })
    expect(bonus).toBeGreaterThanOrEqual(5)
    expect(reasons.some(r => r.includes('logged fresh'))).toBe(true)
  })
})

describe('getLevelForXP', () => {
  it('level 1 at 0 XP', () => {
    expect(getLevelForXP(0).level).toBe(1)
  })

  it('level increases with XP', () => {
    const l1 = getLevelForXP(0).level
    const l2 = getLevelForXP(500).level
    const l3 = getLevelForXP(2000).level
    expect(l2).toBeGreaterThan(l1)
    expect(l3).toBeGreaterThan(l2)
  })

  it('caps at max level', () => {
    expect(getLevelForXP(999999).level).toBeLessThanOrEqual(15)
  })
})

// ─── Runner Class ─────────────────────────────────────────────────────────────

function mkClassInput(overrides: Partial<ClassifyInput> = {}): ClassifyInput {
  return {
    logs: [],
    sessionTypeMap: new Map(),
    firstSessionAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    planType: 'predetermined',
    ...overrides,
  }
}

function mkLog(weekN: number, dayI: number, sessI: number, km: number, loggedAt?: string) {
  return {
    done: true,
    km,
    pace: null,
    logged_at: loggedAt ?? new Date().toISOString(),
    session_i: sessI,
    week_n: weekN,
    day_i: dayI,
  }
}

describe('computeRunnerClass', () => {
  it('returns warming_up with insufficient data (< 6 sessions)', () => {
    const input = mkClassInput({
      logs: [mkLog(1, 0, 0, 10)],
    })
    expect(computeRunnerClass(input)).toBe('warming_up')
  })

  it('returns warming_up with < 3 weeks of data', () => {
    const logs = Array.from({ length: 8 }, (_, i) => mkLog(1, i, 0, 8))
    const sessionTypeMap = new Map(logs.map((_, i) => [`1_${i}_0`, 'run-easy']))
    const input = mkClassInput({ logs, sessionTypeMap })
    expect(computeRunnerClass(input)).toBe('warming_up')
  })

  it('assigns comeback_runner on Lifestyle path', () => {
    const logs = Array.from({ length: 8 }, (_, i) => mkLog(i < 4 ? 1 : i < 6 ? 2 : 3, 0, 0, 10))
    const sessionTypeMap = new Map(logs.map((l, i) => [`${l.week_n}_0_0`, 'run-easy']))
    const input = mkClassInput({ logs, sessionTypeMap, planType: 'lifestyle' })
    expect(computeRunnerClass(input)).toBe('comeback_runner')
  })

  it('assigns comeback_runner on 4+ week gap in history', () => {
    const now = Date.now()
    const logs = [
      mkLog(1, 0, 0, 10, new Date(now - 70 * 86400000).toISOString()),
      mkLog(1, 1, 0, 10, new Date(now - 69 * 86400000).toISOString()),
      mkLog(1, 2, 0, 10, new Date(now - 68 * 86400000).toISOString()),
      // 35-day gap
      mkLog(2, 0, 0, 10, new Date(now - 33 * 86400000).toISOString()),
      mkLog(2, 1, 0, 10, new Date(now - 32 * 86400000).toISOString()),
      mkLog(2, 2, 0, 10, new Date(now - 31 * 86400000).toISOString()),
      mkLog(3, 0, 0, 10, new Date(now - 10 * 86400000).toISOString()),
    ]
    const sessionTypeMap = new Map(logs.map(l => [`${l.week_n}_${l.day_i}_0`, 'run-easy']))
    const input = mkClassInput({ logs, sessionTypeMap })
    expect(computeRunnerClass(input)).toBe('comeback_runner')
  })

  it('assigns speed_merchant when 40%+ sessions are speed work', () => {
    const logs = [
      mkLog(1, 0, 0, 8),  // easy
      mkLog(1, 1, 0, 6),  // interval
      mkLog(1, 2, 0, 7),  // interval
      mkLog(2, 0, 0, 8),  // easy
      mkLog(2, 1, 0, 6),  // interval
      mkLog(2, 2, 0, 7),  // tempo
      mkLog(3, 0, 0, 8),  // easy
    ]
    const sessionTypeMap = new Map([
      ['1_0_0', 'run-easy'], ['1_1_0', 'run-int'], ['1_2_0', 'run-int'],
      ['2_0_0', 'run-easy'], ['2_1_0', 'run-int'], ['2_2_0', 'run-tempo'],
      ['3_0_0', 'run-easy'],
    ])
    const input = mkClassInput({ logs, sessionTypeMap })
    // 4/7 = 57% speed sessions — should be Speed Merchant
    expect(computeRunnerClass(input)).toBe('speed_merchant')
  })

  it('trail blazer requires 50%+ trail sessions (not 30%)', () => {
    // Only 30% trail — should NOT be trail blazer
    const logs = [
      mkLog(1, 0, 0, 10), mkLog(1, 1, 0, 8), mkLog(1, 2, 0, 10),
      mkLog(2, 0, 0, 12), mkLog(2, 1, 0, 8), mkLog(2, 2, 0, 10),
      mkLog(3, 0, 0, 10),
    ]
    const sessionTypeMap = new Map([
      ['1_0_0', 'run-trail'], ['1_1_0', 'run-easy'], ['1_2_0', 'run-easy'],
      ['2_0_0', 'run-easy'],  ['2_1_0', 'run-easy'], ['2_2_0', 'run-easy'],
      ['3_0_0', 'run-easy'],
    ])
    const input = mkClassInput({ logs, sessionTypeMap })
    expect(computeRunnerClass(input)).not.toBe('trail_blazer')
  })

  it('assigns base_builder for predominantly easy running', () => {
    const logs = Array.from({ length: 9 }, (_, i) =>
      mkLog(Math.floor(i / 3) + 1, i % 3, 0, 10)
    )
    const sessionTypeMap = new Map(logs.map(l => [`${l.week_n}_${l.day_i}_0`, 'run-easy']))
    const input = mkClassInput({ logs, sessionTypeMap })
    expect(computeRunnerClass(input)).toBe('base_builder')
  })
})

// ─── Warming Up Anticipation ──────────────────────────────────────────────────

describe('getWarmingUpPhase', () => {
  it('returns too-early with < 6 sessions', () => {
    expect(getWarmingUpPhase(3, 1, false)).toBe('too-early')
  })

  it('returns taking-shape with 6-11 sessions', () => {
    expect(getWarmingUpPhase(8, 2, false)).toBe('taking-shape')
  })

  it('returns almost-there at week 3', () => {
    expect(getWarmingUpPhase(10, 3, false)).toBe('almost-there')
  })

  it('returns almost-there with 12+ sessions', () => {
    expect(getWarmingUpPhase(12, 2, false)).toBe('almost-there')
  })

  it('returns ready when revealReady = true', () => {
    expect(getWarmingUpPhase(6, 4, true)).toBe('ready')
  })
})
