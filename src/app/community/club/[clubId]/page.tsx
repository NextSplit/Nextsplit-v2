import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import { redirect, notFound } from 'next/navigation'
import ClubDetailClient from './ClubDetailClient'

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const supabase   = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: club } = await db(supabase)
    .from('clubs')
    .select('*')
    .eq('id', clubId)
    .maybeSingle()

  if (!club) notFound()

  // Check membership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await db(supabase)
    .from('club_members')
    .select('role, weekly_km, season_xp')
    .eq('club_id', clubId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership && !club.is_public) redirect('/community')

  // Leaderboard (top members by weekly km)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: members } = await db(supabase)
    .from('club_members')
    .select('user_id, role, weekly_km, season_xp, profiles(display_name, handle, current_league)')
    .eq('club_id', clubId)
    .order('weekly_km', { ascending: false })
    .limit(50)

  // Recent feed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: feed } = await db(supabase)
    .from('club_feed')
    .select('*, profiles(display_name, handle)')
    .eq('club_id', clubId)
    .order('logged_at', { ascending: false })
    .limit(20)

  return (
    <ClubDetailClient
      club={club}
      membership={membership}
      members={members ?? []}
      feed={feed ?? []}
      userId={user.id}
    />
  )
}
