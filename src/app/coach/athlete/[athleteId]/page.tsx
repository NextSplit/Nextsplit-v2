import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AthleteDetailClient from './AthleteDetailClient'

export default async function AthleteDetailPage({
  params,
}: {
  params: Promise<{ athleteId: string }>
}) {
  const { athleteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Verify coach-athlete relationship
  const { data: rel } = await supabase
    .from('coach_athletes')
    .select('*')
    .eq('coach_id', user.id)
    .eq('athlete_id', athleteId)
    .eq('status', 'active')
    .maybeSingle()

  if (!rel) redirect('/coach/squad')

  // Fetch athlete profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, age, running_experience, weekly_km_current, handle')
    .eq('id', athleteId)
    .single()

  // Fetch recent training logs (last 4 weeks)
  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 3600 * 1000).toISOString()
  const { data: logs } = await supabase
    .from('training_logs')
    .select('week_n, day_i, session_i, done, km, pace, effort, duration_secs, logged_at')
    .eq('user_id', athleteId)
    .gte('logged_at', fourWeeksAgo)
    .order('logged_at', { ascending: false })
    .limit(50)

  // Fetch recent wellness logs
  const { data: wellness } = await supabase
    .from('wellness_logs')
    .select('log_date, sleep, energy, mood, soreness, weight_kg')
    .eq('user_id', athleteId)
    .order('log_date', { ascending: false })
    .limit(14)

  // Fetch active plan
  const { data: plans } = await supabase
    .from('user_plans')
    .select('id, name, plan_type, total_weeks, current_week, status, race_date')
    .eq('user_id', athleteId)
    .eq('status', 'active')
    .limit(1)

  return (
    <AthleteDetailClient
      athleteId={athleteId}
      coachId={user.id}
      profile={profile}
      logs={logs ?? []}
      wellness={wellness ?? []}
      activePlan={plans?.[0] ?? null}
      relationship={rel}
    />
  )
}
