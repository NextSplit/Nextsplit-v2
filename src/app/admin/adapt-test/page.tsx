import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import { redirect } from 'next/navigation'
import AdaptTestClient from './AdaptTestClient'

export const metadata = { title: 'Adaptation E2E Test — NextSplit Admin' }

// Admin gate via ADMIN_EMAILS allow-list against user.email from auth —
// the earlier profiles.is_admin/email query never worked because those
// columns don't exist on the live profiles table (verified 2026-05-08).
export default async function AdaptTestPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!adminEmails.includes(user.email ?? '')) redirect('/home')

  // Fetch user's active plans to test against
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: plans } = await db(supabase)
    .from('user_plans')
    .select('id, name, current_week, total_weeks, race_date')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return <AdaptTestClient plans={plans ?? []} />
}
