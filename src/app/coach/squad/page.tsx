import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SquadClient from './SquadClient'

export default async function SquadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Must be a coach
  const { data: coachProfile } = await supabase
    .from('coach_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!coachProfile) redirect('/coach/setup')

  return <SquadClient coachProfile={coachProfile} />
}
