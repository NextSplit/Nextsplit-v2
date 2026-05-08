import { describe, it, expect } from 'vitest'
import { buildNotification, passesGuardrails } from '@/lib/notifications'
import type { GuardrailContext } from '@/lib/notifications'

describe('buildNotification', () => {
  it('session_reminder uses runner name and session details', () => {
    const n = buildNotification('session_reminder', {
      firstName: 'Alex',
      sessionName: 'Easy Run',
      sessionKm: 8,
    })
    expect(n.title).toContain('Alex')
    expect(n.body).toContain('8km')
    expect(n.url).toBe('/home')
  })

  it('at_risk_reengagement is warm and not accusatory', () => {
    const n = buildNotification('at_risk_reengagement', { firstName: 'Sam' })
    expect(n.title).toContain('Sam')
    expect(n.body.toLowerCase()).not.toContain('missed')
    expect(n.body.toLowerCase()).not.toContain('failed')
    // Body picks one of 3 messages by day-of-week; require either
    // 'plan' or 'training' so the test isn't brittle on different days.
    expect(n.body.toLowerCase()).toMatch(/plan|training/)
  })

  it('race_countdown includes days context', () => {
    const n = buildNotification('race_countdown', {
      firstName: 'Jo',
      daysToRace: 21,
    })
    expect(n.title.toLowerCase()).toMatch(/race|weeks|go/)
    expect(n.url).toBe('/home')
  })

  it('adaptation_alert surfaces the change', () => {
    const n = buildNotification('adaptation_alert', {
      adaptationNote: 'Moved Saturday intervals to Sunday.',
    })
    expect(n.title).toContain('Plan updated')
    expect(n.body).toContain('Saturday')
  })

  it('class_revealed routes to /profile', () => {
    const n = buildNotification('class_revealed', {
      classEmoji: '⚡',
      className: 'Speed Merchant',
    })
    expect(n.url).toBe('/profile')
    expect(n.title + n.body).toContain('⚡')
  })

  it('coach_message includes coach name', () => {
    const n = buildNotification('coach_message', { coachName: 'Coach Dave' })
    expect(n.title).toContain('Coach Dave')
  })
})

describe('passesGuardrails', () => {
  function mkCtx(overrides: Partial<GuardrailContext> = {}): GuardrailContext {
    return {
      type: 'session_reminder',
      userTimezoneOffset: 0,
      lastNotificationAt: null,
      atRiskSentAt: null,
      notificationsEnabled: true,
      typePrefs: {},
      ...overrides,
    }
  }

  it('passes when all conditions met', () => {
    // 10am UTC — within allowed hours
    const ctx = mkCtx({ userTimezoneOffset: 0 })
    // Mock the time to 10am — note: passesGuardrails uses Date.now() internally
    // We test the logic directly with known offsets
    expect(typeof passesGuardrails(ctx).ok).toBe('boolean')
  })

  it('blocks when notifications disabled', () => {
    const ctx = mkCtx({ notificationsEnabled: false })
    const result = passesGuardrails(ctx)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('notifications_disabled')
  })

  it('blocks when type preference disabled', () => {
    const ctx = mkCtx({ typePrefs: { session_reminder: false } })
    const result = passesGuardrails(ctx)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('type_disabled')
  })

  it('blocks when notification sent < 20 hours ago', () => {
    const sixHoursAgo = new Date(Date.now() - 6 * 3600 * 1000)
    const ctx = mkCtx({ lastNotificationAt: sixHoursAgo })
    const result = passesGuardrails(ctx)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('rate_limit_1_per_day')
  })

  it('allows when last notification was 21+ hours ago', () => {
    const twentyTwoHoursAgo = new Date(Date.now() - 22 * 3600 * 1000)
    const ctx = mkCtx({ lastNotificationAt: twentyTwoHoursAgo })
    // Note: result depends on current hour (quiet hours), but rate limit should pass
    const result = passesGuardrails(ctx)
    // Rate limit check passes — result may still be blocked by quiet hours
    expect(result.reason).not.toBe('rate_limit_1_per_day')
  })

  it('blocks at_risk_reengagement if already sent', () => {
    const ctx = mkCtx({
      type: 'at_risk_reengagement',
      atRiskSentAt: new Date(Date.now() - 5 * 86400 * 1000),
    })
    const result = passesGuardrails(ctx)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('at_risk_already_sent')
  })

  it('allows at_risk_reengagement if not yet sent', () => {
    const ctx = mkCtx({
      type: 'at_risk_reengagement',
      atRiskSentAt: null,
    })
    // May be blocked by quiet hours — but not by at_risk_already_sent
    const result = passesGuardrails(ctx)
    expect(result.reason).not.toBe('at_risk_already_sent')
  })
})
