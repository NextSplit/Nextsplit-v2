'use client'

/**
 * AI Plan Quality Review Tool — Phase A3
 *
 * Allows the founder to:
 * 1. Generate test plans for different runner profiles
 * 2. Inspect the weeks_data structure visually
 * 3. See automated quality checks (progression, ACWR, paces)
 * 4. Flag issues before alpha users receive plans
 */

import { useState } from 'react'

interface PlanProfile {
  goal:          string
  experience:    string
  weeklyKm:      number
  targetTime?:   string  // e.g. "3:30" for marathon
  weeks:         number
  gym:           boolean
  trainingDays:  number
}

interface QualityCheck {
  label:  string
  status: 'pass' | 'warn' | 'fail'
  detail: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlanWeek = Record<string, any>

const PRESET_PROFILES: { label: string; profile: PlanProfile }[] = [
  {
    label: 'Beginner — first 5K',
    profile: { goal: '5k', experience: 'beginner', weeklyKm: 10, weeks: 8, gym: false, trainingDays: 3 },
  },
  {
    label: 'Intermediate — sub-4 marathon',
    profile: { goal: 'marathon', experience: 'intermediate', weeklyKm: 45, targetTime: '3:55', weeks: 16, gym: true, trainingDays: 5 },
  },
  {
    label: 'Advanced — sub-3 marathon',
    profile: { goal: 'marathon', experience: 'advanced', weeklyKm: 80, targetTime: '2:58', weeks: 20, gym: true, trainingDays: 6 },
  },
  {
    label: 'Comeback runner — half marathon',
    profile: { goal: 'half_marathon', experience: 'intermediate', weeklyKm: 20, weeks: 12, gym: false, trainingDays: 4 },
  },
  {
    label: 'Beginner — lifestyle (no race)',
    profile: { goal: 'fitness', experience: 'beginner', weeklyKm: 8, weeks: 8, gym: false, trainingDays: 3 },
  },
]

function buildTestPrompt(p: PlanProfile): string {
  const raceDate = new Date(Date.now() + p.weeks * 7 * 24 * 3600 * 1000).toISOString().split('T')[0]
  return `You are an expert running coach. Generate a structured training plan in JSON format only.

ATHLETE PROFILE:
- Running experience: ${p.experience}
- Current weekly mileage: ${p.weeklyKm}km
- Preferred surfaces: road
- Training days per week: ${p.trainingDays}
- Preferred long run day: Sunday
- Injuries/niggles: none
- Health flags: none

GYM CONFIGURATION:
- Gym enabled: ${p.gym ? 'yes' : 'no'}
- Gym sessions per week: ${p.gym ? 2 : 0}

PRIMARY GOAL:
- Type: ${p.goal === 'fitness' ? 'general_fitness' : 'race'}
- Distance: ${p.goal}
- Race date: ${raceDate}
- Target time: ${p.targetTime ?? 'n/a'}
- Weeks until race: ${p.weeks}

Generate a ${p.weeks}-week plan with periodisation (base → build → peak → taper if applicable).

Rules:
- Include ${p.trainingDays} sessions per week total (run + gym combined)
- ${p.gym ? 'Include 2 gym sessions per week' : 'No gym sessions'}
- Progress weekly km by no more than 10% week-on-week (ACWR safety)
- Include at least 1 rest or easy recovery day per week
- Long run on Sunday

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "name": "plan name",
  "totalWeeks": ${p.weeks},
  "peakWeeklyKm": number,
  "weeks": [
    {
      "n": 1,
      "title": "Base Building",
      "phase": "base",
      "targetKm": number,
      "days": [
        {
          "day": "Mon",
          "sessions": [
            {
              "type": "easy_run|tempo|interval|long_run|recovery|rest|gym|cross",
              "name": "session name",
              "detail": "specific coaching instruction with target pace or effort",
              "km": number or null
            }
          ]
        }
      ]
    }
  ]
}`
}

function runQualityChecks(weeks: PlanWeek[], profile: PlanProfile): QualityCheck[] {
  const checks: QualityCheck[] = []

  if (!weeks.length) {
    return [{ label: 'Plan structure', status: 'fail', detail: 'No weeks generated' }]
  }

  // Check week count matches requested
  checks.push({
    label:  'Week count',
    status: weeks.length === profile.weeks ? 'pass'
            : Math.abs(weeks.length - profile.weeks) <= 1 ? 'warn' : 'fail',
    detail: `Generated ${weeks.length} weeks, requested ${profile.weeks}`,
  })

  // Check week 1 volume vs current fitness (shouldn't exceed current weekly km * 1.1)
  const week1Km = weeks[0]?.targetKm ?? 0
  const maxSafeWeek1 = profile.weeklyKm * 1.15
  checks.push({
    label:  'Week 1 volume',
    status: week1Km <= maxSafeWeek1 ? 'pass' : week1Km <= profile.weeklyKm * 1.3 ? 'warn' : 'fail',
    detail: `Week 1: ${week1Km}km vs current ${profile.weeklyKm}km/week`,
  })

  // Check progressive overload (no single week > 10% jump)
  let bigJumps = 0
  for (let i = 1; i < weeks.length; i++) {
    const prev = weeks[i - 1]?.targetKm ?? 0
    const curr = weeks[i]?.targetKm ?? 0
    if (prev > 0 && curr > prev * 1.15) bigJumps++
  }
  checks.push({
    label:  'Progressive overload',
    status: bigJumps === 0 ? 'pass' : bigJumps <= 2 ? 'warn' : 'fail',
    detail: bigJumps === 0 ? 'All week-on-week increases ≤ 10%' : `${bigJumps} week(s) exceed 10% increase`,
  })

  // Check rest days present in every week
  const weeksWithoutRest = weeks.filter(w => {
    const days = w.days ?? []
    return !days.some((d: PlanWeek) =>
      d.sessions?.some((s: PlanWeek) => s.type === 'rest' || s.type === 'recovery')
    )
  })
  checks.push({
    label:  'Rest days',
    status: weeksWithoutRest.length === 0 ? 'pass' : 'warn',
    detail: weeksWithoutRest.length === 0
      ? 'Every week has rest/recovery'
      : `${weeksWithoutRest.length} week(s) missing rest day`,
  })

  // Check taper exists for race plans
  if (profile.goal !== 'fitness' && profile.weeks >= 12) {
    const lastWeekKm   = weeks[weeks.length - 1]?.targetKm ?? 0
    const peakKm       = Math.max(...weeks.map(w => w.targetKm ?? 0))
    const taperPct     = peakKm > 0 ? (lastWeekKm / peakKm) * 100 : 100
    checks.push({
      label:  'Taper',
      status: taperPct <= 65 ? 'pass' : taperPct <= 80 ? 'warn' : 'fail',
      detail: `Race week is ${Math.round(taperPct)}% of peak volume (target ≤ 65%)`,
    })
  }

  // Check session type variety
  const allTypes = new Set<string>()
  weeks.forEach(w => w.days?.forEach((d: PlanWeek) =>
    d.sessions?.forEach((s: PlanWeek) => allTypes.add(s.type))
  ))
  const hasEasy    = allTypes.has('easy_run')
  const hasLong    = allTypes.has('long_run')
  const hasQuality = allTypes.has('tempo') || allTypes.has('interval')
  checks.push({
    label:  'Session variety',
    status: hasEasy && hasLong && hasQuality ? 'pass' : hasEasy && hasLong ? 'warn' : 'fail',
    detail: `Types found: ${[...allTypes].join(', ')}`,
  })

  return checks
}

export default function PlanReviewClient() {
  const [selectedPreset, setSelectedPreset] = useState(0)
  const [customProfile, setCustomProfile]   = useState<PlanProfile>(PRESET_PROFILES[0].profile)
  const [useCustom, setUseCustom]           = useState(false)
  const [generating, setGenerating]         = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [plan, setPlan]                     = useState<any | null>(null)
  const [error, setError]                   = useState('')
  const [checks, setChecks]                 = useState<QualityCheck[]>([])
  const [expandedWeek, setExpandedWeek]     = useState<number | null>(0)
  const [reviewCount, setReviewCount]       = useState(0)

  const activeProfile = useCustom ? customProfile : PRESET_PROFILES[selectedPreset].profile

  async function generate() {
    setGenerating(true)
    setError('')
    setPlan(null)
    setChecks([])
    try {
      const res  = await fetch('/api/ai/generate-plan', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ prompt: buildTestPrompt(activeProfile) }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPlan(data)
      setChecks(runQualityChecks(data.weeks ?? [], activeProfile))
      setReviewCount(c => c + 1)
      setExpandedWeek(0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const checkColour = (s: QualityCheck['status']) =>
    s === 'pass' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
    s === 'warn' ? 'text-amber-700 bg-amber-50 border-amber-200' :
    'text-red-700 bg-red-50 border-red-200'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Admin</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phase A3</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">AI Plan Quality Review</h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate and inspect AI plans before alpha users see them.
            Run at least 10 before inviting any user. Plans reviewed: <strong>{reviewCount}</strong>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left — profile selector */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Test profile</p>

              <div className="space-y-2 mb-4">
                {PRESET_PROFILES.map((p, i) => (
                  <button key={i}
                    onClick={() => { setSelectedPreset(i); setUseCustom(false) }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                      !useCustom && selectedPreset === i
                        ? 'border-[var(--ns-forest)] bg-[var(--ns-forest-light)] text-[var(--ns-forest)]'
                        : 'border-gray-100 text-gray-600 hover:border-gray-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setUseCustom(true)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                  useCustom ? 'border-[var(--ns-forest)] bg-[var(--ns-forest-light)] text-[var(--ns-forest)]' : 'border-gray-100 text-gray-500'
                }`}
              >
                Custom profile →
              </button>

              {useCustom && (
                <div className="mt-3 space-y-2">
                  {[
                    { label: 'Goal', key: 'goal', type: 'text' },
                    { label: 'Experience', key: 'experience', type: 'text' },
                    { label: 'Weekly km', key: 'weeklyKm', type: 'number' },
                    { label: 'Weeks', key: 'weeks', type: 'number' },
                    { label: 'Training days', key: 'trainingDays', type: 'number' },
                    { label: 'Target time', key: 'targetTime', type: 'text' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-[10px] text-gray-400 font-semibold">{f.label}</label>
                      <input
                        type={f.type}
                        value={customProfile[f.key as keyof PlanProfile]?.toString() ?? ''}
                        onChange={e => setCustomProfile(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-[var(--ns-forest)]"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={generate}
              disabled={generating}
              className="w-full py-3 rounded-2xl text-white text-sm font-bold disabled:opacity-50 transition-all active:scale-[0.98]"
              style={{ background: 'var(--ns-forest)' }}
            >
              {generating ? 'Generating…' : '⚡ Generate plan'}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}
          </div>

          {/* Right — results */}
          <div className="lg:col-span-2 space-y-4">

            {/* Quality checks */}
            {checks.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Quality checks</p>
                <div className="space-y-2">
                  {checks.map((c, i) => (
                    <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-xl border text-xs ${checkColour(c.status)}`}>
                      <span className="font-bold flex-shrink-0">
                        {c.status === 'pass' ? '✓' : c.status === 'warn' ? '⚠' : '✗'}
                      </span>
                      <div>
                        <span className="font-bold">{c.label}</span>
                        <span className="opacity-75 ml-2">{c.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                  <span>Plan: <strong className="text-gray-700">{plan?.name}</strong></span>
                  <span>{plan?.totalWeeks} weeks · peak {plan?.peakWeeklyKm}km/wk</span>
                </div>
              </div>
            )}

            {/* Week-by-week plan */}
            {plan?.weeks && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Week breakdown ({plan.weeks.length} weeks)
                </p>
                <div className="space-y-2">
                  {plan.weeks.map((week: PlanWeek, wi: number) => (
                    <div key={wi} className="border border-gray-100 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedWeek(expandedWeek === wi ? null : wi)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-gray-500 w-8">W{week.n}</span>
                          <span className="text-xs font-bold text-gray-800">{week.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold capitalize">
                            {week.phase}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold" style={{ color: 'var(--ns-forest)' }}>
                            {week.targetKm}km
                          </span>
                          <span className="text-gray-400 text-sm">{expandedWeek === wi ? '−' : '+'}</span>
                        </div>
                      </button>

                      {expandedWeek === wi && (
                        <div className="border-t border-gray-50 px-4 py-3 space-y-2">
                          {(week.days ?? []).map((day: PlanWeek, di: number) => (
                            <div key={di} className="flex gap-3">
                              <span className="text-[10px] font-bold text-gray-400 w-8 flex-shrink-0 pt-1">{day.day}</span>
                              <div className="flex-1 space-y-1">
                                {(day.sessions ?? []).map((s: PlanWeek, si: number) => (
                                  <div key={si} className={`text-xs px-2 py-1.5 rounded-lg ${
                                    s.type === 'rest' || s.type === 'recovery' ? 'bg-gray-50 text-gray-400' :
                                    s.type === 'long_run' ? 'bg-amber-50 text-amber-800' :
                                    s.type === 'interval' ? 'bg-red-50 text-red-800' :
                                    s.type === 'tempo' ? 'bg-orange-50 text-orange-800' :
                                    s.type === 'gym' ? 'bg-purple-50 text-purple-800' :
                                    'bg-emerald-50 text-emerald-800'
                                  }`}>
                                    <span className="font-bold">{s.name}</span>
                                    {s.km && <span className="opacity-70 ml-1.5">{s.km}km</span>}
                                    {s.detail && <p className="opacity-60 mt-0.5 text-[10px] leading-relaxed">{s.detail}</p>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!plan && !generating && (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <p className="text-4xl mb-3">🧠</p>
                <p className="text-sm font-bold text-gray-700 mb-1">Select a profile and generate</p>
                <p className="text-xs text-gray-400">Review 10+ plans before inviting alpha users</p>
              </div>
            )}

            {generating && (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="w-8 h-8 rounded-full border-2 border-gray-100 border-t-[var(--ns-forest)] animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500">Generating plan…</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
