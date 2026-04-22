'use client'

import { TOTAL_STEPS } from '../context/OnboardingContext'
import type { CharacterConfig } from '@/types/database'

interface Props {
  step:            number
  character:       CharacterConfig
  showFinishLine?: boolean
}

function RunnerSprite({ character, size = 32 }: { character: CharacterConfig; size?: number }) {
  const skin = SKIN_TONES[character.skinTone as keyof typeof SKIN_TONES] ?? SKIN_TONES['tone-3']
  const kit  = character.kitColour ?? 'var(--ns-forest)'
  const hair = character.hairColour ?? '#3b2314'
  const shoe = character.shoeColour ?? '#1e293b'

  return (
    <svg width={size} height={Math.round(size * 1.25)} viewBox="0 0 32 40"
      fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}>
      <ellipse cx="16" cy="6" rx="5" ry="5.5" fill={skin} />
      {character.hairStyle !== 'none' && (
        <ellipse cx="16" cy="3" rx="5" ry="3" fill={hair} />
      )}
      <rect x="11" y="11" width="10" height="10" rx="2" fill={kit} />
      <line x1="11" y1="13" x2="6" y2="19" stroke={skin} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="21" y1="13" x2="26" y2="17" stroke={skin} strokeWidth="2.5" strokeLinecap="round" />
      <rect x="11" y="20" width="5" height="5" rx="1" fill={kit} opacity="0.8" />
      <rect x="16" y="20" width="5" height="5" rx="1" fill={kit} opacity="0.8" />
      <line x1="13" y1="25" x2="8" y2="34" stroke={skin} strokeWidth="2.5" strokeLinecap="round" />
      <rect x="5" y="33" width="5" height="2.5" rx="1" fill={shoe} />
      <line x1="19" y1="25" x2="22" y2="33" stroke={skin} strokeWidth="2.5" strokeLinecap="round" />
      <rect x="20" y="32" width="5" height="2.5" rx="1" fill={shoe} />
      {character.accessories?.includes('cap') && (
        <rect x="11" y="1" width="10" height="3" rx="1" fill={kit} />
      )}
    </svg>
  )
}

const SKIN_TONES = {
  'tone-1': '#FDDBB4', 'tone-2': '#F1C27D', 'tone-3': '#E0AC69',
  'tone-4': '#C68642',  'tone-5': '#8D5524',  'tone-6': '#4A2912',
}

const STEP_LABELS: Record<number, string> = {
  1: 'Welcome', 2: 'Your Runner', 3: 'Connect Strava',
  4: 'Sport', 5: 'About You', 6: 'Running History',
  7: 'Goals', 8: 'Your Life', 9: 'Gym & Strength',
  10: 'Training Path', 11: 'Building plan…', 12: 'Plan preview',
}

export function OnboardingProgressBar({ step, character, showFinishLine = false }: Props) {
  const progress = (step - 1) / (TOTAL_STEPS - 1)
  const pct      = Math.round(progress * 100)

  return (
    <div className="w-full select-none" style={{ paddingTop: '0.75rem', paddingBottom: '0.5rem' }}>
      {/* Step label + counter */}
      <div className="flex items-center justify-between px-4 mb-2">
        <span className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
          {STEP_LABELS[step] || `Step ${step}`}
        </span>
        <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--color-text-tertiary)' }}>
          {step} / {TOTAL_STEPS}
        </span>
      </div>

      {/* Track container — styled like a running track */}
      <div className="relative mx-4" style={{ height: 28 }}>
        {/* Outer track border */}
        <div className="absolute inset-0 rounded-full"
          style={{ background: 'var(--color-surface-2)', border: '2px solid var(--color-border)' }} />

        {/* Lane lines */}
        <div className="absolute inset-[3px] rounded-full overflow-hidden">
          <div className="absolute inset-0" style={{ background: 'rgba(255,255,255,0.03)' }} />
          {/* Dashed centre line */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex items-center px-2">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="flex-1 h-px opacity-20" style={{ background: 'var(--color-text-tertiary)' }} />
            ))}
          </div>
        </div>

        {/* Filled progress — track surface */}
        <div className="absolute inset-[3px] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${Math.max(pct, 4)}%`,
              background: 'linear-gradient(90deg, var(--ns-forest) 0%, #3a7a55 100%)',
            }} />
        </div>

        {/* Step tick marks */}
        {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => {
          const tickPct = ((i + 1) / (TOTAL_STEPS - 1)) * 100
          const isPassed = tickPct <= pct
          return (
            <div key={i}
              className="absolute top-1/2 -translate-y-1/2 w-px"
              style={{
                left: `${tickPct}%`,
                height: 14,
                background: isPassed ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)',
              }} />
          )
        })}

        {/* Finish line */}
        {showFinishLine && (
          <div className="absolute right-2 top-0 bottom-0 flex flex-col items-center justify-center gap-0.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1"
                style={{ background: i % 2 === 0 ? 'white' : 'var(--color-text-tertiary)', opacity: 0.5 }} />
            ))}
          </div>
        )}

        {/* Runner sprite positioned on track */}
        <div className="absolute top-0 transition-all duration-500 ease-out"
          style={{
            left: `calc(${pct}% - 16px)`,
            top: '50%',
            transform: 'translateY(-80%)',
            zIndex: 20,
          }}>
          <RunnerSprite character={character} size={30} />
        </div>
      </div>
    </div>
  )
}
