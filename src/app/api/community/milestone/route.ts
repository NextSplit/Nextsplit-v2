import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'

/**
 * POST /api/community/milestone
 *
 * Called after a session is logged. Detects milestones and:
 * 1. Posts to club feed with milestone_type
 * 2. Sends push notification to coach/Split Leader
 *
 * Milestones detected:
 * - first_session: first ever training log
 * - first_20k: first run ≥ 20km
 * - first_half: first run ≥ 21.1km
 * - pb_distance: longest run ever
 * - pb_pace: fastest km pace ever
 * - streak_7: 7-day logging streak
 * - streak_30: 30-day logging streak
 */

const MilestoneCheckSchema = z.object({
  km:          z.number().min(0),
  pace:        z.string().optional(),      // MM:SS format
  session_name: z.string().max(100).optional(),
  session_type: z.string().max(30).optional(),
})

function paceToSecs(pace: string): number {
  const [m, s] = pace.split(':').map(Number)
  return m * 60 + (s || 0)
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = MilestoneCheckSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { km, pace, session_name, session_type } = parsed.data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any
    const milestones: string[] = []

    // Fetch all-time logs for this user
    const { data: allLogs } = await s
      .from('training_logs')
      .select('km, pace, logged_at, done')
      .eq('user_id', user.id)
      .eq('done', true)
      .order('logged_at', { ascending: false })

    const doneLogs = (allLogs ?? []) as Array<{ km: number; pace: string; logged_at: string }>

    // ── First session ever ─────────────────────────────────────────────────
    if (doneLogs.length <= 1) {
      milestones.push('first_session')
    }

    // ── Longest run ever ───────────────────────────────────────────────────
    const prevMaxKm = doneLogs.slice(1).reduce((max: number, l: { km: number }) => Math.max(max, l.km ?? 0), 0)
    if (km > 0 && km > prevMaxKm) {
      if (km >= 20.0 && prevMaxKm < 20.0) milestones.push('first_20k')
      if (km >= 21.1 && prevMaxKm < 21.1) milestones.push('first_half')
      if (km > prevMaxKm && doneLogs.length > 3) milestones.push('pb_distance')
    }

    // ── Fastest pace ever ──────────────────────────────────────────────────
    if (pace && km >= 3) {
      const currentPaceSecs = paceToSecs(pace)
      const prevPaces = doneLogs
        .slice(1)
        .filter((l: { pace: string; km: number }) => l.pace && l.km >= 3)
        .map((l: { pace: string }) => paceToSecs(l.pace))

      const prevBestPace = prevPaces.length > 0 ? Math.min(...prevPaces) : Infinity
      if (currentPaceSecs < prevBestPace && doneLogs.length > 5) {
        milestones.push('pb_pace')
      }
    }

    // ── Streak detection ───────────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0]
    let streak = 1
    let checkDate = new Date()
    checkDate.setDate(checkDate.getDate() - 1)

    for (let i = 0; i < 35; i++) {
      const dateStr = checkDate.toISOString().split('T')[0]
      const hasLog = doneLogs.some((l: { logged_at: string }) => l.logged_at.startsWith(dateStr))
      if (!hasLog) break
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    }

    if (streak === 7)  milestones.push('streak_7')
    if (streak === 30) milestones.push('streak_30')

    if (milestones.length === 0) {
      return NextResponse.json({ milestones: [], posted: false })
    }

    // ── Post to club feeds ─────────────────────────────────────────────────
    const { data: memberships } = await s
      .from('club_members')
      .select('club_id, share_feed')
      .eq('user_id', user.id)

    const primaryMilestone = milestones[0] // Most significant

    await Promise.all(
      (memberships ?? [])
        .filter((m: { share_feed: boolean }) => m.share_feed !== false)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((m: any) =>
          s.from('club_feed').insert({
            club_id:        m.club_id,
            user_id:        user.id,
            session_type:   session_type ?? 'run',
            session_name:   session_name ?? 'Session',
            km:             km || null,
            pace:           pace || null,
            milestone_type: primaryMilestone,
          })
        )
    )

    // ── Notify coach/Split Leader ──────────────────────────────────────────
    const { data: coachRel } = await s
      .from('coach_athletes')
      .select('coach_id')
      .eq('athlete_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (coachRel?.coach_id) {
      const MILESTONE_LABELS: Record<string, string> = {
        first_session: 'first training session',
        first_20k:     'first 20km run 🎉',
        first_half:    'first half marathon distance 🏅',
        pb_distance:   `new longest run (${km.toFixed(1)}km)`,
        pb_pace:       `new pace PB (${pace}/km)`,
        streak_7:      '7-day training streak 🔥',
        streak_30:     '30-day training streak 🔥🔥',
      }
      const label = MILESTONE_LABELS[primaryMilestone] ?? primaryMilestone

      // Fetch athlete name
      const { data: profile } = await s
        .from('profiles')
        .select('display_name, handle')
        .eq('id', user.id)
        .single()
      const name = profile?.display_name ?? profile?.handle ?? 'Your athlete'

      // Send notification to coach
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/api/notifications/send`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-cron-secret': process.env.CRON_SECRET ?? '' },
        body:    JSON.stringify({
          title: `${name} hit a milestone`,
          body:  `${name} just completed their ${label}`,
          url:   `/coach/athlete/${user.id}`,
        }),
      }).catch(() => {}) // Non-blocking

      // Store as coach message for comms thread
      await s.from('coach_messages').insert({
        coach_id:   coachRel.coach_id,
        athlete_id: user.id,
        sender_id:  user.id,
        body:       `🎉 Milestone: ${label}`,
      }).catch(() => {}) // Non-blocking
    }

    return NextResponse.json({ milestones, posted: true })

  } catch (err) {
    console.error('Milestone error:', err)
    return NextResponse.json({ error: 'Milestone check failed' }, { status: 500 })
  }
}
