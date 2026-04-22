'use client'

import Link from 'next/link'

interface MonthlyRow {
  period_month:   string
  gross_gbp:      number
  commission_gbp: number
  net_gbp:        number
  source_count:   number
}
interface YTD { gross_gbp: number; commission_gbp: number; net_gbp: number }
interface RecentRow {
  id: string; source_type: string; gross_gbp: number
  commission_gbp: number; net_gbp: number
  period_month: string; created_at: string
}
interface Props {
  coach:              { display_name: string; stripe_account_id: string | null; total_athletes: number }
  monthly:            MonthlyRow[]
  ytd:                YTD
  commissionRate:     number
  activeSubscribers:  number
  recent:             RecentRow[]
}

function fmt(n: number) { return `£${n.toFixed(2)}` }
function fmtMonth(m: string) {
  const [y, mo] = m.split('-')
  return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

const SOURCE_LABEL: Record<string, string> = {
  subscription:    '👤 Coaching sub',
  plan_sale:       '📋 Plan sale',
  group_coaching:  '👥 Group coaching',
}

export default function EarningsDashboardClient({
  coach, monthly, ytd, commissionRate, activeSubscribers, recent,
}: Props) {
  const commissionPct = Math.round(commissionRate * 100)

  // Next tier threshold
  const nextTier = activeSubscribers >= 50 ? null
    : activeSubscribers >= 25 ? { at: 50, rate: 8 }
    : activeSubscribers >= 10 ? { at: 25, rate: 10 }
    : { at: 10, rate: 12 }

  return (
    <main className="min-h-screen pb-28" style={{ background: 'var(--color-bg)' }}>

      {/* Header */}
      <div className="px-4 pt-14 pb-6"
        style={{ background: 'linear-gradient(180deg, #1e3a5f40 0%, var(--color-bg) 100%)' }}>
        <div className="max-w-lg mx-auto">
          <Link href="/coach/squad" className="flex items-center gap-1.5 mb-4 text-xs"
            style={{ color: 'var(--color-text-tertiary)' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Coach hub
          </Link>
          <h1 className="font-display text-2xl font-black mb-1"
            style={{ color: 'var(--color-text-primary)' }}>
            Earnings
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            {activeSubscribers} active athlete{activeSubscribers !== 1 ? 's' : ''} ·{' '}
            {commissionPct}% commission rate
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4">

        {/* YTD summary */}
        <div className="rounded-2xl p-5"
          style={{ background: 'var(--color-surface)', border: '1px solid #1e3a5f60' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-4"
            style={{ color: 'var(--color-text-tertiary)' }}>
            Year to date {new Date().getFullYear()}
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-2xl font-black font-data" style={{ color: 'var(--color-text-primary)' }}>
                {fmt(ytd.gross_gbp)}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>gross revenue</p>
            </div>
            <div>
              <p className="text-2xl font-black font-data" style={{ color: '#e85d26' }}>
                {fmt(ytd.commission_gbp)}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                commission ({commissionPct}%)
              </p>
            </div>
            <div>
              <p className="text-2xl font-black font-data" style={{ color: '#4ade80' }}>
                {fmt(ytd.net_gbp)}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>your earnings</p>
            </div>
          </div>
        </div>

        {/* Commission tier */}
        <div className="rounded-2xl p-4"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Commission tier
            </p>
            <span className="text-xs font-black font-data px-2 py-0.5 rounded-full"
              style={{ background: '#1e3a5f40', color: '#7eb8e8' }}>
              {commissionPct}%
            </span>
          </div>
          <div className="space-y-1.5">
            {[
              { label: '1–9 athletes',  rate: 15, min: 0,  max: 9  },
              { label: '10–24 athletes', rate: 12, min: 10, max: 24 },
              { label: '25–49 athletes', rate: 10, min: 25, max: 49 },
              { label: '50+ athletes',   rate: 8,  min: 50, max: Infinity },
            ].map(tier => {
              const isActive = activeSubscribers >= tier.min && activeSubscribers <= tier.max
              return (
                <div key={tier.rate} className="flex items-center justify-between py-1 px-2 rounded-lg"
                  style={{ background: isActive ? '#1e3a5f30' : 'transparent' }}>
                  <p className="text-xs" style={{ color: isActive ? '#7eb8e8' : 'var(--color-text-tertiary)' }}>
                    {isActive ? '▶ ' : ''}{tier.label}
                  </p>
                  <p className="text-xs font-bold font-data"
                    style={{ color: isActive ? '#7eb8e8' : 'var(--color-text-tertiary)' }}>
                    {tier.rate}%
                  </p>
                </div>
              )
            })}
          </div>
          {nextTier && (
            <p className="text-[10px] mt-3" style={{ color: 'var(--color-text-tertiary)' }}>
              {nextTier.at - activeSubscribers} more athletes to reach {nextTier.rate}% commission
            </p>
          )}
        </div>

        {/* Monthly breakdown */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-text-tertiary)' }}>
            Monthly breakdown
          </p>
          {monthly.length === 0 ? (
            <div className="rounded-2xl p-8 text-center"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="text-3xl mb-2">💳</p>
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                No earnings yet
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Earnings appear here once athletes subscribe.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {monthly.map(row => (
                <div key={row.period_month} className="rounded-2xl p-4"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      {fmtMonth(row.period_month)}
                    </p>
                    <p className="text-sm font-black font-data" style={{ color: '#4ade80' }}>
                      {fmt(row.net_gbp)}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <p className="text-xs font-data" style={{ color: 'var(--color-text-secondary)' }}>
                        {fmt(row.gross_gbp)}
                      </p>
                      <p className="text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>gross</p>
                    </div>
                    <div>
                      <p className="text-xs font-data" style={{ color: '#e85d26' }}>
                        −{fmt(row.commission_gbp)}
                      </p>
                      <p className="text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>commission</p>
                    </div>
                    <div>
                      <p className="text-xs font-data" style={{ color: 'var(--color-text-secondary)' }}>
                        {row.source_count}
                      </p>
                      <p className="text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>transactions</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent transactions */}
        {recent.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-3"
              style={{ color: 'var(--color-text-tertiary)' }}>
              Recent transactions
            </p>
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              {recent.map((row, i) => (
                <div key={row.id}
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}>
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      {SOURCE_LABEL[row.source_type] ?? row.source_type}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                      {fmtMonth(row.period_month)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black font-data" style={{ color: '#4ade80' }}>
                      {fmt(row.net_gbp)}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                      after {fmt(row.commission_gbp)} fee
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stripe dashboard link */}
        {coach.stripe_account_id ? (
          <div className="rounded-2xl p-4"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-xs font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
              Stripe payouts
            </p>
            <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              View detailed transaction history, manage bank accounts, and track payouts.
            </p>
            <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer"
              className="inline-block px-4 py-2.5 rounded-xl text-xs font-bold text-white"
              style={{ background: '#1e3a5f' }}>
              Open Stripe Dashboard →
            </a>
          </div>
        ) : (
          <div className="rounded-2xl p-4"
            style={{ background: 'var(--color-surface)', border: '1px solid #e85d2640' }}>
            <p className="text-xs font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
              ⚠️ Payments not set up
            </p>
            <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              Connect your Stripe account to receive payments from athletes.
            </p>
            <Link href="/coach/squad?tab=settings"
              className="inline-block px-4 py-2.5 rounded-xl text-xs font-bold text-white"
              style={{ background: '#e85d26' }}>
              Set up payments →
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
