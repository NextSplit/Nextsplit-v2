import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingEntry from './OnboardingEntry'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return <OnboardingEntry />
}
