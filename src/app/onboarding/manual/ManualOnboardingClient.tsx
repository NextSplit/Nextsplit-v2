'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import OnboardingProgress from '@/components/OnboardingProgress'

const DISTANCES = [
  { slug: '5k_couch_to_5k',    label: 'C25K / 5K',     weeks: '9 weeks',  desc: 'Couch to 5K base structure', emoji: '🏃' },
  { slug: '10k_intermediate',   label: '10K',            weeks: '16 weeks', desc: 'Solid 10K framework', emoji: '🏃' },
  { slug: 'half_intermediate',  label: 'Half Marathon',  weeks: '20 weeks', desc: 'Half marathon structure', emoji: '🏅' },
  { slug: 'marathon_intermediate', label: 'Marathon',    weeks: '24 weeks', desc: 'Full marathon build', emoji: '🏆' },
]

type Step = 'base' | 'details' | 'saving'

export default function ManualOnboardingClient() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('base')
  const [baseSlug, setBaseSlug] = useState('')
  const [planName, setPlanName] = useState('')
  const [raceDate, setRaceDate] = useState('')
  const [includeGym, setIncludeGym] = useState(true)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const selected = DISTANCES.find(d => d.slug === baseSlug)

  function handleBack() {
    if (step === 'details') setStep('base')
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
        body: JSON.stringify({ slug: baseSlug, name: planName.trim(), race_date: raceDate || undefined, plan_type: 'manual', include_gym: includeGym }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      router.push(data.raceTooSoon ? '/home?notice=race_soon' : '/home')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStep('details')
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-5 pt-14 pb-10"
      style={{ background: 'linear-gradient(160deg, #0f172a 0%, #18181b 60%, #0f172a 100%)' }}>

      {step !== 'saving' && (
        <OnboardingProgress current={step === 'base' ? 1 : 2} total={2} onBack={handleBack} />
      )}

      {step === 'base' && (
        <div>
          <div className="text-3xl mb-3">✏️</div>
          <h1 className="text-2xl font-black text-white mb-1">Choose a base structure</h1>
          <p className="text-zinc-400 text-sm mb-7">We set up the weeks — you adjust sessions to match your plan.</p>
          <div className="space-y-2.5">
            {DISTANCES.map(d => (
              <button key={d.slug} onClick={() => { setBaseSlug(d.slug); setStep('details') }}
                className="w-full rounded-2xl border border-white/10 hover:border-white/25 p-4 text-left transition-all active:scale-[0.98] flex items-center gap-4"
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                <span className="text-2xl w-8 text-center flex-shrink-0">{d.emoji}</span>
                <div>
                  <div className="text-sm font-bold text-white">{d.label}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">{d.weeks} · {d.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'details' && (
        <div>
          <div className="inline-flex items-center gap-1.5 bg-[var(--ns-ember)]/15 border border-[var(--ns-ember)]/30 rounded-full px-3 py-1 mb-6">
            <span className="text-xs font-bold text-[var(--ns-ember)]">{selected?.label} · {selected?.weeks} ✓</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Set up your plan</h1>
          <p className="text-zinc-400 text-sm mb-6">Name it, set a race date, and choose whether to include strength sessions.</p>
          <div className="space-y-3 mb-6">
            <input value={planName} onChange={e => setPlanName(e.target.value)}
              placeholder={`${selected?.label} ${new Date().getFullYear()}`}
              className="w-full rounded-2xl border border-white/20 px-4 py-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[var(--ns-ember)]"
              style={{ background: 'rgba(255,255,255,0.07)' }} />
            <div>
              <p className="text-xs text-zinc-500 mb-2 font-medium">Race date (optional)</p>
              <input type="date" value={raceDate} onChange={e => setRaceDate(e.target.value)} min={today}
                className="w-full rounded-2xl border border-white/20 px-4 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--ns-ember)]"
                style={{ background: 'rgba(255,255,255,0.07)' }} />
            </div>

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
            className="w-full bg-[var(--ns-ember)] text-white py-4 rounded-2xl text-sm font-bold disabled:opacity-40 active:scale-[0.98] transition-transform">
            Start tracking →
          </button>
        </div>
      )}

      {step === 'saving' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
          <div className="text-6xl mb-6">⏳</div>
          <p className="text-white font-bold text-lg">Setting up your plan…</p>
          <p className="text-zinc-400 text-sm mt-1">Almost there!</p>
        </div>
      )}
    </div>
  )
}
