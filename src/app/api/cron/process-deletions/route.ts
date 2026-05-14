import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * K33 — Hard-delete cron for accounts past their 30-day grace period.
 *
 * Wired by Vercel cron (daily, 03:00 UTC). Walks profiles where
 * deletion_requested_at is set + older than 30 days + not already
 * processed. For each:
 *
 *   1. Calls anonymise_user_financial_records(user_id) so HMRC-
 *      retained financial rows lose their PII but keep the
 *      financial fact (amounts, dates, Stripe transfer ids).
 *   2. Calls auth.admin.deleteUser(user_id) for the hard delete.
 *   3. Stamps deletion_processed_at on the profile soft-tombstone.
 *   4. Logs an account_lifecycle_events 'deletion_processed' row.
 *
 * The cron is idempotent: re-running it on the same day is a no-op
 * because deletion_processed_at is set after step 3.
 *
 * Auth: requires CRON_SECRET in the Authorization header (Vercel
 * cron sets this automatically when configured in vercel.json).
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization') ?? ''
  const expected = process.env.CRON_SECRET
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Find accounts past the 30-day grace, not yet processed.
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: due, error: selErr } = await (supabase as any)
    .from('profiles')
    .select('id, deletion_requested_at')
    .lte('deletion_requested_at', cutoff)
    .is('deletion_processed_at', null)
    .limit(500)

  if (selErr) {
    return NextResponse.json({ error: selErr.message }, { status: 500 })
  }

  const rows = (due ?? []) as { id: string; deletion_requested_at: string }[]
  const processed: string[] = []
  const failed:    { id: string; error: string }[] = []

  for (const row of rows) {
    try {
      // 1. Anonymise financial records (preserves the HMRC-required fact)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: anonErr } = await (supabase as any).rpc('anonymise_user_financial_records', {
        p_user_id: row.id,
      })
      if (anonErr) throw new Error(`anonymise: ${anonErr.message}`)

      // 2. Hard-delete the auth user (cascades all non-financial FKs)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: delErr } = await (supabase.auth as any).admin.deleteUser(row.id)
      if (delErr) throw new Error(`auth delete: ${delErr.message}`)

      // 3. Stamp the soft-tombstone on the profile (if profile still exists
      // — auth delete should have cascaded the profile but stamping is
      // idempotent and harmless).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('profiles')
        .update({ deletion_processed_at: new Date().toISOString() })
        .eq('id', row.id)

      // 4. Audit-trail row (account_lifecycle_events has no FK to auth.users
      // per the K33 safe-harbour migration, so the audit row survives the
      // user delete).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('account_lifecycle_events')
        .insert({
          user_id:    row.id,
          event_type: 'deletion_processed',
          metadata:   { grace_started_at: row.deletion_requested_at },
        })

      processed.push(row.id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error'
      failed.push({ id: row.id, error: msg })
    }
  }

  return NextResponse.json({
    cutoff,
    candidates: rows.length,
    processed:  processed.length,
    failed,
  })
}
