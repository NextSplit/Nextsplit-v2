// K37 — server-side entitlement guard for API routes.
//
// Use at the top of any route that gates a paid feature:
//
//   import { requireEntitlement } from '@/lib/requireEntitlement'
//   export async function POST(req: Request) {
//     const guard = await requireEntitlement('split_forecast')
//     if (!guard.ok) return guard.response
//     // ... entitled work
//   }
//
// Routes that take request bodies should still parse + validate
// AFTER the entitlement check, so an unauthenticated request never
// triggers schema parsing.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAccess, type FeatureKey, type Tier } from '@/lib/features'

interface OkGuard { ok: true;  tier: Tier; userId: string }
interface ErrGuard { ok: false; response: NextResponse }

export async function requireEntitlement(
  feature: FeatureKey,
): Promise<OkGuard | ErrGuard> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    }
  }

  // PREMIUM_ENFORCED is server-side only (per council /council 2026-05-07
  // P1.3). When false, all entitlement checks pass for dev / pre-launch.
  const enforced = process.env.PREMIUM_ENFORCED === 'true'

  if (!enforced) {
    return { ok: true, tier: 'pro', userId: user.id }
  }

  // Read tier from the profiles row. profiles.is_pro is the legacy
  // boolean source-of-truth; richer tier handling (free/pro/coach)
  // comes from the subscriptions table when wired.
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_pro, subscription_tier')
    .eq('id', user.id)
    .single()

  const rawTier = (profile as { subscription_tier?: string } | null)?.subscription_tier
  const tier: Tier = rawTier === 'coach'
    ? 'coach'
    : (profile as { is_pro?: boolean } | null)?.is_pro
      ? 'pro'
      : 'free'

  if (!canAccess(tier, feature, enforced)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'entitlement_required', feature, current_tier: tier },
        { status: 402 }, // 402 Payment Required
      ),
    }
  }

  return { ok: true, tier, userId: user.id }
}
