'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const DISTANCES = [
  { slug: 'plan_c25k', label: 'C25K / 5K', weeks: '9 weeks', desc: 'Couch to 5K base', emoji: '🏃' },
  { slug: '10k_intermediate', label: '10K', weeks: '16 weeks', desc: 'Solid 10K framework', emoji: '🏃' },
  { slug: 'half_intermediate', label: 'Half Marathon', weeks: '20 weeks', desc: 'Half marathon structure', emoji: '🏅' },
  { slug: 'marathon_intermediate', label: 'Marathon', weeks: '24 weeks', desc: 'Full marathon build', emoji: '🏆' },
]

export default function ManualOnboardingClient() {
  const router = useRouter()
  const [step, setStep] = useState<'base' | 'details' | 'saving'>('base')
  const [baseSlug, setBaseSlug] = useState('')
  const [planName, setPlanName] = useState('')
  const [raceDate, setRaceDate] = useState('')
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const selected = DISTANCES.find(d => d.slug === baseSlug)

  async function save() {
    if (!planName.trim()) return
    setStep('saving')
    setError('')
    try {
      const res = await fetch('/api/plans/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: baseSlug,
          name: planName.trim(),
          race_date: raceDate || undefined,
          plan_type: 'manual',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      router.push('/today')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStep('details')
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col px-6 pt-16 pb-10">
      <button onClick={() => step === 'details' ? setStep('base') : router.push('/onboarding')}
        className="text-[#888] text-sm mb-8 self-start">
        ← Back
      </button>

      {step === 'base' && (
        <div>
          <div className="text-3xl mb-2">✏️</div>
          <h1 className="text-2xl font-bold text-white mb-1">Choose a base structure</h1>
          <p className="text-[#888] text-sm mb-8">We&apos;ll set up the weeks — you adjust sessions to match your own plan.</p>
          <div className="space-y-2.5">
            {DISTANCES.map(d => (
              <button key={d.slug} onClick={() => { setBaseSlug(d.slug); setStep('details') }}
                className="w-full bg-white/10 hover:bg-white/15 rounded-2xl p-4 text-left transition-colors flex items-center gap-4">
                <span className="text-2xl">{d.emoji}</span>
                <div>
                  <div className="text-sm font-semibold text-white">{d.label}</div>
                  <div className="text-xs text-[#888] mt-0.5">{d.weeks} · {d.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'details' && (
        <div>
          <div className="text-sm text-[#0D9488] font-semibold mb-6">{selected?.label} ✓</div>
          <h1 className="text-2xl font-bold text-white mb-1">Name your plan</h1>
          <p className="text-[#888] text-sm mb-6">And optionally set a race date.</p>
          <div className="space-y-4 mb-6">
            <input value={planName} onChange={e => setPlanName(e.target.value)}
              placeholder={`${selected?.label} ${new Date().getFullYear()}`}
              className="w-full bg-white/10 text-white border border-white/20 rounded-2xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488] placeholder:text-white/30" />
            <div>
              <p className="text-xs text-[#888] mb-2">Race date (optional)</p>
              <input type="date" value={raceDate} onChange={e => setRaceDate(e.target.value)} min={today}
                className="w-full bg-white/10 text-white border border-white/20 rounded-2xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
            </div>
          </div>
          {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
          <button onClick={save} disabled={!planName.trim()}
            className="w-full bg-[#0D9488] text-white py-4 rounded-2xl text-sm font-semibold disabled:opacity-40">
            Start tracking →
          </button>
        </div>
      )}

      {step === 'saving' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-5xl mb-6">⏳</div>
          <p className="text-white font-bold text-lg">Setting up your plan…</p>
        </div>
      )}
    </div>
  )
}
