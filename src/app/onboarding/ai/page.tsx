import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AIOnboardingClient from './AIOnboardingClient'

export default async function AIOnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return <AIOnboardingClient />
}
