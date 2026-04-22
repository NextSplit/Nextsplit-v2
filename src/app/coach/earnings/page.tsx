import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EarningsDashboardClient from './EarningsDashboardClient'

export const metadata = { title: 'Earnings — NextSplit Coach' }

export default async function EarningsDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = supabase as any

  const { data: coach } = await s
    .from('coach_profiles')
    .select('display_name, stripe_account_id, total_athletes')
    .eq('user_id', user.id)
    .single()

  if (!coach) redirect('/coach/setup')

  const [monthlyRes, ytdRes, rateRes, activeRes] = await Promise.all([
    s.rpc('coach_earnings_summary', { p_coach_id: user.id }),
    s.rpc('coach_earnings_ytd',     { p_coach_id: user.id }),
    s.rpc('get_commission_rate',    { p_coach_id: user.id }),
    s.from('coaching_subscriptions').select('id', { count: 'exact' }).eq('coach_id', user.id).eq('status', 'active'),
  ])

  const { data: recent } = await s
    .from('coach_earnings')
    .select('id, source_type, gross_gbp, commission_gbp, net_gbp, period_month, created_at')
    .eq('coach_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <EarningsDashboardClient
      coach={coach}
      monthly={monthlyRes.data ?? []}
      ytd={ytdRes.data?.[0] ?? { gross_gbp: 0, commission_gbp: 0, net_gbp: 0 }}
      commissionRate={rateRes.data ?? 0.15}
      activeSubscribers={activeRes.count ?? 0}
      recent={recent ?? []}
    />
  )
}
