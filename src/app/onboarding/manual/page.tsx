import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ManualOnboardingClient from './ManualOnboardingClient'

export default async function ManualOnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return <ManualOnboardingClient />
}
