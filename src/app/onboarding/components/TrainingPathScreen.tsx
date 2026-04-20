'use client'

import { useState } from 'react'
import { useOnboarding } from '../context/OnboardingContext'
import { OnboardingProgressBar } from './OnboardingProgressBar'
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
}

const PATHS: PathOption[] = [
  {
    id:        'predetermined',
    emoji:     '📋',
    label:     'Follow a plan',
    desc:      'Expert-designed, tailored to you',
    detail:    'We pick the best matching plan from our library and personalise the paces, volume and dates around your profile and goal.',
    tag:       'Most popular',
    tagColour: 'bg-teal-500',
  },
  {
    id:        'ai_bespoke',
    emoji:     '🤖',
    label:     'AI coached plan',
    desc:      'Built from scratch, just for you',
    detail:    'Our AI coaches analyse everything you\'ve told us and generate a completely custom plan. Takes under 60 seconds.',
    tag:       'Recommended',
    tagColour: 'bg-teal-500',
  },
  {
    id:        'manual',
    emoji:     '✏️',
    label:     'Build your own',
    desc:      'Your sessions, your structure',
    detail:    'Design every session yourself. A silent AI suggestion panel sits next to each week — tap to populate, or ignore it. AI rationale is a Pro feature.',
  },
  {
    id:        'lifestyle',
    emoji:     '🌿',
    label:     'Lifestyle training',
    desc:      'Continuous improvement, no end date',
    detail:    'No race target — just consistent progress. A baseline plan is generated around your goals. Adjust the difficulty slider up or down any time.',
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <OnboardingProgressBar step={step} character={data.characterConfig} showFinishLine />

      <div className="flex-1 overflow-y-auto pb-32 px-4 pt-6 space-y-4">
        <div className="mb-2">
          <h1 className="text-xl font-black text-slate-900">How do you want to train?</h1>
          <p className="text-sm text-slate-500 mt-1">
            Based on your profile, we think{' '}
            <span className="text-teal-600 font-semibold">
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
                className={`rounded-2xl border transition-all ${
                  isSelected
                    ? 'bg-teal-50 border-teal-400 shadow-sm'
                    : 'bg-white border-slate-200'
                }`}
              >
                {/* Main row */}
                <button
                  className="w-full text-left p-4"
                  onClick={() => setSelected(path.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${
                      isSelected ? 'bg-teal-100' : 'bg-slate-100'
                    }`}>
                      {path.emoji}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-800">{path.label}</span>
                        {path.tag && (
                          <span className={`text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full ${path.tagColour}`}>
                            {path.tag}
                          </span>
                        )}
                        {isRecommended && !isSelected && (
                          <span className="text-[9px] font-bold text-teal-600 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-full">
                            ✦ For you
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{path.desc}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Info toggle */}
                      <button
                        onClick={e => { e.stopPropagation(); setExpanded(isExpanded ? null : path.id) }}
                        className="text-slate-300 hover:text-slate-500 transition-colors text-sm font-bold w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center"
                      >
                        {isExpanded ? '−' : 'i'}
                      </button>
                      {/* Select indicator */}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-teal-500 border-teal-500' : 'border-slate-300'
                      }`}>
                        {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-xs text-slate-600 leading-relaxed">{path.detail}</p>
                      {path.id === 'coach_marketplace' && (
                        <div className="mt-3 space-y-1.5">
                          {[
                            { emoji: '🏪', label: 'Buy a plan — browse and purchase from our coach library' },
                            { emoji: '👫', label: 'Follow a Split Leader — find friends or club leaders' },
                            { emoji: '🎓', label: 'Pro Coach — apply for bespoke coaching and a managed plan' },
                          ].map(item => (
                            <div key={item.label} className="flex items-start gap-2 text-xs text-slate-500">
                              <span>{item.emoji}</span>
                              <span>{item.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {path.id === 'manual' && (
                        <p className="mt-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1.5">
                          💡 AI rationale generation on manual sessions is a Pro feature
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-xs text-slate-400 text-center pb-2">
          You can switch training path or start a new plan anytime from your profile
        </p>
      </div>

      {/* Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-4 flex gap-3">
        <button onClick={back} className="px-5 py-3 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600">←</button>
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="flex-1 bg-teal-500 text-white py-3 rounded-2xl text-sm font-bold disabled:opacity-50 transition-all hover:bg-teal-600 active:scale-95"
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
