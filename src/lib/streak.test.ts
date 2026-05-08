// F6.1 (audit) — unit tests for streak + consistency.
// Audit acceptance: ≥5 cases including ≥1 zero-input + ≥1 boundary.

import { describe, it, expect } from 'vitest'
import { computeStreak, computeConsistency } from './streak'

// Helper — yyyy-mm-dd for `n` days ago.
function daysAgo(n: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

describe('computeStreak', () => {
  it('returns zeros for empty logs (zero-input)', () => {
    const s = computeStreak([])
    expect(s.current).toBe(0)
    expect(s.longest).toBe(0)
    expect(s.totalDaysLogged).toBe(0)
  })

  it('skips logs where done=false (zero-input adjacent)', () => {
    const logs = [
      { logged_at: daysAgo(0), done: false },
      { logged_at: daysAgo(1), done: false },
    ]
    const s = computeStreak(logs)
    expect(s.current).toBe(0)
    expect(s.longest).toBe(0)
    expect(s.totalDaysLogged).toBe(0)
  })

  it('counts a single log today as a one-day current streak', () => {
    const s = computeStreak([{ logged_at: daysAgo(0), done: true }])
    expect(s.current).toBe(1)
    expect(s.longest).toBe(1)
    expect(s.totalDaysLogged).toBe(1)
  })

  it('extends current streak from yesterday if today not yet logged (boundary)', () => {
    const s = computeStreak([
      { logged_at: daysAgo(1), done: true },
      { logged_at: daysAgo(2), done: true },
      { logged_at: daysAgo(3), done: true },
    ])
    expect(s.current).toBe(3)
    expect(s.longest).toBe(3)
  })

  it('breaks streak on a gap day', () => {
    const s = computeStreak([
      { logged_at: daysAgo(0), done: true },
      { logged_at: daysAgo(2), done: true },  // gap on day -1
      { logged_at: daysAgo(3), done: true },
    ])
    expect(s.current).toBe(1)        // only today
    expect(s.longest).toBe(2)        // the older 2-day run
    expect(s.totalDaysLogged).toBe(3)
  })

  it('deduplicates multiple logs on the same day', () => {
    const today = daysAgo(0)
    const s = computeStreak([
      { logged_at: today, done: true },
      { logged_at: today, done: true },
      { logged_at: today, done: true },
    ])
    expect(s.current).toBe(1)
    expect(s.totalDaysLogged).toBe(1)
  })
})

describe('computeConsistency', () => {
  // Helper — synthetic plan week with n sessions
  function planWeek(weekN: number, sessionsPerDay: number[]) {
    return {
      n: weekN,
      days: sessionsPerDay.map(count => ({
        sessions: Array.from({ length: count }, () => ({})),
      })),
    }
  }

  it('returns 0% when there is no current week in the plan (zero-input)', () => {
    const r = computeConsistency([], [], 1)
    expect(r.thisWeekPct).toBe(0)
    expect(r.last4WeekPct).toBe(0)
  })

  it('returns 0% when current week has zero planned sessions (boundary, divide-by-zero guard)', () => {
    const weeks = [planWeek(1, [0, 0, 0, 0, 0, 0, 0])]
    const r = computeConsistency([], weeks, 1)
    expect(r.thisWeekPct).toBe(0)
    expect(r.last4WeekPct).toBe(0)
  })

  it('returns 100% when every planned session is logged this week', () => {
    const weeks = [planWeek(1, [1, 0, 1, 0, 1, 0, 1])] // 4 sessions
    const logs = [
      { week_n: 1, done: true },
      { week_n: 1, done: true },
      { week_n: 1, done: true },
      { week_n: 1, done: true },
    ]
    const r = computeConsistency(logs, weeks, 1)
    expect(r.thisWeekPct).toBe(100)
  })

  it('returns 50% when half are done', () => {
    const weeks = [planWeek(1, [1, 0, 1, 0, 1, 0, 1])] // 4 sessions
    const logs = [
      { week_n: 1, done: true },
      { week_n: 1, done: true },
    ]
    const r = computeConsistency(logs, weeks, 1)
    expect(r.thisWeekPct).toBe(50)
  })

  it('aggregates last 4 weeks for last4WeekPct', () => {
    const weeks = [
      planWeek(1, [1]), planWeek(2, [1]), planWeek(3, [1]), planWeek(4, [1]),
    ] // 4 planned across 4 weeks
    const logs = [
      { week_n: 1, done: true },
      { week_n: 4, done: true },
    ]
    const r = computeConsistency(logs, weeks, 4)
    expect(r.last4WeekPct).toBe(50) // 2 of 4
  })
})
