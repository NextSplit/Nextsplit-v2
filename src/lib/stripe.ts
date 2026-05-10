import Stripe from 'stripe'
import { db } from '@/lib/supabase/db'
import { serverConfig, config } from '@/lib/config'

// Lazy singleton — only initialises when first called (not at build time)
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = serverConfig.stripeSecretKey
    if (!key) throw new Error('STRIPE_SECRET_KEY not set')
    _stripe = new Stripe(key, { apiVersion: '2026-03-25.dahlia' })
  }
  return _stripe
}

// Price IDs
export const PRICES = {
  founding_monthly: config.stripe.foundingMonthly,
  founding_annual:  config.stripe.foundingAnnual,
  standard_monthly: config.stripe.standardMonthly,
  standard_annual:  config.stripe.standardAnnual,
} as const

export const FOUNDING_LIMIT = config.stripe.foundingLimit

type SupabaseClient = Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>

/** Get current founding member count */
export async function getFoundingCount(supabase: SupabaseClient): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await db(supabase)
    .from('app_config')
    .select('value')
    .eq('key', 'founding_member_count')
    .single()
  return parseInt(data?.value ?? '0', 10)
}

/** Are founding spots still available? */
export async function isFoundingAvailable(supabase: SupabaseClient): Promise<boolean> {
  const count = await getFoundingCount(supabase)
  return count < FOUNDING_LIMIT
}

/**
 * Atomically claim a founding-tier spot.
 *
 * Council R1 (BACKEND/QA-RISK) found the previous read-then-write
 * incrementFoundingCount as a race vector: concurrent Stripe webhooks
 * both reading 499 → both writing 500 → 502 spots sold against a 500-spot
 * promise. This wraps the SQL-side `claim_founding_spot()` RPC which uses
 * FOR UPDATE to serialise concurrent claims.
 *
 * Returns:
 *   · `{ claimed: true, count: N }` — caller should use founding price
 *   · `{ claimed: false, count: 500 }` — tier full, caller uses standard price
 *
 * The Stripe webhook should call this AFTER the subscription becomes
 * 'active' (or 'trialing' if we treat trial → paid as a single
 * commitment), pick founding vs standard price based on `claimed`, and
 * persist the resulting price tier on the user's profile so subsequent
 * renewals don't re-claim.
 */
export async function claimFoundingSpot(
  supabase: SupabaseClient,
): Promise<{ claimed: boolean; count: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('claim_founding_spot')
  if (error || data === null || data === undefined) {
    // Migration not yet applied — fall back to legacy read-then-write.
    // This branch logs a no-op risk but keeps the webhook functioning
    // until the founder pastes phase-council-r1-founding-atomic-v1.sql.
    await incrementFoundingCount(supabase)
    const count = await getFoundingCount(supabase)
    return { claimed: count <= FOUNDING_LIMIT, count }
  }
  if (data === -1) return { claimed: false, count: FOUNDING_LIMIT }
  return { claimed: true, count: data as number }
}

/**
 * Legacy non-atomic increment. Retained for the fallback path in
 * claimFoundingSpot above and any caller that hasn't migrated yet.
 *
 * @deprecated Use claimFoundingSpot — this one races.
 */
export async function incrementFoundingCount(supabase: SupabaseClient): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await db(supabase)
    .from('app_config')
    .select('value')
    .eq('key', 'founding_member_count')
    .single()
  const current = parseInt(data?.value ?? '0', 10)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db(supabase)
    .from('app_config')
    .update({ value: String(current + 1), updated_at: new Date().toISOString() })
    .eq('key', 'founding_member_count')
}
