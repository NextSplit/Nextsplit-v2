/**
 * NextSplit — Feature Flag & Subscription Framework
 *
 * This file is the single source of truth for:
 *  - Which features exist
 *  - Which tier each feature requires
 *  - Whether premium is enforced (dev vs prod)
 *
 * TO ENABLE MONETISATION:
 *  1. Set NEXT_PUBLIC_PREMIUM_ENFORCED=true in Vercel env vars
 *  2. Wire up Stripe in /api/stripe/* (scaffold exists in Phase 11)
 *  3. That's it — all gates activate automatically
 *
 * TIERS:
 *  free    — default, no payment required
 *  pro     — paid subscription (£4.99/mo or equivalent)
 *  coach   — future coach/team tier
 */

import { config } from '@/lib/config'

export type Tier = 'free' | 'pro' | 'coach'

export type FeatureKey =
  // AI features
  | 'ai_pre_race_brief'
  | 'ai_adaptive_suggestions'
  | 'ai_coaching_card'
  | 'ai_post_session_feedback'
  | 'ai_bespoke_plan'
  // Plan features
  | 'multiple_active_plans'
  | 'plan_history_full'
  | 'plan_history_preview'   // free users see last 1 plan
  // Analytics
  | 'advanced_stats'
  | 'pace_trends'
  | 'acwr_chart'
  | 'wellness_trends'
  // Integrations
  | 'strava_sync'
  | 'garmin_export'          // Phase 10
  // Social
  | 'share_session_card'
  | 'leaderboard'            // Phase 10
  // Misc
  | 'push_notifications'
  | 'custom_goals'

/**
 * Maps each feature to the minimum tier required.
 * Change a feature's tier here to move it behind/ahead of a paywall.
 */
export const FEATURE_TIERS: Record<FeatureKey, Tier> = {
  // AI — all Pro
  ai_pre_race_brief:         'pro',
  ai_adaptive_suggestions:   'pro',
  ai_coaching_card:          'pro',
  ai_post_session_feedback:  'pro',
  ai_bespoke_plan:           'pro',

  // Plans — free gets 1, pro gets unlimited
  multiple_active_plans:     'pro',
  plan_history_full:         'pro',
  plan_history_preview:      'free',

  // Analytics — basic free, advanced pro
  advanced_stats:            'pro',
  pace_trends:               'pro',
  acwr_chart:                'pro',
  wellness_trends:           'pro',

  // Integrations
  strava_sync:               'pro',
  garmin_export:             'pro',

  // Social
  share_session_card:        'free',   // sharing is marketing — keep free
  leaderboard:               'pro',

  // Core features — always free
  push_notifications:        'free',
  custom_goals:              'free',
}

/**
 * Whether premium gating is enforced.
 * false = all features available to everyone (dev/test mode)
 * true  = tiers are enforced (production monetisation)
 */
export const PREMIUM_ENFORCED = config.premiumEnforced

/**
 * Tier hierarchy — higher index = higher access
 */
const TIER_RANK: Record<Tier, number> = {
  free: 0,
  pro: 1,
  coach: 2,
}

/**
 * Check if a given tier can access a feature.
 * When PREMIUM_ENFORCED is false, always returns true.
 */
export function canAccess(userTier: Tier, feature: FeatureKey): boolean {
  if (!PREMIUM_ENFORCED) return true
  const required = FEATURE_TIERS[feature]
  return TIER_RANK[userTier] >= TIER_RANK[required]
}

/**
 * AI rate limit config.
 * Max AI calls per user per day — enforced server-side in API routes.
 *
 * Current state: PREMIUM_ENFORCED=false so AI_RATE_LIMIT_DEV (5) is used for all users.
 * When PREMIUM_ENFORCED=true is set in Vercel:
 *   - free:  3 calls/day  (coach card + fuel tip + pre-race brief)
 *   - pro:   25 calls/day (unlimited practical use)
 *   - coach: 50 calls/day
 *
 * The free limit is intentionally not 0 — free users should experience AI
 * features so they understand the value before upgrading.
 */
export const AI_RATE_LIMITS: Record<Tier, number> = {
  free:  3,   // enough to experience all 3 AI features once per day
  pro:   25,  // unlimited practical use
  coach: 50,
}

/**
 * During dev/test (PREMIUM_ENFORCED=false), use this limit for all users.
 * Protects against runaway API costs during testing.
 */
export const AI_RATE_LIMIT_DEV = 5  // calls per user per day
