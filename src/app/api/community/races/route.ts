import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient() as AnyClient
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const now = new Date().toISOString()

    // Upcoming + active races
    const { data: races } = await supabase
      .from('virtual_races')
      .select('*')
      .gte('ends_at', now)
      .order('starts_at', { ascending: true })
      .limit(10)

    // User's entries
    const { data: entries } = await supabase
      .from('virtual_race_entries')
      .select('race_id, finish_time_secs, position, submitted_at')
      .eq('user_id', user.id)

    const entryMap = Object.fromEntries(
      (entries ?? []).map((e: { race_id: string }) => [e.race_id, e])
    )

    return NextResponse.json({
      races: (races ?? []).map((r: { id: string }) => ({
        ...r,
        my_entry: entryMap[r.id] ?? null,
      })),
    })

  } catch (err) {
    console.error('Get races error:', err)
    return NextResponse.json({ error: 'Failed to fetch races' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient() as AnyClient
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { race_id, action, finish_time_secs } = await req.json()
    if (!race_id) return NextResponse.json({ error: 'race_id required' }, { status: 400 })

    // Verify race exists and is active
    const { data: race } = await supabase
      .from('virtual_races').select('id, ends_at, entry_count, max_entries').eq('id', race_id).single()

    if (!race) return NextResponse.json({ error: 'Race not found' }, { status: 404 })
    if (new Date(race.ends_at) < new Date()) return NextResponse.json({ error: 'Race has ended' }, { status: 400 })
    if (race.max_entries && race.entry_count >= race.max_entries) {
      return NextResponse.json({ error: 'Race is full' }, { status: 400 })
    }

    if (action === 'enter') {
      const { data: existing } = await supabase
        .from('virtual_race_entries').select('id').eq('race_id', race_id).eq('user_id', user.id).maybeSingle()
      if (existing) return NextResponse.json({ error: 'Already entered' }, { status: 409 })

      await supabase.from('virtual_race_entries').insert({ race_id, user_id: user.id })
      await supabase.from('virtual_races').update({ entry_count: race.entry_count + 1 }).eq('id', race_id)
      return NextResponse.json({ success: true })
    }

    if (action === 'submit') {
      if (!finish_time_secs) return NextResponse.json({ error: 'finish_time_secs required' }, { status: 400 })

      // Calculate pace
      const { data: raceData } = await supabase.from('virtual_races').select('distance_km').eq('id', race_id).single()
      const paceSecsPerKm = raceData?.distance_km ? Math.round(finish_time_secs / raceData.distance_km) : null
      const paceStr = paceSecsPerKm
        ? `${Math.floor(paceSecsPerKm / 60)}:${String(paceSecsPerKm % 60).padStart(2, '0')}`
        : null

      await supabase
        .from('virtual_race_entries')
        .update({ finish_time_secs, pace: paceStr, submitted_at: new Date().toISOString() })
        .eq('race_id', race_id).eq('user_id', user.id)

      // Recalculate positions — bulk upsert instead of N individual updates
      const { data: allEntries } = await supabase
        .from('virtual_race_entries')
        .select('id, finish_time_secs')
        .eq('race_id', race_id)
        .not('finish_time_secs', 'is', null)
        .order('finish_time_secs', { ascending: true })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const positionUpdates = (allEntries ?? []).map((entry: any, i: number) => ({
        id:       entry.id,
        position: i + 1,
      }))

      if (positionUpdates.length > 0) {
        await supabase
          .from('virtual_race_entries')
          .upsert(positionUpdates, { onConflict: 'id' })
      }

      return NextResponse.json({ success: true, pace: paceStr })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  } catch (err) {
    console.error('Race action error:', err)
    return NextResponse.json({ error: 'Failed to process race action' }, { status: 500 })
  }
}
