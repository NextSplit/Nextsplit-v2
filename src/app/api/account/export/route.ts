// K31 — GDPR data portability export.
//
// Returns a JSON blob of every row in every table that holds personal
// data tied to the caller. Streamed straight back as a downloadable
// file — no async job, no email link — to keep the surface small for
// the pre-alpha gate.
//
// Tables covered (pre-alpha scope): profiles, training_logs, plans,
// squad_memberships, race_entries, ai_coach_conversations (if present),
// wellness_checkins (if present). Best-effort: a missing table is
// recorded as `_missing` rather than failing the whole export, so
// schema drift between environments doesn't break compliance.

import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const TABLES_TO_EXPORT: { table: string; userIdColumn: string }[] = [
  { table: 'profiles',                 userIdColumn: 'id' },
  { table: 'training_logs',            userIdColumn: 'user_id' },
  { table: 'plans',                    userIdColumn: 'user_id' },
  { table: 'squad_memberships',        userIdColumn: 'user_id' },
  { table: 'race_entries',             userIdColumn: 'user_id' },
  { table: 'ai_coach_conversations',   userIdColumn: 'user_id' },
  { table: 'wellness_checkins',        userIdColumn: 'user_id' },
  { table: 'account_lifecycle_events', userIdColumn: 'user_id' },
]

async function safeFetch(
  service: SupabaseClient,
  table: string,
  userIdColumn: string,
  userId: string,
): Promise<unknown> {
  try {
    const { data, error } = await service.from(table).select('*').eq(userIdColumn, userId)
    if (error) return { _error: error.message }
    return data
  } catch (err) {
    return { _error: err instanceof Error ? err.message : 'unknown' }
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const service = createServiceClient()

    const exportPayload: Record<string, unknown> = {
      _meta: {
        format_version: 1,
        generated_at:   new Date().toISOString(),
        user_id:        user.id,
        email:          user.email,
      },
    }

    for (const { table, userIdColumn } of TABLES_TO_EXPORT) {
      exportPayload[table] = await safeFetch(service, table, userIdColumn, user.id)
    }

    // Record the export request — required by GDPR audit, no need to
    // wait on the insert before responding.
    service.from('account_lifecycle_events').insert({
      user_id:    user.id,
      event_type: 'export_requested',
      ip_address: req.headers.get('x-forwarded-for') ?? null,
      user_agent: req.headers.get('user-agent') ?? null,
    }).then(() => { /* fire and forget */ })

    const filename = `nextsplit-export-${user.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        'content-type':        'application/json',
        'content-disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'account.export' } })
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
