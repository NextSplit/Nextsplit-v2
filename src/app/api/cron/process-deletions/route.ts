// K31 — daily deletion cron.
//
// Scans profiles for deletion_requested_at older than 30 days and
// hard-deletes the auth user. The ON DELETE CASCADE on every FK from
// public.* → auth.users(id) takes care of the cascade automatically.
//
// Idempotent: a profile with deletion_processed_at already set is
// skipped. The auth-user delete is the source of truth; the column on
// profiles is a soft-tombstone for audit (and gets wiped by the
// cascade anyway).
//
// Invoked by Inngest (src/inngest/functions.ts) once a day at ~02:00
// UTC. Auth via Bearer CRON_SECRET, matching the existing race-tick
// and smart-notify cron pattern.

import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const GRACE_DAYS = 30

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const service = createServiceClient()
    const cutoff = new Date(Date.now() - GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const { data: pending, error: scanErr } = await service
      .from('profiles')
      .select('id, deletion_requested_at')
      .lt('deletion_requested_at', cutoff)
      .is('deletion_processed_at', null)

    if (scanErr) {
      Sentry.captureException(scanErr, { tags: { route: 'cron.process-deletions' } })
      return NextResponse.json({ error: 'scan_failed', detail: scanErr.message }, { status: 500 })
    }

    const rows = (pending ?? []) as { id: string }[]
    const results: { user_id: string; ok: boolean; error?: string }[] = []

    for (const row of rows) {
      try {
        // Audit BEFORE the cascade so the event survives in the
        // service-role-only table (which doesn't FK-cascade — see
        // migration phase-k31-gdpr-deletion-v1.sql for why).
        await service.from('account_lifecycle_events').insert({
          user_id:    row.id,
          event_type: 'deletion_processed',
          metadata:   { grace_days: GRACE_DAYS, processed_via: 'cron' },
        })

        // Mark the soft-tombstone before the hard delete in case the
        // cascade fails partway — we never want to leave a "deletion
        // requested 31 days ago, still not processed" row staring at us.
        await service
          .from('profiles')
          .update({ deletion_processed_at: new Date().toISOString() })
          .eq('id', row.id)

        // Hard delete the auth user — cascades through every FK.
        const { error: delErr } = await service.auth.admin.deleteUser(row.id)
        if (delErr) throw new Error(delErr.message)

        results.push({ user_id: row.id, ok: true })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown'
        Sentry.captureException(err, {
          tags:  { route: 'cron.process-deletions' },
          extra: { user_id: row.id },
        })
        results.push({ user_id: row.id, ok: false, error: msg })
      }
    }

    return NextResponse.json({
      ok:        true,
      processed: results.length,
      successes: results.filter(r => r.ok).length,
      failures:  results.filter(r => !r.ok).length,
      results,
    })
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'cron.process-deletions' } })
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
