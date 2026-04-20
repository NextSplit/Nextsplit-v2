import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlanBuilderClient from './PlanBuilderClient'

export default async function PlanBuilderPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: coach } = await (supabase as any)
    .from('coach_profiles')
    .select('user_id, display_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!coach) redirect('/coach/setup')

  return <PlanBuilderClient coachName={coach.display_name} />
}
