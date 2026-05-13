import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'
import { config, serverConfig } from '@/lib/config'
import { redirect } from 'next/navigation'
import HealthDashboard from './HealthDashboard'

// PR I1 — single-page system pulse. Rolls up the signals that already
// have their own dashboards (cron, AI cost, retention) plus a couple of
// new ones (Sentry DSN presence, recent training-log activity, recent
// signups). The point: spot drift without opening 4 tabs.

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Health — NextSplit Admin' }

export interface HealthSummary {
  // Cron pulse
  smart_notify_last: { started_at: string; ok: boolean; result: unknown } | null
  race_tick_last:    { started_at: string; ok: boolean; result: unknown } | null
  cron_runs_24h:     number
  cron_failures_24h: number

  // AI pulse
  ai_calls_today:    number
  ai_users_today:    number
  ai_tokens_in_24h:  number
  ai_tokens_out_24h: number

  // Activity pulse
  logs_24h:          number
  notifications_24h: number
  signups_7d:        number
  active_users_7d:   number

  // Sentry config
  sentry_dsn_present: boolean

  // PR J4 — recent Sentry issues (last 24h, top 5 by recency).
  // sentry_token_present=false when SENTRY_AUTH_TOKEN env unset.
  sentry_token_present: boolean
  sentry_issues_24h:    Array<{ id: string; title: string; count: number; last_seen: string; level: string; web_url: string }>
  sentry_total_24h:     number
}

async function loadHealth(): Promise<HealthSummary> {
  const admin = createAdminClient(config.supabaseUrl, serverConfig.supabaseServiceRoleKey)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = admin as any

  const now = new Date()
  const cutoff24h = new Date(now.getTime() - 24 * 3600 * 1000).toISOString()
  const cutoff7d  = new Date(now.getTime() - 7 * 86400 * 1000).toISOString()
  const todayStr  = now.toISOString().slice(0, 10)

  const [
    cronRuns, aiToday, aiRecent, logs24, notifs24, signups7, profilesTouched7,
  ] = await Promise.all([
    a.from('cron_runs')
      .select('job, started_at, ok, result')
      .gte('started_at', cutoff24h)
      .order('started_at', { ascending: false }),
    a.from('ai_usage')
      .select('user_id, call_count')
      .eq('date', todayStr),
    a.from('ai_usage')
      .select('tokens_in, tokens_out, date')
      .gte('date', new Date(now.getTime() - 86400 * 1000).toISOString().slice(0, 10)),
    a.from('training_logs')
      .select('id', { count: 'exact', head: true })
      .gte('logged_at', cutoff24h),
    a.from('notifications')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', cutoff24h),
    a.from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', cutoff7d),
    a.from('training_logs')
      .select('user_id')
      .gte('logged_at', cutoff7d),
  ])

  type CronRow = { job: string; started_at: string; ok: boolean; result: unknown }
  const cronRows: CronRow[] = cronRuns.data ?? []
  const smartNotifyLast = cronRows.find(r => r.job === 'smart-notify') ?? null
  const raceTickLast    = cronRows.find(r => r.job === 'race-tick') ?? null

  const aiTodayRows: Array<{ user_id: string; call_count: number }> = aiToday.data ?? []
  const aiCallsToday = aiTodayRows.reduce((s, r) => s + (r.call_count ?? 0), 0)
  const aiUsersToday = new Set(aiTodayRows.map(r => r.user_id)).size

  const aiRecentRows: Array<{ tokens_in: number; tokens_out: number }> = aiRecent.data ?? []
  const aiTokensIn  = aiRecentRows.reduce((s, r) => s + (r.tokens_in ?? 0), 0)
  const aiTokensOut = aiRecentRows.reduce((s, r) => s + (r.tokens_out ?? 0), 0)

  const activeUsers7: Array<{ user_id: string }> = profilesTouched7.data ?? []
  const activeUsers7Count = new Set(activeUsers7.map(r => r.user_id)).size

  // PR J4 — recent Sentry issues. Only fetched if SENTRY_AUTH_TOKEN is
  // set; fails open with empty list if the API errors. Non-fatal.
  const sentryToken     = serverConfig.sentryAuthToken
  const sentryOrg       = serverConfig.sentryOrgSlug
  const sentryRegion    = serverConfig.sentryRegionUrl.replace(/\/$/, '')
  let sentryIssues24h: HealthSummary['sentry_issues_24h'] = []
  let sentryTotal24h   = 0
  if (sentryToken) {
    try {
      const url = `${sentryRegion}/api/0/organizations/${sentryOrg}/issues/?statsPeriod=24h&query=is:unresolved&limit=5&sort=date`
      const res = await fetch(url, {
        headers: { 'authorization': `Bearer ${sentryToken}` },
        // Force-dynamic + no cache so the admin pane shows real-time data.
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json() as Array<{
          id: string; title: string; count: string; lastSeen: string; level: string; permalink: string
        }>
        sentryIssues24h = data.map(d => ({
          id:        d.id,
          title:     d.title,
          count:     parseInt(d.count, 10) || 0,
          last_seen: d.lastSeen,
          level:     d.level,
          web_url:   d.permalink,
        }))
        sentryTotal24h = sentryIssues24h.length
      }
    } catch { /* swallow — non-fatal */ }
  }

  return {
    smart_notify_last: smartNotifyLast,
    race_tick_last:    raceTickLast,
    cron_runs_24h:     cronRows.length,
    cron_failures_24h: cronRows.filter(r => !r.ok).length,

    ai_calls_today:    aiCallsToday,
    ai_users_today:    aiUsersToday,
    ai_tokens_in_24h:  aiTokensIn,
    ai_tokens_out_24h: aiTokensOut,

    logs_24h:          logs24.count ?? 0,
    notifications_24h: notifs24.count ?? 0,
    signups_7d:        signups7.count ?? 0,
    active_users_7d:   activeUsers7Count,

    sentry_dsn_present: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

    sentry_token_present: !!sentryToken,
    sentry_issues_24h:    sentryIssues24h,
    sentry_total_24h:     sentryTotal24h,
  }
}

export default async function HealthPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!adminEmails.includes(user.email ?? '')) redirect('/home')

  let data
  try {
    data = await loadHealth()
  } catch (err) {
    Sentry.captureException(err, {
      tags: { feature: 'pr-i1-health-dashboard' },
      extra: { context: '[admin/health loadHealth]' },
    })
    throw err
  }
  return <HealthDashboard {...data} />
}
