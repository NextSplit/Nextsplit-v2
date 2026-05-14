// PR J14 — Inngest function definitions.
//
// Each function mirrors a Vercel cron entry. The actual business logic
// still lives in the `/api/cron/*` route handlers; the Inngest function
// invokes them via fetch with CRON_SECRET — this avoids duplicating the
// long cron route bodies and keeps a single source of truth for the work.
//
// To add a new scheduled job: define a new `inngest.createFunction(...)`
// here, export it, and add it to the `inngestFunctions` array at the
// bottom. The `/api/inngest` serve handler picks the list up automatically.

import { inngest } from './client'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nextsplit.app'
const CRON_SECRET = process.env.CRON_SECRET ?? ''

async function invokeCronRoute(path: string): Promise<{ ok: boolean; status: number; body: string }> {
  const res = await fetch(`${SITE_URL}${path}`, {
    method: 'GET',
    headers: {
      'authorization': `Bearer ${CRON_SECRET}`,
      'x-source':      'inngest',
    },
  })
  const body = await res.text()
  return { ok: res.ok, status: res.status, body: body.slice(0, 500) }
}

// 14:00 UTC daily — same schedule as the prior Vercel cron entry.
export const smartNotifyDaily = inngest.createFunction(
  {
    id:       'smart-notify-daily',
    name:     'Smart notify (daily push)',
    triggers: [{ cron: '0 14 * * *' }],
  },
  async () => invokeCronRoute('/api/cron/smart-notify'),
)

// 22:05 UTC daily — same schedule as the prior Vercel cron entry.
export const raceTickDaily = inngest.createFunction(
  {
    id:       'race-tick-daily',
    name:     'Race tick (daily race close + seed)',
    triggers: [{ cron: '5 22 * * *' }],
  },
  async () => invokeCronRoute('/api/cron/race-tick'),
)

// 03:00 UTC daily — K33 GDPR deletion cron. Walks profiles where
// deletion_requested_at is older than 30 days, calls the
// anonymise_user_financial_records RPC to preserve HMRC-required
// financial fact, then hard-deletes the auth user.
export const processDeletionsDaily = inngest.createFunction(
  {
    id:       'process-deletions-daily',
    name:     'Process pending account deletions (GDPR)',
    triggers: [{ cron: '0 3 * * *' }],
  },
  async () => invokeCronRoute('/api/cron/process-deletions'),
)

// Future: Supabase advisor weekly check (PR J1 sequel), hot-weather
// alert when OpenWeatherMap forecast crosses thresholds (PR J12 sequel),
// retention digest emails (PR J15 sequel).

export const inngestFunctions = [smartNotifyDaily, raceTickDaily, processDeletionsDaily]
