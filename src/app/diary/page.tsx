import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DiaryClient from './DiaryClient'

export const metadata = { title: 'Training Diary — NextSplit' }

export default async function DiaryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: logs } = await (supabase as any)
    .from('training_logs')
    .select('id, done, km, effort, pace, hr, duration_secs, notes, created_at, week_n')
    .eq('user_id', user.id)
    .eq('done', true)
    .not('notes', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100)

  return <DiaryClient logs={logs ?? []} />
}
