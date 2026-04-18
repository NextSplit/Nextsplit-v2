import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlanClient from './PlanClient'

export default async function PlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return <PlanClient />
}
