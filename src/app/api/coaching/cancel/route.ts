import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'

const CancelSchema = z.object({
  coach_id: z.string().uuid(),
})

/**
 * POST /api/coaching/cancel
 * Cancels an athlete's coaching subscription at period end.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = CancelSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { coach_id } = parsed.data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    const { data: sub } = await s
      .from('coaching_subscriptions')
      .select('id, stripe_subscription_id, status')
      .eq('coach_id', coach_id)
      .eq('athlete_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!sub) return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })

    // Cancel in Stripe at period end
    if (sub.stripe_subscription_id) {
      await getStripe().subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
      })
    }

    // Mark as cancelled in DB
    await s.from('coaching_subscriptions').update({
      status:       'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    }).eq('id', sub.id)

    // Update coach_athletes relationship
    await s.from('coach_athletes')
      .update({ status: 'ended' })
      .eq('coach_id', coach_id)
      .eq('athlete_id', user.id)

    return NextResponse.json({ cancelled: true })
  } catch (err) {
    console.error('Coaching cancel error:', err)
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 })
  }
}
