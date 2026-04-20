import { serverConfig, config } from '@/lib/config'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'

async function refreshStravaToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
) {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error('Token refresh failed')
  return res.json()
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const clientSecret = serverConfig.stravaClientSecret
  const clientId = config.stravaClientId
  if (!clientSecret || !clientId) {
    return NextResponse.json({ error: 'Strava not configured' }, { status: 400 })
  }

  // Get stored connection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: conn, error: connErr } = await db(supabase)
    .from('strava_connections')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (connErr || !conn) {
    return NextResponse.json({ error: 'No Strava connection' }, { status: 404 })
  }

  let accessToken = conn.access_token

  // Refresh if expired
  const expiresAt = new Date(conn.token_expires_at).getTime()
  if (Date.now() >= expiresAt - 60_000) {
    try {
      const refreshed = await refreshStravaToken(conn.refresh_token, clientId, clientSecret)
      accessToken = refreshed.access_token

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db(supabase)
        .from('strava_connections')
        .update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          token_expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
        })
        .eq('user_id', user.id)
    } catch {
      return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 })
    }
  }

  // Fetch latest activity from Strava
  const activitiesRes = await fetch(
    'https://www.strava.com/api/v3/athlete/activities?per_page=5',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!activitiesRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 502 })
  }

  const activities = await activitiesRes.json()

  // Return the most recent, plus any from today
  const today = new Date().toISOString().slice(0, 10)
  const recent = activities.map((a: StravaActivity) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    distance_km: Math.round(a.distance / 100) / 10,
    moving_time_secs: a.moving_time,
    elapsed_time_secs: a.elapsed_time,
    avg_pace_secs: a.distance > 0 ? Math.round((a.moving_time / (a.distance / 1000))) : null,
    avg_hr: a.average_heartrate ?? null,
    date: a.start_date_local?.slice(0, 10),
    is_today: a.start_date_local?.slice(0, 10) === today,
    kudos: a.kudos_count,
    map_url: a.map?.summary_polyline ? true : false,
    splits: a.splits_metric?.map((s: StravaSplit) => ({
      km: s.distance ? Math.round(s.distance / 100) / 10 : 1,
      pace_secs: s.moving_time && s.distance ? Math.round(s.moving_time / (s.distance / 1000)) : null,
      hr: s.average_heartrate ?? null,
    })) ?? [],
  }))

  return NextResponse.json({ activities: recent, athlete_id: conn.athlete_id })
}

interface StravaActivity {
  id: number
  name: string
  type: string
  distance: number
  moving_time: number
  elapsed_time: number
  average_heartrate?: number
  start_date_local?: string
  kudos_count: number
  map?: { summary_polyline?: string }
  splits_metric?: StravaSplit[]
}

interface StravaSplit {
  distance: number
  moving_time: number
  average_heartrate?: number
}
