import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CoachSettingsClient from './CoachSettingsClient'

export const metadata = { title: 'Coach Settings — NextSplit' }

export default async function CoachSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = supabase as any

  const { data: coach } = await s
    .from('coach_profiles')
    .select(`
      display_name, slug, bio, location, timezone,
      accepting_athletes, max_athletes, total_athletes,
      rate_monthly_gbp, rate_plan_gbp,
      website_url, instagram_handle, strava_profile,
      specialty_tags, distance_tags, athlete_type_tags, language_tags,
      coach_pbs, group_coaching, group_max_size, group_price_gbp,
      verification_tier, stripe_account_id, avg_rating, review_count, is_coach_pro, coach_pro_expires_at
    `)
    .eq('user_id', user.id)
    .single()

  if (!coach) redirect('/coach/setup')

  const { count: activeCount } = await s
    .from('coach_athletes')
    .select('id', { count: 'exact' })
    .eq('coach_id', user.id)
    .eq('status', 'active')

  const isCoachPro = coach?.is_coach_pro === true &&
    (!coach.coach_pro_expires_at || new Date(coach.coach_pro_expires_at) > new Date())

  return (
    <CoachSettingsClient
      coach={coach}
      activeAthletes={activeCount ?? 0}
      userId={user.id}
      isCoachPro={isCoachPro}
    />
  )
}
