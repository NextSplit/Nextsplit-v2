import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'

export async function POST(req: NextRequest) {
  try {
    const webpush = (await import('web-push')).default
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL ?? 'hello@nextsplit.app'}`,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    )

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { title, body, url } = await req.json()

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
    console.error('[push/send]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
