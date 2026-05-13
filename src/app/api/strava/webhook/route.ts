import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { config, serverConfig } from '@/lib/config'

// PR J11a — Strava webhook receiver.
//
// GET  /api/strava/webhook?hub.mode=subscribe&hub.verify_token=<TOKEN>&hub.challenge=<...>
//   Strava handshake when registering a subscription. Echoes the challenge
//   if the verify_token matches our STRAVA_WEBHOOK_VERIFY_TOKEN env.
//
// POST /api/strava/webhook
//   Strava pushes an event when an athlete creates / updates / deletes
//   an activity. We log the event to Sentry as a breadcrumb (low traffic;
//   useful for debugging) and asynchronously kick off an import for the
//   subject activity. Strava expects a 200 within 2 seconds; the import
//   itself runs fire-and-forget against the user's stored access token.
//
// Founder setup (one-time per environment):
//   1. Set on Vercel:
//        STRAVA_CLIENT_ID                <client id>
//        STRAVA_CLIENT_SECRET            <client secret>
//        STRAVA_WEBHOOK_VERIFY_TOKEN     <any random string we pick>
//   2. Register the webhook with Strava (one curl, one-time):
//        curl -X POST https://www.strava.com/api/v3/push_subscriptions \
//          -F client_id=<id> -F client_secret=<secret> \
//          -F callback_url=https://nextsplit.app/api/strava/webhook \
//          -F verify_token=<same TOKEN>
//   3. Strava performs the GET handshake; this endpoint echoes the
//      challenge; Strava confirms the subscription. From then on every
//      Strava activity write fires a POST here.

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const expected = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN
  if (!expected) {
    Sentry.captureMessage('Strava webhook verify rejected — STRAVA_WEBHOOK_VERIFY_TOKEN unset', { level: 'warning' })
    return NextResponse.json({ error: 'webhook not configured' }, { status: 503 })
  }

  if (mode !== 'subscribe' || token !== expected || !challenge) {
    return NextResponse.json({ error: 'bad verify' }, { status: 400 })
  }

  // Strava expects exactly: {"hub.challenge": "<value>"}
  return NextResponse.json({ 'hub.challenge': challenge })
}

interface StravaWebhookEvent {
  object_type: 'activity' | 'athlete'
  object_id:   number
  aspect_type: 'create' | 'update' | 'delete'
  owner_id:    number        // Strava athlete id (matches strava_connections.athlete_id)
  subscription_id: number
  event_time:  number
  updates?:    Record<string, unknown>
}

export async function POST(req: NextRequest) {
  let event: StravaWebhookEvent
  try {
    event = await req.json() as StravaWebhookEvent
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }

  Sentry.addBreadcrumb({
    category: 'strava-webhook',
    message:  `[${event.aspect_type} ${event.object_type}]`,
    level:    'info',
    data:     { object_id: event.object_id, owner_id: event.owner_id },
  })

  // Only handle activity creates for now — deletes + updates can be
  // wired in a follow-on once the create path is stable.
  if (event.object_type !== 'activity' || event.aspect_type !== 'create') {
    return NextResponse.json({ ok: true, ignored: true })
  }

  // Fire-and-forget the import. Strava wants a 200 in <2s; we don't
  // block on the fetch + upsert chain.
  void importActivityForOwner(event.owner_id, event.object_id).catch(err => {
    Sentry.captureException(err, {
      tags:  { feature: 'pr-j11a-strava-webhook' },
      extra: { owner_id: event.owner_id, object_id: event.object_id },
    })
  })

  return NextResponse.json({ ok: true })
}

async function importActivityForOwner(athleteId: number, activityId: number): Promise<void> {
  const supabase = createAdminClient(config.supabaseUrl, serverConfig.supabaseServiceRoleKey)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = supabase as any

  // Look up which user this athlete belongs to.
  const { data: conn } = await a
    .from('strava_connections')
    .select('user_id, access_token, refresh_token, token_expires_at')
    .eq('athlete_id', athleteId)
    .maybeSingle()

  if (!conn) {
    Sentry.captureMessage(`Strava webhook for unknown athlete ${athleteId}`, {
      level: 'warning',
      tags: { feature: 'pr-j11a-strava-webhook' },
    })
    return
  }

  let accessToken = conn.access_token
  // Refresh if expired.
  if (Date.now() >= new Date(conn.token_expires_at).getTime() - 60_000) {
    const refreshed = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     config.stravaClientId,
        client_secret: serverConfig.stravaClientSecret,
        refresh_token: conn.refresh_token,
        grant_type:    'refresh_token',
      }),
    }).then(r => r.ok ? r.json() : null)
    if (!refreshed) return
    accessToken = refreshed.access_token
    await a.from('strava_connections')
      .update({
        access_token:     refreshed.access_token,
        refresh_token:    refreshed.refresh_token,
        token_expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
      })
      .eq('user_id', conn.user_id)
  }

  // Fetch the activity detail.
  const detailRes = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!detailRes.ok) return
  const detail = await detailRes.json() as {
    id: number
    name: string
    distance: number
    moving_time: number
    average_heartrate?: number
    start_date_local?: string
  }

  // Idempotent insert — `strava_id` is uniqued via existing import route.
  const km           = detail.distance / 1000
  const duration     = detail.moving_time
  const paceSecs     = detail.distance > 0 ? Math.round(duration / (detail.distance / 1000)) : null
  const paceStr      = paceSecs ? `${Math.floor(paceSecs / 60)}:${String(paceSecs % 60).padStart(2, '0')}/km` : null
  const activityDate = (detail.start_date_local ?? new Date().toISOString()).slice(0, 10)

  // Skip if already imported.
  const { data: existing } = await a
    .from('training_logs')
    .select('id')
    .eq('user_id', conn.user_id)
    .eq('strava_id', detail.id)
    .maybeSingle()
  if (existing) return

  await a.from('training_logs').insert({
    user_id:       conn.user_id,
    done:          true,
    km,
    pace:          paceStr,
    hr:            detail.average_heartrate ?? null,
    duration_secs: duration,
    strava_id:     detail.id,
    notes:         `Imported from Strava: ${detail.name}`,
    created_at:    `${activityDate}T12:00:00.000Z`,
    plan_id:       null,
    week_n:        0,
    day_i:         0,
    session_i:     0,
  })
}
