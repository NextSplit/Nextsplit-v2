'use client'

/**
 * Coach Marketplace Performance Dashboard — Phase B5
 * Per-plan: starts, completion rate, rating, revenue earned
 * Summary: total revenue, all-time starts, avg rating
 */

import Link from 'next/link'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Plan     = Record<string, any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Purchase = Record<string, any>

interface Props {
  plans:     Plan[]
  purchases: Purchase[]
  coachTier: string
}

function StarRating({ rating, count }: { rating: number | null; count: number }) {
  if (!rating || count === 0) return <span className="text-xs text-[var(--color-text-tertiary)]">No ratings yet</span>
  return (
    <div className="flex items-center gap-1">
      {'★★★★★'.split('').map((star, i) => (
        <span key={i} className={`text-sm ${i < Math.round(rating) ? 'text-amber-400' : 'text-gray-200'}`}>{star}</span>
      ))}
      <span className="text-xs text-[var(--color-text-tertiary)] ml-1">{rating.toFixed(1)} ({count})</span>
    </div>
  )
}

function CompletionBar({ pct }: { pct: number | null }) {
  const val = pct ?? 0
  const colour = val >= 70 ? '#8b5cf6' : val >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(val, 100)}%`, background: colour }} />
      </div>
      <span className="text-xs font-bold" style={{ color: colour }}>{val ? `${Math.round(val)}%` : '—'}</span>
    </div>
  )
}

export default function CoachMarketplaceClient({ plans, purchases, coachTier }: Props) {
  const isPro = coachTier === 'professional'

  // Revenue calculations
  const totalRevenue     = purchases.reduce((s: number, p: Purchase) => s + (p.coach_payout_gbp ?? 0), 0)
  const revenueByPlan    = purchases.reduce((acc: Record<string, number>, p: Purchase) => {
    acc[p.template_id] = (acc[p.template_id] ?? 0) + (p.coach_payout_gbp ?? 0)
    return acc
  }, {})
  const purchasesByPlan  = purchases.reduce((acc: Record<string, number>, p: Purchase) => {
    acc[p.template_id] = (acc[p.template_id] ?? 0) + 1
    return acc
  }, {})

  const totalStarts      = plans.reduce((s: number, p: Plan) => s + (p.total_starts ?? 0), 0)
  const publishedCount   = plans.filter(p => p.is_public).length

  // Recent revenue (last 30 days)
  const thirtyDaysAgo   = new Date(Date.now() - 30 * 24 * 3600 * 1000)
  const recentRevenue   = purchases
    .filter((p: Purchase) => new Date(p.created_at) > thirtyDaysAgo)
    .reduce((s: number, p: Purchase) => s + (p.coach_payout_gbp ?? 0), 0)

  return (
    <div className="min-h-screen pb-24" style={{ background: '#f8f8f6' }}>
      <div className="bg-white border-b border-[var(--color-border)] px-4 pt-12 pb-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <Link href="/coach/squad" className="text-xs text-[var(--color-text-tertiary)] hover:underline">← Squad</Link>
            <h1 className="text-lg font-black text-gray-900 mt-0.5">My Plans</h1>
          </div>
          <Link href="/coach/plan-builder"
            className="text-sm font-bold px-4 py-2 rounded-xl text-white"
            style={{ background: 'var(--ns-ember)' }}>
            + New plan
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* Revenue summary — Pro coaches only */}
        {isPro && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'All-time', value: `£${totalRevenue.toFixed(0)}`, sub: 'earned (70% share)' },
              { label: 'Last 30 days', value: `£${recentRevenue.toFixed(0)}`, sub: 'recent revenue' },
              { label: 'Total starts', value: totalStarts.toString(), sub: `across ${publishedCount} plan${publishedCount !== 1 ? 's' : ''}` },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-[var(--color-border)] p-3 text-center">
                <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1">{s.label}</p>
                <p className="text-lg font-black" style={{ color: 'var(--ns-violet)' }}>{s.value}</p>
                <p className="text-[10px] text-[var(--color-text-tertiary)]">{s.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Plans list */}
        {plans.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-8 text-center">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-sm font-bold text-gray-800 mb-1">No plans published yet</p>
            <p className="text-xs text-[var(--color-text-tertiary)] mb-4">Create a training plan and publish it to the marketplace.</p>
            <Link href="/coach/plan-builder"
              className="text-sm font-bold px-4 py-2 rounded-xl text-white inline-block"
              style={{ background: 'var(--ns-ember)' }}>
              Build your first plan →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((plan: Plan) => {
              const revenue    = revenueByPlan[plan.id] ?? 0
              const sales      = purchasesByPlan[plan.id] ?? 0
              const price      = plan.meta?.price_gbp
              return (
                <div key={plan.id} className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
                  <div className="px-4 pt-4 pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{plan.name}</p>
                        <p className="text-xs text-[var(--color-text-tertiary)]">{plan.distance} · {plan.level}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {plan.is_public ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                            Published
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)]">
                            Draft
                          </span>
                        )}
                        {price && (
                          <span className="text-[10px] font-bold text-[var(--color-text-secondary)]">£{price}</span>
                        )}
                      </div>
                    </div>

                    <StarRating rating={plan.avg_rating} count={plan.review_count ?? 0} />
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-[var(--color-border)]">
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs font-black text-gray-800">{plan.total_starts ?? 0}</p>
                      <p className="text-[10px] text-[var(--color-text-tertiary)]">starts</p>
                    </div>
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs font-black text-gray-800">{sales}</p>
                      <p className="text-[10px] text-[var(--color-text-tertiary)]">sales</p>
                    </div>
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs font-black" style={{ color: 'var(--ns-violet)' }}>
                        {isPro ? `£${revenue.toFixed(0)}` : '—'}
                      </p>
                      <p className="text-[10px] text-[var(--color-text-tertiary)]">earned</p>
                    </div>
                  </div>

                  {/* Completion rate */}
                  <div className="px-4 py-3 border-t border-[var(--color-border)]">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider">Completion rate</p>
                    </div>
                    <CompletionBar pct={plan.avg_completion_rate} />
                  </div>

                  {/* Actions */}
                  <div className="flex border-t border-[var(--color-border)]">
                    <Link href={`/marketplace/${plan.id}`}
                      className="flex-1 py-3 text-center text-xs font-bold text-[var(--color-text-tertiary)] hover:bg-gray-50">
                      View listing
                    </Link>
                    <Link href={`/coach/plan-builder?edit=${plan.id}`}
                      className="flex-1 py-3 text-center text-xs font-bold border-l border-[var(--color-border)] hover:bg-gray-50"
                      style={{ color: 'var(--ns-violet)' }}>
                      Edit plan
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Upgrade prompt for Split Leaders */}
        {!isPro && (
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4">
            <p className="text-xs font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">Marketplace revenue</p>
            <p className="text-sm text-gray-700 mb-3">
              Upgrade to Professional Coach to publish plans in the marketplace and earn 70% of each sale.
            </p>
            <Link href="/coach/setup"
              className="text-sm font-bold px-4 py-2 rounded-xl text-white inline-block"
              style={{ background: 'var(--ns-ember)' }}>
              Upgrade to Pro →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
