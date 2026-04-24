import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import { redirect } from 'next/navigation'
import CoachSetupClient from './CoachSetupClient'

export default async function CoachSetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Already a coach?
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await db(supabase)
    .from('coach_profiles')
    .select('slug')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) redirect('/coach/squad')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await db(supabase)
    .from('profiles')
    .select('display_name, handle')
    .eq('id', user.id)
    .single()

  return (
    <CoachSetupClient
      defaultName={profile?.display_name ?? ''}
      defaultSlug={profile?.handle ?? ''}
    />
  )
}
