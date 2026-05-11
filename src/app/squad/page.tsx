import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import SquadPageClient from './SquadPageClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'My Squad — NextSplit' }

export default async function SquadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <Suspense fallback={null}>
      <SquadPageClient userId={user.id} />
    </Suspense>
  )
}
