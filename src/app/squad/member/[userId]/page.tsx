import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import MemberProfileClient from './MemberProfileClient'

export default async function SquadMemberPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { userId } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = supabase as any

  const [profileRes, planRes, logsRes] = await Promise.all([
    s.from('profiles').select('id, display_name, handle, runner_class, runner_colour, bio, is_split_leader').eq('id', userId).single(),
    s.from('user_plans').select('name, goal, race_date, current_week, total_weeks, plan_type').eq('user_id', userId).eq('status', 'active').maybeSingle(),
    s.from('training_logs').select('done, km, effort, created_at, week_n').eq('user_id', userId).eq('done', true).gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()).order('created_at', { ascending: false }),
  ])

  if (!profileRes.data) notFound()

  return (
    <MemberProfileClient
      profile={profileRes.data}
      plan={planRes.data}
      logs={logsRes.data ?? []}
      viewerId={user.id}
    />
  )
}
