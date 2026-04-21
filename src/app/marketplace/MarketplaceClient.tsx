'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSubscription } from '@/hooks/useSubscription'

interface Coach {
  user_id: string; display_name: string; slug: string
  verified: boolean; photo_url: string | null
}

interface MarketplacePlan {
  id: string; slug: string; name: string; subtitle: string | null
  distance: string; level: string; weeks_min: number; weeks_max: number
  description: string | null; meta: Record<string, unknown>
  author_type: string; author_id: string | null
  avg_completion_rate: number | null; total_starts: number
  avg_rating: number | null; review_count: number
  coach: Coach | null; price_gbp: number | null; owned: boolean
}

const DISTANCES = ['All', '5K', '10K', 'Half Marathon', 'Marathon', 'Ultra']
const LEVELS    = ['All', 'Beginner', 'Intermediate', 'Advanced']

// ─── Plan Detail Modal ────────────────────────────────────────────────────────

function PlanDetailModal({
  plan, onClose, onActivated,
}: { plan: MarketplacePlan; onClose: () => void; onActivated: () => void }) {
  const router    = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const { isPro } = useSubscription()

  const isFree = !plan.price_gbp || plan.price_gbp === 0
  const canGet = isFree || plan.owned

  async function handleGet() {
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/marketplace/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: plan.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      onActivated()
      router.push('/today?notice=plan_activated')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally { setLoading(false) }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[90dvh] overflow-y-auto max-w-lg mx-auto animate-slide-up">
        <div className="px-5 pt-5 pb-8">
          {/* Handle */}
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {plan.author_type === 'nextsplit' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                style={{ color: 'var(--ns-forest)', background: 'var(--ns-forest-light)', borderColor: 'var(--ns-forest)30' }}>
                ✦ NextSplit Official
              </span>
            )}
            {plan.coach?.verified && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                ✅ Verified Coach
              </span>
            )}
            {plan.owned && !isFree && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                ✓ Purchased
              </span>
            )}
          </div>

          {/* Name + price */}
          <div className="flex items-start justify-between gap-3 mb-1">
            <h2 className="text-xl font-black text-gray-900 leading-tight">{plan.name}</h2>
            <div className="text-right shrink-0">
              {isFree || plan.author_type === 'nextsplit' ? (
                <p className="text-lg font-black" style={{ color: 'var(--ns-forest)' }}>Free</p>
              ) : plan.owned ? (
                <p className="text-base font-bold text-emerald-600">Owned ✓</p>
              ) : (
                <p className="text-xl font-black text-gray-900">£{plan.price_gbp}</p>
              )}
            </div>
          </div>

          {/* Subtitle */}
          {plan.subtitle && <p className="text-sm text-gray-500 mb-3">{plan.subtitle}</p>}

          {/* Coach link */}
          {plan.coach && (
            <a href={`/coach/${plan.coach.slug}`}
              className="flex items-center gap-2 mb-4 group"
              onClick={e => e.stopPropagation()}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
                style={{ background: 'var(--ns-forest-light)' }}>🏃</div>
              <div>
                <span className="text-xs font-semibold text-gray-700 group-hover:underline">
                  {plan.coach.display_name}
                </span>
                <span className="text-[10px] text-gray-400 ml-1">· Coach</span>
              </div>
            </a>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Distance', value: plan.distance },
              { label: 'Level', value: plan.level },
              { label: 'Duration', value: `${plan.weeks_min}${plan.weeks_min !== plan.weeks_max ? `–${plan.weeks_max}` : ''} wks` },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-sm font-bold text-gray-900">{s.value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Social proof */}
          {(plan.total_starts > 0 || plan.avg_rating) && (
            <div className="flex items-center gap-4 mb-4 text-xs text-gray-400">
              {plan.total_starts > 0 && <span>👥 {plan.total_starts} runners started this</span>}
              {plan.avg_rating && (
                <span>⭐ {plan.avg_rating.toFixed(1)} ({plan.review_count} reviews)</span>
              )}
              {plan.avg_completion_rate && (
                <span>✓ {Math.round(plan.avg_completion_rate * 100)}% complete it</span>
              )}
            </div>
          )}

          {/* Description */}
          {plan.description && (
            <div className="bg-gray-50 rounded-2xl p-4 mb-5">
              <p className="text-sm text-gray-700 leading-relaxed">{plan.description}</p>
            </div>
          )}

          {/* Error */}
          {error && <p className="text-xs text-red-500 text-center mb-3">{error}</p>}

          {/* CTA */}
          {canGet ? (
            <button onClick={handleGet} disabled={loading}
              className="w-full py-4 rounded-2xl text-base font-black text-white disabled:opacity-50 active:scale-95 transition-all"
              style={{ background: 'var(--ns-forest)' }}>
              {loading ? 'Starting plan…' : plan.owned && !isFree ? 'Start plan again →' : 'Start this plan →'}
            </button>
          ) : (
            <div className="space-y-3">
              {!isPro && (
                <div className="bg-gray-50 rounded-2xl p-3 text-center">
                  <p className="text-xs text-gray-500">
                    Paid plans require a NextSplit account.{' '}
                    <a href="/profile" className="font-bold" style={{ color: 'var(--ns-forest)' }}>
                      Upgrade →
                    </a>
                  </p>
                </div>
              )}
              <button onClick={handleGet} disabled={loading}
                className="w-full py-4 rounded-2xl text-base font-black text-white disabled:opacity-50 active:scale-95 transition-all"
                style={{ background: 'var(--ns-forest)' }}>
                {loading ? 'Processing…' : `Get for £${plan.price_gbp} →`}
              </button>
              <p className="text-center text-[10px] text-gray-400">
                Secure payment · Instant access · No subscription needed
              </p>
            </div>
          )}

          <button onClick={onClose} className="w-full py-3 text-sm text-gray-400 mt-2">
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({ plan, onClick }: { plan: MarketplacePlan; onClick: () => void }) {
  const isFree = !plan.price_gbp || plan.price_gbp === 0 || plan.author_type === 'nextsplit'

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border border-gray-100 p-4 space-y-3 active:scale-[0.98] transition-all hover:border-gray-200 hover:shadow-sm"
    >
      {/* Badges + price */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {plan.author_type === 'nextsplit' && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ color: 'var(--ns-forest)', background: 'var(--ns-forest-light)' }}>
                ✦ Official
              </span>
            )}
            {plan.coach?.verified && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                ✅ Verified
              </span>
            )}
            {plan.owned && !isFree && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                ✓ Owned
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-gray-900 leading-tight">{plan.name}</h3>
          <p className="text-xs text-gray-400">
            {plan.distance} · {plan.level} · {plan.weeks_min}
            {plan.weeks_min !== plan.weeks_max ? `–${plan.weeks_max}` : ''} wks
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-base font-black ${isFree ? '' : 'text-gray-900'}`}
            style={isFree ? { color: 'var(--ns-forest)' } : {}}>
            {isFree ? 'Free' : `£${plan.price_gbp}`}
          </p>
        </div>
      </div>

      {/* Coach */}
      {plan.coach && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
            style={{ background: 'var(--ns-forest-light)' }}>🏃</div>
          {plan.coach.display_name}
        </div>
      )}

      {/* Description snippet */}
      {plan.description && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{plan.description}</p>
      )}

      {/* Stats */}
      {(plan.total_starts > 0 || plan.avg_rating) && (
        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          {plan.total_starts > 0 && <span>👥 {plan.total_starts}</span>}
          {plan.avg_rating && <span>⭐ {plan.avg_rating.toFixed(1)}</span>}
          {plan.avg_completion_rate && (
            <span>✓ {Math.round(plan.avg_completion_rate * 100)}%</span>
          )}
        </div>
      )}
    </button>
  )
}

// ─── Main Marketplace ─────────────────────────────────────────────────────────

export default function MarketplaceClient({ initialPlans }: { initialPlans: MarketplacePlan[] }) {
  const router = useRouter()
  const [plans, setPlans]           = useState<MarketplacePlan[]>(initialPlans)
  const [distance, setDistance]     = useState('All')
  const [level, setLevel]           = useState('All')
  const [search, setSearch]         = useState('')
  const [tab, setTab]               = useState<'browse' | 'purchased'>('browse')
  const [selected, setSelected]     = useState<MarketplacePlan | null>(null)

  // Refresh plans on mount to get live ownership status
  useEffect(() => {
    fetch('/api/marketplace')
      .then(r => r.json())
      .then(d => { if (d.plans) setPlans(d.plans) })
      .catch(() => {})
  }, [])

  const filtered = plans.filter(p => {
    if (tab === 'purchased') return p.owned && p.author_type === 'coach'
    const matchDist   = distance === 'All' || p.distance.toLowerCase().includes(distance.toLowerCase())
    const matchLevel  = level === 'All' || p.level.toLowerCase().includes(level.toLowerCase())
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.coach?.display_name.toLowerCase().includes(search.toLowerCase())
    return matchDist && matchLevel && matchSearch
  })

  const official = filtered.filter(p => p.author_type === 'nextsplit')
  const coached  = filtered.filter(p => p.author_type === 'coach')

  return (
    <div className="min-h-screen pb-24" style={{ background: '#f8f8f6' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-0 sticky top-0 z-40">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-black text-gray-900">Plans</h1>
            <button
              onClick={() => router.push('/coach/plan-builder')}
              className="text-xs font-bold px-3 py-1.5 rounded-xl border transition-all"
              style={{ color: 'var(--ns-forest)', borderColor: 'var(--ns-forest)' }}
            >
              + Publish a plan
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex border-b border-gray-100">
            {(['browse', 'purchased'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-xs font-bold capitalize border-b-2 transition-all ${
                  tab === t ? 'border-b-[var(--ns-forest)] text-[var(--ns-forest)]' : 'border-transparent text-gray-400'
                }`}
                style={tab === t ? { borderBottomColor: 'var(--ns-forest)', color: 'var(--ns-forest)' } : {}}>
                {t === 'browse' ? '🔍 Browse' : '✓ My Plans'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters — browse only */}
      {tab === 'browse' && (
        <div className="bg-white border-b border-gray-100 px-4 py-3">
          <div className="max-w-lg mx-auto space-y-2">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search plans or coaches…"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-[var(--ns-forest)] transition-colors" />
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {DISTANCES.map(d => (
                <button key={d} onClick={() => setDistance(d)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all flex-shrink-0"
                  style={distance === d
                    ? { background: 'var(--ns-forest)', color: 'white', borderColor: 'var(--ns-forest)' }
                    : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }}>
                  {d}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {LEVELS.map(l => (
                <button key={l} onClick={() => setLevel(l)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all flex-shrink-0"
                  style={level === l
                    ? { background: '#1a1a14', color: 'white', borderColor: '#1a1a14' }
                    : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-5 space-y-6">
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">{tab === 'purchased' ? '📋' : '🔍'}</div>
            <p className="text-sm text-gray-400">
              {tab === 'purchased'
                ? "You haven't purchased any coach plans yet."
                : 'No plans match your filters.'}
            </p>
            {tab === 'purchased' && (
              <button onClick={() => setTab('browse')}
                className="mt-3 text-xs font-bold underline"
                style={{ color: 'var(--ns-forest)' }}>
                Browse plans →
              </button>
            )}
          </div>
        )}

        {tab === 'browse' && official.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">✦ NextSplit Official</p>
            {official.map(p => <PlanCard key={p.id} plan={p} onClick={() => setSelected(p)} />)}
          </div>
        )}

        {coached.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {tab === 'purchased' ? '✓ Purchased Plans' : '👟 Coach Plans'}
            </p>
            {coached.map(p => <PlanCard key={p.id} plan={p} onClick={() => setSelected(p)} />)}
          </div>
        )}
      </div>

      {/* Plan detail modal */}
      {selected && (
        <PlanDetailModal
          plan={selected}
          onClose={() => setSelected(null)}
          onActivated={() => setSelected(null)}
        />
      )}
    </div>
  )
}
