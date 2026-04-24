'use client'

// Plan Browse — standalone version accessible from Today tab and Plan tab.
// Wraps the onboarding predetermined browser but with correct back navigation.
// The onboarding version links back to /onboarding; this one links back to /today.

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { PlanTemplate } from '@/types/database'

const DISTANCE_ORDER = ['5k','10k','10mi','half','marathon','lifestyle','ultra_50mi','ultra_100mi','ultra']
const DISTANCE_LABEL: Record<string, string> = {
  '5k': '5K', '10k': '10K', '10mi': '10 Miles',
  'half': 'Half Marathon', 'marathon': 'Marathon',
  'lifestyle': 'Lifestyle', 'ultra': 'Ultra',
  'ultra_50mi': '50-Mile Ultra', 'ultra_100mi': '100-Mile Ultra',
}
const LEVEL_ORDER = ['beginner','intermediate','advanced']
const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
}
const LEVEL_PILL: Record<string, string> = {
  beginner:     'bg-emerald-900/50 text-emerald-300',
  intermediate: 'bg-amber-900/50 text-amber-300',
  advanced:     'bg-red-900/50 text-red-300',
}

interface Props { templates: PlanTemplate[] }

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
      style={{
        background: active ? 'var(--ns-cyan)' : 'var(--color-surface-2)',
        color:      active ? 'white' : 'var(--color-text-secondary)',
        border:     `1px solid ${active ? 'var(--ns-cyan)' : 'var(--color-border)'}`,
      }}>
      {label}
    </button>
  )
}

function PlanCard({ plan, onSelect }: { plan: PlanTemplate; onSelect: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta = (plan.meta ?? {}) as Record<string, any>
  const tags: string[] = meta.tags ?? []
  const subtitle = plan.subtitle ?? meta.subtitle ?? ''

  return (
    <button onClick={onSelect} className="w-full text-left rounded-2xl p-4 transition-all active:scale-[0.98]"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black leading-tight" style={{ color: 'var(--color-text-primary)' }}>
            {plan.name}
          </p>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{subtitle}</p>
          )}
        </div>
        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ${LEVEL_PILL[plan.level] ?? 'bg-gray-700 text-gray-300'}`}>
          {LEVEL_LABEL[plan.level] ?? plan.level}
        </span>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {plan.weeks_min && (
          <span className="text-[10px] font-data font-bold" style={{ color: 'var(--color-text-tertiary)' }}>
            {plan.weeks_min}{plan.weeks_max && plan.weeks_max !== plan.weeks_min ? `–${plan.weeks_max}` : ''} weeks
          </span>
        )}
        {plan.runs_per_week && (
          <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
            {plan.runs_per_week}× runs/week
          </span>
        )}
        {plan.peak_km_week && (
          <span className="text-[10px] font-data" style={{ color: 'var(--color-text-tertiary)' }}>
            Peak {plan.peak_km_week}km
          </span>
        )}
      </div>

      {tags.length > 0 && (
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)' }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}

function PlanDetail({ plan, onBack }: { plan: PlanTemplate; onBack: () => void }) {
  const router = useRouter()
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta = (plan.meta ?? {}) as Record<string, any>

  const activate = async () => {
    setActivating(true)
    setError('')
    try {
      const res = await fetch('/api/plans/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: plan.id,
          name: plan.name,
          plan_type: 'predetermined',
          include_gym: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to activate plan')
      router.push('/home?notice=plan_activated')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setActivating(false)
    }
  }

  return (
    <main className="min-h-screen pb-32" style={{ background: 'var(--color-bg)' }}>
      <div className="border-b px-4 pt-12 pb-4 sticky top-0 z-40"
        style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={onBack} className="text-sm font-medium"
            style={{ color: 'var(--color-text-tertiary)' }}>← Back</button>
          <span className="text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
            {plan.name}
          </span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        {/* Hero */}
        <div className="rounded-2xl p-5 space-y-3"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-black" style={{ color: 'var(--color-text-primary)' }}>{plan.name}</h1>
              {plan.subtitle && (
                <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{plan.subtitle}</p>
              )}
            </div>
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0 mt-1 ${LEVEL_PILL[plan.level]}`}>
              {LEVEL_LABEL[plan.level]}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Weeks', value: plan.weeks_min ? `${plan.weeks_min}${plan.weeks_max && plan.weeks_max !== plan.weeks_min ? `–${plan.weeks_max}` : ''}` : '—' },
              { label: 'Runs/week', value: plan.runs_per_week ? `${plan.runs_per_week}×` : '—' },
              { label: 'Peak km', value: plan.peak_km_week ? `${plan.peak_km_week}km` : '—' },
            ].map(s => (
              <div key={s.label} className="text-center rounded-xl py-3"
                style={{ background: 'var(--color-surface-2)' }}>
                <p className="font-data text-base font-black" style={{ color: 'var(--color-text-primary)' }}>{s.value}</p>
                <p className="text-[9px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {plan.description && (
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {plan.description}
            </p>
          )}

          {meta.coach_notes && (
            <div className="rounded-xl p-3" style={{ background: 'var(--color-surface-2)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ns-cyan)' }}>
                Coach notes
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {meta.coach_notes}
              </p>
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs text-center font-bold" style={{ color: 'var(--ns-ember)' }}>{error}</p>
        )}
      </div>

      {/* Sticky activate button */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4 border-t"
        style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
        <button onClick={activate} disabled={activating}
          className="w-full py-4 rounded-2xl font-black text-base text-white disabled:opacity-50 active:scale-95 transition-all max-w-lg mx-auto block"
          style={{ background: 'linear-gradient(135deg, var(--ns-ember) 0%, #e0334f 100%)', boxShadow: '0 4px 20px rgba(232,93,38,0.3)' }}>
          {activating ? 'Activating…' : `Start ${plan.name} →`}
        </button>
      </div>
    </main>
  )
}

export default function PlanBrowseClient({ templates }: Props) {
  const [selectedDistance, setSelectedDistance] = useState('all')
  const [selectedLevel, setSelectedLevel]       = useState('all')
  const [maxWeeks, setMaxWeeks]                 = useState(0)
  const [selectedPlan, setSelectedPlan]         = useState<PlanTemplate | null>(null)

  const distances = DISTANCE_ORDER.filter(d =>
    templates.some(t => d === 'ultra' ? t.distance?.startsWith('ultra') : t.distance === d)
  )

  const filtered = useMemo(() => {
    return templates.filter(t => {
      if (selectedDistance !== 'all') {
        if (selectedDistance === 'ultra') { if (!t.distance?.startsWith('ultra')) return false }
        else if (t.distance !== selectedDistance) return false
      }
      if (selectedLevel !== 'all' && t.level !== selectedLevel) return false
      if (maxWeeks > 0 && (t.weeks_min ?? 0) > maxWeeks) return false
      return true
    }).sort((a, b) => {
      const li = LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level)
      if (li !== 0) return li
      return (a.weeks_min ?? 0) - (b.weeks_min ?? 0)
    })
  }, [templates, selectedDistance, selectedLevel, maxWeeks])

  const grouped = DISTANCE_ORDER.reduce<Record<string, PlanTemplate[]>>((acc, dist) => {
    const plans = filtered.filter(t =>
      dist === 'ultra' ? t.distance?.startsWith('ultra') : t.distance === dist
    )
    if (plans.length > 0 && dist !== 'ultra_50mi' && dist !== 'ultra_100mi') acc[dist] = plans
    return acc
  }, {})

  if (selectedPlan) return <PlanDetail plan={selectedPlan} onBack={() => setSelectedPlan(null)} />

  return (
    <main className="min-h-screen pb-32" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="border-b px-4 pt-12 pb-3 sticky top-0 z-40"
        style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/home" className="text-sm font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
              ← Back
            </Link>
            <span className="text-base font-black" style={{ color: 'var(--color-text-primary)' }}>
              Choose your plan
            </span>
            <span className="text-xs ml-auto" style={{ color: 'var(--color-text-tertiary)' }}>
              {filtered.length} plans
            </span>
          </div>

          {/* Distance chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide mb-2">
            <FilterChip label="All" active={selectedDistance === 'all'} onClick={() => setSelectedDistance('all')} />
            {distances.filter(d => !d.startsWith('ultra_')).map(d => (
              <FilterChip key={d} label={DISTANCE_LABEL[d] ?? d}
                active={selectedDistance === d} onClick={() => setSelectedDistance(d)} />
            ))}
          </div>

          {/* Level + duration row */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <select value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)}
              className="text-xs font-semibold rounded-xl px-2.5 py-1.5 outline-none flex-shrink-0"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
              <option value="all">All levels</option>
              {LEVEL_ORDER.map(l => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
            </select>
            <select value={maxWeeks} onChange={e => setMaxWeeks(Number(e.target.value))}
              className="text-xs font-semibold rounded-xl px-2.5 py-1.5 outline-none flex-shrink-0"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
              <option value={0}>Any duration</option>
              <option value={8}>≤ 8 weeks</option>
              <option value={12}>≤ 12 weeks</option>
              <option value={16}>≤ 16 weeks</option>
              <option value={20}>≤ 20 weeks</option>
            </select>
          </div>
        </div>
      </div>

      {/* Plan list — grouped by distance */}
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-6">
        {Object.entries(grouped).map(([dist, plans]) => (
          <div key={dist}>
            <h2 className="text-xs font-black uppercase tracking-widest mb-3"
              style={{ color: 'var(--color-text-tertiary)' }}>
              {DISTANCE_LABEL[dist] ?? dist}
            </h2>
            <div className="space-y-2">
              {plans.map(plan => (
                <PlanCard key={plan.id} plan={plan} onSelect={() => setSelectedPlan(plan)} />
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
              No plans match your filters.
            </p>
            <button onClick={() => { setSelectedDistance('all'); setSelectedLevel('all'); setMaxWeeks(0) }}
              className="text-xs font-bold mt-2" style={{ color: 'var(--ns-cyan)' }}>
              Clear filters
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
