import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import { redirect } from 'next/navigation'
import CoachMarketplaceClient from './CoachMarketplaceClient'

export const metadata = { title: 'My Plans — NextSplit Coach' }

export default async function CoachMarketplacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Verify professional coach
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await db(supabase)
    .from('profiles')
    .select('is_coach, coach_tier')
    .eq('id', user.id)
    .single()

  if (!profile?.is_coach) redirect('/coach/setup')

  // Fetch coach's published plans with performance data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: plans } = await db(supabase)
    .from('plan_templates')
    .select('id, name, distance, level, is_public, avg_completion_rate, total_starts, avg_rating, review_count, meta, created_at')
    .eq('author_id', user.id)
    .eq('author_type', 'coach')
    .order('total_starts', { ascending: false })

  // Fetch purchase records for revenue data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: purchases } = await db(supabase)
    .from('plan_purchases')
    .select('template_id, amount_gbp, coach_payout_gbp, created_at')
    .eq('coach_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <CoachMarketplaceClient
      plans={plans ?? []}
      purchases={purchases ?? []}
      coachTier={profile?.coach_tier ?? 'split_leader'}
    />
  )
}
