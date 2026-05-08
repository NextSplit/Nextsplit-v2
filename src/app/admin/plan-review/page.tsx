import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlanReviewClient from './PlanReviewClient'

export const metadata = {
  title: 'AI Plan Quality Review — NextSplit Admin',
}

/**
 * /admin/plan-review — Phase A3
 * Gated to admin users via ADMIN_EMAILS allow-list against user.email
 * from auth.getUser(). The earlier `profiles.is_admin/email` query was a
 * dead-end (verified 2026-05-08 — neither column exists on the live
 * profiles table), so it redirected every user including the founder.
 * Allows generating + reviewing AI plans before alpha users see them.
 */
export default async function PlanReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!adminEmails.includes(user.email ?? '')) redirect('/home')

  return <PlanReviewClient />
}
