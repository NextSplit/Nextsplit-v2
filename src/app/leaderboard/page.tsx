import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LeaderboardClient from './LeaderboardClient'

// Council /forge v1 marketing-growth lens + /council R2 dissent: ship a
// passive leaderboard surface as the "Race V0". No new race mechanic, no
// character system, no XP multipliers — just rank-by-existing-data weekly
// km display. Lets users see the leaderboard shape ahead of the full
// Phase 3+ Race tab build, and gives the team a real surface to point at
// when refining the gamification spec.

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Leaderboard — NextSplit' }

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return <LeaderboardClient userId={user.id} />
}
