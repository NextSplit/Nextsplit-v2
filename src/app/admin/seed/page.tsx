import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SeedPageClient from './SeedPageClient'

export default async function SeedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return <SeedPageClient />
}
