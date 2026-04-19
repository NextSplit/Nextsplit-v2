import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db(supabase)
    .from('strava_connections')
    .delete()
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
