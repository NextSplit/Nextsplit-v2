import { NextRequest, NextResponse } from 'next/server'
import { ChallengeActionSchema, zodError } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient() as AnyClient
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const now = new Date().toISOString()

    // Active global challenges + user's entries
    const { data: challenges } = await supabase
      .from('challenges')
      .select('*')
      .eq('is_global', true)
      .lte('starts_at', now)
      .gte('ends_at', now)
      .order('ends_at', { ascending: true })

    // User's entries
    const { data: entries } = await supabase
      .from('challenge_entries')
      .select('challenge_id, progress, completed')
      .eq('user_id', user.id)

    const entryMap = Object.fromEntries((entries ?? []).map((e: { challenge_id: string; progress: number; completed: boolean }) => [e.challenge_id, e]))

    return NextResponse.json({
      challenges: (challenges ?? []).map((c: { id: string }) => ({
        ...c,
        my_entry: entryMap[c.id] ?? null,
      })),
    })

  } catch (err) {
    console.error('Get challenges error:', err)
    return NextResponse.json({ error: 'Failed to fetch challenges' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient() as AnyClient
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = ChallengeActionSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { challenge_id, action } = parsed.data
    if (!challenge_id) return NextResponse.json({ error: 'challenge_id required' }, { status: 400 })

    if (action === 'join') {
      const { data: existing } = await supabase
        .from('challenge_entries').select('id').eq('challenge_id', challenge_id).eq('user_id', user.id).maybeSingle()

      if (existing) return NextResponse.json({ error: 'Already entered' }, { status: 409 })

      await supabase.from('challenge_entries').insert({ challenge_id, user_id: user.id, progress: 0 })
      // Increment entry count
      await supabase.rpc('increment', { table: 'challenges', field: 'entry_count', row_id: challenge_id })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  } catch (err) {
    console.error('Challenge action error:', err)
    return NextResponse.json({ error: 'Failed to process challenge action' }, { status: 500 })
  }
}
