import Stripe from 'stripe'

// Lazy singleton — only initialises when first called (not at build time)
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY not set')
    _stripe = new Stripe(key, { apiVersion: '2026-03-25.dahlia' })
  }
  return _stripe
}

// Price IDs
export const PRICES = {
  founding_monthly: process.env.STRIPE_PRICE_FOUNDING_MONTHLY ?? '',
  founding_annual:  process.env.STRIPE_PRICE_FOUNDING_ANNUAL  ?? '',
  standard_monthly: process.env.STRIPE_PRICE_STANDARD_MONTHLY ?? '',
  standard_annual:  process.env.STRIPE_PRICE_STANDARD_ANNUAL  ?? '',
} as const

export const FOUNDING_LIMIT = parseInt(process.env.STRIPE_FOUNDING_MEMBER_LIMIT ?? '500', 10)

type SupabaseClient = Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>

/** Get current founding member count */
export async function getFoundingCount(supabase: SupabaseClient): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
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

/** Increment founding member count */
export async function incrementFoundingCount(supabase: SupabaseClient): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('app_config')
    .select('value')
    .eq('key', 'founding_member_count')
    .single()
  const current = parseInt(data?.value ?? '0', 10)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('app_config')
    .update({ value: String(current + 1), updated_at: new Date().toISOString() })
    .eq('key', 'founding_member_count')
}
