// K31 — request account deletion (GDPR right-to-erasure).
//
// Sets profiles.deletion_requested_at = now(). The user can cancel
// within 30 days via /api/account/delete/cancel; after the grace
// window the daily cron at /api/cron/process-deletions hard-deletes
// the auth user and all FK-cascaded rows.
//
// Records an audit event in account_lifecycle_events including the
// caller IP + user-agent for the legal trail.

import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const service = createServiceClient()

    const { error: updateErr } = await service
      .from('profiles')
      .update({ deletion_requested_at: new Date().toISOString() })
      .eq('id', user.id)

    if (updateErr) {
      Sentry.captureException(updateErr, { tags: { route: 'account.delete' } })
      return NextResponse.json({ error: 'failed_to_request' }, { status: 500 })
    }

    await service.from('account_lifecycle_events').insert({
      user_id:    user.id,
      event_type: 'deletion_requested',
      ip_address: req.headers.get('x-forwarded-for') ?? null,
      user_agent: req.headers.get('user-agent') ?? null,
    })

    return NextResponse.json({
      ok:                  true,
      deletion_requested:  true,
      grace_window_days:   30,
      message:             'Your account will be deleted in 30 days. You can cancel any time before then.',
    })
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'account.delete' } })
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
