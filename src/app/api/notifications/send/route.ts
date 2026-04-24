import * as Sentry from '@sentry/nextjs'
import { config, serverConfig } from '@/lib/config'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'

const SendNotifSchema = z.object({
  title: z.string().min(1).max(100),
  body:  z.string().min(1).max(300),
  url:   z.string().max(200).default('/home'),
})

export async function POST(req: NextRequest) {
  try {
    const webpush = (await import('web-push')).default
    webpush.setVapidDetails(
      `mailto:${serverConfig.vapidEmail || 'hello@nextsplit.app'}`,
      config.vapidPublicKey,
      serverConfig.vapidPrivateKey
    )

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = SendNotifSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { title, body, url } = parsed.data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sub } = await db(supabase)
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user.id)
      .single()

    if (!sub) return NextResponse.json({ error: 'No subscription found' }, { status: 404 })

    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({ title: title ?? 'NextSplit', body, url: url ?? '/' })
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: '[push/send]' } })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
