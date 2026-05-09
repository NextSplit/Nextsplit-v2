import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'

// GET /api/race/active
// Returns ALL currently-active races for the caller — daily 5K + weekly
// marquee + monthly major (and any future formats once they have seeders).
// Auto-seeds today's daily, this week's marquee, and this month's major
// (idempotent service-role RPCs) so the response is always populated even
// if the cron hasn't fired yet today.
//
// "Active" = (entries_close_at > now() AND finalized_at IS NULL) OR
//            (finalized_at NOT NULL AND finalized_at > now() - 7 days).
// The 7-day result-visibility window keeps finished races on the surface
// long enough for users who didn't open the app on resolve day.

export const dynamic = 'force-dynamic'

interface RaceBundle {
  race: {
    id:                string
    format:            string
    name:              string
    distance_m:        number
    entries_open_at:   string
    entries_close_at:  string
    resolves_at:       string
    finalized_at:      string | null
  }
  entry_count: number
  my_entry: {
    id:                 string
    entered_at:         string
    character_snapshot: Record<string, unknown>
  } | null
  result: {
    finishing_order: Array<{ user_id: string; build_class: string; finish_secs: number; rank: number }>
    result_timeline: Array<{ user_id: string; splits: number[] }>
    computed_at:     string
  } | null
}

interface ActiveRacesResponse {
  me_user_id: string | null
  races:      RaceBundle[]
}

const RESULT_VISIBILITY_DAYS = 7

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Auto-seed all 3 formats. Idempotent — returns existing IDs if rows
    // already exist for the current period.
    const svc = createServiceClient()
    await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (svc as any).rpc('seed_daily_race').then(() => null).catch(() => null),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (svc as any).rpc('seed_weekly_marquee').then(() => null).catch(() => null),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (svc as any).rpc('seed_monthly_major').then(() => null).catch(() => null),
    ])

    const cutoffMs = Date.now() - RESULT_VISIBILITY_DAYS * 24 * 60 * 60 * 1000
    const cutoffIso = new Date(cutoffMs).toISOString()
    const nowIso    = new Date().toISOString()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = db(supabase) as any

    const { data: races } = await s
      .from('character_races')
      .select('id, format, name, distance_m, entries_open_at, entries_close_at, resolves_at, finalized_at')
      .or(`and(entries_close_at.gt.${nowIso},finalized_at.is.null),and(finalized_at.gte.${cutoffIso})`)
      .order('finalized_at', { ascending: false, nullsFirst: true })
      .order('entries_close_at', { ascending: true })
      .limit(20)

    if (!races || races.length === 0) {
      return NextResponse.json<ActiveRacesResponse>({ me_user_id: user.id, races: [] })
    }

    const raceIds = (races as Array<{ id: string }>).map(r => r.id)

    const [{ data: myEntries }, { data: entriesAll }, { data: resultsAll }] = await Promise.all([
      s.from('character_race_entries')
        .select('id, race_id, entered_at, character_snapshot')
        .eq('user_id', user.id)
        .in('race_id', raceIds),
      s.from('character_race_entries')
        .select('race_id')
        .in('race_id', raceIds),
      s.from('character_race_results')
        .select('race_id, finishing_order, result_timeline, computed_at')
        .in('race_id', raceIds),
    ])

    const myEntryByRace = new Map(
      (myEntries ?? []).map((e: { race_id: string }) => [e.race_id, e]),
    )
    const resultByRace = new Map(
      (resultsAll ?? []).map((r: { race_id: string }) => [r.race_id, r]),
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countByRace: Record<string, number> = (entriesAll ?? []).reduce(
      (acc: Record<string, number>, e: { race_id: string }) => {
        acc[e.race_id] = (acc[e.race_id] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const bundles: RaceBundle[] = (races as RaceBundle['race'][]).map(race => ({
      race,
      entry_count: countByRace[race.id] ?? 0,
      my_entry:    (myEntryByRace.get(race.id) as RaceBundle['my_entry']) ?? null,
      result:      (resultByRace.get(race.id) as RaceBundle['result']) ?? null,
    }))

    return NextResponse.json<ActiveRacesResponse>({ me_user_id: user.id, races: bundles })

  } catch (err) {
    Sentry.captureException(err, { extra: { context: '[api/race/active GET]' } })
    return NextResponse.json({ error: 'Failed to fetch active races' }, { status: 500 })
  }
}
