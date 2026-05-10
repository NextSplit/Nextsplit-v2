import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CoachDashboardClient from './CoachDashboardClient'

// /coach — canonical coach landing page (P3.1 dashboard v2).
// Replaces the orphaned BottomNav target — previously the Coach tab linked
// here but no page.tsx existed at this level, so it 404'd. The dashboard
// content (athlete-roster overview with at-a-glance health, filters,
// nudge / message CTAs) lived at /coach/squad which is now redirected
// here for back-compat.
//
// Acceptance per docs/ROADMAP.md P3.1:
//   "Athlete-roster overview with at-a-glance health (last log, streak,
//   ACWR band, days-since-message). One-tap into any athlete's plan +
//   comms."
//
// Auth gate is server-side: must be logged in AND have a coach_profiles
// row. Athletes who somehow reach /coach get bounced to /coach/setup
// where they can apply to become one.

export default async function CoachPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: coachProfile } = await supabase
    .from('coach_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!coachProfile) redirect('/coach/setup')

  return <CoachDashboardClient coachProfile={coachProfile} />
}
