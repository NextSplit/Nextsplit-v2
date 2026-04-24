import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HomeClient from './HomeClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Home — NextSplit',
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Load all signals needed to determine home state server-side
  const [profileRes, planRes, coachAthleteRes, squadRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('user_plans').select('id,name,plan_type,current_week,total_weeks,race_date,weeks_data,goal,meta')
      .eq('user_id', user.id).eq('status', 'active').maybeSingle(),
    (supabase as any).from('coach_athletes').select('coach_id,status').eq('athlete_id', user.id).eq('status', 'active').maybeSingle(),
    (supabase as any).from('squad_members').select('squad_id').eq('user_id', user.id).maybeSingle(),
  ])

  // Load coach profile if has coach
  let coachProfile = null
  if (coachAthleteRes.data?.coach_id) {
    const { data } = await supabase
      .from('coach_profiles')
      .select('display_name, slug, photo_url, verified')
      .eq('user_id', coachAthleteRes.data.coach_id)
      .single()
    coachProfile = data
  }

  // Load squad if member
  let squad = null
  if ((squadRes.data as any)?.squad_id) {
    const { data } = await supabase
      .from('squads')
      .select('id,name,colour,leader_id,goal_type,goal_value,goal_month')
      .eq('id', (squadRes.data as any).squad_id)
      .single()
    squad = data
  }

  // Load recent training logs for streak + this week stats
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const { data: recentLogs } = await supabase
    .from('training_logs')
    .select('done,km,created_at,week_n,day_i,session_i')
    .eq('user_id', user.id)
    .eq('done', true)
    .gte('created_at', weekAgo.toISOString())
    .order('created_at', { ascending: false })

  // Check if coach (has coach_profiles row)
  const { data: coachProfileSelf } = await supabase
    .from('coach_profiles')
    .select('user_id,athlete_count')
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <HomeClient
      profile={profileRes.data}
      activePlan={planRes.data}
      coachProfile={coachProfile}
      hasCoach={!!coachAthleteRes.data}
      squad={squad}
      isCoach={!!coachProfileSelf}
      recentLogs={recentLogs ?? []}
    />
  )
}
