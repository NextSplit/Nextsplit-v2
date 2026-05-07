'use server'

import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'

// Server action wrapping the SECURITY DEFINER RPC `insert_squad_feed_on_log`
// (defined in supabase/migrations/phase-p1-0a-schema.sql).
//
// Council prereq P1.0a sub-item 8a: the squad-feed write is awaitable from a
// server-trusted code path so the celebration UI can conditionally render the
// feed-card preview vs. an empty-state. Direct INSERT on squad_feed has been
// revoked from the `authenticated` role; this RPC is the only legitimate path.
//
// The RPC validates auth.uid() ownership of the log row + share_logs_with_squad
// preference, then fans out one feed_card row per active squad membership.
// Returns the inserted feed_card ids (empty array if user opted out, has no
// active squads, or all inserts hit the partial UNIQUE on retry).
//
// Failure mode: any RPC error is reported to Sentry and surfaced to the caller
// as `error` so SessionCelebration can render the empty-state copy ("Your run
// is logged. Share it when you're ready.") rather than a silent contraction.

export async function shareSessionWithSquadAction(logId: string): Promise<{
  feedCardIds: string[]
  error: string | null
}> {
  if (!logId) {
    return { feedCardIds: [], error: 'Missing log id' }
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = supabase as any

  const { data, error } = await s.rpc('insert_squad_feed_on_log', {
    p_log_id: logId,
  })

  if (error) {
    Sentry.captureException(error, {
      extra: { op: 'insert_squad_feed_on_log', logId },
      tags: { feature: 'p1.1-squad-feed' },
    })
    return { feedCardIds: [], error: error.message ?? 'RPC failed' }
  }

  return { feedCardIds: (data as string[] | null) ?? [], error: null }
}
