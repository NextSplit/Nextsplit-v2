import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import TrophyRoomClient from './TrophyRoomClient'

export const metadata = { title: 'Trophy Room — NextSplit' }

export default async function TrophyRoomPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = supabase as any

  // Find the user's squad (leader or member)
  let squadId: string | null = null
  let isPremium = false

  const { data: profile } = await s
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  isPremium = profile?.subscription_tier === 'premium'

  const { data: ledSquad } = await s
    .from('squads')
    .select('id, name, colour')
    .eq('leader_id', user.id)
    .is('disbanded_at', null)
    .maybeSingle()

  if (ledSquad) {
    squadId = ledSquad.id
  } else {
    const { data: membership } = await s
      .from('squad_members')
      .select('squad_id, squads(id, name, colour)')
      .eq('user_id', user.id)
      .is('removed_at', null)
      .maybeSingle()
    if (membership?.squads) {
      squadId = membership.squads.id
    }
  }

  if (!squadId) redirect('/squad')

  // Fetch squad info
  const { data: squad } = await s
    .from('squads')
    .select('id, name, colour, goal_type, goal_value, created_at')
    .eq('id', squadId)
    .single()

  // Fetch achievements
  const { data: achievements } = await s
    .from('squad_achievements')
    .select('*')
    .eq('squad_id', squadId)
    .order('earned_at', { ascending: false })

  // Fetch seasons (all time always visible; monthly/annual Premium-gated)
  const { data: seasons } = await s
    .from('squad_seasons')
    .select('*')
    .eq('squad_id', squadId)
    .order('period', { ascending: false })

  // All-time km
  const { data: alltimeKm } = await s.rpc('squad_alltime_km', { p_squad_id: squadId })

  return (
    <TrophyRoomClient
      squad={squad}
      achievements={achievements ?? []}
      seasons={seasons ?? []}
      alltimeKm={alltimeKm ?? 0}
      isPremium={isPremium}
    />
  )
}
