'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import { canAccess, type Tier, type FeatureKey } from '@/lib/features'
import { db } from '@/lib/supabase/db'

export interface Subscription {
  tier:              Tier
  status:            'active' | 'trialing' | 'founding' | 'cancelled' | 'expired' | 'none' | 'free'
  currentPeriodEnd:  string | null
  trialEnd:          string | null    // BL-C6 — ISO date when 14-day trial expires (predicted; null after expiry)
  trialEndedAt:      string | null    // BL-C6 — set by the cron sweep when trial lapsed without conversion
  trialSource:       'squad_join' | 'first_coach_message' | null
  stripeCustomerId:  string | null
  isFounding:        boolean
  foundingLeft:      number   // spots remaining for founding pricing
}

const DEFAULT_SUB: Subscription = {
  tier:             'free',
  status:           'none',
  currentPeriodEnd: null,
  trialEnd:         null,
  trialEndedAt:     null,
  trialSource:      null,
  stripeCustomerId: null,
  isFounding:       false,
  foundingLeft:     500,
}

const TRIAL_DAYS = 14
const WINBACK_WINDOW_DAYS = 7  // PR N — banner only renders while lapse is still recent

export interface UseSubscriptionReturn {
  subscription:        Subscription
  loading:             boolean
  isPro:               boolean
  isTrialing:          boolean
  trialDaysLeft:       number | null
  isTrialLapsed:       boolean        // PR N — had trial, no longer Pro, ended in last 7 days
  trialLapsedDaysAgo:  number | null
  isFounding:          boolean
  foundingLeft:        number
  isDevMode:           boolean
  canUseFeature:       (feature: FeatureKey) => boolean
  refresh:             () => void
}

export function useSubscription(): UseSubscriptionReturn {
  const supabase = useSupabase()
  const [subscription, setSubscription] = useState<Subscription>(DEFAULT_SUB)
  const [loading, setLoading]           = useState(true)
  const [isDevMode, setIsDevMode]       = useState<boolean>(false)
  const [tick, setTick]                 = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  // P1.3: dev-mode is a server-only flag (PREMIUM_ENFORCED env). We fetch
  // its boolean effect once on mount; the value cannot leak into the
  // client bundle as a constant.
  useEffect(() => {
    let cancelled = false
    fetch('/api/subscription/dev-mode')
      .then(r => r.ok ? r.json() : { isDevMode: false })
      .then(({ isDevMode: serverFlag }) => {
        if (!cancelled) setIsDevMode(Boolean(serverFlag))
      })
      .catch(() => { /* default false (enforced) on error */ })
    return () => { cancelled = true }
  }, [])

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

        // BL-C6 — trial fields piggy-back on the same profiles row.
        const { data: profile } = await db(supabase)
          .from('profiles')
          .select('is_pro, subscription_status, stripe_customer_id, pro_expires_at, trial_started_at, trial_ended_at, trial_source')
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

        // BL-C6 — derive trial window. If trial_started_at is set and
        // trial_ended_at is NULL, compute trialEnd = start + 14d. If
        // trialEnd has already passed, fire the lazy-expiry RPC (idempotent
        // server-side via WHERE guards) and treat as expired locally.
        const p = profile as {
          is_pro?:              boolean | null
          subscription_status?: string | null
          stripe_customer_id?:  string | null
          pro_expires_at?:      string | null
          trial_started_at?:    string | null
          trial_ended_at?:      string | null
          trial_source?:        string | null
        } | null
        const startedAt = p?.trial_started_at ?? null
        const endedAt   = p?.trial_ended_at   ?? null
        let trialEnd: string | null = null
        let trialActive = false
        if (startedAt && !endedAt) {
          const end = new Date(new Date(startedAt).getTime() + TRIAL_DAYS * 86400_000)
          trialEnd = end.toISOString()
          if (end.getTime() > Date.now()) {
            trialActive = true
          } else {
            // Lazy-expire — fire and forget; the RPC is idempotent.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            void (supabase as any).rpc('expire_trial_if_due')
          }
        }

        if (!cancelled) {
          const profileIsPro = p?.is_pro ?? false
          const status       = (p?.subscription_status ?? 'free') as Subscription['status']
          const isFounding   = status === 'founding'

          // Pro-effective tier = profile.is_pro OR active trial. Trial
          // grants every gated feature except billing-only flows (Stripe
          // routes still see is_pro=false until the trial converts).
          const effectivePro = profileIsPro || trialActive

          setSubscription({
            tier:             effectivePro ? 'pro' : 'free',
            status,
            currentPeriodEnd: p?.pro_expires_at ?? null,
            trialEnd,
            trialEndedAt:     endedAt,
            trialSource:      (p?.trial_source as Subscription['trialSource']) ?? null,
            stripeCustomerId: p?.stripe_customer_id ?? null,
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
  // BL-C6 — trialing iff a trialEnd is set, in the future, and we're not
  // a paid Pro (paid Pro post-conversion keeps the field but isn't trialing).
  const isTrialing = !!subscription.trialEnd
    && new Date(subscription.trialEnd).getTime() > Date.now()
    && subscription.status === 'trialing'
  const trialDaysLeft = subscription.trialEnd
    ? Math.max(0, Math.ceil((new Date(subscription.trialEnd).getTime() - Date.now()) / 86400_000))
    : null

  // PR N — trial-lapsed detection for the in-app winback banner.
  // Lapsed iff: trial_ended_at is set AND user did NOT convert to Pro AND
  // the lapse is still within the 7-day winback window. Trial converters
  // (is_pro=true post-trial) still have trial_ended_at set but are not lapsed.
  let isTrialLapsed = false
  let trialLapsedDaysAgo: number | null = null
  if (subscription.trialEndedAt && !isPro) {
    const lapsedMs = Date.now() - new Date(subscription.trialEndedAt).getTime()
    if (lapsedMs >= 0) {
      const daysAgo = Math.floor(lapsedMs / 86400_000)
      if (daysAgo <= WINBACK_WINDOW_DAYS) {
        isTrialLapsed = true
        trialLapsedDaysAgo = daysAgo
      }
    }
  }

  const canUseFeature = useCallback(
    // canAccess takes `enforced` as a parameter — we pass !isDevMode.
    // When dev-mode is true, every feature returns true regardless of tier.
    (feature: FeatureKey) => canAccess(subscription.tier, feature, !isDevMode),
    [subscription.tier, isDevMode]
  )

  return {
    subscription,
    loading,
    isPro,
    isTrialing,
    trialDaysLeft,
    isTrialLapsed,
    trialLapsedDaysAgo,
    isFounding:   subscription.isFounding,
    foundingLeft: subscription.foundingLeft,
    isDevMode,
    canUseFeature,
    refresh,
  }
}
