import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'
import { config, serverConfig } from '@/lib/config'
import { redirect } from 'next/navigation'
import AiCostDashboard from './AiCostDashboard'

// PR G2 — Anthropic API cost dashboard. Internal/founder-facing. Reads
// the `ai_usage` table (already populated by checkAndIncrementAIUsage +
// recordTokenUsage middleware on every AI endpoint) and projects cost
// using Sonnet 4.6 pricing ($3/M input · $15/M output).
//
// Admin gate matches /admin/retention pattern: profiles has neither
// is_admin nor email; use auth.users.email against ADMIN_EMAILS env var.

export const dynamic = 'force-dynamic'
export const metadata = { title: 'AI cost — NextSplit Admin' }

export interface AiCostDailyRow {
  date:        string  // YYYY-MM-DD
  users:       number  // distinct user_ids that day
  calls:       number
  tokens_in:   number
  tokens_out:  number
  cost_usd:    number
}

export interface AiCostTopUserRow {
  user_id:     string
  display_name: string | null
  calls:       number
  tokens_in:   number
  tokens_out:  number
  cost_usd:    number
}

export interface AiCostFeatureRow {
  feature:     string
  calls:       number
  tokens_in:   number
  tokens_out:  number
  cost_usd:    number
}

// Sonnet 4.6 list pricing — keep in sync if Anthropic changes rates.
// Cache-hit pricing isn't broken out yet (ai_usage doesn't column-split
// cache_read tokens); the rough estimate slightly over-counts cost on
// cache-heavy endpoints like /api/ai/fuel.
const PRICE_IN_PER_M_USD  = 3
const PRICE_OUT_PER_M_USD = 15

function costFor(tokensIn: number, tokensOut: number): number {
  return (tokensIn / 1_000_000) * PRICE_IN_PER_M_USD
       + (tokensOut / 1_000_000) * PRICE_OUT_PER_M_USD
}

interface UsageRow {
  user_id:    string
  date:       string
  call_count: number
  tokens_in:  number
  tokens_out: number
  feature:    string | null
}

async function loadAiCostData(): Promise<{
  daily30:      AiCostDailyRow[]
  topUsers30:   AiCostTopUserRow[]
  features30:   AiCostFeatureRow[]
  totals30:     { calls: number; tokens_in: number; tokens_out: number; cost_usd: number; active_users: number }
  todayCost:    number
  monthlyProjection: number
}> {
  const admin = createAdminClient(config.supabaseUrl, serverConfig.supabaseServiceRoleKey)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = admin as any

  const today = new Date()
  const cutoff = new Date(today); cutoff.setUTCDate(cutoff.getUTCDate() - 30)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  const todayStr  = today.toISOString().slice(0, 10)

  const { data: usageData } = await a.from('ai_usage')
    .select('user_id, date, call_count, tokens_in, tokens_out, feature')
    .gte('date', cutoffStr)
    .order('date', { ascending: false })

  const usage: UsageRow[] = usageData ?? []
  const userIds = [...new Set(usage.map(r => r.user_id))]

  // Hydrate display names for top-users table
  const { data: profileData } = userIds.length > 0
    ? await a.from('profiles')
        .select('id, display_name')
        .in('id', userIds)
    : { data: [] as Array<{ id: string; display_name: string | null }> }
  const nameMap = new Map<string, string | null>(
    (profileData ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name])
  )

  // Daily aggregation
  const dailyMap = new Map<string, AiCostDailyRow & { _users: Set<string> }>()
  for (const r of usage) {
    if (!dailyMap.has(r.date)) {
      dailyMap.set(r.date, {
        date: r.date, users: 0, calls: 0, tokens_in: 0, tokens_out: 0, cost_usd: 0,
        _users: new Set<string>(),
      })
    }
    const row = dailyMap.get(r.date)!
    row.calls      += r.call_count
    row.tokens_in  += r.tokens_in
    row.tokens_out += r.tokens_out
    row._users.add(r.user_id)
  }
  const daily30: AiCostDailyRow[] = [...dailyMap.values()].map(r => ({
    date: r.date,
    users: r._users.size,
    calls: r.calls,
    tokens_in: r.tokens_in,
    tokens_out: r.tokens_out,
    cost_usd: costFor(r.tokens_in, r.tokens_out),
  })).sort((a, b) => b.date.localeCompare(a.date))

  // Top users by cost (30d)
  const userMap = new Map<string, { calls: number; tokens_in: number; tokens_out: number }>()
  for (const r of usage) {
    const u = userMap.get(r.user_id) ?? { calls: 0, tokens_in: 0, tokens_out: 0 }
    u.calls      += r.call_count
    u.tokens_in  += r.tokens_in
    u.tokens_out += r.tokens_out
    userMap.set(r.user_id, u)
  }
  const topUsers30: AiCostTopUserRow[] = [...userMap.entries()].map(([user_id, u]) => ({
    user_id,
    display_name: nameMap.get(user_id) ?? null,
    calls:       u.calls,
    tokens_in:   u.tokens_in,
    tokens_out:  u.tokens_out,
    cost_usd:    costFor(u.tokens_in, u.tokens_out),
  })).sort((a, b) => b.cost_usd - a.cost_usd).slice(0, 10)

  // Feature breakdown (when feature column populated)
  const featureMap = new Map<string, { calls: number; tokens_in: number; tokens_out: number }>()
  for (const r of usage) {
    const f = r.feature ?? '(unlabelled)'
    const v = featureMap.get(f) ?? { calls: 0, tokens_in: 0, tokens_out: 0 }
    v.calls      += r.call_count
    v.tokens_in  += r.tokens_in
    v.tokens_out += r.tokens_out
    featureMap.set(f, v)
  }
  const features30: AiCostFeatureRow[] = [...featureMap.entries()].map(([feature, v]) => ({
    feature,
    calls:      v.calls,
    tokens_in:  v.tokens_in,
    tokens_out: v.tokens_out,
    cost_usd:   costFor(v.tokens_in, v.tokens_out),
  })).sort((a, b) => b.cost_usd - a.cost_usd)

  const totals30 = {
    calls:        daily30.reduce((s, r) => s + r.calls, 0),
    tokens_in:    daily30.reduce((s, r) => s + r.tokens_in, 0),
    tokens_out:   daily30.reduce((s, r) => s + r.tokens_out, 0),
    cost_usd:     daily30.reduce((s, r) => s + r.cost_usd, 0),
    active_users: userMap.size,
  }

  const todayRow = daily30.find(r => r.date === todayStr)
  const todayCost = todayRow?.cost_usd ?? 0
  // Naive monthly projection: 30-day cost / days observed × 30. Smoothed
  // over the actually-observed window to avoid skewing early-month.
  const daysObserved = daily30.length || 1
  const monthlyProjection = (totals30.cost_usd / daysObserved) * 30

  return { daily30, topUsers30, features30, totals30, todayCost, monthlyProjection }
}

export default async function AiCostPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!adminEmails.includes(user.email ?? '')) redirect('/home')

  let data
  try {
    data = await loadAiCostData()
  } catch (err) {
    Sentry.captureException(err, {
      tags: { feature: 'pr-g2-ai-cost-dashboard' },
      extra: { context: '[admin/ai-cost loadAiCostData]' },
    })
    throw err
  }
  return <AiCostDashboard {...data} />
}
