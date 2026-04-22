'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
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
type SortKey = 'level' | 'weeks_asc' | 'weeks_desc' | 'rating' | 'completion'

interface Props { templates: PlanTemplate[] }

export default function PlanBrowserClient({ templates }: Props) {
  const [selectedDistance, setSelectedDistance] = useState<string>('all')
  const [selectedLevel,    setSelectedLevel]    = useState<string>('all')
  const [maxWeeks,         setMaxWeeks]          = useState<number>(0)   // 0 = any
  const [sortBy,           setSortBy]            = useState<SortKey>('level')
  const [selectedPlan,     setSelectedPlan]      = useState<PlanTemplate | null>(null)
  const [previewPlan,      setPreviewPlan]       = useState<PlanTemplate | null>(null)

  const distances = DISTANCE_ORDER.filter(d => templates.some(t => t.distance === d))

  const filtered = useMemo(() => {
    let list = templates.filter(t => {
      if (selectedDistance !== 'all' && t.distance !== selectedDistance) return false
      if (selectedLevel    !== 'all' && t.level    !== selectedLevel)    return false
      if (maxWeeks > 0 && (t.weeks_min ?? 0) > maxWeeks)                return false
      return true
    })
    list = [...list].sort((a, b) => {
      if (sortBy === 'level')       return LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level)
      if (sortBy === 'weeks_asc')   return (a.weeks_min ?? 0) - (b.weeks_min ?? 0)
      if (sortBy === 'weeks_desc')  return (b.weeks_min ?? 0) - (a.weeks_min ?? 0)
      if (sortBy === 'rating')      return ((b as any).avg_rating ?? 0) - ((a as any).avg_rating ?? 0)
      if (sortBy === 'completion')  return ((b as any).avg_completion_rate ?? 0) - ((a as any).avg_completion_rate ?? 0)
      return 0
    })
    return list
  }, [templates, selectedDistance, selectedLevel, maxWeeks, sortBy])

  const grouped = DISTANCE_ORDER.reduce<Record<string, PlanTemplate[]>>((acc, dist) => {
    const plans = filtered.filter(t => t.distance === dist || (dist === 'ultra' && t.distance?.startsWith('ultra')))
    if (plans.length > 0 && dist !== 'ultra_50mi' && dist !== 'ultra_100mi') acc[dist] = plans
    return acc
  }, {})

  if (selectedPlan) return <PlanDetail plan={selectedPlan} onBack={() => setSelectedPlan(null)} />

  return (
    <main className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      {/* Header */}
      <div className="border-b px-4 pt-12 pb-3 sticky top-0 z-40" style={{ background: "var(--color-bg)", borderColor: "var(--color-border)" }}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/onboarding" className="text-gray-400 text-sm font-medium">← Back</Link>
            <span className="text-base font-bold text-gray-900">Choose your plan</span>
            <span className="text-xs ml-auto" style={{ color: "var(--color-text-tertiary)" }}>{filtered.length} plans</span>
          </div>

          {/* Distance filter */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide mb-2">
            <FilterChip label="All" active={selectedDistance === 'all'} onClick={() => setSelectedDistance('all')} />
            {distances.filter(d => !d.startsWith('ultra_')).map(d => (
              <FilterChip key={d} label={DISTANCE_LABEL[d] ?? d} active={selectedDistance === d} onClick={() => setSelectedDistance(d)} />
            ))}
          </div>

          {/* Level + Duration + Sort row */}
          <div className="flex gap-2 items-center overflow-x-auto pb-1 scrollbar-hide">
            <select
              value={selectedLevel}
              onChange={e => setSelectedLevel(e.target.value)}
              className="text-xs font-semibold rounded-xl px-2.5 py-1.5 outline-none flex-shrink-0" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-2)", color: "var(--color-text-primary)" }}
            >
              <option value="all">All levels</option>
              {LEVEL_ORDER.map(l => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
            </select>
            <select
              value={maxWeeks}
              onChange={e => setMaxWeeks(Number(e.target.value))}
              className="text-xs font-semibold rounded-xl px-2.5 py-1.5 outline-none flex-shrink-0" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-2)", color: "var(--color-text-primary)" }}
            >
              <option value={0}>Any duration</option>
              <option value={8}>≤ 8 weeks</option>
              <option value={12}>≤ 12 weeks</option>
              <option value={16}>≤ 16 weeks</option>
              <option value={20}>≤ 20 weeks</option>
            </select>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortKey)}
              className="text-xs font-semibold rounded-xl px-2.5 py-1.5 outline-none flex-shrink-0" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-2)", color: "var(--color-text-primary)" }}
            >
              <option value="level">By level</option>
              <option value="weeks_asc">Shortest first</option>
              <option value="weeks_desc">Longest first</option>
              <option value="rating">Top rated</option>
              <option value="completion">Best completion</option>
            </select>
          </div>
        </div>
      </div>

      {/* Week 1 preview sheet */}
      {previewPlan && (
        <Week1Preview plan={previewPlan} onClose={() => setPreviewPlan(null)} onSelect={() => { setSelectedPlan(previewPlan); setPreviewPlan(null) }} />
      )}

      <div className="max-w-lg mx-auto px-4 pt-4 pb-20">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>No plans match those filters</p>
            <button onClick={() => { setSelectedDistance('all'); setSelectedLevel('all'); setMaxWeeks(0) }}
              className="text-xs font-bold mt-2" style={{ color: 'var(--ns-forest)' }}>
              Clear filters
            </button>
          </div>
        ) : (
          Object.entries(grouped).map(([dist, plans]) => (
            <div key={dist} className="mb-6">
              <h2 className="text-xs font-bold uppercase tracking-widest mb-3 px-1" style={{ color: "var(--color-text-tertiary)" }}>
                {DISTANCE_LABEL[dist] ?? dist}
              </h2>
              <div className="space-y-2">
                {plans.map(plan => (
                  <PlanCard key={plan.id} plan={plan}
                    onClick={() => setSelectedPlan(plan)}
                    onPreview={() => setPreviewPlan(plan)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl border-2 transition-all ${
        active ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 bg-white'
      }`}
      style={active ? { background: 'var(--ns-forest)', borderColor: 'var(--ns-forest)' } : {}}
    >
      {label}
    </button>
  )
}

function PlanCard({ plan, onClick, onPreview }: { plan: PlanTemplate; onClick: () => void; onPreview: () => void }) {
  const meta = plan.meta as Record<string, unknown>
  const tags = (meta?.tags as string[]) ?? []

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <button onClick={onClick} className="w-full text-left p-4 transition-colors active:opacity-80">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${LEVEL_PILL[plan.level]}`}>
                {LEVEL_LABEL[plan.level]}
              </span>
              {tags.slice(0,2).map(tag => (
                <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)' }}>{tag}</span>
              ))}
            </div>
            <div className="text-sm font-bold leading-tight" style={{ color: 'var(--color-text-primary)' }}>{plan.name}</div>
            {plan.subtitle && <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{plan.subtitle}</div>}
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl font-black font-data leading-none" style={{ color: 'var(--ns-ember)' }}>{plan.weeks_min}</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>weeks</div>
          </div>
        </div>

        <div className="flex gap-4 mt-3 pt-3 border-t items-center" style={{ borderColor: 'var(--color-border)' }}>
          <Stat label="runs/wk" value={String(plan.runs_per_week)} />
          {plan.peak_km_week && <Stat label="peak km" value={`${plan.peak_km_week}`} />}
          {(plan as any).avg_rating && (plan as any).review_count > 0 && (
            <Stat label="rating" value={`★ ${((plan as any).avg_rating as number).toFixed(1)}`} />
          )}
          {(plan as any).avg_completion_rate && (
            <Stat label="completion" value={`${Math.round((plan as any).avg_completion_rate as number)}%`} />
          )}
          <div className="ml-auto" style={{ color: 'var(--ns-forest)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Week 1 preview button */}
      <button onClick={onPreview}
        className="w-full text-[10px] font-bold text-center py-2 border-t transition-colors"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}>
        Preview week 1 →
      </button>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold font-data" style={{ color: 'var(--color-text-primary)' }}>{value}</div>
      <div className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{label}</div>
    </div>
  )
}

function Week1Preview({ plan, onClose, onSelect }: { plan: PlanTemplate; onClose: () => void; onSelect: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const weeks = (plan as any).weeks_data as any[] ?? []
  const week1 = weeks[0]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const days  = (week1?.days ?? []) as any[]

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto">
        <div className="rounded-t-3xl px-5 pt-4 pb-8 max-h-[75vh] overflow-y-auto" style={{ background: "var(--color-surface)" }}>
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-gray-900">{plan.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">Week 1 preview</p>
            </div>
            <button onClick={onClose} className="text-gray-400 text-lg">✕</button>
          </div>

          {days.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Week 1 preview not available for this plan</p>
          ) : (
            <div className="space-y-2 mb-5">
              {days.map((d: any, i: number) => {
                const sessions = d.sessions ?? []
                if (sessions.length === 0) return (
                  <div key={i} className="flex gap-3 items-center">
                    <span className="text-[10px] font-bold text-gray-400 w-8">{d.d}</span>
                    <span className="text-xs text-gray-300">Rest</span>
                  </div>
                )
                return (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="text-[10px] font-bold text-gray-400 w-8 pt-1">{d.d}</span>
                    <div className="flex-1 space-y-1">
                      {sessions.map((s: any, j: number) => (
                        <div key={j} className={`text-xs px-2 py-1.5 rounded-lg ${
                          s.c?.includes('long')     ? 'bg-amber-50 text-amber-800' :
                          s.c?.includes('interval') ? 'bg-red-50 text-red-800' :
                          s.c?.includes('tempo')    ? 'bg-orange-50 text-orange-800' :
                          s.c?.includes('gym')      ? 'bg-purple-50 text-purple-800' :
                          s.c?.includes('rest')     ? 'bg-gray-50 text-gray-400' :
                          'bg-emerald-50 text-emerald-800'
                        }`}>
                          <span className="font-bold">{s.n}</span>
                          {s.km && <span className="opacity-70 ml-1.5">{s.km}km</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-500">
              Back to browse
            </button>
            <button onClick={onSelect}
              className="flex-1 py-3 rounded-2xl text-white text-sm font-bold"
              style={{ background: 'var(--ns-forest)' }}>
              Select this plan →
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
function PlanDetail({ plan, onBack }: { plan: PlanTemplate; onBack: () => void }) {
  const [raceDateInput, setRaceDateInput] = useState('')
  const [planName, setPlanName] = useState(plan.name)
  const [includeGym, setIncludeGym] = useState(true)
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
        body: JSON.stringify({ template_id: plan.id, name: planName, race_date: raceDateInput || null, include_gym: includeGym }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed to activate plan')
      }
      const result = await res.json()
      if (result.raceTooSoon) {
        window.location.href = '/today?notice=race_soon'
      } else {
        window.location.href = '/today'
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setActivating(false)
    }
  }

  return (
    <main className="min-h-screen pb-24">
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
          <div className="bg-[var(--ns-forest-light)] rounded-2xl border border-teal-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">🧠</span>
              <span className="text-xs font-bold text-teal-800 uppercase tracking-wide">Coach notes</span>
            </div>
            <p className="text-sm text-[var(--ns-forest)] leading-relaxed">{meta.coach_notes as string}</p>
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
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[var(--ns-forest)] focus:ring-2 focus:ring-[var(--ns-forest)]/20 transition-colors" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">
              Race date <span className="text-gray-300 font-normal">(optional)</span>
            </label>
            <input type="date" value={raceDateInput} onChange={e => setRaceDateInput(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[var(--ns-forest)] focus:ring-2 focus:ring-[var(--ns-forest)]/20 transition-colors" />
            <p className="text-[10px] text-gray-400 mt-1">
              We&apos;ll align your training weeks to build up to race day.
            </p>
          </div>

          {/* Gym toggle */}
          <button
            onClick={() => setIncludeGym(g => !g)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
              includeGym ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50'
            }`}
          >
            <span className="text-xl">{includeGym ? '🏋️' : '🏃'}</span>
            <div className="flex-1 text-left">
              <p className={`text-xs font-bold ${includeGym ? 'text-amber-800' : 'text-gray-600'}`}>
                {includeGym ? 'Strength sessions included' : 'Running only'}
              </p>
              <p className={`text-[10px] mt-0.5 ${includeGym ? 'text-amber-600' : 'text-gray-400'}`}>
                {includeGym
                  ? 'Gym sessions on rest days — builds injury resilience'
                  : 'Tap to add gym sessions to your plan'}
              </p>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${includeGym ? 'bg-amber-500' : 'bg-gray-200'}`}>
              <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-all ${includeGym ? 'ml-5' : 'ml-1'}`} />
            </div>
          </button>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl border border-red-100">{error}</p>
          )}

          <button onClick={handleActivate} disabled={activating || !planName.trim()}
            className="w-full bg-[var(--ns-forest)] text-white py-3.5 rounded-xl text-sm font-bold hover:bg-[var(--ns-forest)] transition-colors disabled:opacity-50">
            {activating ? 'Starting your plan…' : 'Start this plan →'}
          </button>
        </div>
      </div>
    </main>
  )
}
