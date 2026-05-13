import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { config, serverConfig } from '@/lib/config'

// PR J11a follow-on — admin-callable Strava webhook subscription manager.
// Lets the founder register the webhook subscription from the phone via
// a tap on /admin/health rather than running curl from a desktop.
//
// GET    → list current subscriptions (Strava allows one per app).
// POST   → create a new subscription pointed at /api/strava/webhook.
// DELETE → unsubscribe (rarely needed; useful for rotating verify token).
//
// All routes admin-gated via ADMIN_EMAILS allow-list.

const SITE_URL    = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nextsplit.app'
const STRAVA_BASE = 'https://www.strava.com/api/v3/push_subscriptions'

async function requireAdmin(): Promise<{ ok: true } | NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!adminEmails.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return { ok: true }
}

function envCheck(): { ok: true; clientId: string; clientSecret: string; verifyToken: string } | NextResponse {
  const clientId     = config.stravaClientId
  const clientSecret = serverConfig.stravaClientSecret
  const verifyToken  = serverConfig.stravaWebhookVerifyToken
  if (!clientId || !clientSecret || !verifyToken) {
    return NextResponse.json({
      error: 'Strava env vars not set',
      missing: {
        NEXT_PUBLIC_STRAVA_CLIENT_ID: !clientId,
        STRAVA_CLIENT_SECRET:         !clientSecret,
        STRAVA_WEBHOOK_VERIFY_TOKEN:  !verifyToken,
      },
    }, { status: 400 })
  }
  return { ok: true, clientId, clientSecret, verifyToken }
}

export async function GET() {
  const gate = await requireAdmin()
  if (gate instanceof NextResponse) return gate
  const env = envCheck()
  if (env instanceof NextResponse) return env

  const params = new URLSearchParams({
    client_id:     env.clientId,
    client_secret: env.clientSecret,
  })
  const res  = await fetch(`${STRAVA_BASE}?${params.toString()}`)
  const body = await res.json()
  return NextResponse.json({ status: res.status, subscriptions: body })
}

export async function POST() {
  const gate = await requireAdmin()
  if (gate instanceof NextResponse) return gate
  const env = envCheck()
  if (env instanceof NextResponse) return env

  const form = new FormData()
  form.append('client_id',     env.clientId)
  form.append('client_secret', env.clientSecret)
  form.append('callback_url',  `${SITE_URL}/api/strava/webhook`)
  form.append('verify_token',  env.verifyToken)

  const res  = await fetch(STRAVA_BASE, { method: 'POST', body: form })
  const body = await res.json()
  return NextResponse.json({ status: res.status, body })
}

export async function DELETE(req: Request) {
  const gate = await requireAdmin()
  if (gate instanceof NextResponse) return gate
  const env = envCheck()
  if (env instanceof NextResponse) return env

  const { searchParams } = new URL(req.url)
  const subscriptionId = searchParams.get('id')
  if (!subscriptionId) return NextResponse.json({ error: 'id query param required' }, { status: 400 })

  const params = new URLSearchParams({
    client_id:     env.clientId,
    client_secret: env.clientSecret,
  })
  const res = await fetch(`${STRAVA_BASE}/${subscriptionId}?${params.toString()}`, { method: 'DELETE' })
  return NextResponse.json({ status: res.status, ok: res.ok })
}
