import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'
import { PageErrorBoundary } from '@/components/ErrorBoundary'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  return (
    <PageErrorBoundary name="settings">
      <SettingsClient
        email={user.email ?? ''}
        initialProfile={profile}
      />
    </PageErrorBoundary>
  )
}
