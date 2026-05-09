// Character system V1 — public types + class XP weights table.
//
// Two-layer design (founder direction 2026-05-08):
//   · profiles.runner_class — auto-derived archetype from training behaviour
//     (existing 7 RUNNER_CLASSES in src/lib/rpg.ts). Identity flavour.
//   · characters.build_class — user-picked active build. Drives stat-weighted
//     XP gain at session-log time.
//
// Race outcomes are completion-based, NOT VDOT-anchored. Character power =
// (level + class_fit_modifier + boost_stack) × xp_rate_multiplier. No RNG
// at race resolution time (council /council R2 — Gambling Act 2005 ss.6-9).
//
// CLASS_XP_WEIGHTS mirrors the CASE table inside award_session_xp RPC
// (supabase/migrations/phase-character-system-v1.sql). Keep in sync — when
// adjusting, update both. The RPC is the source of truth at write-time;
// this table powers UI previews ("if you log an interval, you'll gain +4
// speed").

export const BUILD_CLASSES = ['track_star', 'trail_champion', 'marathon_monster'] as const
export type BuildClass = (typeof BUILD_CLASSES)[number]

export interface BuildClassMeta {
  id:        BuildClass
  name:      string
  tagline:   string
  emoji:     string
  primary:   'speed' | 'endurance' | 'resilience'
  secondary: 'speed' | 'endurance' | 'resilience'
  blurb:     string
  bestFor:   string  // session types where this class shines
}

export const BUILD_CLASS_META: Record<BuildClass, BuildClassMeta> = {
  track_star: {
    id:        'track_star',
    name:      'Track Star',
    tagline:   'Built for speed',
    emoji:     '⚡',
    primary:   'speed',
    secondary: 'resilience',
    blurb:     'Short distance specialist. Levels speed faster from intervals, threshold and hill sessions. Best at sprint races and pace-anchored efforts.',
    bestFor:   'intervals · threshold · hills',
  },
  trail_champion: {
    id:        'trail_champion',
    name:      'Trail Champion',
    tagline:   'Endurance + grit',
    emoji:     '🏔️',
    primary:   'resilience',
    secondary: 'endurance',
    blurb:     'Hills and long days are your home. Levels resilience faster from hill sessions and long runs. Best at trail-format and mixed-elevation races.',
    bestFor:   'hills · long runs · gym',
  },
  marathon_monster: {
    id:        'marathon_monster',
    name:      'Marathon Monster',
    tagline:   'Built for the long game',
    emoji:     '🏆',
    primary:   'endurance',
    secondary: 'resilience',
    blurb:     'Steady-state specialist. Levels endurance faster from long runs and threshold work. Best at distance races where consistency wins.',
    bestFor:   'long runs · threshold · easy',
  },
}

// Per-class × per-session-type XP weights. MUST match the CASE in
// award_session_xp RPC body. Used for UI previews; the RPC is canonical
// at write-time. Unknown session types fall back to the 'default' row.
export interface ClassXPWeight {
  speed:      number
  endurance:  number
  resilience: number
}

const ZERO: ClassXPWeight = { speed: 0, endurance: 0, resilience: 0 }

export const CLASS_XP_WEIGHTS: Record<BuildClass, Record<string, ClassXPWeight>> = {
  track_star: {
    interval:  { speed: 4, endurance: 0, resilience: 0 },
    speed:     { speed: 4, endurance: 0, resilience: 0 },
    threshold: { speed: 3, endurance: 0, resilience: 0 },
    tempo:     { speed: 3, endurance: 0, resilience: 0 },
    hill:      { speed: 2, endurance: 0, resilience: 1 },
    race:      { speed: 4, endurance: 1, resilience: 0 },
    long:      { speed: 0, endurance: 1, resilience: 0 },
    easy:      { speed: 1, endurance: 1, resilience: 0 },
    gym:       { speed: 1, endurance: 0, resilience: 0 },
    recovery:  { speed: 0, endurance: 0, resilience: 1 },
    rest:      ZERO,
    default:   { speed: 0, endurance: 1, resilience: 0 },
  },
  trail_champion: {
    hill:      { speed: 0, endurance: 0, resilience: 4 },
    long:      { speed: 0, endurance: 3, resilience: 1 },
    race:      { speed: 0, endurance: 2, resilience: 2 },
    threshold: { speed: 0, endurance: 2, resilience: 0 },
    tempo:     { speed: 0, endurance: 2, resilience: 0 },
    gym:       { speed: 0, endurance: 0, resilience: 2 },
    recovery:  { speed: 0, endurance: 0, resilience: 2 },
    easy:      { speed: 0, endurance: 1, resilience: 0 },
    interval:  { speed: 1, endurance: 0, resilience: 0 },
    speed:     { speed: 1, endurance: 0, resilience: 0 },
    rest:      ZERO,
    default:   { speed: 0, endurance: 1, resilience: 0 },
  },
  marathon_monster: {
    long:      { speed: 0, endurance: 4, resilience: 0 },
    threshold: { speed: 0, endurance: 3, resilience: 0 },
    tempo:     { speed: 0, endurance: 3, resilience: 0 },
    race:      { speed: 0, endurance: 3, resilience: 1 },
    easy:      { speed: 0, endurance: 2, resilience: 0 },
    hill:      { speed: 0, endurance: 2, resilience: 1 },
    gym:       { speed: 0, endurance: 0, resilience: 1 },
    recovery:  { speed: 0, endurance: 0, resilience: 1 },
    interval:  { speed: 1, endurance: 0, resilience: 0 },
    speed:     { speed: 1, endurance: 0, resilience: 0 },
    rest:      ZERO,
    default:   { speed: 0, endurance: 1, resilience: 0 },
  },
}

// Engagement-pro-rata XP rate ratios. Council /council R2 finance lens
// picked modest 1.0/1.3/1.6/1.8× as the widest spread that stays below the
// "feels rigged" threshold pre-paywall. Materialised on profiles.
// xp_rate_multiplier via recompute_xp_rate_multiplier RPC (called from
// subscription-state webhooks). Never read directly client-side.
export const XP_RATE_RATIOS = {
  free:                          1.0,
  elite:                         1.3,
  elite_plus_coach:              1.6,
  elite_plus_coach_plus_market:  1.8,
} as const

// Helper for UI previews — returns the (speed, endurance, resilience)
// deltas for a given build_class + session_type at a given multiplier.
// The RPC is canonical at write-time; this runs on client for UX hints
// like "log a long run for +4 endurance".
export function previewSessionXP(
  buildClass:    BuildClass,
  sessionType:   string | null | undefined,
  multiplier:    number = 1.0,
): ClassXPWeight & { xpAwarded: number } {
  const lc = (sessionType ?? 'easy').toLowerCase()
  const w = CLASS_XP_WEIGHTS[buildClass][lc] ?? CLASS_XP_WEIGHTS[buildClass].default
  return {
    speed:      Math.round(w.speed      * multiplier),
    endurance:  Math.round(w.endurance  * multiplier),
    resilience: Math.round(w.resilience * multiplier),
    xpAwarded:  Math.round(50           * multiplier),
  }
}

// Character row shape (mirrors public.characters table).
export interface Character {
  user_id:          string
  build_class:      BuildClass
  level:            number
  xp:               number
  speed_stat:       number
  endurance_stat:   number
  resilience_stat:  number
  active_cosmetics: Record<string, string>
  created_at:       string
  updated_at:       string
}
