// F6.1 (audit) — unit tests for referral code generation + share helpers.
// Audit acceptance: ≥5 cases including ≥1 zero-input + ≥1 boundary.

import { describe, it, expect } from 'vitest'
import {
  generateReferralCode,
  buildReferralUrl,
  buildShareText,
  REFERRAL_REWARD,
} from './referral'

describe('generateReferralCode', () => {
  it('returns a 6-character code for a typical UUID', () => {
    const code = generateReferralCode('11111111-1111-1111-1111-111111111111')
    expect(code).toHaveLength(6)
  })

  it('uses only the safe alphabet (no 0/O/1/I/L ambiguous chars)', () => {
    const code = generateReferralCode('22222222-2222-2222-2222-222222222222')
    // Whitelist: ABCDEFGHJKMNPQRSTUVWXYZ23456789 (no 0, O, 1, I, L)
    expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/)
  })

  it('is deterministic — same userId always returns the same code (boundary: idempotency)', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000'
    const a = generateReferralCode(id)
    const b = generateReferralCode(id)
    expect(a).toBe(b)
  })

  it('produces different codes for different userIds (collision smoke)', () => {
    const a = generateReferralCode('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
    const b = generateReferralCode('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
    expect(a).not.toBe(b)
  })

  it('handles empty string userId without throwing (zero-input)', () => {
    // hash starts at 0; loop doesn't run; seed is 0 → code is 6 of CHARS[0] = 'AAAAAA'.
    const code = generateReferralCode('')
    expect(code).toHaveLength(6)
    expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/)
  })

  it('handles a single-character userId (boundary)', () => {
    const code = generateReferralCode('x')
    expect(code).toHaveLength(6)
  })
})

describe('buildReferralUrl', () => {
  it('builds the expected production URL', () => {
    expect(buildReferralUrl('ABC234')).toBe('https://nextsplit.app/refer/ABC234')
  })

  it('honours an override base URL (test/staging path)', () => {
    expect(buildReferralUrl('XYZ789', 'https://staging.nextsplit.app'))
      .toBe('https://staging.nextsplit.app/refer/XYZ789')
  })
})

describe('buildShareText', () => {
  it('uses the firstName when provided', () => {
    const txt = buildShareText('Sam')
    expect(txt).toContain('Sam')
    expect(txt).toContain('NextSplit')
  })

  it('falls back to "a friend" when firstName is null (zero-input)', () => {
    const txt = buildShareText(null)
    expect(txt).toContain('a friend')
    expect(txt).toContain('NextSplit')
  })
})

describe('REFERRAL_REWARD', () => {
  it('matches the growth-pillar spec — both parties get one free month', () => {
    // The reward shape is part of the public contract (lifecycle emails reference it).
    expect(REFERRAL_REWARD.referrer.months).toBe(1)
    expect(REFERRAL_REWARD.referee.months).toBe(1)
    expect(REFERRAL_REWARD.referrer.label).toMatch(/free month/i)
    expect(REFERRAL_REWARD.referee.label).toMatch(/first month/i)
  })
})
