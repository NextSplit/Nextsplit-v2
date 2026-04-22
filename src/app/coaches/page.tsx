import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import CoachesBrowseClient from './CoachesBrowseClient'

export const metadata: Metadata = {
  title: 'Find a Coach — NextSplit',
  description: 'Browse verified running coaches. Find your perfect training partner.',
}

export default async function CoachesBrowsePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient()
  const s = supabase as any

  const { data: { user } } = await supabase.auth.getUser()

  // Initial load — featured + top rated
  const { data: coaches } = await s.rpc('marketplace_coaches', {
    p_specialty:     null,
    p_distance:      null,
    p_max_price:     null,
    p_language:      null,
    p_verified_only: false,
    p_limit:         20,
    p_offset:        0,
  })

  // Viewer's active coach (if any)
  let activeCoachId: string | null = null
  if (user) {
    const { data: rel } = await s
      .from('coach_athletes')
      .select('coach_id')
      .eq('athlete_id', user.id)
      .eq('status', 'active')
      .maybeSingle()
    activeCoachId = rel?.coach_id ?? null
  }

  return (
    <CoachesBrowseClient
      initialCoaches={coaches ?? []}
      viewerLoggedIn={!!user}
      activeCoachId={activeCoachId}
    />
  )
}
