import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'
import { config, serverConfig } from '@/lib/config'
import { redirect } from 'next/navigation'
import CronDashboard from './CronDashboard'

// PR H3 — cron run observability. Reads the public.cron_runs table
// (populated by smart-notify + race-tick via service-role) and renders
// a per-job timeline with success rate, duration, last-fire result.

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Cron — NextSplit Admin' }

export interface CronRunRow {
  id:            string
  job:           string
  started_at:    string
  finished_at:   string | null
  duration_ms:   number | null
  ok:            boolean
  result:        unknown
  error_message: string | null
}

export interface CronJobSummary {
  job:         string
  runs_30d:    number
  ok_30d:      number
  fail_30d:    number
  last_run_at: string | null
  last_ok:     boolean | null
  avg_ms_30d:  number | null
  recent:      CronRunRow[]  // last 10
}

async function loadCronData(): Promise<{
  jobs: CronJobSummary[]
}> {
  const admin = createAdminClient(config.supabaseUrl, serverConfig.supabaseServiceRoleKey)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = admin as any

  const cutoff = new Date(); cutoff.setUTCDate(cutoff.getUTCDate() - 30)

  const { data: runs } = await a.from('cron_runs')
    .select('id, job, started_at, finished_at, duration_ms, ok, result, error_message')
    .gte('started_at', cutoff.toISOString())
    .order('started_at', { ascending: false })

  const rows: CronRunRow[] = runs ?? []
  const byJob = new Map<string, CronRunRow[]>()
  for (const r of rows) {
    if (!byJob.has(r.job)) byJob.set(r.job, [])
    byJob.get(r.job)!.push(r)
  }

  const jobs: CronJobSummary[] = [...byJob.entries()].map(([job, jobRuns]) => {
    const oks   = jobRuns.filter(r => r.ok)
    const fails = jobRuns.filter(r => !r.ok)
    const durations = jobRuns.map(r => r.duration_ms).filter((d): d is number => d !== null)
    const avgMs = durations.length > 0
      ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
      : null
    return {
      job,
      runs_30d:    jobRuns.length,
      ok_30d:      oks.length,
      fail_30d:    fails.length,
      last_run_at: jobRuns[0]?.started_at ?? null,
      last_ok:     jobRuns[0]?.ok ?? null,
      avg_ms_30d:  avgMs,
      recent:      jobRuns.slice(0, 10),
    }
  }).sort((a, b) => (b.last_run_at ?? '').localeCompare(a.last_run_at ?? ''))

  return { jobs }
}

export default async function CronPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!adminEmails.includes(user.email ?? '')) redirect('/home')

  let data
  try {
    data = await loadCronData()
  } catch (err) {
    Sentry.captureException(err, {
      tags: { feature: 'pr-h3-cron-dashboard' },
      extra: { context: '[admin/cron loadCronData]' },
    })
    throw err
  }
  return <CronDashboard {...data} />
}
