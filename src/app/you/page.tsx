import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageErrorBoundary } from '@/components/ErrorBoundary'
import YouClient from './YouClient'
import type { Profile } from '@/types/database'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'You — NextSplit' }

// P2.2 split: /you renders the lean character/RPG view; the kitchen-sink
// ProfileClient stays at /profile. Strava redirect status is handled at
// /settings now (where the integration UI actually lives), so the
// strava/athlete query params are no longer relevant here.
export default async function YouPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profileData = profile as Profile | null
  const displayName = profileData?.display_name || user.email?.split('@')[0] || 'Runner'

  return (
    <PageErrorBoundary name="you">
      <YouClient
        email={user.email ?? ''}
        displayName={displayName}
      />
    </PageErrorBoundary>
  )
}
