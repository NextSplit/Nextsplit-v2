import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdaptTestClient from './AdaptTestClient'

export const metadata = { title: 'Adaptation E2E Test — NextSplit Admin' }

export default async function AdaptTestPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles').select('is_admin, email').eq('id', user.id).single()

  const isAdmin = profile?.is_admin === true ||
    process.env.ADMIN_EMAILS?.split(',').includes(profile?.email ?? '')

  if (!isAdmin) redirect('/home')

  // Fetch user's active plans to test against
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: plans } = await (supabase as any)
    .from('user_plans')
    .select('id, name, current_week, total_weeks, race_date')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return <AdaptTestClient plans={plans ?? []} />
}
