import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HistoryClient from './HistoryClient'
import { PageErrorBoundary } from '@/components/ErrorBoundary'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return <PageErrorBoundary name="history"><HistoryClient /></PageErrorBoundary>
}
