'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import { canAccess, PREMIUM_ENFORCED, type Tier, type FeatureKey } from '@/lib/features'
import { db } from '@/lib/supabase/db'

export interface Subscription {
  tier: Tier
  status: 'active' | 'trialing' | 'cancelled' | 'expired' | 'none'
  currentPeriodEnd: string | null
  trialEnd: string | null
  stripeCustomerId: string | null
}

const DEFAULT_SUB: Subscription = {
  tier: 'free',
  status: 'none',
  currentPeriodEnd: null,
  trialEnd: null,
  stripeCustomerId: null,
}

export interface UseSubscriptionReturn {
  subscription: Subscription
  loading: boolean
  /** True if user has pro or above */
  isPro: boolean
  /** True if premium is not yet enforced (dev/test mode) */
  isDevMode: boolean
  /** Check if user can access a specific feature */
  canUseFeature: (feature: FeatureKey) => boolean
  refresh: () => void
}

/**
 * Reads the user's subscription tier from Supabase.
 * Returns free tier by default until subscriptions table exists and is populated.
 *
 * When NEXT_PUBLIC_PREMIUM_ENFORCED=false (default), canUseFeature always
 * returns true regardless of tier — safe for dev/testing.
 */
export function useSubscription(): UseSubscriptionReturn {
  const supabase = useSupabase()
  const [subscription, setSubscription] = useState<Subscription>(DEFAULT_SUB)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false

    async function fetchSubscription() {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          if (!cancelled) { setSubscription(DEFAULT_SUB); setLoading(false) }
          return
        }

        // Try to read from subscriptions table (may not exist yet — that's fine)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await db(supabase)
          .from('subscriptions')
          .select('tier, status, current_period_end, trial_end, stripe_customer_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!cancelled) {
          if (error || !data) {
            // Table doesn't exist yet or no row — default to free
            setSubscription(DEFAULT_SUB)
          } else {
            setSubscription({
              tier: (data.tier as Tier) ?? 'free',
              status: data.status ?? 'none',
              currentPeriodEnd: data.current_period_end ?? null,
              trialEnd: data.trial_end ?? null,
              stripeCustomerId: data.stripe_customer_id ?? null,
            })
          }
          setLoading(false)
        }
      } catch {
        // Any error → default to free, don't block the UI
        if (!cancelled) { setSubscription(DEFAULT_SUB); setLoading(false) }
      }
    }

    fetchSubscription()
    return () => { cancelled = true }
  }, [supabase, tick])

  const isPro = subscription.tier === 'pro' || subscription.tier === 'coach'

  const canUseFeature = useCallback(
    (feature: FeatureKey) => canAccess(subscription.tier, feature),
    [subscription.tier]
  )

  return {
    subscription,
    loading,
    isPro,
    isDevMode: !PREMIUM_ENFORCED,
    canUseFeature,
    refresh,
  }
}
