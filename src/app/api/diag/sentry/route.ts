import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as Sentry from '@sentry/nextjs'

// PR I1 — Sentry healthcheck. Fires a tagged exception so admins can
// verify the wiring round-trips to the Sentry org. Returns the eventId
// so callers can search for it in the dashboard.
//
// Symptom that prompted this: production Sentry shows zero unresolved
// issues across 7+ days despite a now-known broken smart-notify cron
// (insert into a non-existent `notifications` table for ~2 days before
// PR G3 fixed it). Either Sentry wiring is broken or filters drop
// everything — this route is the canonical diagnostic.
//
// Admin-gated (ADMIN_EMAILS env-allowlist matching every other /admin
// route) to prevent abuse.

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!adminEmails.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const stamp = new Date().toISOString()
  const message = `Sentry healthcheck · ${stamp} · invoked by ${user.email}`

  // captureException returns the eventId. If wiring is broken (no DSN /
  // filtered / quota exhausted), the dashboard won't show this event in
  // the next few seconds and we know to investigate.
  const eventId = Sentry.captureException(new Error(message), {
    tags: {
      feature:      'sentry-healthcheck',
      diagnostic:   'pr-i1',
      environment:  process.env.NODE_ENV ?? 'unknown',
    },
    extra: {
      caller_email: user.email,
      invoked_at:   stamp,
    },
    level: 'warning',
  })

  // Flush so the event ships before the serverless function suspends.
  // 2s ceiling is generous — typical ship is <300ms.
  await Sentry.flush(2000)

  return NextResponse.json({
    ok:           true,
    eventId,
    message,
    dsn_present:  !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment:  process.env.NODE_ENV ?? 'unknown',
    note:         "If Sentry doesn't surface this event within ~30s under tag 'feature:sentry-healthcheck', the wiring is broken (DSN missing / quota / filters).",
  })
}
