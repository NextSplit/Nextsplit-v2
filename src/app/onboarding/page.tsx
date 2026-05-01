import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingEntry from './OnboardingEntry'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { step } = await searchParams
  const initialStep = step ? Math.max(1, parseInt(step, 10)) : 1

  // Load existing profile to pre-populate context on re-onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, handle, date_of_birth, biological_sex, weight_kg')
    .eq('id', user.id)
    .maybeSingle()

  return <OnboardingEntry initialStep={initialStep} existingProfile={profile} />
}
