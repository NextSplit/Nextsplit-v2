import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'
import { config } from '@/lib/config'

const SubscribeSchema = z.object({
  coach_id: z.string().uuid(),
  interval: z.enum(['month', 'year']).default('month'),
})

/**
 * POST /api/coaching/subscribe
 * Creates a Stripe Checkout session for an athlete to subscribe to a coach.
 * Uses Stripe Connect (payment_intent_data.application_fee_amount) for commission.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = SubscribeSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { coach_id, interval } = parsed.data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    // Fetch coach profile
    const { data: coach } = await s
      .from('coach_profiles')
      .select('display_name, rate_monthly_gbp, rate_plan_gbp, stripe_account_id, accepting_athletes, total_athletes')
      .eq('user_id', coach_id)
      .single()

    if (!coach) return NextResponse.json({ error: 'Coach not found' }, { status: 404 })
    if (!coach.accepting_athletes) return NextResponse.json({ error: 'Coach is not accepting athletes' }, { status: 400 })
    if (!coach.stripe_account_id) return NextResponse.json({ error: 'Coach has not set up payments yet' }, { status: 400 })

    const priceGbp = coach.rate_monthly_gbp
    if (!priceGbp) return NextResponse.json({ error: 'Coach has not set a price' }, { status: 400 })

    // Check not already subscribed
    const { data: existing } = await s
      .from('coaching_subscriptions')
      .select('id, status')
      .eq('coach_id', coach_id)
      .eq('athlete_id', user.id)
      .maybeSingle()

    if (existing && existing.status === 'active') {
      return NextResponse.json({ error: 'Already subscribed to this coach' }, { status: 400 })
    }

    // Calculate commission (sliding scale based on current athlete count)
    const { data: commissionRate } = await s.rpc('get_commission_rate', { p_coach_id: coach_id })
    const rate = commissionRate ?? 0.15
    const amountPence = Math.round(priceGbp * 100)
    const feePence    = Math.round(amountPence * rate)

    // Get or create Stripe customer
    const { data: profile } = await s
      .from('profiles')
      .select('stripe_customer_id, display_name')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id as string | null
    const stripe = getStripe()

    if (!customerId) {
      const customer = await stripe.customers.create({
        email:    user.email ?? undefined,
        name:     profile?.display_name ?? undefined,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await s.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      customer:    customerId,
      mode:        'subscription',
      line_items:  [{
        price_data: {
          currency:    'gbp',
          unit_amount: amountPence,
          recurring:   { interval },
          product_data: {
            name:        `Coaching by ${coach.display_name}`,
            description: `${interval === 'month' ? 'Monthly' : 'Annual'} coaching subscription`,
          },
        },
        quantity: 1,
      }],
      payment_intent_data: {
        application_fee_amount: feePence,
        transfer_data: { destination: coach.stripe_account_id },
      } as never, // Stripe types don't expose this on subscription mode — handled via subscription_data
      subscription_data: {
        application_fee_percent: rate * 100,
        transfer_data:           { destination: coach.stripe_account_id },
        metadata: {
          supabase_user_id:  user.id,
          coach_id,
          commission_rate:   rate.toString(),
          source:            'coaching_subscription',
        },
      },
      success_url: `${config.siteUrl}/coach/${encodeURIComponent(coach_id)}?subscribed=true`,
      cancel_url:  `${config.siteUrl}/coach/${encodeURIComponent(coach_id)}`,
      metadata: {
        supabase_user_id: user.id,
        coach_id,
        commission_rate:  rate.toString(),
        amount_gbp:       priceGbp.toString(),
        source:           'coaching_subscription',
      },
    })

    return NextResponse.json({ url: session.url, session_id: session.id })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Coaching subscribe error:' } })
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 })
  }
}
