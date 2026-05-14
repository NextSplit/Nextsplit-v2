import * as Sentry from '@sentry/nextjs'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { USER_OWNED_TABLES } from '@/lib/legal/user-owned-tables'

/**
 * K33 — UK GDPR Article 15 (right of access) + Article 20 (portability).
 *
 * Walks the USER_OWNED_TABLES registry and assembles a JSON document
 * containing every row in the public schema that holds data about
 * the authenticated user.
 *
 * Suspension carve-out: per the K33 council finding, a suspended /
 * banned user can still request their data. This route checks
 * auth.uid() only; it does NOT check any suspension flag. If
 * suspension is later implemented as a profiles column, the route
 * must remain accessible.
 *
 * Audit trail: every export request is logged to
 * account_lifecycle_events with timestamp + IP + user-agent so an
 * ICO investigation can verify when access was provided.
 *
 * The response is application/json; the client wraps it in a Blob
 * for download.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Audit-trail row first so we have evidence even if the export
    // itself fails halfway through.
    const ip        = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    const userAgent = req.headers.get('user-agent') ?? null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('account_lifecycle_events')
      .insert({
        user_id:    user.id,
        event_type: 'export_requested',
        ip_address: ip,
        user_agent: userAgent,
        metadata:   { table_count: USER_OWNED_TABLES.length },
      })

    // Walk the registry.
    const data: Record<string, unknown[]> = {}
    const errors: Record<string, string>  = {}

    for (const entry of USER_OWNED_TABLES) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows, error } = await (supabase as any)
        .from(entry.table)
        .select('*')
        .eq(entry.column, user.id)

      const key = `${entry.category}__${entry.table}`
      if (error) {
        errors[key] = error.message
        continue
      }
      if (rows && (rows as unknown[]).length > 0) {
        data[key] = rows as unknown[]
      }
    }

    return NextResponse.json({
      schema_version: 1,
      exported_at:    new Date().toISOString(),
      user_id:        user.id,
      data,
      // Errors block is empty when everything works. If any table failed
      // RLS or didn't exist, the user (and the ICO) see exactly which.
      errors,
    })
  } catch (err) {
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
