// ─── XP per session type ─────────────────────────────────────────────────────

export const SESSION_XP: Record<string, number> = {
  'run-easy':  10,
  'run-tempo': 20,
  'run-int':   25,
  'run-long':  40,
  'run-mp':    30,
  'run-race':  100,
  'gym-a':     15,
  'gym-b':     15,
  'gym-c':     15,
  'gym-bw':    10,
  'pilates':   8,
  'sauna':     5,
  'rest':      2,
}

export function getSessionXP(code: string): number {
  return SESSION_XP[code] ?? 10
}

// ─── Level system ─────────────────────────────────────────────────────────────

export interface Level {
  level: number
  name: string
  minXP: number
  maxXP: number
}

export const LEVELS: Level[] = [
  { level: 1,  name: 'Fresh Legs',        minXP: 0,    maxXP: 100   },
  { level: 2,  name: 'Easy Runner',        minXP: 100,  maxXP: 250   },
  { level: 3,  name: 'Consistent Mover',   minXP: 250,  maxXP: 500   },
  { level: 4,  name: 'Training Regular',   minXP: 500,  maxXP: 900   },
  { level: 5,  name: 'Base Builder',       minXP: 900,  maxXP: 1400  },
  { level: 6,  name: 'Tempo Tracker',      minXP: 1400, maxXP: 2000  },
  { level: 7,  name: 'Interval Warrior',   minXP: 2000, maxXP: 2800  },
  { level: 8,  name: 'Long Run Legend',    minXP: 2800, maxXP: 3800  },
  { level: 9,  name: 'Sub-4 Contender',    minXP: 3800, maxXP: 5000  },
  { level: 10, name: 'Sub-3:30 Chaser',    minXP: 5000, maxXP: 6500  },
  { level: 11, name: 'Sub-3:15 Contender', minXP: 6500, maxXP: 8500  },
  { level: 12, name: 'Marathon Machine',   minXP: 8500, maxXP: 11000 },
  { level: 13, name: 'Peak Week Survivor', minXP: 11000,maxXP: 14000 },
  { level: 14, name: 'Race Day Ready',     minXP: 14000,maxXP: 18000 },
  { level: 15, name: 'Sub-3:15 Runner',    minXP: 18000,maxXP: 999999},
]

export function getLevelForXP(xp: number): Level {
  return LEVELS.slice().reverse().find(l => xp >= l.minXP) ?? LEVELS[0]
}

export function getXPProgress(xp: number): number {
  const level = getLevelForXP(xp)
  if (level.maxXP === 999999) return 100
  const inLevel = xp - level.minXP
  const range = level.maxXP - level.minXP
  return Math.min(Math.round((inLevel / range) * 100), 100)
}

// ─── Badge definitions ────────────────────────────────────────────────────────

export interface Badge {
  id: string
  name: string
  description: string
  emoji: string
  /** Returns true if the badge should be awarded given log stats */
  check: (stats: BadgeStats) => boolean
}

export interface BadgeStats {
  totalSessions: number
  totalKm: number
  totalRuns: number
  totalGym: number
  longestRun: number
  consecutiveDays: number
  racesCompleted: number
  firstSession: boolean
  weekCompleted: boolean
  xp: number
}

export const BADGES: Badge[] = [
  {
    id: 'first_session',
    name: 'First Step',
    description: 'Log your very first session',
    emoji: '👟',
    check: s => s.firstSession,
  },
  {
    id: 'five_sessions',
    name: 'Getting Started',
    description: 'Log 5 sessions',
    emoji: '🔥',
    check: s => s.totalSessions >= 5,
  },
  {
    id: 'twenty_sessions',
    name: 'Habit Formed',
    description: 'Log 20 sessions',
    emoji: '💪',
    check: s => s.totalSessions >= 20,
  },
  {
    id: 'fifty_sessions',
    name: 'Committed',
    description: 'Log 50 sessions',
    emoji: '🏅',
    check: s => s.totalSessions >= 50,
  },
  {
    id: 'first_50km',
    name: '50km Club',
    description: 'Log 50km total',
    emoji: '📍',
    check: s => s.totalKm >= 50,
  },
  {
    id: 'first_100km',
    name: '100km Club',
    description: 'Log 100km total',
    emoji: '💯',
    check: s => s.totalKm >= 100,
  },
  {
    id: 'first_200km',
    name: '200km Club',
    description: 'Log 200km total',
    emoji: '🌍',
    check: s => s.totalKm >= 200,
  },
  {
    id: 'long_run_20',
    name: '20km Long Run',
    description: 'Complete a 20km+ run',
    emoji: '🏃',
    check: s => s.longestRun >= 20,
  },
  {
    id: 'long_run_30',
    name: '30km Long Run',
    description: 'Complete a 30km+ run',
    emoji: '🦵',
    check: s => s.longestRun >= 30,
  },
  {
    id: 'gym_10',
    name: 'Iron Regular',
    description: 'Complete 10 gym sessions',
    emoji: '🏋️',
    check: s => s.totalGym >= 10,
  },
  {
    id: 'gym_25',
    name: 'Iron Addict',
    description: 'Complete 25 gym sessions',
    emoji: '🦾',
    check: s => s.totalGym >= 25,
  },
  {
    id: 'week_complete',
    name: 'Full Week',
    description: 'Log all sessions in a plan week',
    emoji: '📅',
    check: s => s.weekCompleted,
  },
  {
    id: 'first_race',
    name: 'Race Finisher',
    description: 'Complete your first race',
    emoji: '🏁',
    check: s => s.racesCompleted >= 1,
  },
  {
    id: 'xp_500',
    name: 'XP Earner',
    description: 'Earn 500 XP',
    emoji: '⭐',
    check: s => s.xp >= 500,
  },
  {
    id: 'xp_2000',
    name: 'XP Hunter',
    description: 'Earn 2,000 XP',
    emoji: '🌟',
    check: s => s.xp >= 2000,
  },
  {
    id: 'xp_5000',
    name: 'XP Legend',
    description: 'Earn 5,000 XP',
    emoji: '✨',
    check: s => s.xp >= 5000,
  },
]

export function checkBadges(stats: BadgeStats): string[] {
  return BADGES.filter(b => b.check(stats)).map(b => b.id)
}
