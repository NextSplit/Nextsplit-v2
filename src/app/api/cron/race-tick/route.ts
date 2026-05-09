// Daily race tick — Vercel cron at 22:05 UTC.
//
// Two responsibilities, both idempotent:
//   1. seed_daily_race()   — ensure today's daily 5K race row exists
//   2. simulate_race(id)   — finalize any race where resolves_at <= now()
//                            AND finalized_at IS NULL
//
// Both RPCs are SECDEF service-role-only (REVOKE'd from authenticated). We
// authenticate the cron itself via Bearer CRON_SECRET (matches smart-notify
// pattern) and use createServiceClient() for the Supabase calls so we have
// the role permission to invoke them.
//
// Vercel Hobby cap: 2 daily crons. smart-notify = 14:00 UTC; this = 22:05
// UTC. Both slots now in use — adding more requires Pro tier or pg_cron.

import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface DueRace {
  id: string
  format: string
  name: string
  resolves_at: string
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const summary = {
    seeded_today_race_id: null as string | null,
    seeded_was_new:       false as boolean,
    resolved_count:       0,
    resolved_ids:         [] as string[],
    failed_ids:           [] as Array<{ id: string; error: string }>,
    duration_ms:          0,
  }

  try {
    const supabase = createServiceClient()

    // 1. Ensure today's daily 5K race exists.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: seedId, error: seedErr } = await (supabase as any).rpc('seed_daily_race')
    if (seedErr) {
      Sentry.captureException(seedErr, { extra: { context: '[cron/race-tick] seed_daily_race' } })
    } else {
      summary.seeded_today_race_id = seedId as string
      // Detect new vs existing: if created_at is within last 60s, treat as new.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: row } = await (supabase as any)
        .from('character_races')
        .select('created_at')
        .eq('id', seedId)
        .single()
      if (row?.created_at) {
        const ageMs = Date.now() - new Date(row.created_at).getTime()
        summary.seeded_was_new = ageMs < 60_000
      }
    }

    // 2. Resolve any unfinalized race whose resolves_at has passed.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: dueRows, error: dueErr } = await (supabase as any)
      .from('character_races')
      .select('id, format, name, resolves_at')
      .lte('resolves_at', new Date().toISOString())
      .is('finalized_at', null)
      .order('resolves_at', { ascending: true })
      .limit(50) // safety cap per tick

    if (dueErr) {
      Sentry.captureException(dueErr, { extra: { context: '[cron/race-tick] due-races query' } })
    }

    const due = (dueRows ?? []) as DueRace[]
    for (const race of due) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: simErr } = await (supabase as any).rpc('simulate_race', { p_race_id: race.id })
      if (simErr) {
        Sentry.captureException(simErr, {
          extra: { context: '[cron/race-tick] simulate_race', raceId: race.id, format: race.format },
        })
        summary.failed_ids.push({ id: race.id, error: simErr.message ?? 'unknown' })
      } else {
        summary.resolved_count += 1
        summary.resolved_ids.push(race.id)
      }
    }

    summary.duration_ms = Date.now() - startedAt
    return NextResponse.json({ ok: true, ...summary })

  } catch (err) {
    Sentry.captureException(err, { extra: { context: '[cron/race-tick] catch' } })
    summary.duration_ms = Date.now() - startedAt
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err), ...summary },
      { status: 500 },
    )
  }
}
