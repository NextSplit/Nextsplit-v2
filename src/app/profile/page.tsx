import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageErrorBoundary } from '@/components/ErrorBoundary'
import ProfileClient from './ProfileClient'
import type { Profile } from '@/types/database'

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ strava?: string; athlete?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profileData = profile as Profile | null
  const displayName = profileData?.display_name || user.email?.split('@')[0] || 'Runner'

  // Check Strava connection
  const { data: stravaConn } = await supabase
    .from('strava_connections')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  const { strava, athlete } = await searchParams

  return (
    <PageErrorBoundary name="profile">
      <ProfileClient
        email={user.email ?? ''}
        displayName={displayName}
        isStravaConnected={!!stravaConn}
        stravaStatus={strava}
        stravaAthlete={athlete}
      />
    </PageErrorBoundary>
  )
}
