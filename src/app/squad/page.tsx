import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SquadPageClient from './SquadPageClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'My Squad — NextSplit' }

export default async function SquadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Minimal server component - just auth check, client handles data fetching
  return <SquadPageClient userId={user.id} />
}
