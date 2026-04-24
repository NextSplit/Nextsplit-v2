import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import { redirect } from 'next/navigation'
import CreateSquadClient from './CreateSquadClient'

export const metadata = { title: 'Create Squad — NextSplit' }

export default async function CreateSquadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // If they already lead a squad, redirect to squad dashboard
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await db(supabase)
    .from('squads')
    .select('id')
    .eq('leader_id', user.id)
    .is('disbanded_at', null)
    .maybeSingle()

  if (existing) redirect('/squad')

  return <CreateSquadClient />
}
