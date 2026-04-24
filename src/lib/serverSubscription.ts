/**
 * Server-side subscription check for API routes.
 * Prevents client-side ProGate bypass.
 * Call this before any AI or premium feature in API routes.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface SubscriptionCheck {
  isPro:  boolean
  isFree: boolean
}

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

    const isPro = !!(data?.is_pro || data?.subscription_status === 'active')
    return { isPro, isFree: !isPro }
  } catch {
    // Fail open — don't block users if check fails
    return { isPro: false, isFree: true }
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
