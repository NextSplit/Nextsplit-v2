import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RacesClient from './RacesClient'

export default async function RacesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return <RacesClient />
}
