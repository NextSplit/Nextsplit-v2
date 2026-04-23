import * as Sentry from '@sentry/nextjs'
import { config } from '@/lib/config'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe, PRICES, isFoundingAvailable } from '@/lib/stripe'
import { db } from '@/lib/supabase/db'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { interval } = await req.json() // 'monthly' | 'annual'

    // Get or create Stripe customer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('stripe_customer_id, display_name, is_pro')
      .eq('id', user.id)
      .single()

    if (profile?.is_pro) {
      return NextResponse.json({ error: 'Already subscribed' }, { status: 400 })
    }

    let customerId = profile?.stripe_customer_id as string | null

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email:    user.email,
        name:     profile?.display_name ?? undefined,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      await db(supabase).from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Choose price based on founding availability
    const founding = await isFoundingAvailable(supabase)
    const priceId  = interval === 'annual'
      ? (founding ? PRICES.founding_annual  : PRICES.standard_annual)
      : (founding ? PRICES.founding_monthly : PRICES.standard_monthly)

    const isFoundingPrice = priceId === PRICES.founding_monthly || priceId === PRICES.founding_annual

    // Create Checkout session
    const session = await getStripe().checkout.sessions.create({
      customer:             customerId,
      mode:                 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price:    priceId,
        quantity: 1,
      }],
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          supabase_user_id: user.id,
          is_founding:      String(isFoundingPrice),
        },
      },
      success_url: `${config.siteUrl}/today?upgrade=success`,
      cancel_url:  `${config.siteUrl}/profile?upgrade=cancelled`,
      metadata: {
        supabase_user_id: user.id,
        is_founding:      String(isFoundingPrice),
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    })

    return NextResponse.json({ url: session.url })

  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Stripe checkout error:' } })
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}
