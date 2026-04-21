'use client'

import { useState } from 'react'
import { useOnboarding } from '../context/OnboardingContext'
import { OnboardingProgressBar } from './OnboardingProgressBar'
import { SmartTimeInput } from '@/components/inputs/SmartInputs'
import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/supabase/db'

const EXPERIENCE_OPTIONS = [
  { id: 'lt_6mo',  label: '< 6 months',  desc: 'Just getting started' },
  { id: '6_12mo',  label: '6–12 months', desc: 'Finding my rhythm' },
  { id: '1_3yr',   label: '1–3 years',   desc: 'Building consistency' },
  { id: '3yr_plus',label: '3+ years',    desc: 'Experienced runner' },
] as const

const SURFACE_OPTIONS = [
  { id: 'road',      label: '🛣️ Road' },
  { id: 'trail',     label: '🌲 Trail' },
  { id: 'track',     label: '🏟️ Track' },
  { id: 'treadmill', label: '⚙️ Treadmill' },
]

const LONGEST_RUN_OPTIONS = [
  '< 5km', '5–10km', '10–15km', '15–21km', '21–30km', '30km+'
]

// Format seconds as MM:SS pace string
function secsToMMSS(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Parse MM:SS string to seconds (returns null if invalid)
function parseMMSS(val: string): number | null {
  const match = val.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const m = parseInt(match[1])
  const s = parseInt(match[2])
  if (s > 59) return null
  return m * 60 + s
}

function RaceTimeInput({ label, value, onChange }: {
  label: string
  value: number | undefined
  onChange: (secs: number | undefined) => void
}) {
  const [raw, setRaw] = useState(value ? secsToMMSS(value) : '')
  const [error, setError] = useState('')

  const handleBlur = () => {
    if (!raw) { onChange(undefined); setError(''); return }
    // Accept formats: MM:SS or H:MM:SS
    const parts = raw.split(':').map(Number)
    let secs: number | null = null
    if (parts.length === 2) secs = parts[0] * 60 + parts[1]
    if (parts.length === 3) secs = parts[0] * 3600 + parts[1] * 60 + parts[2]
    if (secs && secs > 0) { onChange(secs); setError('') }
    else setError('Use format M:SS or H:MM:SS')
  }

  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-500">{label}</label>
      <input
        value={raw}
        onChange={e => setRaw(e.target.value)}
        onBlur={handleBlur}
        placeholder="e.g. 25:30"
        className={`w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-teal-100 transition-colors ${
          error ? 'border-red-300' : 'border-slate-200 focus:border-teal-400'
        }`}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {value && !error && <p className="text-xs text-teal-600">✓ {secsToMMSS(value)}</p>}
    </div>
  )
}

export function YourRunningScreen() {
  const { step, data, update, next, back } = useOnboarding()

  const [experience, setExperience]   = useState(data.runningExperience)
  const [weeklyKm, setWeeklyKm]       = useState(data.weeklyKmCurrent)
  const [raceTimes, setRaceTimes]     = useState(data.recentRaceTimes)
  const [longestRun, setLongestRun]   = useState<string | null>(null)
  const [surfaces, setSurfaces]       = useState<string[]>(data.runSurfaces)
  const [saving, setSaving]           = useState(false)

  const toggleSurface = (id: string) => {
    setSurfaces(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const canContinue = !!experience

  const handleContinue = async () => {
    if (!canContinue) return
    setSaving(true)
    update({
      runningExperience: experience,
      weeklyKmCurrent: weeklyKm,
      recentRaceTimes: raceTimes,
      longestRecentRun: longestRun ? LONGEST_RUN_OPTIONS.indexOf(longestRun) * 5 : null,
      runSurfaces: surfaces,
    })
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await db(supabase).from('profiles').update({
        running_experience: experience,
        weekly_km_current: weeklyKm,
        recent_race_times: raceTimes,
        run_surfaces: surfaces,
        onboarding_step: 5,
      }).eq('id', user.id)
    }
    setSaving(false)
    next()
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <OnboardingProgressBar step={step} character={data.characterConfig} showFinishLine />

      <div className="flex-1 overflow-y-auto pb-32 px-4 pt-6 space-y-4">
        <div className="mb-2">
          {data.trainingPath === 'ai_bespoke' ? (
            <>
              <h1 className="text-xl font-black text-gray-900">Tell us about your training</h1>
              <p className="text-sm text-gray-500 mt-1">
                The more specific you are, the better the plan. These questions are more detailed than other paths — because they need to be.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-black text-gray-900">Your running</h1>
              <p className="text-sm text-gray-500 mt-1">Helps us set the right starting point for your plan.</p>
            </>
          )}
        </div>

        {/* Deeper question for AI Bespoke — signals intelligence (Product Pillar spec) */}
        {data.trainingPath === 'ai_bespoke' && (
          <div className="bg-[var(--ns-forest-light)] border border-[var(--ns-forest)]20 rounded-2xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ns-forest)' }}>
              One important question first
            </p>
            <p className="text-sm font-semibold text-gray-900 mb-3 leading-snug">
              What happened the last time you didn&apos;t complete a training plan?
            </p>
            <div className="space-y-2">
              {[
                { id: 'life_got_busy',  label: 'Life got in the way — work, family, travel' },
                { id: 'too_hard',       label: 'The plan was too demanding to keep up with' },
                { id: 'injury',         label: 'I picked up an injury' },
                { id: 'lost_motivation',label: 'Lost motivation when progress felt slow' },
                { id: 'first_plan',     label: 'This is my first structured training plan' },
              ].map(opt => {
                const isOn = (data as { prevPlanDropReason?: string }).prevPlanDropReason === opt.id
                return (
                  <button key={opt.id}
                    onClick={() => update({ prevPlanDropReason: opt.id } as never)}
                    className="w-full text-left px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all"
                    style={isOn
                      ? { background: 'var(--ns-forest)', color: 'white', borderColor: 'var(--ns-forest)' }
                      : { background: 'white', color: '#374151', borderColor: '#e5e7eb' }}>
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Experience */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">How long have you been running?</label>
          <div className="space-y-2">
            {EXPERIENCE_OPTIONS.map(o => (
              <button
                key={o.id}
                onClick={() => setExperience(o.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all`}
                style={experience === o.id
                  ? { background: 'var(--ns-forest-light)', borderColor: 'var(--ns-forest)' }
                  : { background: 'white', borderColor: '#e5e7eb' }}
              >
                <p className={`text-sm font-bold ${experience === o.id ? 'text-teal-800' : 'text-slate-700'}`}>{o.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{o.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Weekly km */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current weekly mileage</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0} max={120} step={5}
              value={weeklyKm}
              onChange={e => setWeeklyKm(Number(e.target.value))}
              className="flex-1 accent-teal-500"
            />
            <span className="text-lg font-black text-teal-600 w-16 text-right">{weeklyKm}km</span>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>0km</span><span>60km</span><span>120km</span>
          </div>
          {weeklyKm === 0 && (
            <p className="text-xs text-slate-400">No worries — we&apos;ll build you up from scratch</p>
          )}
        </div>

        {/* Recent race times */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent race times</label>
            <p className="text-xs text-slate-400 mt-1">Optional but powerful — we use this to set your pace zones precisely. Fill in what you know.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SmartTimeInput label="5K" value={raceTimes['5k'] ?? null} onChange={v => setRaceTimes(p => ({ ...p, '5k': v ?? undefined }))} hint="e.g. 02000 → 0:20:00" />
            <SmartTimeInput label="10K" value={raceTimes['10k'] ?? null} onChange={v => setRaceTimes(p => ({ ...p, '10k': v ?? undefined }))} hint="e.g. 04500 → 0:45:00" />
            <SmartTimeInput label="Half Marathon" value={raceTimes['half'] ?? null} onChange={v => setRaceTimes(p => ({ ...p, half: v ?? undefined }))} hint="e.g. 13000 → 1:30:00" />
            <SmartTimeInput label="Marathon" value={raceTimes['marathon'] ?? null} onChange={v => setRaceTimes(p => ({ ...p, marathon: v ?? undefined }))} hint="e.g. 34500 → 3:45:00" />
          </div>
        </div>

        {/* Longest recent run */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Longest run in last 4 weeks</label>
          <div className="grid grid-cols-3 gap-2">
            {LONGEST_RUN_OPTIONS.map(o => (
              <button
                key={o}
                onClick={() => setLongestRun(o)}
                className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                  longestRun === o ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        {/* Surfaces */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Where do you typically run?</label>
          <div className="grid grid-cols-2 gap-2">
            {SURFACE_OPTIONS.map(o => (
              <button
                key={o.id}
                onClick={() => toggleSurface(o.id)}
                className={`py-2.5 px-3 rounded-xl text-sm font-semibold border transition-all text-left ${
                  surfaces.includes(o.id) ? 'bg-teal-50 border-teal-400 text-teal-800' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-4 flex gap-3">
        <button onClick={back} className="px-5 py-3 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600">←</button>
        <button
          onClick={handleContinue}
          disabled={!canContinue || saving}
          className="flex-1 bg-teal-500 text-white py-3 rounded-2xl text-sm font-bold disabled:opacity-50 transition-all hover:bg-teal-600 active:scale-95"
        >
          {saving ? 'Saving…' : canContinue ? 'Continue →' : 'Select your experience level'}
        </button>
      </div>
    </div>
  )
}
