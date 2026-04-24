import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlanReviewClient from './PlanReviewClient'

export const metadata = {
  title: 'AI Plan Quality Review — NextSplit Admin',
}

/**
 * /admin/plan-review — Phase A3
 * Gated to admin users (is_admin flag on profiles, or founder email).
 * Allows generating + reviewing AI plans before alpha users see them.
 */
export default async function PlanReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Gate to admin users only
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('is_admin, email')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.is_admin === true ||
    process.env.ADMIN_EMAILS?.split(',').includes(profile?.email ?? '')

  if (!isAdmin) redirect('/home')

  return <PlanReviewClient />
}
