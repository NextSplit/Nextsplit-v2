'use client'

import { useState, useCallback } from 'react'
import { useSubscription } from './useSubscription'
import type { FeatureKey } from '@/lib/features'

/**
 * K37 — entitlement check + automatic paywall surfacing.
 *
 * Thin wrapper over useSubscription().canUseFeature for ergonomics
 * in feature-gated UI. Returns the boolean check plus a
 * `requireFeature(feature)` helper that returns true if the user can
 * use the feature, false otherwise — and in the false case toggles a
 * paywall modal state the consumer mounts via <PaywallModal />.
 *
 * Usage:
 *   const { isEntitled, requireFeature, paywallProps } = useEntitlement()
 *   function onPredictClick() {
 *     if (!requireFeature('split_forecast')) return
 *     // ... proceed with the entitled action
 *   }
 *   return (
 *     <>
 *       <button onClick={onPredictClick}>Predict</button>
 *       <PaywallModal {...paywallProps} />
 *     </>
 *   )
 */

interface PaywallProps {
  open:        boolean
  feature:     FeatureKey | null
  onClose:     () => void
}

export function useEntitlement() {
  const { canUseFeature, isPro } = useSubscription()
  const [paywallFeature, setPaywallFeature] = useState<FeatureKey | null>(null)

  const isEntitled = useCallback(
    (feature: FeatureKey) => canUseFeature(feature),
    [canUseFeature],
  )

  const requireFeature = useCallback(
    (feature: FeatureKey): boolean => {
      if (canUseFeature(feature)) return true
      setPaywallFeature(feature)
      return false
    },
    [canUseFeature],
  )

  const paywallProps: PaywallProps = {
    open:    paywallFeature !== null,
    feature: paywallFeature,
    onClose: () => setPaywallFeature(null),
  }

  return { isEntitled, requireFeature, paywallProps, isPro }
}
