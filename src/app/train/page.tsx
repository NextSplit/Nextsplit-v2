import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TrainClient from './TrainClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Train — NextSplit' }

export default async function TrainPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return <TrainClient />
}
