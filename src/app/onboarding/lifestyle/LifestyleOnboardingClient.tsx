'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const FREQUENCIES = [
  { id: '3', label: '3 days/week', desc: 'Great for beginners or busy schedules', slug: 'plan_c25k' },
  { id: '4', label: '4 days/week', desc: 'Solid consistency with recovery days', slug: '5k_improve' },
  { id: '5', label: '5 days/week', desc: 'High volume for committed runners', slug: '10k_intermediate' },
]

const FOCUSES = [
  { id: 'easy', label: 'Stay healthy & active', emoji: '🌿', desc: 'Low pressure, feel good running' },
  { id: 'speed', label: 'Get faster', emoji: '⚡', desc: 'Mix of easy and quality sessions' },
  { id: 'endurance', label: 'Build endurance', emoji: '🏔️', desc: 'Long runs and steady mileage' },
]

export default function LifestyleOnboardingClient() {
  const router = useRouter()
  const [step, setStep] = useState<'focus' | 'freq' | 'name' | 'saving'>('focus')
  const [focus, setFocus] = useState('')
  const [freq, setFreq] = useState('')
  const [planName, setPlanName] = useState('')
  const [error, setError] = useState('')

  const selectedFocus = FOCUSES.find(f => f.id === focus)
  const selectedFreq = FREQUENCIES.find(f => f.id === freq)

  async function save() {
    if (!planName.trim()) return
    setStep('saving')
    setError('')
    try {
      const slug = selectedFreq?.slug ?? 'plan_c25k'
      const res = await fetch('/api/plans/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name: planName.trim(),
          plan_type: 'lifestyle',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      router.push('/today')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStep('name')
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col px-6 pt-16 pb-10">
      <button onClick={() => {
        if (step === 'freq') setStep('focus')
        else if (step === 'name') setStep('freq')
        else router.push('/onboarding')
      }} className="text-[#888] text-sm mb-8 self-start">
        ← Back
      </button>

      {step === 'focus' && (
        <div>
          <div className="text-3xl mb-2">🌿</div>
          <h1 className="text-2xl font-bold text-white mb-1">What&apos;s your focus?</h1>
          <p className="text-[#888] text-sm mb-8">No race pressure — just running for you.</p>
          <div className="space-y-2.5">
            {FOCUSES.map(f => (
              <button key={f.id} onClick={() => { setFocus(f.id); setStep('freq') }}
                className="w-full bg-white/10 hover:bg-white/15 rounded-2xl p-4 text-left transition-colors flex items-center gap-4">
                <span className="text-2xl">{f.emoji}</span>
                <div>
                  <div className="text-sm font-semibold text-white">{f.label}</div>
                  <div className="text-xs text-[#888] mt-0.5">{f.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'freq' && (
        <div>
          <div className="text-sm text-[#0D9488] font-semibold mb-6">{selectedFocus?.label} ✓</div>
          <h1 className="text-2xl font-bold text-white mb-1">How often can you run?</h1>
          <p className="text-[#888] text-sm mb-8">Be realistic — consistency beats intensity.</p>
          <div className="space-y-2.5">
            {FREQUENCIES.map(f => (
              <button key={f.id} onClick={() => { setFreq(f.id); setStep('name') }}
                className="w-full bg-white/10 hover:bg-white/15 rounded-2xl p-4 text-left transition-colors">
                <div className="text-sm font-semibold text-white">{f.label}</div>
                <div className="text-xs text-[#888] mt-0.5">{f.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'name' && (
        <div>
          <div className="text-sm text-[#0D9488] font-semibold mb-6">{selectedFocus?.label} · {selectedFreq?.label} ✓</div>
          <h1 className="text-2xl font-bold text-white mb-1">Name your plan</h1>
          <p className="text-[#888] text-sm mb-8">Something that motivates you.</p>
          <input value={planName} onChange={e => setPlanName(e.target.value)}
            placeholder="My Running Plan"
            className="w-full bg-white/10 text-white border border-white/20 rounded-2xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488] placeholder:text-white/30 mb-4" />
          {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
          <button onClick={save} disabled={!planName.trim()}
            className="w-full bg-[#0D9488] text-white py-4 rounded-2xl text-sm font-semibold disabled:opacity-40">
            Start running →
          </button>
        </div>
      )}

      {step === 'saving' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-5xl mb-6 animate-pulse">🌿</div>
          <p className="text-white font-bold text-lg">Setting up your plan…</p>
        </div>
      )}
    </div>
  )
}
