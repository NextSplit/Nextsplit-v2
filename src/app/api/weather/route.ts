import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWeather, getWeatherAdvice } from '@/lib/weather'

// PR J12 — Cached weather + running-advice endpoint.
//
// GET /api/weather?lat=51.5&lon=-0.1&at=<unix-secs?>
// Returns: { snapshot: WeatherSnapshot, advice: WeatherAdvice } | { configured: false }
//
// Auth-required (we don't want bots scraping the underlying free-tier
// API). Response is cached at the Vercel edge for 60min via the fetch
// inside `getWeather()` (next.revalidate).

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lon = parseFloat(searchParams.get('lon') ?? '')
  const at  = parseInt(searchParams.get('at') ?? '0', 10) || undefined
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: 'lat/lon required' }, { status: 400 })
  }

  const snapshot = await getWeather(lat, lon, at)
  if (!snapshot) {
    return NextResponse.json({ configured: false }, { status: 200 })
  }
  return NextResponse.json({
    configured: true,
    snapshot,
    advice: getWeatherAdvice(snapshot),
  })
}
