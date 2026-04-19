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
 */

import { createClient } from '@supabase/supabase-js'
import { AI_RATE_LIMIT_DEV, AI_RATE_LIMITS, PREMIUM_ENFORCED, type Tier } from './features'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

interface RateLimitResult {
  allowed: boolean
  callsToday: number
  limit: number
  reason?: string
}

/**
 * Check if a user can make an AI call, and increment their counter if so.
 * @param userId  Supabase auth user ID
 * @param tier    User's subscription tier
 */
export async function checkAndIncrementAIUsage(
  userId: string,
  tier: Tier = 'free'
): Promise<RateLimitResult> {
  // Determine limit
  const limit = PREMIUM_ENFORCED
    ? AI_RATE_LIMITS[tier]
    : AI_RATE_LIMIT_DEV

  try {
    const supabase = getAdminClient()
    const today = todayStr()

    // Upsert today's row, increment counter
    const { data, error } = await supabase
      .from('ai_usage')
      .upsert(
        { user_id: userId, date: today, call_count: 1 },
        {
          onConflict: 'user_id,date',
          ignoreDuplicates: false,
        }
      )
      .select('call_count')
      .single()

    if (error) {
      // Table doesn't exist yet — allow the call, log a warning
      console.warn('[aiRateLimit] ai_usage table not found — allowing call:', error.message)
      return { allowed: true, callsToday: 0, limit }
    }

    const callsToday = data?.call_count ?? 1

    if (callsToday > limit) {
      // Roll back the increment
      await supabase
        .from('ai_usage')
        .update({ call_count: limit })
        .eq('user_id', userId)
        .eq('date', today)

      return {
        allowed: false,
        callsToday: limit,
        limit,
        reason: `Daily AI limit reached (${limit} calls/day). Resets at midnight.`,
      }
    }

    return { allowed: true, callsToday, limit }
  } catch (err) {
    // Any unexpected error — fail open (allow call) so users aren't blocked by infra issues
    console.error('[aiRateLimit] Unexpected error — allowing call:', err)
    return { allowed: true, callsToday: 0, limit }
  }
}

/**
 * Record token usage after a successful AI call.
 * Non-fatal — if this fails it doesn't affect the user.
 */
export async function recordTokenUsage(
  userId: string,
  tokensIn: number,
  tokensOut: number
): Promise<void> {
  try {
    const supabase = getAdminClient()
    await supabase.rpc('increment_token_usage', {
      p_user_id: userId,
      p_date: todayStr(),
      p_tokens_in: tokensIn,
      p_tokens_out: tokensOut,
    })
  } catch {
    // Non-fatal — token recording is for analytics, not gating
  }
}
