import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function isAuthorized(req: NextRequest) {
  return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET ?? ''}`
}

interface PushSub { user_id: string; endpoint: string; p256dh: string; auth: string }
interface Profile { id: string; full_name: string | null; notification_time: string | null }
interface Plan { user_id: string; name: string }

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Lazy import so VAPID validation only runs at request time (not build time)
    const webpush = (await import('web-push')).default
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL ?? 'hello@nextsplit.app'}`,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    )

    const supabase = await createClient()
    const now = new Date()
    const hh = now.getUTCHours().toString().padStart(2, '0')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await (supabase as any)
      .from('profiles')
      .select('id, full_name, notification_time')
      .eq('notifications_enabled', true)
      .gte('notification_time', `${hh}:00:00`)
      .lt('notification_time', `${hh}:59:59`) as { data: Profile[] | null }

    if (!profiles?.length) return NextResponse.json({ ok: true, sent: 0 })

    const userIds = profiles.map(p => p.id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subs } = await (supabase as any)
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth')
      .in('user_id', userIds) as { data: PushSub[] | null }

    if (!subs?.length) return NextResponse.json({ ok: true, sent: 0 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: plans } = await (supabase as any)
      .from('user_plans')
      .select('user_id, name')
      .in('user_id', userIds)
      .eq('status', 'active') as { data: Plan[] | null }

    const planByUser: Record<string, string> = {}
    for (const p of plans ?? []) planByUser[p.user_id] = p.name

    let sent = 0
    const errors: string[] = []

    for (const sub of subs) {
      const profile = profiles.find(p => p.id === sub.user_id)
      const name = profile?.full_name?.split(' ')[0] ?? 'Runner'
      const planName = planByUser[sub.user_id]

      const title = `Time to run, ${name}! 🏃`
      const body = planName
        ? `Your ${planName} session is waiting. Let's go!`
        : "Today's training session is ready. Keep the streak alive!"

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, url: '/today' })
        )
        sent++
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`${sub.user_id}: ${msg}`)
        if (msg.includes('410') || msg.includes('404')) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any).from('push_subscriptions').delete().eq('user_id', sub.user_id)
        }
      }
    }

    console.log(`[cron/notify] ${hh}:xx UTC — sent ${sent}, errors: ${errors.length}`)
    return NextResponse.json({ ok: true, sent, errors })
  } catch (err) {
    console.error('[cron/notify]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
