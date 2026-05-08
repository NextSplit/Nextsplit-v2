import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { db } from '@/lib/supabase/db'
import * as Sentry from '@sentry/nextjs'
import { config, serverConfig } from '@/lib/config'
import { redirect } from 'next/navigation'
import RetentionDashboard from './RetentionDashboard'

// P3.8 Retention dashboards (council /council 2026-05-07, Phase 3 retention
// proof). Internal/founder-facing route. Computes the cohort numbers that
// gate the Phase 4 paywall flip (P4.0): signups, activation rate, D1/D7/D30
// return cohorts.
//
// All queries run server-side via service-role client (auth.users isn't
// reachable from the anon client). Gated to admins only via profiles.is_admin
// or ADMIN_EMAILS allow-list (audit F0.3, Track 1 closeout 2026-05-08) —
// matches the gating in /admin/plan-review and /admin/adapt-test.

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Retention — NextSplit Admin' }

interface CohortRow {
  signup_date:    string  // YYYY-MM-DD
  cohort_size:    number
  d1_returners:   number  // logged a session within 24h of signup
  d7_returners:   number  // logged a session 6-8 days after signup
  d30_returners:  number  // logged a session 28-32 days after signup
  onboarded:      number  // onboarding_complete = true
  first_log:      number  // any training_logs row exists
}

function dateOnly(d: Date) { return d.toISOString().slice(0, 10) }

async function loadRetentionData(): Promise<{
  cohorts:        CohortRow[]
  totals:         { signups: number; onboarded: number; first_log: number; pushSubscribed: number }
  recent7Signups: number
  recent7Logs:    number
}> {
  const admin = createAdminClient(config.supabaseUrl, serverConfig.supabaseServiceRoleKey)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = admin as any

  const now = new Date()
  const cutoff30 = new Date(now); cutoff30.setUTCDate(cutoff30.getUTCDate() - 30)

  const [{ data: profiles }, { data: logs }, { data: pushSubs }] = await Promise.all([
    a.from('profiles').select('id, created_at, onboarding_complete'),
    a.from('training_logs').select('user_id, logged_at, created_at, done')
       .eq('done', true),
    a.from('push_subscriptions').select('user_id'),
  ])

  const profileRows: Array<{
    id: string; created_at: string; onboarding_complete: boolean | null
  }> = profiles ?? []
  const logRows: Array<{
    user_id: string; logged_at: string; created_at: string
  }> = logs ?? []
  const pushRows: Array<{ user_id: string }> = pushSubs ?? []

  // Build per-user log timeline.
  const logsByUser: Record<string, number[]> = {}
  for (const l of logRows) {
    const ts = new Date(l.logged_at ?? l.created_at).getTime()
    if (!Number.isFinite(ts)) continue
    if (!logsByUser[l.user_id]) logsByUser[l.user_id] = []
    logsByUser[l.user_id].push(ts)
  }
  const pushSet = new Set(pushRows.map(r => r.user_id))

  // Cohort buckets, last 30 days.
  const cohortMap = new Map<string, CohortRow>()
  let totalOnboarded = 0
  let totalFirstLog  = 0
  let recent7Signups = 0

  for (const p of profileRows) {
    const signupTs = new Date(p.created_at).getTime()
    if (!Number.isFinite(signupTs)) continue
    const signupDate = dateOnly(new Date(signupTs))
    const userLogs   = logsByUser[p.id] ?? []
    const onboarded  = !!p.onboarding_complete
    const hasFirst   = userLogs.length > 0

    if (onboarded) totalOnboarded++
    if (hasFirst)  totalFirstLog++

    if (signupTs >= now.getTime() - 7 * 86400000) recent7Signups++

    if (signupTs < cutoff30.getTime()) continue

    if (!cohortMap.has(signupDate)) {
      cohortMap.set(signupDate, {
        signup_date:   signupDate,
        cohort_size:   0,
        d1_returners:  0,
        d7_returners:  0,
        d30_returners: 0,
        onboarded:     0,
        first_log:     0,
      })
    }
    const row = cohortMap.get(signupDate)!
    row.cohort_size++
    if (onboarded) row.onboarded++
    if (hasFirst)  row.first_log++

    const day1Start  = signupTs + 0  * 86400000
    const day1End    = signupTs + 1  * 86400000
    const day7Start  = signupTs + 6  * 86400000
    const day7End    = signupTs + 8  * 86400000
    const day30Start = signupTs + 28 * 86400000
    const day30End   = signupTs + 32 * 86400000

    if (userLogs.some(ts => ts >= day1Start  && ts < day1End))  row.d1_returners++
    if (userLogs.some(ts => ts >= day7Start  && ts < day7End))  row.d7_returners++
    if (userLogs.some(ts => ts >= day30Start && ts < day30End)) row.d30_returners++
  }

  const cohorts = [...cohortMap.values()].sort((a, b) => a.signup_date.localeCompare(b.signup_date))

  // Recent activity: logs in last 7 days.
  const recent7Cutoff = now.getTime() - 7 * 86400000
  const recent7Logs   = logRows.filter(l => {
    const ts = new Date(l.logged_at ?? l.created_at).getTime()
    return Number.isFinite(ts) && ts >= recent7Cutoff
  }).length

  return {
    cohorts,
    totals: {
      signups:        profileRows.length,
      onboarded:      totalOnboarded,
      first_log:      totalFirstLog,
      pushSubscribed: pushSet.size,
    },
    recent7Signups,
    recent7Logs,
  }
}

export default async function RetentionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await db(supabase)
    .from('profiles').select('is_admin, email').eq('id', user.id).single()
  const isAdmin =
    profile?.is_admin === true ||
    process.env.ADMIN_EMAILS?.split(',').map((e: string) => e.trim()).includes(profile?.email ?? '')
  if (!isAdmin) redirect('/home')

  // BL-X8: wrap the cohort load in Sentry. If service-role queries throw
  // (RLS misconfig, network timeout, schema drift), the page rendering
  // crashes — without this the founder finds out at the Vercel error
  // overlay rather than via the alerting channel.
  let data
  try {
    data = await loadRetentionData()
  } catch (err) {
    Sentry.captureException(err, {
      tags: { feature: 'p3.8-retention-dashboard' },
      extra: { context: '[admin/retention loadRetentionData]' },
    })
    throw err
  }
  return <RetentionDashboard {...data} />
}
