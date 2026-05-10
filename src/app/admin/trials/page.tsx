import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'
import { config, serverConfig } from '@/lib/config'
import { redirect } from 'next/navigation'
import TrialsDashboard from './TrialsDashboard'

// PR L — founder admin surface for the BL-C6 trial conversion funnel.
//
// Reads from profiles directly via service-role admin client (auth.users
// + cross-user reads need the bypass). Aggregates by trial_source so the
// founder can see whether squad-join vs first-coach-message is driving
// more conversions, and at what rate.
//
// All metrics are deterministic from current profile state — no event
// log needed because the trial flow only writes terminal states
// (started → ended; conversion derived from is_pro at read time).
//
// ADMIN_EMAILS gate matches /admin/retention + /admin/nudges.

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Trial funnel — NextSplit Admin' }

export interface TrialRow {
  user_id:           string
  display_name:      string | null
  email:             string | null
  trial_source:      string | null
  trial_started_at:  string
  trial_warned_at:   string | null
  trial_ended_at:    string | null
  is_pro:            boolean
  status:            'active' | 'converted' | 'lapsed'
}

export interface SourceMetrics {
  source:           string  // 'squad_join' | 'first_coach_message'
  granted:          number
  active:           number
  converted:        number
  lapsed:           number
  conversion_rate:  number  // % of total granted that are now is_pro
}

export interface FunnelData {
  totals:        { granted: number; active: number; converted: number; lapsed: number; conversion_rate: number }
  bySource:      SourceMetrics[]
  recent:        TrialRow[]    // last 30 trials, newest first
  dailyGranted:  Array<{ date: string; squad_join: number; first_coach_message: number }>
}

const SOURCES = ['squad_join', 'first_coach_message'] as const

function dateOnly(iso: string): string {
  return iso.slice(0, 10)
}

async function loadFunnelData(): Promise<FunnelData> {
  const admin = createAdminClient(config.supabaseUrl, serverConfig.supabaseServiceRoleKey)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = admin as any

  const { data: profiles, error } = await a
    .from('profiles')
    .select('id, display_name, trial_source, trial_started_at, trial_warned_at, trial_ended_at, is_pro')
    .not('trial_started_at', 'is', null)
    .order('trial_started_at', { ascending: false })

  if (error) throw error

  const profileRows = (profiles ?? []) as Array<{
    id:                string
    display_name:      string | null
    trial_source:      string | null
    trial_started_at:  string
    trial_warned_at:   string | null
    trial_ended_at:    string | null
    is_pro:            boolean | null
  }>

  // Pull email from auth.users for the recent list (display only — not
  // logged or exported). Limited to the 30 most recent to keep the
  // service-role query bounded.
  const recentIds = profileRows.slice(0, 30).map(p => p.id)
  let emailById = new Map<string, string | null>()
  if (recentIds.length > 0) {
    const { data: { users } = { users: [] } } = await a.auth.admin.listUsers({ perPage: 1000 })
    const byId = new Map<string, string | null>()
    for (const u of (users ?? []) as Array<{ id: string; email: string | null }>) {
      byId.set(u.id, u.email)
    }
    emailById = byId
  }

  // ── Aggregate ─────────────────────────────────────────────────────────────
  const sourceAcc = new Map<string, { granted: number; active: number; converted: number; lapsed: number }>()
  for (const s of SOURCES) sourceAcc.set(s, { granted: 0, active: 0, converted: 0, lapsed: 0 })

  let totalGranted   = 0
  let totalActive    = 0
  let totalConverted = 0
  let totalLapsed    = 0

  const recent: TrialRow[] = []

  for (const p of profileRows) {
    const source = p.trial_source ?? 'unknown'
    const slot   = sourceAcc.get(source) ?? { granted: 0, active: 0, converted: 0, lapsed: 0 }
    slot.granted++; totalGranted++

    let status: TrialRow['status']
    if (p.is_pro) {
      // Pro now ⇒ they converted (Stripe webhook flipped is_pro). The
      // trial_ended_at field may or may not be set; doesn't matter for
      // the funnel signal.
      slot.converted++; totalConverted++
      status = 'converted'
    } else if (p.trial_ended_at) {
      slot.lapsed++; totalLapsed++
      status = 'lapsed'
    } else {
      slot.active++; totalActive++
      status = 'active'
    }
    sourceAcc.set(source, slot)

    if (recent.length < 30) {
      recent.push({
        user_id:          p.id,
        display_name:     p.display_name,
        email:            emailById.get(p.id) ?? null,
        trial_source:     p.trial_source,
        trial_started_at: p.trial_started_at,
        trial_warned_at:  p.trial_warned_at,
        trial_ended_at:   p.trial_ended_at,
        is_pro:           !!p.is_pro,
        status,
      })
    }
  }

  const bySource: SourceMetrics[] = SOURCES.map(s => {
    const slot = sourceAcc.get(s)!
    const conversion_rate = slot.granted > 0 ? Math.round((100 * slot.converted / slot.granted) * 10) / 10 : 0
    return { source: s, ...slot, conversion_rate }
  })

  // ── 30-day daily granted timeseries ───────────────────────────────────────
  const cutoff = Date.now() - 30 * 86400000
  const dailyMap = new Map<string, { date: string; squad_join: number; first_coach_message: number }>()
  for (const p of profileRows) {
    const ts = new Date(p.trial_started_at).getTime()
    if (!Number.isFinite(ts) || ts < cutoff) continue
    const d = dateOnly(p.trial_started_at)
    if (!dailyMap.has(d)) dailyMap.set(d, { date: d, squad_join: 0, first_coach_message: 0 })
    const slot = dailyMap.get(d)!
    if (p.trial_source === 'squad_join')          slot.squad_join++
    else if (p.trial_source === 'first_coach_message') slot.first_coach_message++
  }
  const dailyGranted = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date))

  const conversion_rate = totalGranted > 0
    ? Math.round((100 * totalConverted / totalGranted) * 10) / 10
    : 0

  return {
    totals: { granted: totalGranted, active: totalActive, converted: totalConverted, lapsed: totalLapsed, conversion_rate },
    bySource,
    recent,
    dailyGranted,
  }
}

export default async function TrialsAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!adminEmails.includes(user.email ?? '')) redirect('/home')

  let data: FunnelData
  try {
    data = await loadFunnelData()
  } catch (err) {
    Sentry.captureException(err, {
      tags: { feature: 'blc6-trial-admin' },
      extra: { context: '[admin/trials loadFunnelData]' },
    })
    throw err
  }
  return <TrialsDashboard data={data} />
}
