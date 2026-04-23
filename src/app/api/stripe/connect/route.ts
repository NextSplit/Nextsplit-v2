import * as Sentry from '@sentry/nextjs'
import { config } from '@/lib/config'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { db } from '@/lib/supabase/db'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Must be a coach
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: coach } = await (supabase as any)
      .from('coach_profiles')
      .select('user_id, stripe_account_id')
      .eq('user_id', user.id)
      .single()

    if (!coach) return NextResponse.json({ error: 'Not a coach' }, { status: 403 })

    const stripe = getStripe()
    let accountId = coach.stripe_account_id

    // Create Stripe Connect account if not exists
    if (!accountId) {
      const account = await stripe.accounts.create({
        type:         'express',
        country:      'GB',
        email:        user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers:     { requested: true },
        },
        business_type: 'individual',
        metadata: { supabase_user_id: user.id },
      })
      accountId = account.id

      // Save to coach_profiles
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('coach_profiles')
        .update({ stripe_account_id: accountId })
        .eq('user_id', user.id)
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account:     accountId,
      refresh_url: `${config.siteUrl}/coach/squad?stripe=refresh`,
      return_url:  `${config.siteUrl}/coach/squad?stripe=connected`,
      type:        'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })

  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Stripe Connect error:' } })
    return NextResponse.json({ error: 'Failed to create Stripe Connect account' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: coach } = await (supabase as any)
      .from('coach_profiles')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .single()

    if (!coach?.stripe_account_id) {
      return NextResponse.json({ connected: false, charges_enabled: false })
    }

    const stripe  = getStripe()
    const account = await stripe.accounts.retrieve(coach.stripe_account_id)

    return NextResponse.json({
      connected:       true,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
    })

  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Stripe Connect status error:' } })
    return NextResponse.json({ connected: false, charges_enabled: false })
  }
}
