import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { detectFormat, parseFit, parseTcx, type ImportedActivity } from '@/lib/fileImport'

// PR J11c — POST /api/import/file
// Accepts a single .fit or .tcx file in a FormData under field name "file"
// and inserts a training_logs row. Idempotent: rejects an upload if a
// training_logs row already exists for this user at the same start_time
// (±5 min window — catches re-uploads of the same activity).
//
// Max file size: 5 MB (Vercel's default body limit is 4.5 MB on hobby tier;
// .fit files are normally <300 KB, .tcx <1 MB, so this is generous).

export const dynamic = 'force-dynamic'

const MAX_BYTES = 5 * 1024 * 1024

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data with a `file` field' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file in request' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File too large (>${MAX_BYTES / 1024 / 1024} MB)` }, { status: 413 })
  }

  const buffer    = await file.arrayBuffer()
  const head      = new Uint8Array(buffer.slice(0, 16))
  const format    = detectFormat(file.name, head)
  if (!format) {
    return NextResponse.json({ error: 'Unrecognised file format (expected .fit or .tcx)' }, { status: 415 })
  }

  let activity: ImportedActivity
  try {
    activity = format === 'fit'
      ? await parseFit(buffer)
      : parseTcx(new TextDecoder('utf-8').decode(buffer))
  } catch (err) {
    Sentry.captureException(err, {
      tags:  { feature: 'pr-j11c-file-import' },
      extra: { format, filename: file.name, size: file.size },
    })
    return NextResponse.json({ error: 'Failed to parse file', detail: (err as Error).message }, { status: 422 })
  }

  if (activity.distance_m <= 0 || activity.duration_secs <= 0) {
    return NextResponse.json({ error: 'File contained no distance or duration data' }, { status: 422 })
  }

  // Idempotency: reject if a training_logs row exists for this user within
  // ±5 min of the activity's start_time. Uploading the same .fit twice should
  // not duplicate the log.
  const start = new Date(activity.start_time)
  const lo    = new Date(start.getTime() - 5 * 60 * 1000).toISOString()
  const hi    = new Date(start.getTime() + 5 * 60 * 1000).toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = supabase as any
  const { data: dupes } = await s
    .from('training_logs')
    .select('id, created_at')
    .eq('user_id', user.id)
    .gte('created_at', lo)
    .lte('created_at', hi)
    .limit(1)
  if (dupes && dupes.length > 0) {
    return NextResponse.json({
      error: 'Already imported',
      logId: dupes[0].id,
    }, { status: 409 })
  }

  const km        = Math.round((activity.distance_m / 1000) * 10) / 10
  const paceSecs  = activity.distance_m > 0
    ? Math.round(activity.duration_secs / (activity.distance_m / 1000))
    : null
  const paceStr   = paceSecs
    ? `${Math.floor(paceSecs / 60)}:${String(paceSecs % 60).padStart(2, '0')}/km`
    : null

  const { data: log, error } = await s
    .from('training_logs')
    .insert({
      user_id:       user.id,
      done:          true,
      km,
      pace:          paceStr,
      hr:            activity.avg_hr,
      duration_secs: activity.duration_secs,
      strava_id:     null,
      notes:         `Imported from ${activity.source.toUpperCase()}: ${activity.name ?? file.name}`,
      created_at:    activity.start_time,
      plan_id:       null,
      week_n:        0,
      day_i:         0,
      session_i:     0,
      splits:        activity.splits.length > 0 ? activity.splits : null,
    })
    .select()
    .single()

  if (error) {
    Sentry.captureException(error, {
      tags:  { feature: 'pr-j11c-file-import' },
      extra: { context: 'training_logs insert' },
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    log,
    parsed: {
      source:        activity.source,
      start_time:    activity.start_time,
      km,
      duration_secs: activity.duration_secs,
      avg_hr:        activity.avg_hr,
    },
  })
}
