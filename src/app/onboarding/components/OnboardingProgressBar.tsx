'use client'

import { TOTAL_STEPS } from '../context/OnboardingContext'
import type { CharacterConfig } from '@/types/database'

interface Props {
  step:            number
  character:       CharacterConfig
  showFinishLine?: boolean
}

// Tiny SVG runner sprite built from character config
function RunnerSprite({ character, size = 32 }: { character: CharacterConfig; size?: number }) {
  const skin = SKIN_TONES[character.skinTone as keyof typeof SKIN_TONES] ?? SKIN_TONES['tone-3']
  const kit  = character.kitColour ?? 'var(--ns-forest)'
  const hair = character.hairColour ?? '#3b2314'
  const shoe = character.shoeColour ?? '#1e293b'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
    >
      {/* Head */}
      <ellipse cx="16" cy="6" rx="5" ry="5.5" fill={skin} />
      {/* Hair */}
      {character.hairStyle !== 'none' && (
        <ellipse cx="16" cy="3" rx="5" ry="3" fill={hair} />
      )}
      {/* Torso — kit colour */}
      <rect x="11" y="11" width="10" height="10" rx="2" fill={kit} />
      {/* Left arm (back, swinging forward) */}
      <line x1="11" y1="13" x2="6" y2="19" stroke={skin} strokeWidth="2.5" strokeLinecap="round" />
      {/* Right arm (front, swinging back) */}
      <line x1="21" y1="13" x2="26" y2="17" stroke={skin} strokeWidth="2.5" strokeLinecap="round" />
      {/* Shorts */}
      <rect x="11" y="20" width="5" height="5" rx="1" fill={kit} opacity="0.8" />
      <rect x="16" y="20" width="5" height="5" rx="1" fill={kit} opacity="0.8" />
      {/* Left leg — stride forward */}
      <line x1="13" y1="25" x2="8" y2="34" stroke={skin} strokeWidth="2.5" strokeLinecap="round" />
      <rect x="5" y="33" width="5" height="2.5" rx="1" fill={shoe} />
      {/* Right leg — stride back */}
      <line x1="19" y1="25" x2="22" y2="33" stroke={skin} strokeWidth="2.5" strokeLinecap="round" />
      <rect x="20" y="32" width="5" height="2.5" rx="1" fill={shoe} />
      {/* Cap accessory */}
      {character.accessories?.includes('cap') && (
        <rect x="11" y="1" width="10" height="3" rx="1" fill={kit} />
      )}
    </svg>
  )
}

// Skin tone map
const SKIN_TONES = {
  'tone-1': '#FDDBB4',
  'tone-2': '#F1C27D',
  'tone-3': '#E0AC69',
  'tone-4': '#C68642',
  'tone-5': '#8D5524',
  'tone-6': '#4A2912',
}

// Step labels shown below progress bar on desktop (hidden on mobile)
const STEP_LABELS: Record<number, string> = {
  1:  '',           // Welcome — no label needed
  2:  'Character',
  3:  'Connect',
  4:  'Sport',
  5:  'About You',
  6:  'Running',
  7:  'Goals',
  8:  'Your Life',
  9:  'Gym',
  10: 'Your Path',
  11: 'Building…',
  12: 'Preview',
}

export function OnboardingProgressBar({ step, character, showFinishLine = false }: Props) {
  // Progress 0→1 (step 1 = just started, step 11 = done)
  const progress = (step - 1) / (TOTAL_STEPS - 1)
  const pct      = Math.round(progress * 100)

  return (
    <div className="w-full px-4 pt-4 pb-2 select-none">
      {/* Track container */}
      <div className="relative h-2 bg-gray-200 rounded-full overflow-visible">
        {/* Filled track */}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />

        {/* Lane markings */}
        {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-white/60"
            style={{ left: `${((i + 1) / (TOTAL_STEPS - 1)) * 100}%` }}
          />
        ))}

        {/* Finish line */}
        {showFinishLine && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="w-0.5 h-5 bg-slate-400" />
            <span className="text-[8px] text-gray-400 mt-0.5">🏁</span>
          </div>
        )}

        {/* Runner sprite — positioned along track */}
        <div
          className="absolute top-1/2 transition-all duration-500 ease-out"
          style={{
            left:      `${pct}%`,
            transform: 'translate(-50%, -75%)',
            zIndex:    10,
          }}
        >
          <RunnerSprite character={character} size={28} />
        </div>
      </div>

      {/* Step counter */}
      <div className="flex justify-between mt-2">
        <span className="text-[11px] text-gray-400 font-medium">
          {STEP_LABELS[step] || `Step ${step}`}
        </span>
        <span className="text-[11px] text-gray-400">
          {step} / {TOTAL_STEPS}
        </span>
      </div>
    </div>
  )
}
