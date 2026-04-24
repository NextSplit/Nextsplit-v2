import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import { notFound } from 'next/navigation'
import CoachProfileClient from './CoachProfileClient'

export default async function CoachPublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: coach } = await db(supabase)
    .from('coach_profiles')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!coach) notFound()

  // Fetch their published plans
  const { data: plans } = await supabase
    .from('plan_templates')
    .select('id, name, distance, level, weeks_min, weeks_max, description, meta')
    .eq('author_id', coach.user_id)
    .eq('is_public', true)
    .limit(6)

  // Check if viewer is logged in
  const { data: { user } } = await supabase.auth.getUser()
  const isOwnProfile = user?.id === coach.user_id

  return (
    <CoachProfileClient
      coach={coach}
      plans={plans ?? []}
      isOwnProfile={isOwnProfile}
      viewerLoggedIn={!!user}
    />
  )
}
