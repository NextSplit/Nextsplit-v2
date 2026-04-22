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

  const { data: rel } = await supabase
    .from('coach_athletes')
    .select('*')
    .eq('coach_id', user.id)
    .eq('athlete_id', athleteId)
    .eq('status', 'active')
    .maybeSingle()

  if (!rel) redirect('/coach/squad')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, age, running_experience, weekly_km_current, handle, runner_class, season_xp')
    .eq('id', athleteId)
    .single()

  // 12 weeks for ACWR chart
  const twelveWeeksAgo = new Date(Date.now() - 84 * 24 * 3600 * 1000).toISOString()
  const { data: logs } = await supabase
    .from('training_logs')
    .select('week_n, day_i, session_i, done, km, pace, effort, duration_secs, logged_at, notes')
    .eq('user_id', athleteId)
    .gte('logged_at', twelveWeeksAgo)
    .order('logged_at', { ascending: false })
    .limit(200)

  const { data: wellness } = await supabase
    .from('wellness_logs')
    .select('log_date, sleep, energy, mood, soreness, weight_kg')
    .eq('user_id', athleteId)
    .order('log_date', { ascending: false })
    .limit(30)

  const { data: plans } = await supabase
    .from('user_plans')
    .select('id, name, plan_type, total_weeks, current_week, status, race_date, weeks_data')
    .eq('user_id', athleteId)
    .eq('status', 'active')
    .limit(1)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = supabase as any
  const { data: messages } = await s
    .from('coach_messages')
    .select('id, sender_id, body, created_at, read_at, reaction, reaction_at, is_scheduled')
    .or(`coach_id.eq.${user.id},athlete_id.eq.${athleteId}`)
    .eq('is_scheduled', false)
    .order('created_at', { ascending: false })
    .limit(20)

  // Check Coach Pro status
  const { data: coachProfile } = await s
    .from('coach_profiles')
    .select('is_coach_pro, coach_pro_expires_at')
    .eq('user_id', user.id)
    .single()

  const isCoachPro = coachProfile?.is_coach_pro === true &&
    (!coachProfile.coach_pro_expires_at || new Date(coachProfile.coach_pro_expires_at) > new Date())

  return (
    <AthleteDetailClient
      athleteId={athleteId}
      coachId={user.id}
      profile={profile}
      logs={logs ?? []}
      wellness={wellness ?? []}
      activePlan={plans?.[0] ?? null}
      relationship={rel}
      messages={messages ?? []}
      isCoachPro={isCoachPro}
    />
  )
}
