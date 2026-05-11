import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExploreClient from './ExploreClient'

export const metadata = { title: 'Explore — NextSplit' }

// R1 — Buried-route close-out. Previously SSR-prefetched featured coaches +
// plans + active-plan id for the AI-coach tab context. After strip-to-hub
// the page renders three cross-links and lets each downstream surface
// (/coaches, /marketplace, /squad) own its own data fetch.
export default async function ExplorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return <ExploreClient />
}
