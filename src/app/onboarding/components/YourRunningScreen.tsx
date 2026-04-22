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
      <label className="text-xs font-semibold text-gray-500">{label}</label>
      <input
        value={raw}
        onChange={e => setRaw(e.target.value)}
        onBlur={handleBlur}
        placeholder="e.g. 25:30"
        className={`w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-[var(--ns-forest)]/20 transition-colors ${
          error ? 'border-red-300' : 'border-gray-200 focus:border-[var(--ns-forest)]'
        }`}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {value && !error && <p className="text-xs text-[var(--ns-forest)]">✓ {secsToMMSS(value)}</p>}
    </div>
  )
}

export function YourRunningScreen() {
  const { step, data, update, next, back } = useOnboarding()

  const [experience, setExperience]   = useState(data.runningExperience)
  const [weeklyKm, setWeeklyKm]       = useState(data.weeklyKmCurrent)
  const [raceTimes, setRaceTimes]     = useState(data.recentRaceTimes)
  const [longestRun, setLongestRun]   = useState<number>(data.longestRecentRun ?? 0)
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
      longestRecentRun: longestRun > 0 ? longestRun : null,
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
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-bg)" }}>
      <OnboardingProgressBar step={step} character={data.characterConfig} showFinishLine />

      <div className="flex-1 overflow-y-auto pb-32 px-4 pt-6 space-y-4">
        <div className="mb-2">
          {data.trainingPath === 'ai_bespoke' ? (
            <>
              <h1 className="text-xl font-black" style={{ color: 'var(--color-text-primary)' }}>Tell us about your training</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                The more specific you are, the better the plan. These questions are more detailed than other paths — because they need to be.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-black" style={{ color: 'var(--color-text-primary)' }}>Your running</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Helps us set the right starting point for your plan.</p>
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
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
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
                <p className={`text-sm font-bold ${experience === o.id ? 'text-teal-800' : 'text-gray-700'}`}>{o.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{o.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Weekly km */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Average weekly km (last 4 weeks)</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0} max={120} step={5}
              value={weeklyKm}
              onChange={e => setWeeklyKm(Number(e.target.value))}
              className="flex-1 accent-teal-500"
            />
            <span className="text-lg font-black text-[var(--ns-forest)] w-16 text-right">{weeklyKm}km</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>0km</span><span>60km</span><span>120km</span>
          </div>
          {weeklyKm === 0 && (
            <p className="text-xs text-gray-400">No worries — we&apos;ll build you up from scratch</p>
          )}
        </div>

        {/* Recent race times */}
        <div className="rounded-2xl p-4 space-y-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recent race times</label>
            <p className="text-xs text-gray-400 mt-1">Optional but powerful — we use this to set your pace zones precisely. Fill in what you know.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SmartTimeInput label="5K" value={raceTimes['5k'] ?? null} onChange={v => setRaceTimes(p => ({ ...p, '5k': v ?? undefined }))} />
            <SmartTimeInput label="10K" value={raceTimes['10k'] ?? null} onChange={v => setRaceTimes(p => ({ ...p, '10k': v ?? undefined }))} />
            <SmartTimeInput label="Half Marathon" value={raceTimes['half'] ?? null} onChange={v => setRaceTimes(p => ({ ...p, half: v ?? undefined }))} />
            <SmartTimeInput label="Marathon" value={raceTimes['marathon'] ?? null} onChange={v => setRaceTimes(p => ({ ...p, marathon: v ?? undefined }))} />
          </div>
        </div>

        {/* Longest recent run — slider 0-50km+ */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
              Longest run in last 4 weeks
            </label>
            <span className="text-lg font-black font-data" style={{ color: 'var(--ns-forest)' }}>
              {longestRun === 0 ? '—' : longestRun >= 50 ? '50km+' : `${longestRun}km`}
            </span>
          </div>
          <input
            type="range"
            min={0} max={50} step={0.5}
            value={longestRun}
            onChange={e => setLongestRun(Number(e.target.value))}
            className="w-full accent-teal-500"
          />
          <div className="flex justify-between text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
            <span>0</span><span>10km</span><span>21km</span><span>42km</span><span>50km+</span>
          </div>
          {longestRun === 0 && (
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              Slide to set — or leave at 0 if you haven&apos;t run recently
            </p>
          )}
        </div>

        {/* Surfaces */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Where do you typically run?</label>
          <div className="grid grid-cols-2 gap-2">
            {SURFACE_OPTIONS.map(o => (
              <button
                key={o.id}
                onClick={() => toggleSurface(o.id)}
                className={`py-2.5 px-3 rounded-xl text-sm font-semibold border transition-all text-left ${
                  surfaces.includes(o.id) ? 'bg-[var(--ns-forest-light)] border-[var(--ns-forest)] text-teal-800' : 'bg-white border-gray-200 text-gray-700'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-4 flex gap-3 border-t" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
        <button onClick={back} className="px-5 py-3 rounded-2xl border text-sm font-semibold" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>←</button>
        <button
          onClick={handleContinue}
          disabled={!canContinue || saving}
          className="flex-1 py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-50 transition-all active:scale-95" style={{ background: 'var(--ns-ember)' }}
        >
          {saving ? 'Saving…' : canContinue ? 'Continue →' : 'Select your experience level'}
        </button>
      </div>
    </div>
  )
}
