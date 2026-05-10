// OQ#2 = C (founder vote 2026-05-10) — Coach-Pro feature split.
//
// Pro (£29/mo, coach_profiles.is_coach_pro = true):
//   · Marketplace listing — coach profile shows in /coaches discovery
//   · Plan sales — can publish plans with price_gbp > 0
//   · AI digest — manual fetchDigest button on /coach/athlete/[id]
//   · Bulk broadcast — message all athletes at once via /api/coach/broadcast
//   · Scheduled messages — queue future-dated messages
//   · Monday digest — automatic weekly summary via cron
//
// Free Split Leader (default for any coach):
//   · 1-on-1 messaging with athletes (no broadcast)
//   · Plan assignment (assign existing templates to athletes; no marketplace listing)
//   · Basic dashboard (athlete roster, status colours, individual annotations)
//
// Single source of truth — shared between server enforcement and client
// upgrade-prompt UI so the gates can never drift. When the founder revisits
// the split (e.g. moving AI digest to free), only this file changes.

export type CoachFeatureKey =
  | 'marketplace_listing'
  | 'plan_sales'
  | 'ai_digest'
  | 'bulk_broadcast'
  | 'scheduled_messages'
  | 'monday_digest'

const COACH_PRO_FEATURES: ReadonlySet<CoachFeatureKey> = new Set([
  'marketplace_listing',
  'plan_sales',
  'ai_digest',
  'bulk_broadcast',
  'scheduled_messages',
  'monday_digest',
])

/**
 * Is this Coach-Pro-only?
 *
 * `enforced` mirrors the existing PREMIUM_ENFORCED pattern — when false,
 * every coach gets every feature (dev-mode). Server callers read
 * `serverConfig.premiumEnforced`; client callers fetch via
 * /api/subscription/dev-mode like the athlete-side ProGate.
 */
export function isCoachProFeature(feature: CoachFeatureKey): boolean {
  return COACH_PRO_FEATURES.has(feature)
}

export function canCoachAccess(
  feature: CoachFeatureKey,
  isCoachPro: boolean,
  enforced: boolean,
): boolean {
  if (!enforced) return true
  if (!isCoachProFeature(feature)) return true
  return isCoachPro
}

// Display copy for upgrade prompts. Keep in lockstep with FEATURE_DESCRIPTIONS
// in src/components/coach/CoachProUpgradePrompt.tsx so client surfaces stay
// coherent.
export const COACH_FEATURE_LABELS: Record<CoachFeatureKey, string> = {
  marketplace_listing: 'Marketplace listing',
  plan_sales:          'Sell plans',
  ai_digest:           'AI athlete digest',
  bulk_broadcast:      'Bulk broadcast',
  scheduled_messages:  'Scheduled messages',
  monday_digest:       'Monday digest',
}
