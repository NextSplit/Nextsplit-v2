import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/coaching/earnings
 * Returns the authenticated coach's earnings summary:
 *   - Monthly breakdown (last 12 months)
 *   - YTD totals
 *   - Active subscriber count
 *   - Commission rate
 *   - Stripe dashboard link
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    // Verify coach
    const { data: coach } = await s
      .from('coach_profiles')
      .select('stripe_account_id, total_athletes, display_name')
      .eq('user_id', user.id)
      .single()

    if (!coach) return NextResponse.json({ error: 'Not a coach' }, { status: 403 })

    // Monthly summary
    const { data: monthly } = await s.rpc('coach_earnings_summary', { p_coach_id: user.id })

    // YTD totals
    const { data: ytd } = await s.rpc('coach_earnings_ytd', { p_coach_id: user.id })

    // Current commission rate
    const { data: commissionRate } = await s.rpc('get_commission_rate', { p_coach_id: user.id })

    // Active subscribers
    const { count: activeCount } = await s
      .from('coaching_subscriptions')
      .select('id', { count: 'exact' })
      .eq('coach_id', user.id)
      .eq('status', 'active')

    // Recent individual earnings (last 20)
    const { data: recent } = await s
      .from('coach_earnings')
      .select(`
        id, source_type, gross_gbp, commission_gbp, net_gbp, period_month, created_at,
        profiles!athlete_id(display_name, handle)
      `)
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Plan sales
    const { data: planSales } = await s
      .from('plan_purchases')
      .select('id, amount_gbp, coach_payout_gbp, created_at, plan_templates(name)')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      monthly:         monthly ?? [],
      ytd:             ytd?.[0] ?? { gross_gbp: 0, commission_gbp: 0, net_gbp: 0 },
      commission_rate: commissionRate ?? 0.15,
      active_subscribers: activeCount ?? 0,
      recent:          recent ?? [],
      plan_sales:      planSales ?? [],
      stripe_account_id: coach.stripe_account_id,
    })
  } catch (err) {
    console.error('Earnings fetch error:', err)
    return NextResponse.json({ error: 'Failed to load earnings' }, { status: 500 })
  }
}
