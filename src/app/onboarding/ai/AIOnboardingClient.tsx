'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import OnboardingProgress from '@/components/OnboardingProgress'

const GOALS = [
  { id: '5k',      label: '5K',             emoji: '🏃', desc: 'Run your first or faster 5K' },
  { id: '10k',     label: '10K',            emoji: '🏃', desc: 'Build up to 10 kilometres' },
  { id: '10mi',    label: '10 Miles',       emoji: '🏃', desc: '16km — a great stepping stone' },
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
  '10mi_beginner': '10mi_beginner', '10mi_intermediate': '10mi_intermediate', '10mi_advanced': '10mi_performance',
  'half_beginner': 'half_novice', 'half_intermediate': 'half_intermediate', 'half_advanced': 'half_performance',
  'marathon_beginner': 'marathon_novice', 'marathon_intermediate': 'marathon_intermediate', 'marathon_advanced': 'marathon_performance',
  'ultra_beginner': 'ultra_50mi', 'ultra_intermediate': 'ultra_50mi', 'ultra_advanced': 'ultra_100mi',
  'fitness_beginner': '5k_couch_to_5k', 'fitness_intermediate': '10k_beginner', 'fitness_advanced': '10k_intermediate',
}

const SLUG_LABELS: Record<string, string> = {
  '5k_couch_to_5k': 'Couch to 5K', '5k_improve': '5K Improver', '5k_performance': '5K Performance',
  '10k_beginner': '10K Beginner', '10k_intermediate': '10K Intermediate', '10k_performance': '10K Performance',
  '10mi_beginner': '10 Mile Beginner', '10mi_intermediate': '10 Mile Intermediate', '10mi_performance': '10 Mile Performance',
  'half_novice': 'Half Marathon Novice', 'half_intermediate': 'Half Marathon Intermediate', 'half_performance': 'Half Marathon Performance',
  'marathon_novice': 'Marathon Novice', 'marathon_intermediate': 'Marathon Intermediate', 'marathon_performance': 'Marathon Performance',
  'ultra_50mi': '50-Mile Ultra', 'ultra_100mi': '100-Mile Ultra',
}

type Step = 'goal' | 'level' | 'race_date' | 'name' | 'analysing' | 'recommendation' | 'activating'

const STEP_INDEX: Record<Step, number> = {
  goal: 1, level: 2, race_date: 3, name: 4, analysing: 4, recommendation: 4, activating: 4
}

function OptionButton({ onClick, emoji, title, desc }: { onClick: () => void; emoji?: string; title: string; desc: string }) {
  return (
    <button onClick={onClick}
      className="w-full rounded-2xl border border-white/10 hover:border-white/25 p-4 text-left transition-all active:scale-[0.98] flex items-center gap-4"
      style={{ background: 'rgba(255,255,255,0.04)' }}>
      {emoji && <span className="text-2xl w-8 text-center flex-shrink-0">{emoji}</span>}
      <div>
        <div className="text-sm font-bold text-white">{title}</div>
        <div className="text-xs text-zinc-400 mt-0.5 leading-snug">{desc}</div>
      </div>
    </button>
  )
}

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

  function handleBack() {
    if (step === 'level') setStep('goal')
    else if (step === 'race_date') setStep('level')
    else if (step === 'name') setStep('race_date')
    else if (step === 'recommendation') setStep('name')
    else router.push('/onboarding')
  }

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
    } catch {
      setRecommendation(`Based on your ${selectedLevel?.label.toLowerCase()} experience and ${selectedGoal?.label} goal, I've selected the **${SLUG_LABELS[slug]}** plan. This gives you the right structure and volume to hit your target.`)
      if (!planName) setPlanName(`${selectedGoal?.label} ${new Date().getFullYear()}`)
    }
    setStep('recommendation')
  }

  async function activate() {
    setStep('activating')
    setError('')
    try {
      const res = await fetch('/api/plans/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: chosenSlug, name: planName.trim() || `${selectedGoal?.label} Plan`, race_date: raceDate || undefined, plan_type: 'ai_bespoke' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create plan')
      router.push('/today')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStep('recommendation')
    }
  }

  const showProgress = !['analysing', 'activating'].includes(step)

  return (
    <div className="min-h-screen flex flex-col px-5 pt-14 pb-10"
      style={{ background: 'linear-gradient(160deg, #0f172a 0%, #18181b 60%, #0f172a 100%)' }}>

      {showProgress && (
        <OnboardingProgress current={STEP_INDEX[step]} total={4} onBack={handleBack} />
      )}

      {step === 'goal' && (
        <div>
          <div className="text-3xl mb-3">🤖</div>
          <h1 className="text-2xl font-black text-white mb-1">What&apos;s your goal?</h1>
          <p className="text-zinc-400 text-sm mb-7">We&apos;ll build the right plan around it.</p>
          <div className="space-y-2.5">
            {GOALS.map(g => (
              <OptionButton key={g.id} emoji={g.emoji} title={g.label} desc={g.desc}
                onClick={() => { setGoal(g.id); setStep('level') }} />
            ))}
          </div>
        </div>
      )}

      {step === 'level' && (
        <div>
          <div className="inline-flex items-center gap-1.5 bg-teal-500/15 border border-teal-500/30 rounded-full px-3 py-1 mb-6">
            <span className="text-xs font-bold text-teal-400">{selectedGoal?.label} ✓</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Your experience level?</h1>
          <p className="text-zinc-400 text-sm mb-7">We&apos;ll calibrate volume and intensity.</p>
          <div className="space-y-2.5">
            {LEVELS.map(l => (
              <OptionButton key={l.id} title={l.label} desc={l.desc}
                onClick={() => { setLevel(l.id); setStep('race_date') }} />
            ))}
          </div>
        </div>
      )}

      {step === 'race_date' && (
        <div>
          <div className="inline-flex items-center gap-1.5 bg-teal-500/15 border border-teal-500/30 rounded-full px-3 py-1 mb-6">
            <span className="text-xs font-bold text-teal-400">{selectedGoal?.label} · {selectedLevel?.label} ✓</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Race date?</h1>
          <p className="text-zinc-400 text-sm mb-7">Skip if you don&apos;t have one — add it later.</p>
          <input type="date" value={raceDate} onChange={e => setRaceDate(e.target.value)} min={today}
            className="w-full rounded-2xl border border-white/20 px-4 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500 mb-4"
            style={{ background: 'rgba(255,255,255,0.07)' }} />
          <button onClick={() => setStep('name')}
            className="w-full bg-[#0D9488] text-white py-4 rounded-2xl text-sm font-bold active:scale-[0.98] transition-transform">
            {raceDate ? 'Continue →' : 'Skip →'}
          </button>
        </div>
      )}

      {step === 'name' && (
        <div>
          <div className="inline-flex items-center gap-1.5 bg-teal-500/15 border border-teal-500/30 rounded-full px-3 py-1 mb-6">
            <span className="text-xs font-bold text-teal-400">
              {selectedGoal?.label} · {selectedLevel?.label}{raceDate ? ' · ' + new Date(raceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''} ✓
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Name your plan</h1>
          <p className="text-zinc-400 text-sm mb-7">Something to remember it by.</p>
          <input value={planName} onChange={e => setPlanName(e.target.value)}
            placeholder={`${selectedGoal?.label} ${new Date().getFullYear()}`}
            className="w-full rounded-2xl border border-white/20 px-4 py-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-teal-500 mb-4"
            style={{ background: 'rgba(255,255,255,0.07)' }} />
          <button onClick={analyse}
            className="w-full bg-[#0D9488] text-white py-4 rounded-2xl text-sm font-bold active:scale-[0.98] transition-transform">
            Analyse my profile →
          </button>
        </div>
      )}

      {step === 'analysing' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
          <div className="text-6xl mb-6 animate-pulse">🤖</div>
          <p className="text-white font-bold text-lg mb-2">Analysing your profile…</p>
          <p className="text-zinc-400 text-sm">Finding the perfect plan structure for you.</p>
          <div className="flex gap-1.5 mt-8">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-teal-500 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}

      {step === 'recommendation' && (
        <div>
          <div className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-5">Your AI recommendation</div>
          <div className="rounded-2xl border border-white/10 p-5 mb-5"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="text-2xl mb-2">🤖</div>
            <h2 className="text-xl font-black text-white mb-0.5">{SLUG_LABELS[chosenSlug]}</h2>
            <p className="text-zinc-500 text-xs uppercase tracking-wide font-semibold mb-4">Recommended plan</p>
            <p className="text-zinc-300 text-sm leading-relaxed">
              {recommendation.split('**').map((part, i) =>
                i % 2 === 1 ? <strong key={i} className="text-white">{part}</strong> : part
              )}
            </p>
          </div>
          <div className="mb-5">
            <label className="text-xs font-bold text-zinc-400 block mb-2">Plan name</label>
            <input value={planName} onChange={e => setPlanName(e.target.value)}
              className="w-full rounded-xl border border-white/20 px-3 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              style={{ background: 'rgba(255,255,255,0.07)' }} />
          </div>
          {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
          <div className="space-y-2.5">
            <button onClick={activate}
              className="w-full bg-[#0D9488] text-white py-4 rounded-2xl text-sm font-bold active:scale-[0.98] transition-transform">
              Start this plan →
            </button>
            <button onClick={() => setStep('goal')}
              className="w-full text-zinc-500 py-3 text-xs font-medium">
              Choose differently
            </button>
          </div>
        </div>
      )}

      {step === 'activating' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
          <div className="text-6xl mb-6 animate-bounce">🏃</div>
          <p className="text-white font-bold text-lg">Setting up your plan…</p>
          <p className="text-zinc-400 text-sm mt-1">Almost there!</p>
        </div>
      )}
    </div>
  )
}
