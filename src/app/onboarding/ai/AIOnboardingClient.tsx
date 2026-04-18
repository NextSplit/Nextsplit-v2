'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const GOALS = [
  { id: '5k', label: '5K', emoji: '🏃', desc: 'Run your first or faster 5K' },
  { id: '10k', label: '10K', emoji: '🏃', desc: 'Build up to 10 kilometres' },
  { id: 'half', label: 'Half Marathon', emoji: '🏅', desc: '21.1km — a serious challenge' },
  { id: 'marathon', label: 'Marathon', emoji: '🏆', desc: '42.2km — the classic distance' },
  { id: 'ultra', label: 'Ultra', emoji: '🌄', desc: '50K, 50 miles, or beyond' },
  { id: 'fitness', label: 'General Fitness', emoji: '💪', desc: 'Run consistently and feel great' },
]

const LEVELS = [
  { id: 'beginner', label: 'Beginner', desc: 'New to running or returning after a long break' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Running regularly, completed some races' },
  { id: 'advanced', label: 'Advanced', desc: 'Experienced racer chasing PBs' },
]

// Map goal+level → closest plan template slug
const SLUG_MAP: Record<string, string> = {
  '5k_beginner': 'plan_c25k',
  '5k_intermediate': '5k_improve',
  '5k_advanced': '5k_performance',
  '10k_beginner': '10k_beginner',
  '10k_intermediate': '10k_intermediate',
  '10k_advanced': '10k_performance',
  'half_beginner': 'half_novice',
  'half_intermediate': 'half_intermediate',
  'half_advanced': 'half_performance',
  'marathon_beginner': 'marathon_novice',
  'marathon_intermediate': 'marathon_intermediate',
  'marathon_advanced': 'marathon_performance',
  'ultra_beginner': 'ultra_50mi',
  'ultra_intermediate': 'ultra_50mi',
  'ultra_advanced': 'ultra_100mi',
  'fitness_beginner': 'plan_c25k',
  'fitness_intermediate': '10k_beginner',
  'fitness_advanced': '10k_intermediate',
}

type Step = 'goal' | 'level' | 'race_date' | 'name' | 'generating'

export default function AIOnboardingClient() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('goal')
  const [goal, setGoal] = useState('')
  const [level, setLevel] = useState('')
  const [raceDate, setRaceDate] = useState('')
  const [planName, setPlanName] = useState('')
  const [error, setError] = useState('')

  const selectedGoal = GOALS.find(g => g.id === goal)
  const selectedLevel = LEVELS.find(l => l.id === level)

  async function generate() {
    setStep('generating')
    setError('')
    try {
      const key = `${goal}_${level}`
      const slug = SLUG_MAP[key] ?? 'marathon_novice'

      // Fetch matching template
      const res = await fetch(`/api/plans/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name: planName.trim() || `${selectedGoal?.label} Plan`,
          race_date: raceDate || undefined,
          plan_type: 'ai_bespoke',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create plan')
      router.push('/today')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStep('name')
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col px-6 pt-16 pb-10">
      <button onClick={() => router.push('/onboarding')} className="text-[#888] text-sm mb-8 self-start">
        ← Back
      </button>

      {/* Step: Goal */}
      {step === 'goal' && (
        <div>
          <div className="text-3xl mb-2">🤖</div>
          <h1 className="text-2xl font-bold text-white mb-1">What&apos;s your goal?</h1>
          <p className="text-[#888] text-sm mb-8">We&apos;ll build the right plan around it.</p>
          <div className="space-y-2.5">
            {GOALS.map(g => (
              <button key={g.id} onClick={() => { setGoal(g.id); setStep('level') }}
                className="w-full bg-white/10 hover:bg-white/15 rounded-2xl p-4 text-left transition-colors flex items-center gap-4">
                <span className="text-2xl">{g.emoji}</span>
                <div>
                  <div className="text-sm font-semibold text-white">{g.label}</div>
                  <div className="text-xs text-[#888] mt-0.5">{g.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Level */}
      {step === 'level' && (
        <div>
          <div className="text-sm text-[#0D9488] font-semibold mb-6">{selectedGoal?.label} ✓</div>
          <h1 className="text-2xl font-bold text-white mb-1">Your experience level?</h1>
          <p className="text-[#888] text-sm mb-8">We&apos;ll calibrate volume and intensity.</p>
          <div className="space-y-2.5">
            {LEVELS.map(l => (
              <button key={l.id} onClick={() => { setLevel(l.id); setStep('race_date') }}
                className="w-full bg-white/10 hover:bg-white/15 rounded-2xl p-4 text-left transition-colors">
                <div className="text-sm font-semibold text-white">{l.label}</div>
                <div className="text-xs text-[#888] mt-0.5">{l.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Race date */}
      {step === 'race_date' && (
        <div>
          <div className="text-sm text-[#0D9488] font-semibold mb-6">{selectedGoal?.label} · {selectedLevel?.label} ✓</div>
          <h1 className="text-2xl font-bold text-white mb-1">Race date?</h1>
          <p className="text-[#888] text-sm mb-8">Skip if you don&apos;t have one yet — you can add it later.</p>
          <input type="date" value={raceDate} onChange={e => setRaceDate(e.target.value)} min={today}
            className="w-full bg-white/10 text-white border border-white/20 rounded-2xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488] mb-4" />
          <button onClick={() => setStep('name')}
            className="w-full bg-[#0D9488] text-white py-4 rounded-2xl text-sm font-semibold mb-3">
            {raceDate ? 'Continue →' : 'Skip →'}
          </button>
        </div>
      )}

      {/* Step: Name */}
      {step === 'name' && (
        <div>
          <div className="text-sm text-[#0D9488] font-semibold mb-6">{selectedGoal?.label} · {selectedLevel?.label}{raceDate ? ' · ' + new Date(raceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''} ✓</div>
          <h1 className="text-2xl font-bold text-white mb-1">Name your plan</h1>
          <p className="text-[#888] text-sm mb-8">Something to remember it by.</p>
          <input value={planName} onChange={e => setPlanName(e.target.value)}
            placeholder={`${selectedGoal?.label} ${new Date().getFullYear()}`}
            className="w-full bg-white/10 text-white border border-white/20 rounded-2xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488] mb-4 placeholder:text-white/30" />
          {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
          <button onClick={generate}
            className="w-full bg-[#0D9488] text-white py-4 rounded-2xl text-sm font-semibold">
            Generate my plan →
          </button>
        </div>
      )}

      {/* Generating */}
      {step === 'generating' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-5xl mb-6 animate-bounce">🤖</div>
          <p className="text-white font-bold text-lg mb-2">Building your plan…</p>
          <p className="text-[#888] text-sm">Matching your goal to the perfect structure.</p>
        </div>
      )}
    </div>
  )
}
