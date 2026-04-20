import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code        = searchParams.get('code')
  const error       = searchParams.get('error')
  const onboarding  = searchParams.get('onboarding') === '1'

  const errorDest = onboarding ? `${origin}/onboarding?strava=denied` : `${origin}/profile?strava=denied`

  if (error || !code) {
    return NextResponse.redirect(errorDest)
  }

  const clientId     = process.env.STRAVA_CLIENT_ID
  const clientSecret = process.env.STRAVA_CLIENT_SECRET

  if (!clientSecret) {
    return NextResponse.redirect(errorDest)
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     clientId,
        client_secret: clientSecret,
        code,
        grant_type:    'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      return NextResponse.redirect(errorDest)
    }

    const tokens = await tokenRes.json()

    // Save to Supabase
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(`${origin}/auth/login`)

    await db(supabase).from('strava_connections').upsert({
      user_id:          user.id,
      athlete_id:       tokens.athlete?.id,
      access_token:     tokens.access_token,
      refresh_token:    tokens.refresh_token,
      token_expires_at: new Date(tokens.expires_at * 1000).toISOString(),
    }, { onConflict: 'user_id' })

    // Route back to the right place
    if (onboarding) {
      // Return to onboarding — StravaConnectScreen will detect the connection and import
      return NextResponse.redirect(`${origin}/onboarding?strava=connected`)
    }

    const athleteName = [tokens.athlete?.firstname, tokens.athlete?.lastname].filter(Boolean).join(' ')
    const nameParam   = athleteName ? `&athlete=${encodeURIComponent(athleteName)}` : ''
    return NextResponse.redirect(`${origin}/profile?strava=connected${nameParam}`)

  } catch {
    return NextResponse.redirect(errorDest)
  }
}
