'use client'

import Link from 'next/link'
import { AppHeader } from '@/components/AppHeader'
import type { RevenueSnapshot } from './page'

// PR J3 — Stripe revenue admin surface. Read-only snapshot of MRR +
// active / trialing / founding-cap / refunds last 30d + recent payments.
// Promo-code creation deliberately deferred — needs its own POST route +
// confirmation flow to avoid accidental coupon creation.

export default function RevenueDashboard(s: RevenueSnapshot) {
  if (!s.configured) {
    return (
      <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>
        <AppHeader title="Revenue" subtitle="Stripe snapshot" />
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className="rounded-2xl p-4"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-sm font-black" style={{ color: '#ef4444' }}>
              STRIPE_SECRET_KEY not set
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              Set on Vercel to enable this dashboard.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const mrrGbp     = (s.mrr_pence / 100).toFixed(2)
  const refundsGbp = (s.refunds_30d_pence / 100).toFixed(2)
  const foundingRemaining = Math.max(0, s.founding_limit - s.founding_count)
  const foundingPct = Math.min(100, (s.founding_count / s.founding_limit) * 100)

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>
      <AppHeader
        title="Revenue"
        subtitle="Stripe snapshot · live"
        rightSlot={
          <Link href="/admin/health"
            className="text-xs font-bold px-2.5 py-1 rounded-lg"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
            Health
          </Link>
        }
      />

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">

        {/* Headline cards */}
        <section>
          <SectionLabel>Headline</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            <Card label="MRR (£)"          value={`£${mrrGbp}`}        subtitle={`from ${s.active_count} active sub${s.active_count !== 1 ? 's' : ''}`} colour="#22c55e" />
            <Card label="Active"           value={`${s.active_count}`}                                                                                  subtitle="subscriptions"                colour="#3b82f6" />
            <Card label="Trialing"         value={`${s.trialing_count}`}                                                                                subtitle="in trial period"              colour="#a855f7" />
            <Card label="Refunds (30d)"    value={`£${refundsGbp}`}    subtitle={`across the last month`}                                                colour="#ef4444" />
          </div>
        </section>

        {/* Founding tier countdown */}
        <section>
          <SectionLabel>Founding tier</SectionLabel>
          <div className="rounded-2xl p-4"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>
                {s.founding_count} / {s.founding_limit}
              </p>
              <p className="text-xs font-bold" style={{ color: foundingRemaining < 50 ? '#f59e0b' : '#22c55e' }}>
                {foundingRemaining} remaining
              </p>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
              <div className="h-full transition-all"
                style={{ width: `${foundingPct}%`, background: foundingRemaining < 50 ? '#f59e0b' : '#22c55e' }} />
            </div>
          </div>
        </section>

        {/* Recent payments */}
        <section>
          <SectionLabel>Recent payments · last 30d</SectionLabel>
          {s.recent_payments.length === 0 ? (
            <div className="rounded-2xl p-3 text-xs"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)' }}>
              No charges in the last 30 days.
            </div>
          ) : (
            <div className="space-y-1.5">
              {s.recent_payments.map(p => {
                const okColour = p.status === 'succeeded' ? '#22c55e' : p.status === 'pending' ? '#f59e0b' : '#ef4444'
                return (
                  <div key={p.id} className="rounded-xl p-2.5"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>
                          {p.currency.toUpperCase()} {(p.amount_pence / 100).toFixed(2)}
                        </p>
                        <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                          {p.description ?? p.customer ?? p.id}
                        </p>
                      </div>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{ background: `${okColour}30`, color: okColour }}>
                        {p.status}
                      </span>
                    </div>
                    <p className="text-[10px] mt-1 font-mono" style={{ color: 'var(--color-text-tertiary)' }}>
                      {new Date(p.created).toUTCString().slice(5, 22)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <p className="text-[10px] mt-3 leading-snug px-1" style={{ color: 'var(--color-text-tertiary)' }}>
          MRR normalises annual subs to monthly (÷12). For promo-code creation, refunds,
          subscription edits — use the Stripe dashboard. Full Stripe MCP available in Claude
          sessions for one-off operations (<span className="font-mono">create_coupon</span>,
          <span className="font-mono"> create_payment_link</span>, etc.).
        </p>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1"
      style={{ color: 'var(--color-text-tertiary)' }}>
      {children}
    </p>
  )
}

function Card({ label, value, subtitle, colour }: {
  label: string; value: string; subtitle: string; colour: string
}) {
  return (
    <div className="rounded-2xl p-3"
      style={{
        background: `linear-gradient(135deg, ${colour}15, ${colour}05)`,
        border:     `1.5px solid ${colour}40`,
      }}>
      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: colour }}>
        {label}
      </p>
      <p className="text-2xl font-black mt-1"
        style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
        {value}
      </p>
      <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
        {subtitle}
      </p>
    </div>
  )
}
