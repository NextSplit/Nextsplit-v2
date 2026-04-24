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
  redirect('/you')
}
