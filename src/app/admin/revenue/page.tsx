import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getStripe, getFoundingCount, FOUNDING_LIMIT } from '@/lib/stripe'
import { serverConfig } from '@/lib/config'
import RevenueDashboard from './RevenueDashboard'

// PR J3 — Stripe revenue dashboard. Admin-gated mirror of the data
// founder currently checks via the Stripe dashboard. Brings MRR /
// active / trialing / refunds / founding-cap inside the same admin
// surface as /admin/health + /admin/ai-cost + /admin/retention.

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Revenue — NextSplit Admin' }

export interface RevenueSnapshot {
  configured:        boolean
  mrr_pence:         number
  active_count:      number
  trialing_count:    number
  founding_count:    number
  founding_limit:    number
  refunds_30d_pence: number
  recent_payments:   Array<{
    id:           string
    amount_pence: number
    currency:     string
    created:      string         // ISO
    customer:     string | null
    status:       string
    description:  string | null
  }>
}

interface StripeSubscription {
  id:    string
  status: string
  items: { data: Array<{ price: { unit_amount: number | null; recurring: { interval: string } | null } }> }
}

function monthlyValue(sub: StripeSubscription): number {
  const item = sub.items.data[0]
  if (!item) return 0
  const amount = item.price.unit_amount ?? 0
  const interval = item.price.recurring?.interval ?? 'month'
  if (interval === 'year') return Math.round(amount / 12)
  if (interval === 'week') return amount * 4
  if (interval === 'day')  return amount * 30
  return amount
}

async function loadRevenue(): Promise<RevenueSnapshot> {
  if (!serverConfig.stripeSecretKey) {
    return {
      configured:        false,
      mrr_pence:         0,
      active_count:      0,
      trialing_count:    0,
      founding_count:    0,
      founding_limit:    FOUNDING_LIMIT,
      refunds_30d_pence: 0,
      recent_payments:   [],
    }
  }
  const stripe = getStripe()
  const supabase = await createClient()

  const since30d = Math.floor(Date.now() / 1000) - 30 * 86400

  const [actives, trialing, charges, refunds, founding] = await Promise.all([
    stripe.subscriptions.list({ status: 'active',   limit: 100 }),
    stripe.subscriptions.list({ status: 'trialing', limit: 100 }),
    stripe.charges.list({ limit: 10, created: { gte: since30d } }),
    stripe.refunds.list({ limit: 100, created: { gte: since30d } }),
    getFoundingCount(supabase),
  ])

  const mrr = actives.data.reduce((s, sub) => s + monthlyValue(sub as unknown as StripeSubscription), 0)
  const refunds30 = refunds.data.reduce((s, r) => s + (r.amount ?? 0), 0)

  return {
    configured:        true,
    mrr_pence:         mrr,
    active_count:      actives.data.length,
    trialing_count:    trialing.data.length,
    founding_count:    founding,
    founding_limit:    FOUNDING_LIMIT,
    refunds_30d_pence: refunds30,
    recent_payments:   charges.data.slice(0, 10).map(c => ({
      id:           c.id,
      amount_pence: c.amount,
      currency:     c.currency,
      created:      new Date(c.created * 1000).toISOString(),
      customer:     typeof c.customer === 'string' ? c.customer : null,
      status:       c.status,
      description:  c.description ?? null,
    })),
  }
}

export default async function RevenuePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!adminEmails.includes(user.email ?? '')) redirect('/home')

  const data = await loadRevenue()
  return <RevenueDashboard {...data} />
}
