/**
 * Server-side subscription check for API routes.
 * Prevents client-side ProGate bypass.
 * Call this before any AI or premium feature in API routes.
 *
 * BL-C6 — `subscription_status='trialing'` counts as Pro for gating purposes
 * (the whole point of the trial is to give the user the Pro experience).
 * is_pro=true OR status='active' OR status='trialing' all map to isPro=true.
 *
 * Note: trial-window expiry is enforced by the cron sweep (`expire_overdue_trials()`)
 * which flips status='expired'. So we don't need to compute the trial window
 * here — by the time status is still 'trialing', the trial is still valid.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tier } from '@/lib/features'

export interface SubscriptionCheck {
  isPro:  boolean
  isFree: boolean
  tier:   Tier
}

const PRO_STATUSES = new Set(['active', 'trialing', 'founding'])

export async function getServerSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionCheck> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('profiles')
      .select('is_pro, subscription_status')
      .eq('id', userId)
      .single()

    const status = (data?.subscription_status as string | null) ?? null
    const isPro  = !!data?.is_pro || (!!status && PRO_STATUSES.has(status))
    const tier: Tier = isPro ? 'pro' : 'free'
    return { isPro, isFree: !isPro, tier }
  } catch {
    // Fail open — don't block users if check fails
    return { isPro: false, isFree: true, tier: 'free' }
  }
}

/**
 * Returns 403 response if user is not pro.
 * Use in AI routes to enforce subscription server-side.
 */
export function requirePro(check: SubscriptionCheck) {
  if (!check.isPro) {
    return Response.json(
      { error: 'Elite subscription required', upgrade: true },
      { status: 403 }
    )
  }
  return null
}
