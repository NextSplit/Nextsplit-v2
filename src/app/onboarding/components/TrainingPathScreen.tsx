'use client'

import { useState } from 'react'
import { useOnboarding } from '../context/OnboardingContext'
import { OnboardingProgressBar } from './OnboardingProgressBar'
import { Analytics } from '@/lib/analytics'
import type { TrainingPath } from '../context/OnboardingContext'

interface PathOption {
  id:          TrainingPath
  emoji:       string
  label:       string
  desc:        string
  detail:      string
  tag?:        string
  tagColour?:  string
  proOnly?:    boolean
  methodology?: string  // credibility layer — shown below description
}

const PATHS: PathOption[] = [
  {
    id:        'predetermined',
    emoji:     '📋',
    label:     'Follow a structured plan',
    desc:      'Evidence-based methodology, tailored to you',
    detail:    'Our plans are built on established training principles — progressive overload, polarised intensity, periodisation. We match you to the right plan based on your goal, current fitness, and time available, then personalise the paces and dates around you.',
    tag:       'Most popular',
    tagColour: 'bg-[var(--ns-ember)]',
    methodology: 'Based on Daniels\' Running Formula and polarised training principles used by club runners at every level.',
  },
  {
    id:        'ai_bespoke',
    emoji:     '🧠',
    label:     'AI bespoke plan',
    desc:      'Built from scratch, just for you',
    detail:    'Our AI coach analyses your training history, goal, weekly availability, and running profile to generate a completely custom plan. The questions are more detailed — because a better plan comes from better information.',
    tag:       'Recommended for experienced runners',
    tagColour: 'bg-[var(--ns-ember)]',
    methodology: 'Adapts week-by-week based on how your training is going. The plan responds to you, not the other way around.',
  },
  {
    id:        'manual',
    emoji:     '✏️',
    label:     'Build your own',
    desc:      'Your sessions, your structure',
    detail:    'Design every session yourself. A silent AI suggestion panel sits next to each week — tap to populate, or ignore it. AI rationale generation on manual sessions is a Pro feature.',
  },
  {
    id:        'lifestyle',
    emoji:     '🌿',
    label:     'Lifestyle training',
    desc:      'Run for enjoyment, not a finish line',
    detail:    'No race target, no end date — just consistent movement that fits your life. We ask about your availability and what you enjoy, not what pace you run.',
    methodology: 'Ideal for runners returning after a break, or those who train for health and enjoyment rather than race performance.',
  },
  {
    id:        'coach_marketplace',
    emoji:     '👥',
    label:     'Connect with a coach',
    desc:      'Professional plans, human coaching',
    detail:    'Browse the marketplace to buy a coach\'s plan, follow a Split Leader, or connect with a Professional Coach for a bespoke programme.',
    tag:       'New',
    tagColour: 'bg-purple-500',
  },
]

export function TrainingPathScreen() {
  const { step, data, update, next, back } = useOnboarding()
  const [selected, setSelected] = useState<TrainingPath | null>(data.trainingPath)
  const [expanded, setExpanded] = useState<TrainingPath | null>(null)

  const canContinue = !!selected

  const handleContinue = () => {
    if (!canContinue) return
    update({ trainingPath: selected! })
    Analytics.onboardingPathSelected(selected!)
    next()
  }

  // Smart recommendation based on profile
  const getRecommendation = (): TrainingPath => {
    if (data.goals.some(g => g.goal_type === 'race' && g.race_date)) return 'ai_bespoke'
    if (data.runningExperience === 'lt_6mo') return 'predetermined'
    if (data.goals.some(g => g.goal_type === 'continuous')) return 'lifestyle'
    return 'predetermined'
  }
  const recommended = getRecommendation()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-bg)" }} style={{ background: "var(--color-bg)" }}>
      <OnboardingProgressBar step={step} character={data.characterConfig} showFinishLine />

      <div className="flex-1 overflow-y-auto pb-32 px-4 pt-6 space-y-4">
        <div className="mb-2">
          <h1 className="text-xl font-black" style={{ color: 'var(--color-text-primary)' }}>How do you want to train?</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Based on your profile, we think{' '}
            <span className="text-[var(--ns-ember)] font-semibold">
              {PATHS.find(p => p.id === recommended)?.label}
            </span>{' '}
            suits you best — but the choice is yours.
          </p>
        </div>

        {/* Path cards */}
        <div className="space-y-3">
          {PATHS.map(path => {
            const isSelected = selected === path.id
            const isExpanded = expanded === path.id
            const isRecommended = recommended === path.id

            return (
              <div
                key={path.id}
                className={`rounded-2xl border-2 transition-all ${
                  isSelected
                    ? 'border-[var(--ns-ember)]'
                    : ' border-[var(--color-border)]'
                }`}
                style={isSelected ? { background: 'var(--ns-cyan-light)' } : {}}
              >
                {/* Main row */}
                <button
                  className="w-full text-left p-4"
                  onClick={() => setSelected(path.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 mt-0.5 ${
                      isSelected ? '' : 'bg-transparent'
                    }`}>
                      {path.emoji}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Tags first — trust signals before name */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        {path.tag && (
                          <span className={`text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full ${path.tagColour}`}>
                            {path.tag}
                          </span>
                        )}
                        {isRecommended && !isSelected && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ color: 'var(--ns-ember)', background: 'var(--ns-cyan-light)', border: '1px solid var(--ns-cyan)30' }}>
                            ✦ For you
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{path.label}</span>
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{path.desc}</p>
                      {/* Methodology — credibility layer visible without expansion */}
                      {path.methodology && isSelected && (
                        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--ns-ember)' }}>
                          {path.methodology}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                      {/* Info toggle */}
                      <button
                        onClick={e => { e.stopPropagation(); setExpanded(isExpanded ? null : path.id) }}
                        className="text-gray-300 hover:text-[var(--color-text-tertiary)] transition-colors text-sm font-bold w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center"
                      >
                        {isExpanded ? '−' : 'i'}
                      </button>
                      {/* Select indicator */}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'border-[var(--ns-ember)]' : 'border-gray-300'
                      }`}
                        style={isSelected ? { background: 'var(--ns-ember)' } : {}}>
                        {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4">
                    <div className="bg-transparent rounded-xl p-3 border border-[var(--color-border)] space-y-2">
                      <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{path.detail}</p>
                      {path.methodology && (
                        <p className="text-xs leading-relaxed font-medium" style={{ color: 'var(--ns-ember)' }}>
                          {path.methodology}
                        </p>
                      )}
                      {path.id === 'coach_marketplace' && (
                        <div className="mt-2 space-y-1.5">
                          {[
                            { emoji: '🏪', label: 'Buy a plan — browse coach library' },
                            { emoji: '👫', label: 'Follow a Split Leader — friends or club leaders' },
                            { emoji: '🎓', label: 'Pro Coach — bespoke coaching and managed plan' },
                          ].map(item => (
                            <div key={item.label} className="flex items-start gap-2 text-xs text-[var(--color-text-tertiary)]">
                              <span>{item.emoji}</span>
                              <span>{item.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-xs text-[var(--color-text-tertiary)] text-center pb-2">
          You can switch training path or start a new plan anytime from your profile
        </p>
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-4 py-4 flex gap-3 border-t" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
        <button onClick={back} className="px-5 py-3 rounded-2xl border border-[var(--color-border)] text-sm font-semibold text-[var(--color-text-secondary)]">←</button>
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="flex-1 text-white py-3 rounded-2xl text-sm font-bold disabled:opacity-50 transition-all active:scale-95"
          style={{ background: canContinue ? 'var(--ns-ember)' : '#9ca3af' }}
        >
          {canContinue
            ? selected === 'coach_marketplace'
              ? 'Go to marketplace →'
              : 'Build my plan →'
            : 'Choose a training path'}
        </button>
      </div>
    </div>
  )
}
