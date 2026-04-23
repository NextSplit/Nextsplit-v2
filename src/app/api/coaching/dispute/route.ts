import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'

const DisputeSchema = z.object({
  coach_id: z.string().uuid(),
  reason:   z.string().min(10).max(500),
})

/**
 * POST /api/coaching/dispute
 * Opens a dispute within the 7-day window. Triggers automatic refund.
 * After 7 days: no refund, review available instead.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = DisputeSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { coach_id, reason } = parsed.data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    const { data: sub } = await s
      .from('coaching_subscriptions')
      .select('id, stripe_subscription_id, stripe_payment_intent_id, status, created_at, amount_gbp')
      .eq('coach_id', coach_id)
      .eq('athlete_id', user.id)
      .in('status', ['active', 'pending'])
      .maybeSingle()

    if (!sub) return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })

    // Check 7-day window
    const daysSince = Math.floor(
      (Date.now() - new Date(sub.created_at).getTime()) / (1000 * 3600 * 24)
    )

    if (daysSince > 7) {
      return NextResponse.json({
        error: 'Dispute window has closed (7 days from purchase). You can leave a review instead.',
        days_since: daysSince,
        can_review: true,
      }, { status: 400 })
    }

    // Cancel Stripe subscription immediately
    if (sub.stripe_subscription_id) {
      await getStripe().subscriptions.cancel(sub.stripe_subscription_id)
    }

    // Issue refund if payment intent exists
    let refundId: string | null = null
    if (sub.stripe_payment_intent_id) {
      try {
        const refund = await getStripe().refunds.create({
          payment_intent: sub.stripe_payment_intent_id,
          reason: 'requested_by_customer',
        })
        refundId = refund.id
      } catch (refundErr) {
        Sentry.captureException(refundErr, { extra: { context: 'Refund failed:' } })
        // Continue — we still record the dispute
      }
    }

    // Update subscription record
    await s.from('coaching_subscriptions').update({
      status:              'dispute',
      dispute_opened_at:   new Date().toISOString(),
      dispute_reason:      reason,
      cancelled_at:        new Date().toISOString(),
      updated_at:          new Date().toISOString(),
    }).eq('id', sub.id)

    // End coach_athletes relationship
    await s.from('coach_athletes')
      .update({ status: 'ended' })
      .eq('coach_id', coach_id)
      .eq('athlete_id', user.id)

    // Check for repeated disputes (flag if 2+ disputes with same coach)
    const { count } = await s
      .from('coaching_subscriptions')
      .select('id', { count: 'exact' })
      .eq('athlete_id', user.id)
      .eq('coach_id', coach_id)
      .eq('status', 'dispute')

    if ((count ?? 0) >= 2) {
      // Flag coach for NextSplit review (admin notification)
      await s.from('coach_profiles')
        .update({ verification_tier: 'listed' }) // Downgrade if elite/verified
        .eq('user_id', coach_id)
        .eq('verification_tier', 'elite') // Only downgrade elite
    }

    return NextResponse.json({
      disputed:  true,
      refunded:  !!refundId,
      refund_id: refundId,
      amount_gbp: sub.amount_gbp,
    })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Coaching dispute error:' } })
    return NextResponse.json({ error: 'Failed to open dispute' }, { status: 500 })
  }
}
