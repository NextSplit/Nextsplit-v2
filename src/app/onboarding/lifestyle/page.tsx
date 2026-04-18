import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LifestyleOnboardingClient from './LifestyleOnboardingClient'

export default async function LifestyleOnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return <LifestyleOnboardingClient />
}
