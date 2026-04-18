'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { PlanTemplate } from '@/types/database'

// Distance ordering and display labels
const DISTANCE_ORDER = ['5k','10k','10mi','half','marathon','ultra_50mi','ultra_100mi']
const DISTANCE_LABEL: Record<string, string> = {
  '5k': '5k',
  '10k': '10k',
  '10mi': '10 Miles',
  'half': 'Half Marathon',
  'marathon': 'Marathon',
  'ultra_50mi': '50-Mile Ultra',
  'ultra_100mi': '100-Mile Ultra',
}
const LEVEL_ORDER = ['beginner','intermediate','advanced']
const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}
const LEVEL_COLOR: Record<string, string> = {
  beginner: '#22c55e',
  intermediate: '#f59e0b',
  advanced: '#ef4444',
}

interface Props {
  templates: PlanTemplate[]
}

export default function PlanBrowserClient({ templates }: Props) {
  const [selectedDistance, setSelectedDistance] = useState<string>('all')
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [selectedPlan, setSelectedPlan] = useState<PlanTemplate | null>(null)

  // Get distances present in templates
  const distances = DISTANCE_ORDER.filter(d =>
    templates.some(t => t.distance === d)
  )

  const filtered = templates.filter(t => {
    if (selectedDistance !== 'all' && t.distance !== selectedDistance) return false
    if (selectedLevel !== 'all' && t.level !== selectedLevel) return false
    return true
  })

  // Group by distance
  const grouped = DISTANCE_ORDER.reduce<Record<string, PlanTemplate[]>>((acc, dist) => {
    const plans = filtered.filter(t => t.distance === dist)
    if (plans.length > 0) acc[dist] = plans.sort((a, b) =>
      LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level)
    )
    return acc
  }, {})

  if (selectedPlan) {
    return <PlanDetail plan={selectedPlan} onBack={() => setSelectedPlan(null)} />
  }

  return (
    <main className="min-h-screen bg-[#f5f4f0]">
      {/* Header */}
      <div className="bg-white border-b border-[#e0e0e0] px-4 py-3 flex items-center gap-3">
        <Link href="/onboarding" className="text-[#888] text-sm">← Back</Link>
        <span className="text-base font-bold text-[#1a1a1a]">Choose a plan</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">
        {/* Filter row */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {/* Distance filter */}
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => setSelectedDistance('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                selectedDistance === 'all'
                  ? 'bg-[#1a1a1a] text-white'
                  : 'bg-white border border-[#e0e0e0] text-[#555]'
              }`}
            >
              All
            </button>
            {distances.map(d => (
              <button
                key={d}
                onClick={() => setSelectedDistance(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedDistance === d
                    ? 'bg-[#1a1a1a] text-white'
                    : 'bg-white border border-[#e0e0e0] text-[#555]'
                }`}
              >
                {DISTANCE_LABEL[d]}
              </button>
            ))}
          </div>
        </div>

        {/* Level filter */}
        <div className="flex gap-2 mb-5">
          {['all', ...LEVEL_ORDER].map(l => (
            <button
              key={l}
              onClick={() => setSelectedLevel(l)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                selectedLevel === l
                  ? 'bg-[#1a1a1a] text-white'
                  : 'bg-white border border-[#e0e0e0] text-[#555]'
              }`}
            >
              {l === 'all' ? 'All levels' : l}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-16">
            <p className="text-[#888] text-sm">No plans match those filters.</p>
            <button
              onClick={() => { setSelectedDistance('all'); setSelectedLevel('all') }}
              className="text-xs text-[#1a1a1a] underline mt-2"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Plan cards by distance group */}
        {Object.entries(grouped).map(([dist, plans]) => (
          <div key={dist} className="mb-6">
            <h2 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-3">
              {DISTANCE_LABEL[dist]}
            </h2>
            <div className="space-y-2">
              {plans.map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onClick={() => setSelectedPlan(plan)}
                />
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
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border border-[#e0e0e0] p-4 hover:border-[#999] transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{
                background: LEVEL_COLOR[plan.level] + '20',
                color: LEVEL_COLOR[plan.level],
              }}
            >
              {LEVEL_LABEL[plan.level]}
            </span>
          </div>
          <div className="text-sm font-semibold text-[#1a1a1a] leading-tight">{plan.name}</div>
          {plan.subtitle && (
            <div className="text-xs text-[#888] mt-0.5">{plan.subtitle}</div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold text-[#1a1a1a] leading-none">{plan.weeks_min}</div>
          <div className="text-[10px] text-[#aaa] mt-0.5">weeks</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 mt-3">
        <Stat label="runs/week" value={String(plan.runs_per_week)} />
        {plan.peak_km_week && <Stat label="peak km" value={`${plan.peak_km_week}`} />}
        {plan.longest_run_km && <Stat label="long run" value={`${plan.longest_run_km}km`} />}
      </div>
    </button>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold text-[#1a1a1a]">{value}</div>
      <div className="text-[10px] text-[#aaa]">{label}</div>
    </div>
  )
}

function PlanDetail({ plan, onBack }: { plan: PlanTemplate; onBack: () => void }) {
  const [raceDateInput, setRaceDateInput] = useState('')
  const [planName, setPlanName] = useState(plan.name)
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const meta = plan.meta as Record<string, unknown>

  async function handleActivate() {
    setActivating(true)
    setError(null)
    try {
      const res = await fetch('/api/plans/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: plan.id,
          name: planName,
          race_date: raceDateInput || null,
        }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed to activate plan')
      }
      // Redirect to dashboard
      window.location.href = '/today'
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setActivating(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f4f0]">
      <div className="bg-white border-b border-[#e0e0e0] px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="text-[#888] text-sm">← Back</button>
        <span className="text-base font-bold text-[#1a1a1a] truncate">{plan.name}</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Plan header */}
        <div className="bg-white rounded-2xl border border-[#e0e0e0] p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <span
                className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{
                  background: LEVEL_COLOR[plan.level] + '20',
                  color: LEVEL_COLOR[plan.level],
                }}
              >
                {LEVEL_LABEL[plan.level]}
              </span>
              <h1 className="text-lg font-bold text-[#1a1a1a] mt-1">{plan.name}</h1>
              {plan.subtitle && <p className="text-sm text-[#888]">{plan.subtitle}</p>}
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold text-[#1a1a1a]">{plan.weeks_min}</div>
              <div className="text-xs text-[#aaa]">weeks</div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 py-3 border-t border-[#f0f0f0]">
            <div className="text-center">
              <div className="text-base font-bold text-[#1a1a1a]">{plan.runs_per_week}</div>
              <div className="text-[10px] text-[#aaa]">runs/week</div>
            </div>
            {plan.peak_km_week && (
              <div className="text-center">
                <div className="text-base font-bold text-[#1a1a1a]">{plan.peak_km_week}</div>
                <div className="text-[10px] text-[#aaa]">peak km</div>
              </div>
            )}
            {plan.longest_run_km && (
              <div className="text-center">
                <div className="text-base font-bold text-[#1a1a1a]">{plan.longest_run_km}km</div>
                <div className="text-[10px] text-[#aaa]">long run</div>
              </div>
            )}
          </div>

          {/* Description */}
          {plan.description && (
            <p className="text-sm text-[#555] pt-3 border-t border-[#f0f0f0] leading-relaxed">
              {plan.description}
            </p>
          )}

          {/* Target time */}
          {(meta.target_finish_time as string) && (
            <div className="mt-3 px-3 py-2 bg-[#f5f4f0] rounded-lg">
              <span className="text-xs text-[#888]">Target finish time: </span>
              <span className="text-xs font-semibold text-[#1a1a1a]">
                {meta.target_finish_time as string}
              </span>
            </div>
          )}
        </div>

        {/* Activation form */}
        <div className="bg-white rounded-2xl border border-[#e0e0e0] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#1a1a1a]">Set up your plan</h2>

          <div>
            <label className="text-xs font-medium text-[#555] block mb-1.5">Plan name</label>
            <input
              type="text"
              value={planName}
              onChange={e => setPlanName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[#e0e0e0] text-sm outline-none focus:border-[#1a1a1a] transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[#555] block mb-1.5">
              Race date <span className="text-[#aaa] font-normal">(optional)</span>
            </label>
            <input
              type="date"
              value={raceDateInput}
              onChange={e => setRaceDateInput(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[#e0e0e0] text-sm outline-none focus:border-[#1a1a1a] transition-colors"
            />
            <p className="text-[10px] text-[#aaa] mt-1">
              We&apos;ll use this to align your weeks to race day.
            </p>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            onClick={handleActivate}
            disabled={activating || !planName.trim()}
            className="w-full bg-[#1a1a1a] text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            {activating ? 'Starting plan…' : 'Start this plan →'}
          </button>
        </div>

        {/* Coach notes */}
        {(meta.coach_notes as string) && (
          <div className="bg-white rounded-2xl border border-[#e0e0e0] p-5">
            <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">
              Coach notes
            </h3>
            <p className="text-sm text-[#555] leading-relaxed">{meta.coach_notes as string}</p>
          </div>
        )}
      </div>
    </main>
  )
}
