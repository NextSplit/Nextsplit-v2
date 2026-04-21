/**
 * RunnerClassAvatar — Phase D4
 *
 * SVG illustrated avatars for all 7 runner classes.
 * Used in: class reveal modal, CharacterProfileModal, coach squad, leaderboard.
 *
 * Each avatar is a distinct silhouette + pose + colour palette.
 * Design language: bold, minimal, geometric. Not realistic.
 */

interface AvatarProps {
  size?: number
  className?: string
}

// ─── Warming Up — dawn runner, just starting ─────────────────────────────────

export function WarmingUpAvatar({ size = 64, className = '' }: AvatarProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      {/* Sunrise background */}
      <circle cx="32" cy="32" r="28" fill="#f1f5f9" />
      <path d="M8 40 Q32 20 56 40" fill="#fde68a" opacity="0.4" />
      {/* Sun rays */}
      <circle cx="32" cy="22" r="6" fill="#fbbf24" opacity="0.6" />
      {/* Runner silhouette — slow jog, upright */}
      <ellipse cx="32" cy="18" rx="5" ry="5" fill="#94a3b8" />
      <rect x="29" y="23" width="6" height="14" rx="3" fill="#94a3b8" />
      {/* Arms — relaxed swing */}
      <path d="M29 27 L22 32" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
      <path d="M35 27 L42 30" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
      {/* Legs — easy stride */}
      <path d="M30 37 L26 48" stroke="#94a3b8" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M34 37 L38 48" stroke="#94a3b8" strokeWidth="3.5" strokeLinecap="round" />
      {/* Shoes */}
      <ellipse cx="25" cy="49" rx="4" ry="2.5" fill="#94a3b8" />
      <ellipse cx="39" cy="49" rx="4" ry="2.5" fill="#94a3b8" />
    </svg>
  )
}

// ─── Marathon Runner — endurance stride, lean forward ────────────────────────

export function MarathonRunnerAvatar({ size = 64, className = '' }: AvatarProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <circle cx="32" cy="32" r="28" fill="#edf4f0" />
      {/* Distance markers — subtle road lines */}
      <line x1="10" y1="50" x2="54" y2="50" stroke="#d1fae5" strokeWidth="2" />
      <line x1="20" y1="53" x2="44" y2="53" stroke="#d1fae5" strokeWidth="1.5" />
      {/* Head */}
      <ellipse cx="32" cy="14" rx="5.5" ry="5.5" fill="#2b5c3f" />
      {/* Torso — slight forward lean */}
      <path d="M30 19 L28 34" stroke="#2b5c3f" strokeWidth="5" strokeLinecap="round" />
      {/* Arms — efficient, compact swing */}
      <path d="M30 22 L22 27" stroke="#2b5c3f" strokeWidth="3" strokeLinecap="round" />
      <path d="M30 25 L38 21" stroke="#2b5c3f" strokeWidth="3" strokeLinecap="round" />
      {/* Legs — long stride */}
      <path d="M28 34 L20 46" stroke="#2b5c3f" strokeWidth="4" strokeLinecap="round" />
      <path d="M30 34 L38 44" stroke="#2b5c3f" strokeWidth="4" strokeLinecap="round" />
      {/* Extended trailing leg */}
      <path d="M20 46 L16 50" stroke="#2b5c3f" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M38 44 L42 50" stroke="#2b5c3f" strokeWidth="3.5" strokeLinecap="round" />
      {/* Shoes */}
      <ellipse cx="15" cy="51" rx="4.5" ry="2.5" fill="#2b5c3f" />
      <ellipse cx="43" cy="51" rx="4.5" ry="2.5" fill="#2b5c3f" />
      {/* Race number bib */}
      <rect x="26" y="24" width="8" height="6" rx="1" fill="white" opacity="0.8" />
      <text x="30" y="29" textAnchor="middle" fontSize="3.5" fill="#2b5c3f" fontWeight="bold">42</text>
    </svg>
  )
}

// ─── Speed Merchant — explosive sprint pose ───────────────────────────────────

export function SpeedMerchantAvatar({ size = 64, className = '' }: AvatarProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <circle cx="32" cy="32" r="28" fill="#fff7ed" />
      {/* Speed lines */}
      <line x1="6" y1="30" x2="18" y2="30" stroke="#fed7aa" strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="35" x2="16" y2="35" stroke="#fed7aa" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6" y1="40" x2="15" y2="40" stroke="#fed7aa" strokeWidth="1.5" strokeLinecap="round" />
      {/* Head — tilted forward, aggressive */}
      <ellipse cx="36" cy="13" rx="5" ry="5" fill="#e85d26" />
      {/* Torso — deep lean */}
      <path d="M34 18 L26 30" stroke="#e85d26" strokeWidth="5.5" strokeLinecap="round" />
      {/* Power arm drive — pumping */}
      <path d="M32 20 L40 14" stroke="#e85d26" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M28 25 L20 28" stroke="#e85d26" strokeWidth="3.5" strokeLinecap="round" />
      {/* Legs — explosive, knees high */}
      <path d="M28 30 L22 40 L18 48" stroke="#e85d26" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 30 L40 36 L44 46" stroke="#e85d26" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Spikes */}
      <ellipse cx="17" cy="49" rx="4" ry="2" fill="#e85d26" />
      <ellipse cx="45" cy="47" rx="4" ry="2" fill="#e85d26" />
      {/* Lightning bolt */}
      <path d="M38 8 L34 15 L37 15 L33 22" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Trail Blazer — mountain/trail runner ─────────────────────────────────────

export function TrailBlazerAvatar({ size = 64, className = '' }: AvatarProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <circle cx="32" cy="32" r="28" fill="#fef9c3" />
      {/* Mountain silhouette */}
      <path d="M8 52 L22 32 L32 42 L42 28 L56 52 Z" fill="#d97706" opacity="0.15" />
      {/* Pine trees */}
      <path d="M12 52 L15 44 L18 52 Z" fill="#7c5c2e" opacity="0.3" />
      <path d="M46 52 L49 44 L52 52 Z" fill="#7c5c2e" opacity="0.3" />
      {/* Head — cap */}
      <ellipse cx="32" cy="14" rx="5.5" ry="5" fill="#7c5c2e" />
      <rect x="25" y="12" width="14" height="3" rx="1.5" fill="#5c3d11" opacity="0.8" />
      {/* Torso — vest/pack */}
      <path d="M30 19 L29 34" stroke="#7c5c2e" strokeWidth="5" strokeLinecap="round" />
      {/* Hydration pack bump */}
      <ellipse cx="27" cy="25" rx="4" ry="6" fill="#7c5c2e" opacity="0.4" />
      {/* Arms — poles/uphill */}
      <path d="M30 22 L22 30" stroke="#7c5c2e" strokeWidth="3" strokeLinecap="round" />
      <path d="M30 24 L40 20" stroke="#7c5c2e" strokeWidth="3" strokeLinecap="round" />
      {/* Trekking poles */}
      <line x1="22" y1="30" x2="18" y2="42" stroke="#7c5c2e" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="40" y1="20" x2="44" y2="34" stroke="#7c5c2e" strokeWidth="1.5" strokeLinecap="round" />
      {/* Legs — high step on trail */}
      <path d="M29 34 L24 44" stroke="#7c5c2e" strokeWidth="4" strokeLinecap="round" />
      <path d="M31 34 L38 42" stroke="#7c5c2e" strokeWidth="4" strokeLinecap="round" />
      {/* Trail shoes */}
      <ellipse cx="23" cy="46" rx="4.5" ry="3" fill="#7c5c2e" />
      <ellipse cx="39" cy="44" rx="4.5" ry="3" fill="#7c5c2e" />
    </svg>
  )
}

// ─── Base Builder — steady, consistent, methodical ───────────────────────────

export function BaseBuilderAvatar({ size = 64, className = '' }: AvatarProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <circle cx="32" cy="32" r="28" fill="#eff6ff" />
      {/* Foundation/structure */}
      <rect x="10" y="46" width="44" height="6" rx="2" fill="#bfdbfe" opacity="0.5" />
      {/* Building block metaphor */}
      <rect x="18" y="38" width="12" height="8" rx="1.5" fill="#93c5fd" opacity="0.3" />
      <rect x="34" y="38" width="12" height="8" rx="1.5" fill="#93c5fd" opacity="0.3" />
      {/* Head */}
      <ellipse cx="32" cy="14" rx="5.5" ry="5.5" fill="#0984e3" />
      {/* Torso — upright, solid */}
      <rect x="28" y="19" width="8" height="15" rx="4" fill="#0984e3" />
      {/* Arms — balanced */}
      <path d="M29 24 L21 28" stroke="#0984e3" strokeWidth="3" strokeLinecap="round" />
      <path d="M35 24 L43 28" stroke="#0984e3" strokeWidth="3" strokeLinecap="round" />
      {/* Legs — consistent stride */}
      <path d="M30 34 L26 46" stroke="#0984e3" strokeWidth="4" strokeLinecap="round" />
      <path d="M34 34 L38 46" stroke="#0984e3" strokeWidth="4" strokeLinecap="round" />
      {/* Shoes */}
      <ellipse cx="25" cy="48" rx="4.5" ry="2.5" fill="#0984e3" />
      <ellipse cx="39" cy="48" rx="4.5" ry="2.5" fill="#0984e3" />
      {/* Metronome/consistency symbol */}
      <circle cx="32" cy="28" r="2.5" fill="white" opacity="0.6" />
    </svg>
  )
}

// ─── All Rounder — versatile, balanced, adaptable ────────────────────────────

export function AllRounderAvatar({ size = 64, className = '' }: AvatarProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <circle cx="32" cy="32" r="28" fill="#f5f3ff" />
      {/* Orbit rings — versatility */}
      <ellipse cx="32" cy="32" rx="22" ry="8" stroke="#c4b5fd" strokeWidth="1.5" fill="none" opacity="0.4" />
      <ellipse cx="32" cy="32" rx="8" ry="22" stroke="#c4b5fd" strokeWidth="1.5" fill="none" opacity="0.4" />
      {/* Head */}
      <ellipse cx="32" cy="13" rx="5.5" ry="5.5" fill="#6c5ce7" />
      {/* Torso */}
      <path d="M31 18 L30 34" stroke="#6c5ce7" strokeWidth="5" strokeLinecap="round" />
      {/* Arms — wide, balanced */}
      <path d="M30 22 L20 26" stroke="#6c5ce7" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M32 22 L44 26" stroke="#6c5ce7" strokeWidth="3.5" strokeLinecap="round" />
      {/* Legs — mid-stride, balanced */}
      <path d="M29 34 L24 46" stroke="#6c5ce7" strokeWidth="4" strokeLinecap="round" />
      <path d="M33 34 L40 44" stroke="#6c5ce7" strokeWidth="4" strokeLinecap="round" />
      <path d="M24 46 L20 50" stroke="#6c5ce7" strokeWidth="3" strokeLinecap="round" />
      <path d="M40 44 L44 50" stroke="#6c5ce7" strokeWidth="3" strokeLinecap="round" />
      {/* Shoes */}
      <ellipse cx="19" cy="51" rx="4" ry="2.5" fill="#6c5ce7" />
      <ellipse cx="45" cy="51" rx="4" ry="2.5" fill="#6c5ce7" />
    </svg>
  )
}

// ─── Comeback Runner — resilient, determined, rising ─────────────────────────

export function ComebackRunnerAvatar({ size = 64, className = '' }: AvatarProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <circle cx="32" cy="32" r="28" fill="#fdf2f8" />
      {/* Rising arc — comeback trajectory */}
      <path d="M10 52 Q20 30 32 28 Q44 26 54 16" stroke="#fda4d4" strokeWidth="2" fill="none" strokeDasharray="3 2" opacity="0.6" />
      {/* Arrow up */}
      <path d="M50 12 L54 16 L58 12" stroke="#e84393" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Head */}
      <ellipse cx="32" cy="14" rx="5.5" ry="5.5" fill="#e84393" />
      {/* Torso — upright, determined */}
      <path d="M31 19 L30 33" stroke="#e84393" strokeWidth="5.5" strokeLinecap="round" />
      {/* Heart on chest — resilience */}
      <path d="M29 24 Q30 22 32 24 Q34 22 35 24 Q35 27 32 30 Q29 27 29 24 Z" fill="white" opacity="0.7" />
      {/* Arms */}
      <path d="M30 23 L21 27" stroke="#e84393" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 23 L41 19" stroke="#e84393" strokeWidth="3" strokeLinecap="round" />
      {/* Legs — strong stride */}
      <path d="M29 33 L24 45" stroke="#e84393" strokeWidth="4" strokeLinecap="round" />
      <path d="M33 33 L40 43" stroke="#e84393" strokeWidth="4" strokeLinecap="round" />
      {/* Shoes */}
      <ellipse cx="23" cy="47" rx="4.5" ry="2.5" fill="#e84393" />
      <ellipse cx="41" cy="45" rx="4.5" ry="2.5" fill="#e84393" />
    </svg>
  )
}

// ─── Unified component — pick by class ID ────────────────────────────────────

import type { RunnerClassId } from '@/lib/rpg'
import type { ReactElement } from 'react'

const AVATAR_MAP: Record<RunnerClassId, (props: AvatarProps) => ReactElement> = {
  warming_up:      WarmingUpAvatar,
  marathon_runner: MarathonRunnerAvatar,
  speed_merchant:  SpeedMerchantAvatar,
  trail_blazer:    TrailBlazerAvatar,
  base_builder:    BaseBuilderAvatar,
  all_rounder:     AllRounderAvatar,
  comeback_runner: ComebackRunnerAvatar,
}

export function RunnerClassAvatar({
  classId,
  size = 64,
  className = '',
}: {
  classId: RunnerClassId | null | undefined
  size?: number
  className?: string
}) {
  if (!classId || !(classId in AVATAR_MAP)) {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
        <circle cx="32" cy="32" r="28" fill="#f1f5f9" />
        <ellipse cx="32" cy="20" rx="6" ry="6" fill="#94a3b8" />
        <rect x="28" y="26" width="8" height="16" rx="4" fill="#94a3b8" />
        <path d="M28 34 L22 46" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
        <path d="M36 34 L42 46" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
      </svg>
    )
  }
  const AvatarComponent = AVATAR_MAP[classId]
  return <AvatarComponent size={size} className={className} />
}
