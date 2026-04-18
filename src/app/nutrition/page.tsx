import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NutritionClient from './NutritionClient'

export default async function NutritionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return <NutritionClient />
}
