/**
 * Server-side AI rate limiter.
 * Tracks daily AI call counts per user in Supabase.
 * Falls back to allowing the call if the table doesn't exist yet.
 *
 * Table schema (create when ready):
 *   CREATE TABLE ai_usage (
 *     id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     user_id     uuid REFERENCES auth.users NOT NULL,
 *     date        date NOT NULL DEFAULT CURRENT_DATE,
 *     call_count  integer NOT NULL DEFAULT 0,
 *     tokens_in   integer NOT NULL DEFAULT 0,
 *     tokens_out  integer NOT NULL DEFAULT 0,
 *     UNIQUE (user_id, date)
 *   );
 *   ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "Users read own usage" ON ai_usage FOR SELECT USING (auth.uid() = user_id);
 *
 * PR M — bug fix: previous signature took a `tier` parameter that every
 * caller hardcoded to 'free'. Once PREMIUM_ENFORCED=true flips, Pro and
 * trialing users would hit the 3/day free limit instead of the 25/day
 * Pro limit. Fixed by looking up the tier internally via the same
 * service-role admin client we already use for the upsert. The `tier`
 * param is removed; callers just pass `userId`.
 *
 * Trial-aware: BL-C6 trialing users get the 'pro' tier limit because the
 * trial is meant to be the full Pro experience. serverSubscription.ts
 * recognises 'trialing' status as isPro=true; this function inlines the
 * same logic to avoid an extra round-trip.
 */

import { createClient } from '@supabase/supabase-js'
import { AI_RATE_LIMIT_DEV, AI_RATE_LIMITS, type Tier } from './features'
import { config, serverConfig } from '@/lib/config'

const SUPABASE_URL = config.supabaseUrl

// F2.5 (audit): no anon-key fallback. Rate-limit needs service-role to upsert
// the ai_usage row regardless of RLS. Anon-key fallback let the cap silently
// fail-open when the env var was missing (e.g. staging misconfig). Throw
// loud at first call instead.
function getAdminClient() {
  if (!serverConfig.supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY required for aiRateLimit (F2.5)')
  }
  return createClient(SUPABASE_URL, serverConfig.supabaseServiceRoleKey)
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

const PRO_STATUSES = new Set(['active', 'trialing', 'founding'])

interface RateLimitResult {
  allowed: boolean
  callsToday: number
  limit: number
  tier: Tier
  reason?: string
}

/**
 * Check if a user can make an AI call, and increment their counter if so.
 * Tier is looked up server-side from profiles — callers don't pass it,
 * which prevents the previous bug of every caller hardcoding 'free'.
 *
 * PR H1: `feature` tag enables per-feature attribution in /admin/ai-cost.
 * Stored on the ai_usage row; daily totals SUM across features for the
 * rate-limit check. Defaults to '' for back-compat with any caller that
 * forgets to pass one (those calls land in the "(unlabelled)" bucket).
 */
export async function checkAndIncrementAIUsage(
  userId: string,
  feature: string = '',
): Promise<RateLimitResult> {
  let tier: Tier = 'free'
  const supabase = getAdminClient()

  // ── Tier lookup ───────────────────────────────────────────────────────────
  // is_pro=true OR subscription_status in PRO_STATUSES ⇒ Pro tier limit.
  // Trial users (status='trialing') get Pro limits — the trial is meant
  // to be the full Pro experience.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('is_pro, subscription_status')
      .eq('id', userId)
      .single()
    const status = profile?.subscription_status as string | null
    const isPro  = !!profile?.is_pro || (!!status && PRO_STATUSES.has(status))
    tier = isPro ? 'pro' : 'free'
  } catch {
    // Profile fetch failed — fall through with 'free' tier (safer default
    // than 'pro' if profile is misconfigured).
  }

  // ── Limit selection ───────────────────────────────────────────────────────
  // PREMIUM_ENFORCED=false → use the dev limit for everyone (test guard
  // against runaway costs). PREMIUM_ENFORCED=true → use real per-tier limits.
  const limit = serverConfig.premiumEnforced
    ? AI_RATE_LIMITS[tier]
    : AI_RATE_LIMIT_DEV

  try {
    const today = todayStr()

    // Upsert today's row for THIS feature; conflict key is now
    // (user_id, date, feature) per phase_ai_usage_per_feature_v1.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upsertErr } = await (supabase as any)
      .from('ai_usage')
      .upsert(
        { user_id: userId, date: today, feature, call_count: 1 },
        { onConflict: 'user_id,date,feature', ignoreDuplicates: false },
      )

    if (upsertErr) {
      // Table doesn't exist yet — allow the call (will be rate limited once table exists)
      return { allowed: true, callsToday: 0, limit, tier }
    }

    // Read daily total across ALL features for the rate-limit check.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows } = await (supabase as any)
      .from('ai_usage')
      .select('call_count, feature')
      .eq('user_id', userId)
      .eq('date', today)

    const callsToday: number = (rows ?? []).reduce(
      (s: number, r: { call_count: number }) => s + (r.call_count ?? 0),
      0,
    )

    if (callsToday > limit) {
      // Roll back this feature's increment so the user can retry
      // tomorrow without our overshoot polluting the count.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const thisRow = (rows ?? []).find((r: { feature: string }) => r.feature === feature)
      if (thisRow) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('ai_usage')
          .update({ call_count: Math.max(0, thisRow.call_count - 1) })
          .eq('user_id', userId)
          .eq('date', today)
          .eq('feature', feature)
      }

      return {
        allowed: false,
        callsToday: limit,
        limit,
        tier,
        reason: `Daily AI limit reached (${limit} calls/day). Resets at midnight.`,
      }
    }

    return { allowed: true, callsToday, limit, tier }
  } catch {
    // Any unexpected error — fail open (allow call) so users aren't blocked by infra issues
    return { allowed: true, callsToday: 0, limit, tier }
  }
}

/**
 * Record token usage after a successful AI call.
 * PR H1: `feature` tag matches the ai_usage row written by
 * checkAndIncrementAIUsage. Non-fatal — if this fails it doesn't affect
 * the user, but the cost dashboard under-attributes the call.
 */
export async function recordTokenUsage(
  userId: string,
  tokensIn: number,
  tokensOut: number,
  feature: string = '',
): Promise<void> {
  try {
    const supabase = getAdminClient()
    await supabase.rpc('increment_token_usage', {
      p_user_id:    userId,
      p_date:       todayStr(),
      p_tokens_in:  tokensIn,
      p_tokens_out: tokensOut,
      p_feature:    feature,
    })
  } catch {
    // Non-fatal — token recording is for analytics, not gating
  }
}
