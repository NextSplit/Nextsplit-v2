/**
 * NextSplit Referral Programme
 * Growth Pillar spec: "Double-sided. Both parties win when the referee upgrades.
 * One free month each. No discounts — a full month free is more legible than 20% off."
 *
 * Mechanics:
 * - Every user gets a unique referral code (6-char alphanumeric)
 * - Share via native share API or copy link
 * - Referee signs up via /refer/[code] — code stored in localStorage
 * - On first payment, referrer gets +1 free month, referee gets first month free
 * - PostHog flag 'referral_programme' gates the UI (build now, release at retention gate)
 *
 * DB columns needed on profiles:
 *   referral_code TEXT UNIQUE
 *   referred_by TEXT (referrer's user_id)
 *   referral_reward_given_at TIMESTAMPTZ
 *   referral_count INT DEFAULT 0  (how many successful referrals)
 */

export interface ReferralCode {
  code:      string
  userId:    string
  shareUrl:  string
  shareText: string
}

/**
 * Generate a deterministic referral code from a user ID.
 * 6 chars, alphanumeric uppercase, no ambiguous chars (0/O, 1/I/L).
 */
export function generateReferralCode(userId: string): string {
  const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  // Use userId chars as seed — deterministic so same user always gets same code
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  }
  let code = ''
  let seed = hash
  for (let i = 0; i < 6; i++) {
    code += CHARS[seed % CHARS.length]
    seed = (seed * 1103515245 + 12345) >>> 0
  }
  return code
}

export function buildReferralUrl(code: string, baseUrl = 'https://nextsplit.app'): string {
  return `${baseUrl}/refer/${code}`
}

export function buildShareText(firstName: string | null): string {
  const name = firstName ?? 'a friend'
  return `${name} uses NextSplit to train for their races — it's the only training app that adapts when life gets in the way. Try it free: `
}

/**
 * Reward amounts — both get a full month free, not a discount.
 * A month free is more legible than "20% off" and feels more generous.
 */
export const REFERRAL_REWARD = {
  referrer: { months: 1, label: 'one free month' },
  referee:  { months: 1, label: 'first month free' },
}
