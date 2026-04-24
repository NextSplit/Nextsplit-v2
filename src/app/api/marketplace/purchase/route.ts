import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { PurchasePlanSchema, zodError } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'

/**
 * POST /api/marketplace/purchase
 * For free plans: records purchase + activates immediately.
 * For paid plans: records purchase (Stripe Connect payment handled client-side first).
 *
 * Body: { template_id, stripe_payment_intent_id? }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = PurchasePlanSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { template_id, stripe_payment_intent_id } = parsed.data
    if (!template_id) return NextResponse.json({ error: 'template_id required' }, { status: 400 })

    // Fetch plan details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: plan, error: planErr } = await db(supabase)
      .from('plan_templates')
      .select('id, name, meta, is_public, author_type, author_id, weeks_data, weeks_min, weeks_max, distance, level, total_starts')
      .eq('id', template_id)
      .eq('is_public', true)
      .single()

    if (planErr || !plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

    const priceGbp = (plan.meta as Record<string, unknown>)?.price_gbp as number | null ?? 0
    const isFree   = !priceGbp || priceGbp === 0
    const isOwn    = plan.author_type === 'nextsplit'

    // For paid plans, require payment intent
    if (!isFree && !isOwn && !stripe_payment_intent_id) {
      return NextResponse.json({
        error: 'Payment required',
        price_gbp: priceGbp,
        requires_payment: true,
      }, { status: 402 })
    }

    // Check if already purchased
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await db(supabase)
      .from('plan_purchases')
      .select('id')
      .eq('athlete_id', user.id)
      .eq('template_id', template_id)
      .maybeSingle()

    if (!existing) {
      // Record purchase with full schema: athlete_id, template_id, coach_id, amount_gbp
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db(supabase)
        .from('plan_purchases')
        .insert({
          athlete_id:        user.id,
          template_id:       template_id,
          coach_id:          plan.author_id ?? null,
          amount_gbp:        priceGbp,
          stripe_payment_id: stripe_payment_intent_id ?? null,
          coach_payout_gbp:  priceGbp ? Math.round(priceGbp * 0.7 * 100) / 100 : 0,
          platform_fee_gbp:  priceGbp ? Math.round(priceGbp * 0.3 * 100) / 100 : 0,
        })

      // Increment total_starts on the template
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db(supabase)
        .from('plan_templates')
        .update({ total_starts: (plan.total_starts ?? 0) + 1 })
        .eq('id', template_id)
    }

    // Activate plan — archive existing active plan first
    await supabase
      .from('user_plans')
      .update({ status: 'archived', updated_at: new Date().toISOString() } as never)
      .eq('user_id', user.id)
      .eq('status', 'active')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newPlan, error: createErr } = await db(supabase)
      .from('user_plans')
      .insert({
        user_id:      user.id,
        template_id:  template_id,
        plan_type:    'predetermined',
        status:       'active',
        name:         plan.name,
        start_date:   new Date().toISOString().slice(0, 10),
        total_weeks:  plan.weeks_max ?? plan.weeks_min ?? 12,
        current_week: 1,
        weeks_data:   plan.weeks_data,
        meta:         { source: 'marketplace', template_id },
      })
      .select()
      .single()

    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })

    return NextResponse.json({ success: true, plan: newPlan })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Marketplace purchase error:' } })
    return NextResponse.json({ error: 'Purchase failed' }, { status: 500 })
  }
}
