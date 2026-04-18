'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const GOALS = [
  { id: '5k',      label: '5K',             emoji: '🏃', desc: 'Run your first or faster 5K' },
  { id: '10k',     label: '10K',            emoji: '🏃', desc: 'Build up to 10 kilometres' },
  { id: 'half',    label: 'Half Marathon',  emoji: '🏅', desc: '21.1km — a serious challenge' },
  { id: 'marathon',label: 'Marathon',       emoji: '🏆', desc: '42.2km — the classic distance' },
  { id: 'ultra',   label: 'Ultra',          emoji: '🌄', desc: '50K, 50 miles, or beyond' },
  { id: 'fitness', label: 'General Fitness',emoji: '💪', desc: 'Run consistently and feel great' },
]

const LEVELS = [
  { id: 'beginner',     label: 'Beginner',     desc: 'New to running or returning after a long break' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Running regularly, completed some races' },
  { id: 'advanced',     label: 'Advanced',     desc: 'Experienced racer chasing PBs' },
]

const SLUG_MAP: Record<string, string> = {
  '5k_beginner': '5k_couch_to_5k', '5k_intermediate': '5k_improve', '5k_advanced': '5k_performance',
  '10k_beginner': '10k_beginner', '10k_intermediate': '10k_intermediate', '10k_advanced': '10k_performance',
  'half_beginner': 'half_novice', 'half_intermediate': 'half_intermediate', 'half_advanced': 'half_performance',
  'marathon_beginner': 'marathon_novice', 'marathon_intermediate': 'marathon_intermediate', 'marathon_advanced': 'marathon_performance',
  'ultra_beginner': 'ultra_50mi', 'ultra_intermediate': 'ultra_50mi', 'ultra_advanced': 'ultra_100mi',
  'fitness_beginner': '5k_couch_to_5k', 'fitness_intermediate': '10k_beginner', 'fitness_advanced': '10k_intermediate',
}

const SLUG_LABELS: Record<string, string> = {
  '5k_couch_to_5k': 'Couch to 5K', '5k_improve': '5K Improver', '5k_performance': '5K Performance',
  '10k_beginner': '10K Beginner', '10k_intermediate': '10K Intermediate', '10k_performance': '10K Performance',
  'half_novice': 'Half Marathon Novice', 'half_intermediate': 'Half Marathon Intermediate', 'half_performance': 'Half Marathon Performance',
  'marathon_novice': 'Marathon Novice', 'marathon_intermediate': 'Marathon Intermediate', 'marathon_performance': 'Marathon Performance',
  'ultra_50mi': '50-Mile Ultra', 'ultra_100mi': '100-Mile Ultra',
}

type Step = 'goal' | 'level' | 'race_date' | 'name' | 'analysing' | 'recommendation' | 'activating'

export default function AIOnboardingClient() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('goal')
  const [goal, setGoal] = useState('')
  const [level, setLevel] = useState('')
  const [raceDate, setRaceDate] = useState('')
  const [planName, setPlanName] = useState('')
  const [recommendation, setRecommendation] = useState('')
  const [chosenSlug, setChosenSlug] = useState('')
  const [error, setError] = useState('')

  const selectedGoal = GOALS.find(g => g.id === goal)
  const selectedLevel = LEVELS.find(l => l.id === level)
  const today = new Date().toISOString().split('T')[0]

  async function analyse() {
    setStep('analysing')
    setError('')
    const slug = SLUG_MAP[`${goal}_${level}`] ?? 'marathon_novice'
    setChosenSlug(slug)

    try {
      const res = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, level, raceDate: raceDate || null, slug }),
      })
      const data = await res.json()
      if (!res.ok || !data.recommendation) throw new Error(data.error || 'Failed')
      setRecommendation(data.recommendation)
      if (!planName) setPlanName(data.suggestedName || `${selectedGoal?.label} ${new Date().getFullYear()}`)
      setStep('recommendation')
    } catch {
      // Fall back to recommendation step with generic message
      setRecommendation(`Based on your ${selectedLevel?.label.toLowerCase()} experience and ${selectedGoal?.label} goal, I've selected the **${SLUG_LABELS[slug]}** plan. This gives you the right structure and volume to hit your target.`)
      if (!planName) setPlanName(`${selectedGoal?.label} ${new Date().getFullYear()}`)
      setStep('recommendation')
    }
  }

  async function activate() {
    setStep('activating')
    setError('')
    try {
      const res = await fetch('/api/plans/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: chosenSlug,
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
      setStep('recommendation')
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col px-6 pt-16 pb-10">
      <button
        onClick={() => {
          if (step === 'level') setStep('goal')
          else if (step === 'race_date') setStep('level')
          else if (step === 'name') setStep('race_date')
          else if (step === 'recommendation') setStep('name')
          else router.push('/onboarding')
        }}
        className="text-[#888] text-sm mb-8 self-start"
      >
        ← Back
      </button>

      {/* Goal */}
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

      {/* Level */}
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

      {/* Race date */}
      {step === 'race_date' && (
        <div>
          <div className="text-sm text-[#0D9488] font-semibold mb-6">{selectedGoal?.label} · {selectedLevel?.label} ✓</div>
          <h1 className="text-2xl font-bold text-white mb-1">Race date?</h1>
          <p className="text-[#888] text-sm mb-8">Skip if you don&apos;t have one — you can add it later.</p>
          <input type="date" value={raceDate} onChange={e => setRaceDate(e.target.value)} min={today}
            className="w-full bg-white/10 text-white border border-white/20 rounded-2xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488] mb-4" />
          <button onClick={() => setStep('name')}
            className="w-full bg-[#0D9488] text-white py-4 rounded-2xl text-sm font-semibold">
            {raceDate ? 'Continue →' : 'Skip →'}
          </button>
        </div>
      )}

      {/* Name */}
      {step === 'name' && (
        <div>
          <div className="text-sm text-[#0D9488] font-semibold mb-6">
            {selectedGoal?.label} · {selectedLevel?.label}{raceDate ? ' · ' + new Date(raceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''} ✓
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Name your plan</h1>
          <p className="text-[#888] text-sm mb-8">Something to remember it by.</p>
          <input value={planName} onChange={e => setPlanName(e.target.value)}
            placeholder={`${selectedGoal?.label} ${new Date().getFullYear()}`}
            className="w-full bg-white/10 text-white border border-white/20 rounded-2xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488] mb-4 placeholder:text-white/30" />
          <button onClick={analyse}
            className="w-full bg-[#0D9488] text-white py-4 rounded-2xl text-sm font-semibold">
            Analyse my profile →
          </button>
        </div>
      )}

      {/* Analysing */}
      {step === 'analysing' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-5xl mb-6 animate-pulse">🤖</div>
          <p className="text-white font-bold text-lg mb-2">Analysing your profile…</p>
          <p className="text-[#888] text-sm">Finding the perfect plan structure for you.</p>
        </div>
      )}

      {/* Recommendation */}
      {step === 'recommendation' && (
        <div>
          <div className="text-sm text-[#0D9488] font-semibold mb-6">Your AI recommendation</div>
          <div className="text-2xl mb-1">🤖</div>
          <h1 className="text-xl font-bold text-white mb-1">{SLUG_LABELS[chosenSlug]}</h1>
          <p className="text-[#555] text-xs mb-4 font-medium uppercase tracking-wide">Recommended plan</p>

          {/* Coach message */}
          <div className="bg-white/8 rounded-2xl p-4 mb-6 border border-white/10">
            <p className="text-[#ccc] text-sm leading-relaxed">
              {recommendation.split('**').map((part, i) =>
                i % 2 === 1
                  ? <strong key={i} className="text-white">{part}</strong>
                  : part
              )}
            </p>
          </div>

          {/* Plan name edit */}
          <div className="mb-5">
            <label className="text-xs font-semibold text-[#888] block mb-1.5">Plan name</label>
            <input value={planName} onChange={e => setPlanName(e.target.value)}
              className="w-full bg-white/10 text-white border border-white/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
          </div>

          {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

          <div className="space-y-2.5">
            <button onClick={activate}
              className="w-full bg-[#0D9488] text-white py-4 rounded-2xl text-sm font-semibold">
              Start this plan →
            </button>
            <button onClick={() => setStep('goal')}
              className="w-full text-[#888] py-3 text-xs font-medium">
              Choose differently
            </button>
          </div>
        </div>
      )}

      {/* Activating */}
      {step === 'activating' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-5xl mb-6 animate-bounce">🏃</div>
          <p className="text-white font-bold text-lg">Setting up your plan…</p>
        </div>
      )}
    </div>
  )
}
