// K31 — cancel a pending deletion within the 30-day grace window.
//
// Only callable by the user themselves (auth.getUser). Sets
// deletion_requested_at back to NULL and records the cancel event.

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
      .update({ deletion_requested_at: null })
      .eq('id', user.id)

    if (updateErr) {
      Sentry.captureException(updateErr, { tags: { route: 'account.delete.cancel' } })
      return NextResponse.json({ error: 'failed_to_cancel' }, { status: 500 })
    }

    await service.from('account_lifecycle_events').insert({
      user_id:    user.id,
      event_type: 'deletion_cancelled',
      ip_address: req.headers.get('x-forwarded-for') ?? null,
      user_agent: req.headers.get('user-agent') ?? null,
    })

    return NextResponse.json({ ok: true, deletion_requested: false })
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'account.delete.cancel' } })
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
