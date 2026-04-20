'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import { canAccess, PREMIUM_ENFORCED, type Tier, type FeatureKey } from '@/lib/features'
import { db } from '@/lib/supabase/db'

export interface Subscription {
  tier:              Tier
  status:            'active' | 'trialing' | 'founding' | 'cancelled' | 'expired' | 'none' | 'free'
  currentPeriodEnd:  string | null
  trialEnd:          string | null
  stripeCustomerId:  string | null
  isFounding:        boolean
  foundingLeft:      number   // spots remaining for founding pricing
}

const DEFAULT_SUB: Subscription = {
  tier:             'free',
  status:           'none',
  currentPeriodEnd: null,
  trialEnd:         null,
  stripeCustomerId: null,
  isFounding:       false,
  foundingLeft:     500,
}

export interface UseSubscriptionReturn {
  subscription:   Subscription
  loading:        boolean
  isPro:          boolean
  isFounding:     boolean
  foundingLeft:   number
  isDevMode:      boolean
  canUseFeature:  (feature: FeatureKey) => boolean
  refresh:        () => void
}

export function useSubscription(): UseSubscriptionReturn {
  const supabase = useSupabase()
  const [subscription, setSubscription] = useState<Subscription>(DEFAULT_SUB)
  const [loading, setLoading]           = useState(true)
  const [tick, setTick]                 = useState(0)

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

        // Read from profiles (is_pro + subscription_status)
        const { data: profile } = await db(supabase)
          .from('profiles')
          .select('is_pro, subscription_status, stripe_customer_id, pro_expires_at')
          .eq('id', user.id)
          .maybeSingle()

        // Read founding member count
        const { data: config } = await db(supabase)
          .from('app_config')
          .select('value')
          .eq('key', 'founding_member_count')
          .maybeSingle()

        const foundingCount = parseInt(config?.value ?? '0', 10)
        const foundingLeft  = Math.max(0, 500 - foundingCount)

        if (!cancelled) {
          const isPro      = profile?.is_pro ?? false
          const status     = profile?.subscription_status ?? 'free'
          const isFounding = status === 'founding'

          setSubscription({
            tier:             isPro ? 'pro' : 'free',
            status:           status as Subscription['status'],
            currentPeriodEnd: profile?.pro_expires_at ?? null,
            trialEnd:         null,
            stripeCustomerId: profile?.stripe_customer_id ?? null,
            isFounding,
            foundingLeft,
          })
          setLoading(false)
        }
      } catch {
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
    isFounding:   subscription.isFounding,
    foundingLeft: subscription.foundingLeft,
    isDevMode:    !PREMIUM_ENFORCED,
    canUseFeature,
    refresh,
  }
}
