import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

interface AthleteStatus {
  athlete_id:          string
  display_name:        string | null
  handle:              string | null
  status:              'green' | 'amber' | 'red'
  flags:               string[]
  acwr:                number | null
  sessions_done_week:  number
  sessions_total_week: number
  last_active:         string | null
  avg_wellness:        number | null
  current_week:        number | null
  total_weeks:         number | null
  plan_name:           string | null
  // P3.1 dashboard v2 additions:
  streak_current:      number   // consecutive days with at least one done log
  days_since_message:  number | null  // null = never messaged
}

function calcACWR(logs: { done: boolean; km: number | null; logged_at: string }[]): number | null {
  const now        = Date.now()
  const oneWeekMs  = 7 * 24 * 3600 * 1000
  const fourWkMs   = 28 * 24 * 3600 * 1000

  const acuteLogs  = logs.filter(l => l.done && now - new Date(l.logged_at).getTime() < oneWeekMs)
  const chronicLogs = logs.filter(l => l.done && now - new Date(l.logged_at).getTime() < fourWkMs)

  const acuteKm   = acuteLogs.reduce((a, l) => a + (l.km ?? 3), 0)
  const chronicKm = chronicLogs.reduce((a, l) => a + (l.km ?? 3), 0) / 4

  if (chronicKm === 0) return null
  return Math.round((acuteKm / chronicKm) * 100) / 100
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Get all active athletes for this coach
    const { data: relationships } = await db(supabase)
      .from('coach_athletes')
      .select('athlete_id')
      .eq('coach_id', user.id)
      .eq('status', 'active')

    if (!relationships?.length) return NextResponse.json({ athletes: [] })

    const athleteIds = relationships.map((r: AnyRecord) => r.athlete_id)
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 3600 * 1000).toISOString()
    const oneWeekAgo   = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()

    // Batch fetch all data — P3.1 v2 adds coach_messages for "days since
    // last comm" tile.
    const [profilesRes, logsRes, wellnessRes, plansRes, messagesRes] = await Promise.all([
      db(supabase).from('profiles').select('id, display_name, handle, runner_class').in('id', athleteIds),
      db(supabase).from('training_logs').select('user_id, done, km, logged_at, week_n').in('user_id', athleteIds).gte('logged_at', fourWeeksAgo),
      db(supabase).from('wellness_logs').select('user_id, sleep, energy, mood, soreness, log_date').in('user_id', athleteIds).gte('log_date', oneWeekAgo),
      db(supabase).from('user_plans').select('user_id, name, current_week, total_weeks, status').in('user_id', athleteIds).eq('status', 'active'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db(supabase) as any).from('coach_messages').select('athlete_id, created_at')
        .eq('coach_id', user.id).in('athlete_id', athleteIds).order('created_at', { ascending: false }),
    ])

    const profiles = profilesRes.data ?? []
    const allLogs  = logsRes.data ?? []
    const wellness = wellnessRes.data ?? []
    const plans    = plansRes.data ?? []
    const messages = messagesRes.data ?? []
    // Most-recent message per athlete; messages are already DESC by created_at.
    const lastMessageByAthlete = new Map<string, string>()
    for (const m of messages) {
      const aid = (m as AnyRecord).athlete_id as string
      if (!lastMessageByAthlete.has(aid)) {
        lastMessageByAthlete.set(aid, (m as AnyRecord).created_at as string)
      }
    }

    const athletes: AthleteStatus[] = athleteIds.map((athleteId: string) => {
      const profile = profiles.find((p: AnyRecord) => p.id === athleteId)
      const athleteLogs = allLogs.filter((l: AnyRecord) => l.user_id === athleteId)
      const athleteWellness = wellness.filter((w: AnyRecord) => w.user_id === athleteId)
      const plan    = plans.find((p: AnyRecord) => p.user_id === athleteId)

      // ACWR
      const acwr = calcACWR(athleteLogs as { done: boolean; km: number | null; logged_at: string }[])

      // This week sessions
      const thisWeekLogs    = athleteLogs.filter((l: AnyRecord) => new Date(l.logged_at) >= new Date(oneWeekAgo))
      const sessionsDoneWk  = thisWeekLogs.filter((l: AnyRecord) => l.done).length
      const sessionsTotalWk = thisWeekLogs.length

      // Last active
      const doneLogs = athleteLogs.filter((l: AnyRecord) => l.done).sort((a: AnyRecord, b: AnyRecord) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())
      const lastActive = doneLogs[0]?.logged_at ?? null

      // Streak — consecutive days (including today) with at least one done
      // log. Walks back day-by-day until the first gap. Compresses multiple
      // logs in one day into a single streak tick.
      const streakDates = new Set(
        doneLogs.map((l: AnyRecord) =>
          new Date(l.logged_at as string).toISOString().slice(0, 10),
        ),
      )
      let streakCurrent = 0
      const cursor = new Date()
      cursor.setUTCHours(0, 0, 0, 0)
      while (streakDates.has(cursor.toISOString().slice(0, 10))) {
        streakCurrent++
        cursor.setUTCDate(cursor.getUTCDate() - 1)
      }

      // Days since last coach→athlete message; null if never messaged.
      const lastMsgIso = lastMessageByAthlete.get(athleteId)
      const daysSinceMessage = lastMsgIso
        ? Math.floor((Date.now() - new Date(lastMsgIso).getTime()) / 86400000)
        : null

      // Avg wellness this week
      const wellnessScores = athleteWellness.map((w: AnyRecord) => ((w.sleep ?? 0) / 8 + (w.energy ?? 0) / 10 + (w.mood ?? 0) / 10) / 3 * 10)
      const avgWellness = wellnessScores.length > 0
        ? Math.round(wellnessScores.reduce((a: number, b: number) => a + b, 0) / wellnessScores.length * 10) / 10
        : null

      // Determine status + flags
      const flags: string[] = []
      let status: 'green' | 'amber' | 'red' = 'green'

      if (acwr !== null && acwr > 1.5) { flags.push('⚠️ ACWR very high — injury risk'); status = 'red' }
      else if (acwr !== null && acwr > 1.3) { flags.push('ACWR elevated'); if (status === 'green') status = 'amber' }

      const daysSinceActive = lastActive
        ? Math.floor((Date.now() - new Date(lastActive).getTime()) / (24 * 3600 * 1000))
        : 999

      if (daysSinceActive >= 7) { flags.push('🚩 No activity in 7+ days'); status = 'red' }
      else if (daysSinceActive >= 4) { flags.push('Inactive 4+ days'); if (status === 'green') status = 'amber' }

      if (avgWellness !== null && avgWellness < 5) { flags.push('Low wellness scores'); if (status === 'green') status = 'amber' }

      if (sessionsDoneWk === 0 && sessionsTotalWk > 0) { flags.push('No sessions done this week'); if (status === 'green') status = 'amber' }

      // P3.1 v2: surface "days since last message" as an amber-flag when
      // the coach hasn't been in touch for 14+ days. The athlete might be
      // doing fine but coach silence erodes the £29/mo perception.
      if (daysSinceMessage !== null && daysSinceMessage >= 14 && status === 'green') {
        flags.push('No coach message in 14+ days')
        status = 'amber'
      } else if (daysSinceMessage === null && doneLogs.length > 0) {
        // Athlete has been training but the coach has never messaged.
        flags.push('Never messaged')
        if (status === 'green') status = 'amber'
      }

      return {
        athlete_id:          athleteId,
        display_name:        profile?.display_name ?? null,
        handle:              profile?.handle ?? null,
        status,
        flags,
        acwr,
        sessions_done_week:  sessionsDoneWk,
        sessions_total_week: sessionsTotalWk,
        last_active:         lastActive,
        avg_wellness:        avgWellness,
        current_week:        plan?.current_week ?? null,
        total_weeks:         plan?.total_weeks ?? null,
        plan_name:           plan?.name ?? null,
        runner_class:        (profile as { runner_class?: string | null })?.runner_class ?? null,
        streak_current:      streakCurrent,
        days_since_message:  daysSinceMessage,
      }
    })

    // Sort: red first, then amber, then green
    athletes.sort((a, b) => {
      const order = { red: 0, amber: 1, green: 2 }
      return order[a.status] - order[b.status]
    })

    return NextResponse.json({ athletes })

  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Squad status error:' } })
    return NextResponse.json({ error: 'Failed to compute squad status' }, { status: 500 })
  }
}
