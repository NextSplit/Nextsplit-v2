import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any
    const isSunday = new Date().getUTCDay() === 0
    const todayStr = new Date().toISOString().slice(0, 10)

    const { data: users } = await s
      .from('profiles').select('id, display_name')
      .not('push_subscription', 'is', null).limit(500)

    if (!users?.length) return NextResponse.json({ sent: 0 })
    const userIds = users.map((u: { id: string }) => u.id)

    const { data: todayLogs } = await s
      .from('training_logs').select('user_id')
      .in('user_id', userIds).eq('done', true)
      .gte('created_at', `${todayStr}T00:00:00`)

    const loggedToday = new Set((todayLogs ?? []).map((l: { user_id: string }) => l.user_id))

    const { data: plans } = await s
      .from('user_plans').select('user_id')
      .in('user_id', userIds).eq('status', 'active')

    const hasPlan = new Set((plans ?? []).map((p: { user_id: string }) => p.user_id))

    // Single 14:00 UTC dispatch — Hobby tier allows one cron fire per day,
    // so each user gets at most ONE notification, prioritised:
    //   Sunday → weekly wrap (regardless of log state)
    //   Otherwise, active plan + not logged today → "log before evening"
    //   Otherwise → no notification
    const toNotify: Array<{ userId: string; title: string; body: string }> = []

    for (const user of users) {
      if (isSunday) {
        toNotify.push({
          userId: user.id,
          title:  '📊 Weekly wrap',
          body:   'Check how your week went and get ready for the week ahead.',
        })
      } else if (hasPlan.has(user.id) && !loggedToday.has(user.id)) {
        toNotify.push({
          userId: user.id,
          title:  '🔥 Keep the streak — log before evening',
          body:   'Your session is waiting. Get it logged today and keep the momentum going.',
        })
      }
    }

    if (toNotify.length > 0) {
      await s.from('notifications').insert(
        toNotify.map(n => ({ user_id: n.userId, type: 'smart_notify', title: n.title, body: n.body, read: false }))
      ).catch(() => {})
    }

    return NextResponse.json({ sent: toNotify.length, isSunday })
  } catch (err) {
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
