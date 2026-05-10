import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PR G — surface the BL-C4 Monday-digest cache on the /coach dashboard.
//
// The smart-notify cron writes one row per (coach_id, ISO-week) into
// coach_digest_runs with a JSONB payload of per-athlete summary lines.
// This endpoint returns the most recent row for the calling coach so
// the client can render the headline + summary list inside the
// dashboard without recomputing.
//
// RLS: coach_digest_runs has "Coach reads own digest runs" SELECT policy
// bound to auth.uid() = coach_id, so the regular client respects the
// boundary without an extra check here.

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    const { data } = await s
      .from('coach_digest_runs')
      .select('period, athlete_count, digest_payload, delivered_at')
      .eq('coach_id', user.id)
      .order('delivered_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ digest: data ?? null })
  } catch (err) {
    Sentry.captureException(err, {
      tags:  { feature: 'blc4-monday-digest' },
      extra: { context: '[coach/digest/recent GET]' },
    })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
