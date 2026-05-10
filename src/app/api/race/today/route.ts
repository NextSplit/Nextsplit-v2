import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'

// GET /api/race/today
// Returns today's daily 5K race + caller's entry status + result if finalized.
// Auto-seeds the row if missing — idempotent service-role RPC, safe to call
// from a user request context (we proxy through service-role only for the
// seed call, then continue with the user-scoped client for everything else).

export const dynamic = 'force-dynamic'

interface TodayRaceResponse {
  me_user_id:        string | null
  race: {
    id:                string
    format:            string
    name:              string
    distance_m:        number
    entries_open_at:   string
    entries_close_at:  string
    resolves_at:       string
    finalized_at:      string | null
  } | null
  entry_count:       number
  my_entry: {
    id:                 string
    entered_at:         string
    character_snapshot: Record<string, unknown>
    boost_loadout?:     string[]
  } | null
  result: {
    finishing_order:   Array<{ user_id: string; build_class: string; finish_secs: number; rank: number }>
    result_timeline:   Array<{ user_id: string; splits: number[] }>
    computed_at:       string
  } | null
  // PR #14 — runner_cosmetics map keyed by user_id. RLS allows squad-mates
  // to read each others' active cosmetic_inventory rows; non-squad-mate
  // entrants will be absent from the map (RaceResultReplay falls back to
  // the default lane styling for missing entries). Currently surfaces
  // kit_colour only — aura/banner are self-only effects.
  runner_cosmetics:    Record<string, { kit_colour?: string }>
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Seed today's race via service-role RPC if missing. Idempotent.
    // We use the service client only for the seed call (the SECDEF function
    // is service-role-only); the rest of the work uses the user-scoped
    // client so RLS still applies.
    const { createServiceClient } = await import('@/lib/supabase/server')
    const svc = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: raceId } = await (svc as any).rpc('seed_daily_race')

    if (!raceId) {
      return NextResponse.json<TodayRaceResponse>({
        me_user_id: user.id, race: null, entry_count: 0, my_entry: null, result: null,
        runner_cosmetics: {},
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = db(supabase) as any

    const [
      { data: race },
      { count: entryCount },
      { data: myEntry },
      { data: result },
      { data: allEntries },
    ] = await Promise.all([
      s.from('character_races')
        .select('id, format, name, distance_m, entries_open_at, entries_close_at, resolves_at, finalized_at')
        .eq('id', raceId).single(),
      s.from('character_race_entries')
        .select('id', { count: 'exact', head: true })
        .eq('race_id', raceId),
      s.from('character_race_entries')
        .select('id, entered_at, character_snapshot, boost_loadout')
        .eq('race_id', raceId).eq('user_id', user.id).maybeSingle(),
      s.from('character_race_results')
        .select('finishing_order, result_timeline, computed_at')
        .eq('race_id', raceId).maybeSingle(),
      s.from('character_race_entries')
        .select('user_id')
        .eq('race_id', raceId),
    ])

    // Build runner_cosmetics map. Squad-mate active cosmetics readable via
    // RLS; others silently skipped. JOIN through the cosmetic catalog to
    // get the asset.colour for kit_colour slot.
    const runnerCosmetics: Record<string, { kit_colour?: string }> = {}
    const userIds = ((allEntries ?? []) as Array<{ user_id: string }>).map(e => e.user_id)
    if (userIds.length > 0) {
      const { data: cosmeticRows } = await s
        .from('character_cosmetic_inventory')
        .select('user_id, character_cosmetics_catalog!inner(slot, asset)')
        .in('user_id', userIds)
        .eq('is_active', true)
      for (const row of (cosmeticRows ?? []) as Array<{
        user_id: string
        character_cosmetics_catalog: { slot: string; asset: { colour?: string } }
      }>) {
        const catalog = row.character_cosmetics_catalog
        if (catalog.slot === 'kit_colour' && typeof catalog.asset?.colour === 'string') {
          runnerCosmetics[row.user_id] = { ...(runnerCosmetics[row.user_id] ?? {}), kit_colour: catalog.asset.colour }
        }
      }
    }

    return NextResponse.json<TodayRaceResponse>({
      me_user_id:       user.id,
      race:             race ?? null,
      entry_count:      entryCount ?? 0,
      my_entry:         myEntry ?? null,
      result:           result ?? null,
      runner_cosmetics: runnerCosmetics,
    })

  } catch (err) {
    Sentry.captureException(err, { extra: { context: '[api/race/today GET]' } })
    return NextResponse.json({ error: 'Failed to fetch today race' }, { status: 500 })
  }
}
