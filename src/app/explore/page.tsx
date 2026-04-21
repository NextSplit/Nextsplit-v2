import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExploreClient from './ExploreClient'

export const metadata = { title: 'Explore — NextSplit' }

export default async function ExplorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch featured coaches
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: coaches } = await (supabase as any)
    .from('coach_profiles')
    .select('user_id, display_name, slug, verified, photo_url, profiles(runner_class)')
    .eq('verified', true)
    .limit(6)

  // Fetch featured marketplace plans
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: plans } = await (supabase as any)
    .from('plan_templates')
    .select('id, name, subtitle, distance, level, weeks_min, peak_km_week, avg_rating, review_count, meta')
    .eq('author_type', 'coach')
    .eq('is_public', true)
    .order('avg_rating', { ascending: false })
    .limit(6)

  // Fetch user's active plan for AI coaching context
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: activePlan } = await (supabase as any)
    .from('user_plans')
    .select('id, name, current_week, total_weeks')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  return (
    <ExploreClient
      coaches={coaches ?? []}
      featuredPlans={plans ?? []}
      activePlanId={activePlan?.id ?? null}
    />
  )
}
