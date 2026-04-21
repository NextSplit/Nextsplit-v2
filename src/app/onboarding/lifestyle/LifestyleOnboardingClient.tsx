'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import OnboardingProgress from '@/components/OnboardingProgress'

const FOCUSES = [
  { id: 'easy',      label: 'Stay healthy & active', emoji: '🌿', desc: 'Low pressure, feel good running', slug: '5k_couch_to_5k' },
  { id: 'speed',     label: 'Get faster',             emoji: '⚡', desc: 'Mix of easy and quality sessions', slug: '5k_improve' },
  { id: 'endurance', label: 'Build endurance',        emoji: '🏔️', desc: 'Long runs and steady mileage', slug: '10k_intermediate' },
]

const FREQUENCIES = [
  { id: '3', label: '3 days/week', desc: 'Great for beginners or busy schedules' },
  { id: '4', label: '4 days/week', desc: 'Solid consistency with recovery days' },
  { id: '5', label: '5 days/week', desc: 'High volume for committed runners' },
]

type Step = 'focus' | 'freq' | 'name' | 'saving'
const STEP_INDEX: Record<Step, number> = { focus: 1, freq: 2, name: 3, saving: 3 }

export default function LifestyleOnboardingClient() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('focus')
  const [focus, setFocus] = useState('')
  const [freq, setFreq] = useState('')
  const [planName, setPlanName] = useState('')
  const [includeGym, setIncludeGym] = useState(true)
  const [error, setError] = useState('')

  const selectedFocus = FOCUSES.find(f => f.id === focus)

  function handleBack() {
    if (step === 'freq') setStep('focus')
    else if (step === 'name') setStep('freq')
    else router.push('/onboarding')
  }

  async function save() {
    if (!planName.trim()) return
    setStep('saving')
    setError('')
    try {
      const res = await fetch('/api/plans/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: selectedFocus?.slug ?? '5k_couch_to_5k', name: planName.trim(), plan_type: 'lifestyle', include_gym: includeGym }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      router.push(data.raceTooSoon ? '/today?notice=race_soon' : '/today')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStep('name')
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-5 pt-14 pb-10"
      style={{ background: 'linear-gradient(160deg, #0f172a 0%, #18181b 60%, #0f172a 100%)' }}>

      {step !== 'saving' && (
        <OnboardingProgress current={STEP_INDEX[step]} total={3} onBack={handleBack} />
      )}

      {step === 'focus' && (
        <div>
          <div className="text-3xl mb-3">🌿</div>
          <h1 className="text-2xl font-black text-white mb-1">What&apos;s your focus?</h1>
          <p className="text-zinc-400 text-sm mb-7">No race pressure — just running for you.</p>
          <div className="space-y-2.5">
            {FOCUSES.map(f => (
              <button key={f.id} onClick={() => { setFocus(f.id); setStep('freq') }}
                className="w-full rounded-2xl border border-white/10 hover:border-white/25 p-4 text-left transition-all active:scale-[0.98] flex items-center gap-4"
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                <span className="text-2xl w-8 text-center flex-shrink-0">{f.emoji}</span>
                <div>
                  <div className="text-sm font-bold text-white">{f.label}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">{f.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'freq' && (
        <div>
          <div className="inline-flex items-center gap-1.5 bg-teal-500/15 border border-teal-500/30 rounded-full px-3 py-1 mb-6">
            <span className="text-xs font-bold text-teal-400">{selectedFocus?.label} ✓</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">How often can you run?</h1>
          <p className="text-zinc-400 text-sm mb-7">Be realistic — consistency beats intensity.</p>
          <div className="space-y-2.5">
            {FREQUENCIES.map(f => (
              <button key={f.id} onClick={() => { setFreq(f.id); setStep('name') }}
                className="w-full rounded-2xl border border-white/10 hover:border-white/25 p-4 text-left transition-all active:scale-[0.98]"
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="text-sm font-bold text-white">{f.label}</div>
                <div className="text-xs text-zinc-400 mt-0.5">{f.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'name' && (
        <div>
          <div className="inline-flex items-center gap-1.5 bg-teal-500/15 border border-teal-500/30 rounded-full px-3 py-1 mb-6">
            <span className="text-xs font-bold text-teal-400">{selectedFocus?.label} · {freq} days/week ✓</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Almost there</h1>
          <p className="text-zinc-400 text-sm mb-6">Name your plan and choose whether to include strength sessions.</p>
          <div className="space-y-3 mb-6">
            <input value={planName} onChange={e => setPlanName(e.target.value)}
              placeholder="My Running Plan"
              className="w-full rounded-2xl border border-white/20 px-4 py-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-teal-500"
              style={{ background: 'rgba(255,255,255,0.07)' }} />

            {/* Gym toggle */}
            <button onClick={() => setIncludeGym(g => !g)}
              className="w-full flex items-center gap-3 rounded-2xl border border-white/15 px-4 py-3.5 text-left transition-all active:scale-[0.98]"
              style={{ background: includeGym ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)' }}>
              <span className="text-xl">{includeGym ? '🏋️' : '🏃'}</span>
              <div className="flex-1">
                <p className={`text-sm font-bold ${includeGym ? 'text-amber-400' : 'text-zinc-300'}`}>
                  {includeGym ? 'Strength sessions included' : 'Running only'}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {includeGym ? 'Gym sessions on rest days — tap to remove' : 'Tap to add gym sessions'}
                </p>
              </div>
              <div className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${includeGym ? 'bg-amber-500' : 'bg-zinc-700'}`}>
                <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-all ${includeGym ? 'ml-5' : 'ml-1'}`} />
              </div>
            </button>
          </div>
          {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
          <button onClick={save} disabled={!planName.trim()}
            className="w-full bg-[var(--ns-forest)] text-white py-4 rounded-2xl text-sm font-bold disabled:opacity-40 active:scale-[0.98] transition-transform">
            Start running →
          </button>
        </div>
      )}

      {step === 'saving' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
          <div className="text-6xl mb-6 animate-pulse">🌿</div>
          <p className="text-white font-bold text-lg">Setting up your plan…</p>
          <p className="text-zinc-400 text-sm mt-1">Almost there!</p>
        </div>
      )}
    </div>
  )
}
