import * as Sentry from '@sentry/nextjs'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * K33 — Account deletion request. Sets the 30-day grace clock; the
 * hard-delete happens via /api/cron/process-deletions once the
 * grace expires. Calling DELETE again during the grace cancels.
 *
 * Audit-trail row written for both requests and cancellations.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST: request deletion (start grace clock)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: profErr } = await (supabase as any)
      .from('profiles')
      .update({ deletion_requested_at: new Date().toISOString() })
      .eq('id', user.id)
    if (profErr) throw profErr

    const ip        = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    const userAgent = req.headers.get('user-agent') ?? null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('account_lifecycle_events')
      .insert({
        user_id:    user.id,
        event_type: 'deletion_requested',
        ip_address: ip,
        user_agent: userAgent,
      })

    return NextResponse.json({ status: 'queued', grace_days: 30 })
  } catch (err) {
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Deletion request failed' }, { status: 500 })
  }
}

// DELETE: cancel a pending deletion (clear the grace clock)
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: profErr } = await (supabase as any)
      .from('profiles')
      .update({ deletion_requested_at: null })
      .eq('id', user.id)
    if (profErr) throw profErr

    const ip        = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    const userAgent = req.headers.get('user-agent') ?? null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('account_lifecycle_events')
      .insert({
        user_id:    user.id,
        event_type: 'deletion_cancelled',
        ip_address: ip,
        user_agent: userAgent,
      })

    return NextResponse.json({ status: 'cancelled' })
  } catch (err) {
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Cancellation failed' }, { status: 500 })
  }
}
