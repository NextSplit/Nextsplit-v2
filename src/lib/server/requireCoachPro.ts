// OQ#2 server-side gate for Coach-Pro features.
//
// Mirrors src/lib/serverSubscription.ts:requirePro for the coach side. The
// Coach-Pro tier is independent of the athlete is_pro tier — coaches subscribe
// to coach_profiles.is_coach_pro = true via the £29/mo Coach-Pro Stripe
// product, not the athlete £7.99/mo Pro product.
//
// Behaviour:
//   · serverConfig.premiumEnforced = false ⇒ every coach passes (dev mode)
//   · serverConfig.premiumEnforced = true  ⇒ require is_coach_pro = true
//     AND coach_pro_expires_at IS NULL OR > now() (covers cancelled
//     subscriptions that haven't lapsed yet)
//
// Returns null on pass (caller proceeds), or a 403 NextResponse on fail.

import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { serverConfig } from '@/lib/config'
import {
  canCoachAccess,
  COACH_FEATURE_LABELS,
  type CoachFeatureKey,
} from '@/lib/coach-features'

export interface CoachProCheck {
  isCoachPro: boolean
  expiresAt:  string | null
}

export async function getCoachProStatus(
  supabase: SupabaseClient,
  userId: string,
): Promise<CoachProCheck> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('coach_profiles')
      .select('is_coach_pro, coach_pro_expires_at')
      .eq('user_id', userId)
      .maybeSingle()
    const expiresAt = (data?.coach_pro_expires_at as string | null) ?? null
    const stillValid = !expiresAt || new Date(expiresAt).getTime() > Date.now()
    return {
      isCoachPro: !!data?.is_coach_pro && stillValid,
      expiresAt,
    }
  } catch {
    return { isCoachPro: false, expiresAt: null }
  }
}

/**
 * Returns 403 Response if the coach can't access this feature, or null on pass.
 * Use in coach API routes that gate behind Coach-Pro per OQ#2 = C.
 */
export async function requireCoachPro(
  supabase: SupabaseClient,
  userId: string,
  feature: CoachFeatureKey,
): Promise<Response | null> {
  const check = await getCoachProStatus(supabase, userId)
  const ok    = canCoachAccess(feature, check.isCoachPro, serverConfig.premiumEnforced)
  if (ok) return null
  return NextResponse.json(
    {
      error:   `${COACH_FEATURE_LABELS[feature]} requires Coach-Pro`,
      upgrade: true,
      feature,
    },
    { status: 403 },
  )
}
