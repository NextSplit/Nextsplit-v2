import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlanRequestClient from './PlanRequestClient'

export const metadata = { title: 'Request a Plan — NextSplit' }

export default async function PlanRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ coach?: string }>
}) {
  const { coach: coachId } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  if (!coachId) redirect('/today')

  // Verify the coach exists and is active
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: coach } = await (supabase as any)
    .from('coach_profiles')
    .select('user_id, display_name, verified')
    .eq('user_id', coachId)
    .maybeSingle()

  if (!coach) redirect('/today')

  return (
    <PlanRequestClient
      coachId={coachId}
      coachName={coach.display_name ?? 'Your coach'}
    />
  )
}
