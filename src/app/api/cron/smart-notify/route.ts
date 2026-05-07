// Single consolidated cron — Vercel Hobby caps daily crons at 2 (founder
// decision 2026-05-07, roadmap §9 v0.3). All time-driven push dispatch lands
// here, NOT in a separate /api/cron/squad-nudges route. Per-timezone delivery
// returns to the table at the paywall flip (Open Q #5).
//
// Priority order, first match wins (one notification per user per fire):
//   1. Sunday → weekly wrap (regardless of log state)
//   2. TODO(P1.x): leader-queued squad nudge (from squad_nudges queue)
//   3. TODO(P1.x): at-risk squad-member detection (no log in N+ days)
//   4. Active plan + not logged today → keep-streak fallback
//   5. No notification

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

    // Priority cascade — slots map to the ordered list in the file header.
    // First match wins; any user gets at most ONE notification per fire.
    const toNotify: Array<{ userId: string; title: string; body: string }> = []

    for (const user of users) {
      // Slot 1: Sunday weekly wrap.
      if (isSunday) {
        toNotify.push({
          userId: user.id,
          title:  '📊 Weekly wrap',
          body:   'Check how your week went and get ready for the week ahead.',
        })
        continue
      }

      // Slot 2 — TODO(P1.x): leader-queued squad nudge.
      // SELECT FROM squad_nudges WHERE to_user = user.id AND queued_for_date = todayStr
      //   → push using NUDGE_MESSAGES[message_key] from @/lib/squad-nudges.
      // Lands here when the leader-nudge Home pill (P1.1) starts queuing.

      // Slot 3 — TODO(P1.x): at-risk squad-member detection.
      // For each squad the user belongs to, if no training_logs in last
      // 3 days AND squad has ≥ 2 active members, push "your squad's lacing
      // up — want in?". Forward-looking only (see squad-nudges.ts header).

      // Slot 4: keep-streak fallback (active plan + nothing logged today).
      if (hasPlan.has(user.id) && !loggedToday.has(user.id)) {
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
