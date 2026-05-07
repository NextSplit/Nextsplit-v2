'use server'

// P2.3 referral-reward trigger. Wraps the SECURITY DEFINER RPC defined in
// supabase/migrations/phase-p2-3-referral-reward.sql.
//
// Called fire-and-forget from useSessionLogging after every successful
// training_logs insert. The RPC short-circuits if:
//   - The caller wasn't referred (no referred_by set)
//   - The reward was already credited (referral_reward_given_at IS NOT NULL)
//   - Their done-session count is below the 5-threshold
//
// Idempotent: repeated calls after the threshold has been crossed return
// ok=false / already_credited and don't double-credit. Safe to fire on
// every log without dedup work at the client.

import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'

export async function creditReferralRewardIfEligibleAction(): Promise<{
  ok:     boolean
  reason?: string
}> {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any
    const { data, error } = await s.rpc('credit_referral_reward_if_eligible')
    if (error) {
      Sentry.captureException(error, {
        extra: { op: 'credit_referral_reward_if_eligible' },
        tags:  { feature: 'p2.3-referral' },
      })
      return { ok: false, reason: 'rpc_error' }
    }
    return data as { ok: boolean; reason?: string }
  } catch (err) {
    Sentry.captureException(err, { extra: { context: '[creditReferralRewardIfEligibleAction]' } })
    return { ok: false, reason: 'exception' }
  }
}
