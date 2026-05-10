import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'
import { config, serverConfig } from '@/lib/config'
import { redirect } from 'next/navigation'
import NudgesDashboard from './NudgesDashboard'

// PR J — founder admin surface for the P3.9 nudge effectiveness RPC.
//
// The RPC nudge_effectiveness_summary() (phase-p3-9-nudge-ab-v1.sql) is
// granted to authenticated, but only the founder is meant to read it
// regularly. ADMIN_EMAILS gate matches the rest of /admin/* (retention,
// plan-review, adapt-test). Mismatches redirect to /home so we don't
// surface the route discoverable from the URL bar.
//
// Service-role admin client is used to read the RPC server-side so the
// page renders fully populated on first load (no client-side hydration
// gap, no flicker, no "loading" state). The data isn't user-PII — just
// per-template aggregate counts — so service-role exposure is fine.

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Nudge effectiveness — NextSplit Admin' }

export interface NudgeRow {
  message_key:       string
  template_variant:  string
  sent_count:        number
  opened_count:      number
  dismissed_count:   number
  drop_dead_count:   number
  open_rate:         number  // percent (0-100)
  drop_dead_rate:    number  // percent (0-100)
}

async function loadNudgeData(): Promise<NudgeRow[]> {
  const admin = createAdminClient(config.supabaseUrl, serverConfig.supabaseServiceRoleKey)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = admin as any

  const { data, error } = await a.rpc('nudge_effectiveness_summary')
  if (error) throw error
  return (data ?? []) as NudgeRow[]
}

export default async function NudgesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!adminEmails.includes(user.email ?? '')) redirect('/home')

  let rows: NudgeRow[] = []
  try {
    rows = await loadNudgeData()
  } catch (err) {
    Sentry.captureException(err, {
      tags: { feature: 'p3.9-nudge-admin' },
      extra: { context: '[admin/nudges loadNudgeData]' },
    })
    throw err
  }
  return <NudgesDashboard rows={rows} />
}
