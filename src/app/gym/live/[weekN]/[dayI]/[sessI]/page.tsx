import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GymLiveWrapper from '@/app/gym/live/GymLiveWrapper'

interface Props {
  params: Promise<{ weekN: string; dayI: string; sessI: string }>
}

export default async function GymLivePage({ params }: Props) {
  const { weekN, dayI, sessI } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <GymLiveWrapper
      weekN={parseInt(weekN)}
      dayIndex={parseInt(dayI)}
      sessionIndex={parseInt(sessI)}
    />
  )
}
