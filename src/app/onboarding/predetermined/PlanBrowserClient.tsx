'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { PlanTemplate } from '@/types/database'

const DISTANCE_ORDER = ['5k','10k','10mi','half','marathon','ultra_50mi','ultra_100mi']
const DISTANCE_LABEL: Record<string, string> = {
  '5k': '5K', '10k': '10K', '10mi': '10 Miles',
  'half': 'Half Marathon', 'marathon': 'Marathon',
  'ultra_50mi': '50-Mile Ultra', 'ultra_100mi': '100-Mile Ultra',
}
const LEVEL_ORDER = ['beginner','intermediate','advanced']
const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
}
const LEVEL_PILL: Record<string, string> = {
  beginner:     'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-amber-100 text-amber-700',
  advanced:     'bg-red-100 text-red-600',
}

interface Props { templates: PlanTemplate[] }

export default function PlanBrowserClient({ templates }: Props) {
  const [selectedDistance, setSelectedDistance] = useState<string>('all')
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [selectedPlan, setSelectedPlan] = useState<PlanTemplate | null>(null)

  const distances = DISTANCE_ORDER.filter(d => templates.some(t => t.distance === d))

  const filtered = templates.filter(t => {
    if (selectedDistance !== 'all' && t.distance !== selectedDistance) return false
    if (selectedLevel !== 'all' && t.level !== selectedLevel) return false
    return true
  })

  const grouped = DISTANCE_ORDER.reduce<Record<string, PlanTemplate[]>>((acc, dist) => {
    const plans = filtered.filter(t => t.distance === dist)
    if (plans.length > 0) acc[dist] = plans.sort((a, b) =>
      LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level)
    )
    return acc
  }, {})

  if (selectedPlan) return <PlanDetail plan={selectedPlan} onBack={() => setSelectedPlan(null)} />

  return (
    <main className="min-h-screen bg-[#f8f8f6]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/onboarding" className="text-gray-400 text-sm font-medium">← Back</Link>
            <span className="text-base font-bold text-gray-900">Choose your plan</span>
          </div>

          {/* Distance filter */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide mb-2">
            <button
              onClick={() => setSelectedDistance('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap flex-shrink-0 ${
                selectedDistance === 'all' ? 'bg-[#0D9488] text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >All distances</button>
            {distances.map(d => (
              <button key={d} onClick={() => setSelectedDistance(d)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap flex-shrink-0 ${
                  selectedDistance === d ? 'bg-[#0D9488] text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >{DISTANCE_LABEL[d]}</button>
            ))}
          </div>

          {/* Level filter */}
          <div className="flex gap-1.5">
            {['all', ...LEVEL_ORDER].map(l => (
              <button key={l} onClick={() => setSelectedLevel(l)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors capitalize ${
                  selectedLevel === l ? 'bg-[#0D9488] text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >{l === 'all' ? 'All levels' : l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Empty state */}
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm font-semibold text-gray-700 mb-1">No plans match those filters</p>
            <button onClick={() => { setSelectedDistance('all'); setSelectedLevel('all') }}
              className="text-xs text-[#0D9488] font-semibold mt-2">
              Clear filters
            </button>
          </div>
        )}

        {/* Plan groups */}
        {Object.entries(grouped).map(([dist, plans]) => (
          <div key={dist} className="mb-6">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">
              {DISTANCE_LABEL[dist]}
            </h2>
            <div className="space-y-2">
              {plans.map(plan => (
                <PlanCard key={plan.id} plan={plan} onClick={() => setSelectedPlan(plan)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

function PlanCard({ plan, onClick }: { plan: PlanTemplate; onClick: () => void }) {
  const meta = plan.meta as Record<string, unknown>
  const tags = (meta?.tags as string[]) ?? []

  return (
    <button onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border border-gray-100 p-4 hover:border-teal-200 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${LEVEL_PILL[plan.level]}`}>
              {LEVEL_LABEL[plan.level]}
            </span>
            {tags.slice(0,2).map(tag => (
              <span key={tag} className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
          <div className="text-sm font-bold text-gray-900 leading-tight">{plan.name}</div>
          {plan.subtitle && <div className="text-xs text-gray-500 mt-0.5">{plan.subtitle}</div>}
        </div>
        <div className="text-right shrink-0">
          <div className="text-xl font-black text-gray-900 leading-none">{plan.weeks_min}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">weeks</div>
        </div>
      </div>

      <div className="flex gap-4 mt-3 pt-3 border-t border-gray-50">
        <Stat label="runs/wk" value={String(plan.runs_per_week)} />
        {plan.peak_km_week && <Stat label="peak km" value={`${plan.peak_km_week}`} />}
        {plan.longest_run_km && <Stat label="long run" value={`${plan.longest_run_km}km`} />}
        <div className="ml-auto text-[#0D9488]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold text-gray-900">{value}</div>
      <div className="text-[10px] text-gray-400">{label}</div>
    </div>
  )
}

function PlanDetail({ plan, onBack }: { plan: PlanTemplate; onBack: () => void }) {
  const [raceDateInput, setRaceDateInput] = useState('')
  const [planName, setPlanName] = useState(plan.name)
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const meta = plan.meta as Record<string, unknown>
  const tags = (meta?.tags as string[]) ?? []

  async function handleActivate() {
    setActivating(true)
    setError(null)
    try {
      const res = await fetch('/api/plans/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: plan.id, name: planName, race_date: raceDateInput || null }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed to activate plan')
      }
      window.location.href = '/today'
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setActivating(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f8f6] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 text-sm font-medium">← Back</button>
          <span className="text-base font-bold text-gray-900 truncate">{plan.name}</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Plan hero card */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-white/20 text-white`}>
                  {LEVEL_LABEL[plan.level]}
                </span>
                <h1 className="text-xl font-black text-white mt-2 leading-tight">{plan.name}</h1>
                {plan.subtitle && <p className="text-sm text-teal-100 mt-0.5">{plan.subtitle}</p>}
              </div>
              <div className="text-right shrink-0">
                <div className="text-3xl font-black text-white leading-none">{plan.weeks_min}</div>
                <div className="text-xs text-teal-200 mt-0.5">weeks</div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-0 divide-x divide-gray-50 border-b border-gray-50">
            {[
              { label: 'Runs per week', value: String(plan.runs_per_week) },
              ...(plan.peak_km_week ? [{ label: 'Peak km week', value: `${plan.peak_km_week}km` }] : []),
              ...(plan.longest_run_km ? [{ label: 'Longest run', value: `${plan.longest_run_km}km` }] : []),
            ].slice(0, 3).map(s => (
              <div key={s.label} className="text-center py-4 px-3">
                <div className="text-base font-black text-gray-900">{s.value}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          {plan.description && (
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="text-sm text-gray-600 leading-relaxed">{plan.description}</p>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="px-5 py-3 flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <span key={tag} className="text-[11px] font-medium text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Coach notes — promoted to be visible early */}
        {(meta.coach_notes as string) && (
          <div className="bg-teal-50 rounded-2xl border border-teal-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">🧠</span>
              <span className="text-xs font-bold text-teal-800 uppercase tracking-wide">Coach notes</span>
            </div>
            <p className="text-sm text-teal-700 leading-relaxed">{meta.coach_notes as string}</p>
          </div>
        )}

        {/* Target time */}
        {(meta.target_finish_time as string) && (
          <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">Target finish time</span>
            <span className="text-sm font-bold text-gray-900">{meta.target_finish_time as string}</span>
          </div>
        )}

        {/* Activation form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-900">Set up your plan</h2>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Plan name</label>
            <input type="text" value={planName} onChange={e => setPlanName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-teal-100 transition-colors" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">
              Race date <span className="text-gray-300 font-normal">(optional)</span>
            </label>
            <input type="date" value={raceDateInput} onChange={e => setRaceDateInput(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-teal-100 transition-colors" />
            <p className="text-[10px] text-gray-400 mt-1">
              We&apos;ll align your training weeks to build up to race day.
            </p>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl border border-red-100">{error}</p>
          )}

          <button onClick={handleActivate} disabled={activating || !planName.trim()}
            className="w-full bg-[#0D9488] text-white py-3.5 rounded-xl text-sm font-bold hover:bg-teal-700 transition-colors disabled:opacity-50">
            {activating ? 'Starting your plan…' : 'Start this plan →'}
          </button>
        </div>
      </div>
    </main>
  )
}
