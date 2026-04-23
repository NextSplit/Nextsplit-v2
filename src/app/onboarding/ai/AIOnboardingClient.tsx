'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboarding } from '../context/OnboardingContext'

// ── Plan lookup ───────────────────────────────────────────────────────────────

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
  'plan_c25k': 'Couch to 5K',
}

const GOALS = [
  { id: '5k',       label: '5K',              emoji: '🏃', desc: 'Your first or a faster 5K' },
  { id: '10k',      label: '10K',             emoji: '🏃', desc: 'Build up to 10 kilometres' },
  { id: '10mi',     label: '10 Miles',        emoji: '🏅', desc: '16km — a solid stepping stone' },
  { id: 'half',     label: 'Half Marathon',   emoji: '🏅', desc: '21.1km — a serious challenge' },
  { id: 'marathon', label: 'Marathon',        emoji: '🏆', desc: '42.2km — the classic distance' },
  { id: 'ultra',    label: 'Ultra',           emoji: '🌄', desc: '50K, 50 miles, or beyond' },
  { id: 'fitness',  label: 'General Fitness', emoji: '💪', desc: 'Run consistently and feel great' },
]

const LEVELS = [
  { id: 'beginner',     label: 'Beginner',     desc: 'New to running or returning after a long break' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Running regularly, completed some races' },
  { id: 'advanced',     label: 'Advanced',     desc: 'Experienced racer chasing PBs' },
]

const ANALYSE_MESSAGES = [
  'Reading your profile…',
  'Matching to training plans…',
  'Checking plan structure…',
  'Calibrating volume…',
  'Personalising paces…',
  'Almost ready…',
]

// ── Sub-components ────────────────────────────────────────────────────────────

function OptionCard({ onClick, emoji, title, desc, selected = false }: {
  onClick: () => void; emoji?: string; title: string; desc: string; selected?: boolean
}) {
  return (
    <button onClick={onClick}
      className="w-full rounded-2xl p-4 text-left transition-all active:scale-[0.98] flex items-center gap-4"
      style={{
        background:  selected ? 'rgba(43,92,63,0.2)' : 'rgba(255,255,255,0.04)',
        border:      `1px solid ${selected ? 'rgba(43,92,63,0.6)' : 'rgba(255,255,255,0.08)'}`,
      }}>
      {emoji && <span className="text-2xl w-8 text-center flex-shrink-0">{emoji}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="text-xs text-zinc-400 mt-0.5 leading-snug">{desc}</p>
      </div>
      {selected && <span className="text-xs font-black" style={{ color: 'var(--ns-ember)' }}>✓</span>}
    </button>
  )
}

function Breadcrumb({ items }: { items: string[] }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap mb-6">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(43,92,63,0.2)', color: 'var(--ns-ember)' }}>
            {item}
          </span>
          {i < items.length - 1 && <span className="text-zinc-600 text-xs">›</span>}
        </span>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type Step = 'goal' | 'level' | 'race_date' | 'gym' | 'analysing' | 'recommendation' | 'activating'

export default function AIOnboardingClient() {
  const router = useRouter()
  const { data: onboardingData } = useOnboarding()
  const cfg = onboardingData.characterConfig

  const [step, setStep]                   = useState<Step>('goal')
  const [goal, setGoal]                   = useState('')
  const [level, setLevel]                 = useState('')
  const [raceDate, setRaceDate]           = useState('')
  const [gymPref, setGymPref]             = useState<'yes'|'no'>('yes')
  const [planName, setPlanName]           = useState('')
  const [chosenSlug, setChosenSlug]       = useState('')
  const [reason, setReason]               = useState('')
  const [error, setError]                 = useState('')
  const [msgIdx, setMsgIdx]               = useState(0)

  const selectedGoal  = GOALS.find(g => g.id === goal)
  const selectedLevel = LEVELS.find(l => l.id === level)
  const today         = new Date().toISOString().split('T')[0]

  // Cycle analysis messages
  useEffect(() => {
    if (step !== 'analysing') return
    const t = setInterval(() => setMsgIdx(i => (i + 1) % ANALYSE_MESSAGES.length), 1100)
    return () => clearInterval(t)
  }, [step])

  // Character colours from onboarding context
  const skin = { 'tone-1':'#FDDBB4','tone-2':'#F1C27D','tone-3':'#E0AC69','tone-4':'#C68642','tone-5':'#8D5524','tone-6':'#4A2912' }[cfg.skinTone] ?? '#E0AC69'
  const kit  = cfg.kitColour ?? '#2b5c3f'
  const hair = cfg.hairColour ?? '#3b2314'
  const shoe = cfg.shoeColour ?? '#1e293b'

  async function analyse() {
    setStep('analysing')
    setError('')
    // Fallback slug based on goal+level
    const fallbackSlug = SLUG_MAP[`${goal}_${level}`] ?? '10k_beginner'
    setChosenSlug(fallbackSlug)

    // Calculate weeks available from race date
    const weeksAvailable = raceDate
      ? Math.max(4, Math.min(52, Math.round((new Date(raceDate).getTime() - Date.now()) / (7 * 24 * 3600 * 1000))))
      : 12

    try {
      const res = await fetch('/api/ai/recommend', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        // Match the AiRecommendSchema fields exactly
        body: JSON.stringify({
          goal:           `${selectedGoal?.label ?? goal} — ${selectedLevel?.label ?? level} level`,
          experience:     level,       // 'beginner' | 'intermediate' | 'advanced'
          weeksAvailable,
          daysPerWeek:    onboardingData.trainingDays || 4,
          weekly_km:      onboardingData.weeklyKmCurrent || 0,
          distance:       selectedGoal?.label ?? goal,
        }),
      })
      const data = await res.json()
      if (res.ok && data.slug && (SLUG_LABELS[data.slug] || SLUG_MAP[data.slug])) {
        setChosenSlug(data.slug)
      }
      setReason(data.reason ?? '')
    } catch {
      // Silently use fallback — user still gets a plan
    }

    // Set default plan name
    const slug = chosenSlug || fallbackSlug
    setPlanName(`${selectedGoal?.label ?? 'My'} ${new Date().getFullYear()}`)
    // Small delay so the animation feels intentional
    await new Promise(r => setTimeout(r, 2500))
    setStep('recommendation')
  }

  async function activate() {
    setStep('activating')
    setError('')
    try {
      const res = await fetch('/api/plans/activate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug:        chosenSlug,
          name:        planName.trim() || `${selectedGoal?.label ?? 'My'} Plan`,
          race_date:   raceDate || undefined,
          plan_type:   'ai_bespoke',
          include_gym: gymPref === 'yes',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to activate plan')
      router.push(data.raceTooSoon ? '/today?notice=race_soon' : '/today')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStep('recommendation')
    }
  }

  // ── Background style ──────────────────────────────────────────────────────
  const bg = { background: 'var(--color-bg)' }

  return (
    <div className="min-h-screen flex flex-col px-5 pt-14 pb-10" style={bg}>

      {/* ── GOAL ── */}
      {step === 'goal' && (
        <div className="animate-slide-up">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--ns-ember)' }}>
            AI Bespoke
          </p>
          <h1 className="font-display text-3xl italic text-white mb-1">What's your goal?</h1>
          <p className="text-sm mb-7" style={{ color: 'var(--color-text-tertiary)' }}>
            We'll match you to the best plan structure.
          </p>
          <div className="space-y-2.5">
            {GOALS.map(g => (
              <OptionCard key={g.id} emoji={g.emoji} title={g.label} desc={g.desc}
                onClick={() => { setGoal(g.id); setStep('level') }} />
            ))}
          </div>
        </div>
      )}

      {/* ── LEVEL ── */}
      {step === 'level' && (
        <div className="animate-slide-up">
          <Breadcrumb items={[selectedGoal?.label ?? '']} />
          <h1 className="font-display text-3xl italic text-white mb-1">Your experience?</h1>
          <p className="text-sm mb-7" style={{ color: 'var(--color-text-tertiary)' }}>
            Calibrates your starting volume and intensity.
          </p>
          <div className="space-y-2.5">
            {LEVELS.map(l => (
              <OptionCard key={l.id} title={l.label} desc={l.desc}
                onClick={() => { setLevel(l.id); setStep('race_date') }} />
            ))}
          </div>
          <button onClick={() => setStep('goal')} className="w-full mt-4 text-xs py-2" style={{ color: 'var(--color-text-tertiary)' }}>
            ← Back
          </button>
        </div>
      )}

      {/* ── RACE DATE ── */}
      {step === 'race_date' && (
        <div className="animate-slide-up">
          <Breadcrumb items={[selectedGoal?.label ?? '', selectedLevel?.label ?? '']} />
          <h1 className="font-display text-3xl italic text-white mb-1">Race date?</h1>
          <p className="text-sm mb-7" style={{ color: 'var(--color-text-tertiary)' }}>
            Skip if you don't have one — you can add it later.
          </p>
          <input type="date" value={raceDate} onChange={e => setRaceDate(e.target.value)} min={today}
            className="w-full rounded-2xl px-4 py-4 text-sm text-white outline-none mb-4"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }} />
          <button onClick={() => setStep('gym')}
            className="w-full py-4 rounded-2xl text-sm font-black text-white active:scale-[0.98] transition-transform"
            style={{ background: 'var(--ns-ember)' }}>
            {raceDate ? 'Continue →' : 'Skip for now →'}
          </button>
          <button onClick={() => setStep('level')} className="w-full mt-3 text-xs py-2" style={{ color: 'var(--color-text-tertiary)' }}>
            ← Back
          </button>
        </div>
      )}

      {/* ── GYM ── */}
      {step === 'gym' && (
        <div className="animate-slide-up">
          <Breadcrumb items={[selectedGoal?.label ?? '', selectedLevel?.label ?? '', raceDate ? new Date(raceDate).toLocaleDateString('en-GB', { day:'numeric', month:'short' }) : 'No race date']} />
          <h1 className="font-display text-3xl italic text-white mb-1">Include strength work?</h1>
          <p className="text-sm mb-7" style={{ color: 'var(--color-text-tertiary)' }}>
            Gym sessions on rest days build injury resilience and running economy.
          </p>
          <div className="space-y-2.5 mb-6">
            <OptionCard emoji="🏋️" title="Yes — include strength sessions" selected={gymPref === 'yes'}
              desc="2 gym sessions per week woven into your plan"
              onClick={() => setGymPref('yes')} />
            <OptionCard emoji="🏃" title="Running only" selected={gymPref === 'no'}
              desc="Pure running plan — I'll manage my own strength work"
              onClick={() => setGymPref('no')} />
          </div>
          <button onClick={analyse}
            className="w-full py-4 rounded-2xl text-sm font-black text-white active:scale-[0.98] transition-transform"
            style={{ background: 'var(--ns-ember)' }}>
            Build my plan →
          </button>
          <button onClick={() => setStep('race_date')} className="w-full mt-3 text-xs py-2" style={{ color: 'var(--color-text-tertiary)' }}>
            ← Back
          </button>
        </div>
      )}

      {/* ── ANALYSING ── */}
      {step === 'analysing' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          {/* Character running animation */}
          <div className="relative mb-8 w-full max-w-xs" style={{ height: 72 }}>
            <div className="absolute bottom-4 left-0 right-0 h-2 rounded-full" style={{ background: 'var(--color-surface)' }} />
            <style>{`
              @keyframes ai-run { 0% { left: 5% } 100% { left: 80% } }
              @keyframes ai-arm { 0%,100% { transform: rotate(30deg) } 50% { transform: rotate(-30deg) } }
              @keyframes ai-leg-l { 0%,100% { transform: rotate(-20deg) } 50% { transform: rotate(20deg) } }
              @keyframes ai-leg-r { 0%,100% { transform: rotate(20deg) } 50% { transform: rotate(-20deg) } }
              .ai-runner { position: absolute; bottom: 8px; animation: ai-run 1.2s linear infinite alternate; }
            `}</style>
            <div className="ai-runner">
              <svg width="36" height="48" viewBox="0 0 36 48" fill="none">
                {cfg.hairStyle !== 'none' && <ellipse cx="18" cy="5" rx="6" ry="3.5" fill={hair} />}
                <ellipse cx="18" cy="8" rx="5.5" ry="6" fill={skin} />
                <circle cx="16" cy="7" r="0.8" fill="#1e293b" /><circle cx="20" cy="7" r="0.8" fill="#1e293b" />
                <path d="M12 14 Q13 12 18 12 Q23 12 24 14 L25 26 Q23 27 18 27 Q13 27 11 26 Z" fill={kit} />
                <rect y="13" width="4" height="2.5" rx="0.5" fill={skin} />
                <g style={{ transformOrigin:'12px 15px', animation:'ai-arm 0.4s ease-in-out infinite' }}>
                  <line x1="12" y1="15" y2="22" stroke={skin} strokeWidth="2.5" strokeLinecap="round"/>
                </g>
                <g style={{ transformOrigin:'24px 15px', animation:'ai-arm 0.4s ease-in-out infinite reverse' }}>
                  <line x1="24" y1="15" y2="20" stroke={skin} strokeWidth="2.5" strokeLinecap="round"/>
                </g>
                <path d="M13 25 Q15 30 16 33 L20 33 Q21 30 23 25 Z" fill={kit} opacity="0.9"/>
                <g style={{ transformOrigin:'16px 33px', animation:'ai-leg-l 0.4s ease-in-out infinite' }}>
                  <line x1="16" y1="33" y2="43" stroke={skin} strokeWidth="3" strokeLinecap="round"/>
                  <path d="M8 42 Q6 44 5 45 Q8 46 11 45 Q11 43 10 43 Z" fill={shoe}/>
                </g>
                <g style={{ transformOrigin:'20px 33px', animation:'ai-leg-r 0.4s ease-in-out infinite' }}>
                  <line x1="20" y1="33" y2="42" stroke={skin} strokeWidth="3" strokeLinecap="round"/>
                  <path d="M26 42 Q29 41 31 42 Q29 45 26 45 Q24 44 26 42 Z" fill={shoe}/>
                </g>
              </svg>
            </div>
          </div>
          <h2 className="font-display text-2xl italic text-white mb-2">Building your plan</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-tertiary)' }}>
            {ANALYSE_MESSAGES[msgIdx]}
          </p>
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ background: 'var(--ns-ember)', animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}

      {/* ── RECOMMENDATION ── */}
      {step === 'recommendation' && (
        <div className="animate-slide-up">
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--ns-track)' }}>
            ✓ Your plan is ready
          </p>

          {/* Plan card */}
          <div className="rounded-2xl p-5 mb-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
              AI recommended
            </p>
            <h2 className="font-display text-2xl italic text-white mb-1">
              {SLUG_LABELS[chosenSlug] ?? chosenSlug}
            </h2>
            <div className="flex gap-3 mb-3 flex-wrap">
              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                {selectedGoal?.label}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>·</span>
              <span className="text-xs capitalize" style={{ color: 'var(--color-text-tertiary)' }}>
                {selectedLevel?.label}
              </span>
              {gymPref === 'yes' && (
                <>
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>·</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Gym included</span>
                </>
              )}
            </div>
            {reason && (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {reason}
              </p>
            )}
          </div>

          {/* Plan name */}
          <div className="mb-5">
            <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
              Plan name
            </label>
            <input value={planName} onChange={e => setPlanName(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }} />
          </div>

          {error && (
            <p className="text-xs mb-3 font-bold" style={{ color: 'var(--ns-ember)' }}>{error}</p>
          )}

          <button onClick={activate}
            className="w-full py-4 rounded-2xl text-sm font-black text-white active:scale-[0.98] transition-transform mb-2"
            style={{ background: 'linear-gradient(135deg, var(--ns-ember) 0%, #d44a12 100%)', boxShadow: '0 4px 20px rgba(232,93,38,0.3)' }}>
            Start {SLUG_LABELS[chosenSlug] ?? 'my plan'} →
          </button>
          <button onClick={() => setStep('goal')} className="w-full py-2 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            Choose differently
          </button>
        </div>
      )}

      {/* ── ACTIVATING ── */}
      {step === 'activating' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-5xl mb-4 animate-bounce">🏁</div>
          <h2 className="font-display text-2xl italic text-white mb-2">Setting up your plan…</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Almost there!</p>
        </div>
      )}
    </div>
  )
}
