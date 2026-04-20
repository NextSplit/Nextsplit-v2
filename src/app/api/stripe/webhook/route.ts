import { NextRequest, NextResponse } from 'next/server'
import { getStripe, incrementFoundingCount, PRICES } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Use service role for webhook — bypasses RLS
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = getServiceClient()

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const session = event.data.object as any
        if (session.mode !== 'subscription') break

        const userId    = session.metadata?.supabase_user_id
        const isFounding = session.metadata?.is_founding === 'true'
        if (!userId) break

        const sub = await getStripe().subscriptions.retrieve(session.subscription as string)

        await supabase.from('profiles').update({
          is_pro:                  true,
          stripe_subscription_id:  sub.id,
          stripe_price_id:         sub.items.data[0]?.price.id,
          subscription_status:     isFounding ? 'founding' : sub.status,
          pro_expires_at:          new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
        }).eq('id', userId)

        // Increment founding count if applicable
        if (isFounding) {
          const serverSupabase = await (await import('@/lib/supabase/server')).createClient()
          await incrementFoundingCount(serverSupabase)
        }

        console.log(`✅ Pro activated for user ${userId} (founding: ${isFounding})`)
        break
      }

      case 'customer.subscription.updated': {
        const sub    = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.supabase_user_id

        // Find user by stripe_subscription_id if no metadata
        let uid = userId
        if (!uid) {
          const { data } = await supabase
            .from('profiles')
            .select('id')
            .eq('stripe_subscription_id', sub.id)
            .single()
          uid = data?.id
        }
        if (!uid) break

        const isActive    = ['active', 'trialing'].includes(sub.status)
        const isFounding  = sub.items.data[0]?.price.id === PRICES.founding_monthly ||
                            sub.items.data[0]?.price.id === PRICES.founding_annual

        await supabase.from('profiles').update({
          is_pro:               isActive,
          stripe_price_id:      sub.items.data[0]?.price.id,
          subscription_status:  isFounding && isActive ? 'founding' : sub.status,
          pro_expires_at:       new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
        }).eq('id', uid)

        console.log(`✅ Subscription updated for user ${uid}: ${sub.status}`)
        break
      }

      case 'customer.subscription.deleted': {
        const sub    = event.data.object as Stripe.Subscription

        // Find user by stripe_subscription_id
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_subscription_id', sub.id)
          .single()

        if (data?.id) {
          await supabase.from('profiles').update({
            is_pro:              false,
            subscription_status: 'canceled',
            pro_expires_at:      new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
          }).eq('id', data.id)
          console.log(`✅ Subscription cancelled for user ${data.id}`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }
}
