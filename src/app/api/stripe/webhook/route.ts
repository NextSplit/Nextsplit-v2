import { db } from '@/lib/supabase/db'
import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { getStripe, incrementFoundingCount, PRICES } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { config, serverConfig } from '@/lib/config'

// Use service role for webhook — bypasses RLS (only place in the codebase that uses service role)
function getServiceClient() {
  return createClient(
    config.supabaseUrl,
    serverConfig.supabaseServiceRoleKey
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
      serverConfig.stripeWebhookSecret
    )
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Webhook signature verification failed:' } })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = getServiceClient()

  try {
    switch (event.type) {



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
        }
        break
      }

      // ── Coaching subscription activated ─────────────────────────────────────
      case 'checkout.session.completed': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const session = event.data.object as any
        const source  = session.metadata?.source

        if (source === 'coaching_subscription') {
          const athleteId      = session.metadata?.supabase_user_id
          const coachId        = session.metadata?.coach_id
          const commissionRate = parseFloat(session.metadata?.commission_rate ?? '0.15')
          const amountGbp      = parseFloat(session.metadata?.amount_gbp ?? '0')
          const commissionGbp  = Math.round(amountGbp * commissionRate * 100) / 100
          const netGbp         = Math.round((amountGbp - commissionGbp) * 100) / 100

          if (athleteId && coachId) {
            const stripeSub = session.subscription
              ? await getStripe().subscriptions.retrieve(session.subscription as string)
              : null

            // Upsert coaching subscription record
            await supabase.from('coaching_subscriptions').upsert({
              coach_id:               coachId,
              athlete_id:             athleteId,
              stripe_subscription_id: stripeSub?.id ?? null,
              status:                 'active',
              amount_gbp:             amountGbp,
              commission_rate:        commissionRate,
              commission_gbp:         commissionGbp,
              coach_payout_gbp:       netGbp,
              billing_interval:       'month',
              current_period_start:   stripeSub ? new Date(((stripeSub as any).current_period_start) * 1000).toISOString() : new Date().toISOString(),
              current_period_end:     stripeSub ? new Date(((stripeSub as any).current_period_end) * 1000).toISOString() : null,
              updated_at:             new Date().toISOString(),
            }, { onConflict: 'coach_id,athlete_id' })

            // Record earnings entry
            const periodMonth = new Date().toISOString().slice(0, 7)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await db(supabase).from('coach_earnings').insert({
              coach_id:        coachId,
              athlete_id:      athleteId,
              source_type:     'subscription',
              gross_gbp:       amountGbp,
              commission_rate: commissionRate,
              commission_gbp:  commissionGbp,
              net_gbp:         netGbp,
              period_month:    periodMonth,
            }).catch(() => {})

            // Add to coach_athletes if not already there
            await supabase.from('coach_athletes').upsert({
              coach_id:    coachId,
              athlete_id:  athleteId,
              status:      'active',
              accepted_at: new Date().toISOString(),
            }, { onConflict: 'coach_id,athlete_id' })

            // Update coach total_athletes count (increment)
            const { count: athleteCount } = await supabase
              .from('coaching_subscriptions')
              .select('id', { count: 'exact' })
              .eq('coach_id', coachId)
              .eq('status', 'active')
            await supabase.from('coach_profiles')
              .update({ total_athletes: athleteCount ?? 0 })
              .eq('user_id', coachId)

          }
          break
        }

        // Fall through to original NextSplit Premium handler
        if (session.mode !== 'subscription') break
        const userId     = session.metadata?.supabase_user_id
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

        if (isFounding) {
          const serverSupabase = await (await import('@/lib/supabase/server')).createClient()
          await incrementFoundingCount(serverSupabase)
        }
        break
      }

      default:
    }

    return NextResponse.json({ received: true })

  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Webhook handler error:' } })
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }
}
