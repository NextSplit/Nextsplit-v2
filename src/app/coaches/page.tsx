import { createClient } from '@/lib/supabase/server'
import { serverConfig } from '@/lib/config'
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

  // OQ#2 = C — marketplace_listing is Coach-Pro only. When premium is
  // enforced, post-filter to coaches whose coach_profiles.is_coach_pro = true
  // so free Split Leaders can't appear in the public discovery surface.
  // In dev mode (PREMIUM_ENFORCED=false), every coach surfaces — matches
  // the existing soft-gate convention.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let filteredCoaches = (coaches ?? []) as any[]
  if (serverConfig.premiumEnforced && filteredCoaches.length > 0) {
    const ids = filteredCoaches.map((c: { user_id: string }) => c.user_id)
    const { data: proRows } = await s
      .from('coach_profiles')
      .select('user_id, is_coach_pro, coach_pro_expires_at')
      .in('user_id', ids)
      .eq('is_coach_pro', true)
    const now = Date.now()
    const proSet = new Set<string>(
      ((proRows ?? []) as Array<{ user_id: string; coach_pro_expires_at: string | null }>)
        .filter(r => !r.coach_pro_expires_at || new Date(r.coach_pro_expires_at).getTime() > now)
        .map(r => r.user_id),
    )
    filteredCoaches = filteredCoaches.filter((c: { user_id: string }) => proSet.has(c.user_id))
  }

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
      initialCoaches={filteredCoaches}
      viewerLoggedIn={!!user}
      activeCoachId={activeCoachId}
    />
  )
}
