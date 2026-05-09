// Server-side helper for the character system's engagement-pro-rata XP rate.
//
// Wraps public.recompute_xp_rate_multiplier(p_user_id) — service-role-only
// SECDEF RPC that reads (is_pro, has-active-coach, has-marketplace-plan)
// and writes profiles.xp_rate_multiplier accordingly. The multiplier is
// then applied at session-log time inside award_session_xp.
//
// Failure mode: non-throwing. The character system is decorative on top of
// the core subscription/coach/plan flows. If the RPC fails, the multiplier
// stays at its last-computed value and the upstream flow keeps working.
// Errors are routed to Sentry so we notice silent drift.
//
// Wiring sites (PR #4 — recompute integration):
//   · /api/stripe/webhook    customer.subscription.updated  → caller becomes Pro
//   · /api/stripe/webhook    customer.subscription.deleted  → caller drops Pro
//   · /api/stripe/webhook    checkout.session.completed     → both new-Pro + new-coach branches
//   · /api/coach/accept      after coach_athletes upsert    → caller gains active coach
//   · /api/plans/activate    after user_plans insert        → caller activates marketplace plan
//
// Future sites (later PRs):
//   · Coach disconnection (athlete or coach ends relationship)
//   · Marketplace plan cancellation / status flip away from 'active'

import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase/server'

export async function recomputeXpRateMultiplier(userId: string): Promise<number | null> {
  if (!userId) return null
  try {
    const svc = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (svc as any).rpc('recompute_xp_rate_multiplier', { p_user_id: userId })
    if (error) {
      Sentry.captureException(error, { extra: { context: '[recomputeXpRateMultiplier]', userId } })
      return null
    }
    return typeof data === 'number' ? data : Number(data ?? 1.0)
  } catch (err) {
    Sentry.captureException(err, { extra: { context: '[recomputeXpRateMultiplier catch]', userId } })
    return null
  }
}
