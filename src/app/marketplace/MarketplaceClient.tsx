'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Coach {
  user_id: string; display_name: string; slug: string
  verified: boolean; photo_url: string | null
}

interface Plan {
  id: string; name: string; distance: string; level: string
  weeks_min: number; weeks_max: number; description: string | null
  meta: Record<string, unknown>; author_type: string; author_id: string | null
  avg_completion_rate: number | null; total_starts: number
  avg_rating: number | null; review_count: number
  coach: Coach | null
}

const DISTANCES = ['All', '5K', '10K', 'Half Marathon', 'Marathon', 'Ultra']
const LEVELS    = ['All', 'Beginner', 'Intermediate', 'Advanced']

function PlanCard({ plan, onActivate }: { plan: Plan; onActivate: (id: string) => void }) {
  const price    = plan.meta?.price_gbp as number | null
  const isCoach  = plan.author_type === 'coach' && plan.coach
  const isFree   = !price || price === 0

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {plan.author_type === 'nextsplit' && (
              <span className="text-[10px] font-bold text-teal-600 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-full">
                ✦ NextSplit Official
              </span>
            )}
            {plan.coach?.verified && (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-full">
                ✅ Verified Coach
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-slate-900">{plan.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {plan.distance} · {plan.level} · {plan.weeks_min}–{plan.weeks_max} weeks
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-base font-black ${isFree ? 'text-teal-600' : 'text-slate-900'}`}>
            {isFree ? 'Free' : `£${price}`}
          </p>
        </div>
      </div>

      {/* Coach attribution */}
      {isCoach && plan.coach && (
        <a href={`/coach/${plan.coach.slug}`} className="flex items-center gap-2 text-xs text-slate-600 hover:text-teal-600">
          <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center text-xs shrink-0">🏃</div>
          <span>by {plan.coach.display_name}</span>
        </a>
      )}

      {/* Description */}
      {plan.description && (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{plan.description}</p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-slate-400">
        {plan.total_starts > 0 && <span>👥 {plan.total_starts} started</span>}
        {plan.avg_rating && <span>⭐ {plan.avg_rating.toFixed(1)} ({plan.review_count})</span>}
        {plan.avg_completion_rate && <span>✓ {Math.round(plan.avg_completion_rate * 100)}% complete</span>}
      </div>

      {/* CTA */}
      <button
        onClick={() => onActivate(plan.id)}
        className="w-full bg-teal-500 text-white py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-all"
      >
        {isFree ? 'Start this plan →' : `Buy for £${price} →`}
      </button>
    </div>
  )
}

export default function MarketplaceClient({ plans }: { plans: Plan[] }) {
  const router = useRouter()
  const [distance, setDistance] = useState('All')
  const [level, setLevel]       = useState('All')
  const [search, setSearch]     = useState('')
  const [activating, setActivating] = useState<string | null>(null)

  const filtered = plans.filter(p => {
    const matchDist  = distance === 'All' || p.distance.toLowerCase().includes(distance.toLowerCase())
    const matchLevel = level === 'All' || p.level.toLowerCase().includes(level.toLowerCase())
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    return matchDist && matchLevel && matchSearch
  })

  const handleActivate = async (planId: string) => {
    setActivating(planId)
    try {
      const res = await fetch('/api/plans/activate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ template_id: planId, plan_type: 'predetermined' }),
      })
      if (res.ok) router.push('/today?notice=plan_activated')
    } finally {
      setActivating(null)
    }
  }

  const official = filtered.filter(p => p.author_type === 'nextsplit')
  const coached  = filtered.filter(p => p.author_type === 'coach')

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 pt-12 pb-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto space-y-3">
          <h1 className="text-lg font-black text-slate-900">Plan Marketplace</h1>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search plans…"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400"
          />
          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {DISTANCES.map(d => (
              <button key={d} onClick={() => setDistance(d)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
                  distance === d ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-slate-600 border-slate-200'
                }`}>
                {d}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {LEVELS.map(l => (
              <button key={l} onClick={() => setLevel(l)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
                  level === l ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'
                }`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-6">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm">No plans match your filters</p>
          </div>
        )}

        {official.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">✦ NextSplit Official Plans</p>
            {official.map(p => (
              <PlanCard key={p.id} plan={p} onActivate={handleActivate} />
            ))}
          </div>
        )}

        {coached.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">👟 Coach Plans</p>
            {coached.map(p => (
              <PlanCard key={p.id} plan={p} onActivate={handleActivate} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
