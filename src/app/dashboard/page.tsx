import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageErrorBoundary } from '@/components/ErrorBoundary'
import StatsClient from './StatsClient'

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return <PageErrorBoundary name="stats"><StatsClient /></PageErrorBoundary>
}
