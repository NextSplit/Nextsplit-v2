// ─── NextSplit RPG Engine ─────────────────────────────────────────────────────
// Full RPG character progression: 6 characters, 15 levels, 4 stat bars,
// 32 badges, evolving SVG avatars, cross-plan XP persistence
// Runner Class System: 7 earned classes, computed from 4 weeks training data

// ─── Runner Class System ──────────────────────────────────────────────────────

export type RunnerClassId =
  | 'warming_up'
  | 'marathon_runner'
  | 'speed_merchant'
  | 'trail_blazer'
  | 'base_builder'
  | 'all_rounder'
  | 'comeback_runner'

export interface RunnerClass {
  id: RunnerClassId
  name: string
  emoji: string
  tagline: string          // shown on HeroCard
  description: string      // shown on reveal screen
  colour: string           // accent colour for class card
  bg: string               // background
  textColour: string
  shareText: string        // for the race day share card
}

export const RUNNER_CLASSES: Record<RunnerClassId, RunnerClass> = {
  warming_up: {
    id: 'warming_up',
    name: 'Warming Up',
    emoji: '🌅',
    tagline: 'Every legend starts somewhere.',
    description: 'Your class reveals after four weeks of training data. Keep logging — your running style is taking shape.',
    colour: '#94a3b8',
    bg: 'bg-slate-100',
    textColour: 'text-slate-600',
    shareText: 'Just getting started with NextSplit. Watch this space. 🌅',
  },
  marathon_runner: {
    id: 'marathon_runner',
    name: 'Marathon Runner',
    emoji: '🏁',
    tagline: 'Built for the long game.',
    description: 'High weekly mileage at controlled effort. Long runs are your signature session. You understand that endurance is built in months, not weeks.',
    colour: '#2b5c3f',
    bg: 'bg-emerald-50',
    textColour: 'text-emerald-800',
    shareText: 'NextSplit classified me as a Marathon Runner. Long runs are my thing. 🏁',
  },
  speed_merchant: {
    id: 'speed_merchant',
    name: 'Speed Merchant',
    emoji: '⚡',
    tagline: 'Fast is a habit.',
    description: 'Intervals and tempo runs dominate your training. You chase pace, embrace discomfort, and recover just long enough to go again.',
    colour: '#e85d26',
    bg: 'bg-orange-50',
    textColour: 'text-orange-800',
    shareText: 'NextSplit made me a Speed Merchant. Track work is the answer. ⚡',
  },
  trail_blazer: {
    id: 'trail_blazer',
    name: 'Trail Blazer',
    emoji: '🌲',
    tagline: 'Off-road is where it gets real.',
    description: 'You choose terrain over tarmac. Your sessions feature elevation, variety, and the kind of beauty that road runners miss entirely.',
    colour: '#7c5c2e',
    bg: 'bg-amber-50',
    textColour: 'text-amber-900',
    shareText: 'NextSplit named me a Trail Blazer. The road is just a warm-up. 🌲',
  },
  base_builder: {
    id: 'base_builder',
    name: 'Base Builder',
    emoji: '🔵',
    tagline: 'Consistent. Methodical. Unbreakable.',
    description: 'Easy aerobic running is your foundation. You understand that most runners run too hard, too often — and you\'re the one who shows up on race day.',
    colour: '#0984e3',
    bg: 'bg-blue-50',
    textColour: 'text-blue-800',
    shareText: 'NextSplit says I\'m a Base Builder. Slow and steady builds the engine. 🔵',
  },
  all_rounder: {
    id: 'all_rounder',
    name: 'All-Rounder',
    emoji: '⭐',
    tagline: 'No weakness. Every gear.',
    description: 'You mix speed, endurance, and strength in equal measure. The most complete athletes are All-Rounders — and the hardest to beat on race day.',
    colour: '#6c5ce7',
    bg: 'bg-purple-50',
    textColour: 'text-purple-800',
    shareText: 'NextSplit calls me an All-Rounder. Speed, endurance, strength — bring it. ⭐',
  },
  comeback_runner: {
    id: 'comeback_runner',
    name: 'Comeback Runner',
    emoji: '💫',
    tagline: 'Returning is an act of courage.',
    description: 'You took time away and came back. That takes more mental strength than any PB. The hardest run is always the return — and you did it.',
    colour: '#e84393',
    bg: 'bg-pink-50',
    textColour: 'text-pink-800',
    shareText: 'NextSplit named me a Comeback Runner. Took time away. Back now. 💫',
  },
}

export function getRunnerClass(id: RunnerClassId | null | undefined): RunnerClass {
  return RUNNER_CLASSES[id ?? 'warming_up'] ?? RUNNER_CLASSES.warming_up
}

/**
 * Compute runner class from training logs over the last 4+ weeks.
 * Returns 'warming_up' if insufficient data.
 *
 * Classification logic (priority order):
 * 1. comeback_runner — returned after 4+ week gap
 * 2. speed_merchant  — >40% sessions are intervals/tempo + avg pace fast
 * 3. trail_blazer    — majority of runs are trail/ultra plan type
 * 4. marathon_runner — avg weekly km >50 + long run dominant
 * 5. base_builder    — >70% easy runs + consistent weeks
 * 6. all_rounder     — balanced mix across run types + gym
 * 7. warming_up      — default / insufficient data
 */
export interface ClassifyInput {
  logs: Array<{
    done: boolean
    km: number | null
    pace: string | null
    logged_at: string
    session_i: number
    week_n: number
    day_i: number
  }>
  sessionTypeMap: Map<string, string>  // `weekN_dayI_sessI` → session code
  firstSessionAt: string | null        // ISO string of very first ever session
  planType?: string | null             // 'predetermined' | 'ai_bespoke' | etc
}

export function computeRunnerClass(input: ClassifyInput): RunnerClassId {
  const { logs, sessionTypeMap, firstSessionAt } = input
  const done = logs.filter(l => l.done)

  // Need at least 6 logged sessions to classify (not enough data = warming_up)
  if (done.length < 6) return 'warming_up'

  // Need sessions spread over at least 3 weeks
  const weekSet = new Set(done.map(l => l.week_n))
  if (weekSet.size < 3) return 'warming_up'

  // ── 1. Comeback Runner ──────────────────────────────────────────────────────
  // Spec: Gap of 4+ weeks in training history OR Lifestyle onboarding path
  // Auto-assigned regardless of 4-week window for Lifestyle path
  if (input.planType === 'lifestyle') return 'comeback_runner'

  if (firstSessionAt && done.length >= 2) {
    const sortedDates = done
      .map(l => new Date(l.logged_at).getTime())
      .sort((a, b) => a - b)

    for (let i = 1; i < sortedDates.length; i++) {
      const gapDays = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24)
      if (gapDays >= 28) return 'comeback_runner'
    }
  }

  // ── Session type breakdown ──────────────────────────────────────────────────
  function code(l: typeof done[0]): string {
    return sessionTypeMap.get(`${l.week_n}_${l.day_i}_${l.session_i}`) ?? ''
  }

  const runSessions  = done.filter(l => code(l).startsWith('run'))
  const gymSessions  = done.filter(l => code(l).startsWith('gym'))
  const easySessions = done.filter(l => code(l) === 'run-easy')
  const longSessions = done.filter(l => code(l) === 'run-long')
  const tempoSessions = done.filter(l => code(l) === 'run-tempo' || code(l) === 'run-mp')
  const intSessions  = done.filter(l => code(l) === 'run-int')
  const speedSessions = [...tempoSessions, ...intSessions]

  const totalRuns = runSessions.length
  if (totalRuns === 0) return 'warming_up'

  const speedPct  = speedSessions.length / totalRuns
  const easyPct   = easySessions.length / totalRuns
  const longPct   = longSessions.length / totalRuns
  const gymPct    = gymSessions.length / Math.max(done.length, 1)

  // Weekly km averages
  const weeklyKmMap: Record<number, number> = {}
  for (const l of done) {
    weeklyKmMap[l.week_n] = (weeklyKmMap[l.week_n] ?? 0) + (l.km ?? 0)
  }
  const weeklyKms = Object.values(weeklyKmMap)
  const avgWeeklyKm = weeklyKms.reduce((a, b) => a + b, 0) / Math.max(weeklyKms.length, 1)

  // Avg pace from runs with pace data
  function paceToSecs(pace: string): number {
    const parts = pace.split(':').map(Number)
    return (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
  }
  const pacedRuns = done.filter(l => l.pace && code(l).startsWith('run'))
  const avgPaceSecs = pacedRuns.length > 0
    ? pacedRuns.reduce((a, l) => a + paceToSecs(l.pace!), 0) / pacedRuns.length
    : null

  // ── 2. Speed Merchant ───────────────────────────────────────────────────────
  // Spec: 40%+ intervals/tempo + avg effort >7/10 + pace improving
  if (speedPct >= 0.40 && (avgPaceSecs === null || avgPaceSecs < 360)) {
    return 'speed_merchant'
  }

  // ── 3. Trail Blazer ─────────────────────────────────────────────────────────
  // Spec: 50%+ sessions tagged trail/off-road (NOT 30%)
  const trailSessions = done.filter(l => {
    const c = code(l)
    return c.includes('trail') || c.includes('ultra') || c.includes('hike') || c.includes('walk')
  })
  if (trailSessions.length / Math.max(totalRuns, 1) >= 0.50) {
    return 'trail_blazer'
  }

  // ── 4. Marathon Runner ──────────────────────────────────────────────────────
  // Spec: 3+ long runs (≥18km) in 4 weeks OR marathon race goal + >40km/week
  const longRunsOver18 = done.filter(l => code(l) === 'run-long' && (l.km ?? 0) >= 18)
  if (longRunsOver18.length >= 3 || (longPct >= 0.2 && avgWeeklyKm >= 40)) {
    return 'marathon_runner'
  }

  // ── 5. Base Builder ─────────────────────────────────────────────────────────
  // Spec: 80%+ easy effort + 90%+ plan adherence + no intensity spikes
  // Using easyPct ≥ 0.75 (close to 80% with rounding) + no speed work spike
  if (easyPct >= 0.75 && speedPct < 0.10 && weekSet.size >= 3) {
    return 'base_builder'
  }

  // ── 6. All-Rounder ──────────────────────────────────────────────────────────
  // Spec: no single type >50%, active across 4+ session types, balanced effort
  const hasSpeed  = speedPct >= 0.15
  const hasLong   = longPct >= 0.10
  const hasGym    = gymPct >= 0.15
  if (hasSpeed && hasLong && (hasGym || easyPct >= 0.2)) {
    return 'all_rounder'
  }

  // ── 7. Default ─────────────────────────────────────────────────────────────
  return 'warming_up'
}

/**
 * Check whether a runner has enough data for their class to be revealed.
 * Requires 4 weeks of logged sessions OR 6+ weeks since first session.
 */
export function isClassRevealReady(
  logs: Array<{ done: boolean; week_n: number; logged_at: string }>,
  firstSessionAt: string | null
): boolean {
  const done = logs.filter(l => l.done)
  if (done.length < 6) return false

  const weekSet = new Set(done.map(l => l.week_n))
  if (weekSet.size >= 4) return true

  // Also reveal if 28+ days since first session (even if weeks not accumulated)
  if (firstSessionAt) {
    const daysSinceFirst = (Date.now() - new Date(firstSessionAt).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceFirst >= 28) return true
  }

  return false
}



export interface RPGChar {
  id: string
  label: string
  skin: string
  hair: string
  body: 'lean' | 'stocky' | 'tall'
  accent: string       // kit primary colour
  specialty: string    // flavour text
}

export const RPG_CHARS: RPGChar[] = [
  { id: 'm1', label: 'Alex',   skin: '#FFCC99', hair: '#3E2723', body: 'lean',   accent: 'var(--ns-forest)', specialty: 'Endurance specialist' },
  { id: 'm2', label: 'Marcus', skin: '#8D5524', hair: '#1a1a1a', body: 'stocky', accent: '#DC2626', specialty: 'Power athlete' },
  { id: 'm3', label: 'Kai',    skin: '#F1C27D', hair: '#4E342E', body: 'tall',   accent: '#7C3AED', specialty: 'Versatile runner' },
  { id: 'f1', label: 'Sarah',  skin: '#FFCC99', hair: '#5D4037', body: 'lean',   accent: 'var(--ns-forest)', specialty: 'Marathon machine' },
  { id: 'f2', label: 'Amara',  skin: '#8D5524', hair: '#1a1a1a', body: 'lean',   accent: '#F59E0B', specialty: 'Speed merchant' },
  { id: 'f3', label: 'Yuki',   skin: '#F1C27D', hair: '#212121', body: 'tall',   accent: '#06B6D4', specialty: 'Trail specialist' },
]

// ─── Level System ─────────────────────────────────────────────────────────────

export interface RPGLevel {
  level: number
  name: string
  minXP: number
  maxXP: number
  tier: 0 | 1 | 2 | 3  // determines kit colour + accessories
}

export const RPG_LEVELS: RPGLevel[] = [
  { level: 1,  name: 'Fresh Legs',         minXP: 0,     maxXP: 150,   tier: 0 },
  { level: 2,  name: 'Jogger',             minXP: 150,   maxXP: 350,   tier: 0 },
  { level: 3,  name: 'Consistent Runner',  minXP: 350,   maxXP: 650,   tier: 1 },
  { level: 4,  name: 'Club Runner',        minXP: 650,   maxXP: 1000,  tier: 1 },
  { level: 5,  name: 'Base Builder',       minXP: 1000,  maxXP: 1500,  tier: 1 },
  { level: 6,  name: 'Tempo Warrior',      minXP: 1500,  maxXP: 2200,  tier: 2 },
  { level: 7,  name: 'Interval Crusher',   minXP: 2200,  maxXP: 3100,  tier: 2 },
  { level: 8,  name: 'Long Run Legend',    minXP: 3100,  maxXP: 4200,  tier: 2 },
  { level: 9,  name: 'Race Ready',         minXP: 4200,  maxXP: 5600,  tier: 3 },
  { level: 10, name: 'Elite Amateur',      minXP: 5600,  maxXP: 7200,  tier: 3 },
  { level: 11, name: 'Sub-Elite',          minXP: 7200,  maxXP: 9200,  tier: 3 },
  { level: 12, name: 'Competitor',         minXP: 9200,  maxXP: 11700, tier: 3 },
  { level: 13, name: 'Marathon Star',      minXP: 11700, maxXP: 14700, tier: 3 },
  { level: 14, name: 'Race Day Machine',   minXP: 14700, maxXP: 18200, tier: 3 },
  { level: 15, name: '⚡ Elite',            minXP: 18200, maxXP: 999999,tier: 3 },
]

export function getLevelForXP(xp: number): RPGLevel {
  return RPG_LEVELS.slice().reverse().find(l => xp >= l.minXP) ?? RPG_LEVELS[0]
}

export function getXPProgress(xp: number): number {
  const level = getLevelForXP(xp)
  if (level.maxXP === 999999) return 100
  const inLevel = xp - level.minXP
  const range = level.maxXP - level.minXP
  return Math.min(Math.round((inLevel / range) * 100), 100)
}

export function getXPToNext(xp: number): number {
  const level = getLevelForXP(xp)
  if (level.maxXP === 999999) return 0
  return level.maxXP - xp
}

// ─── XP Rewards ───────────────────────────────────────────────────────────────
// Base XP per session type (Character System Spec, Chapter 4)

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
  'gym-bw':    15,
  'cross':     15,
  'walk':      8,
  'pilates':   8,
  'sauna':     5,
  'rest':      5,  // Spec: "Rest is training. Logging a rest day is active engagement."
}

export function getSessionXP(code: string): number {
  return SESSION_XP[code] ?? 10
}

/**
 * Compute XP bonus conditions per Character System Spec Chapter 4.
 * Called after a session is logged with additional context.
 *
 * Bonuses:
 *   +5  logged within 2 hours of completion (any session)
 *   +5  streak day 7, 14, or 30
 *   +5  tempo effort rating 7–8 (well-executed)
 *   +10 tempo target pace hit within 5%
 *   +10 intervals: effort 8–9/10
 *   +15 intervals: all reps completed
 *   +10 long run: completed within target pace range
 *   +20 long run: personal distance record
 *   +50 race: personal best
 *   +25 race: goal time achieved
 *   +10 gym: all target sets completed
 *   +5  gym: new weight PR logged
 */
export interface XPBonusContext {
  sessionCode:      string
  loggedAt:         string          // ISO — to check if within 2hrs
  sessionStartedAt?: string         // ISO — when session actually happened
  streakDays:       number
  effortRating?:    number          // 1–10
  allRepsCompleted?: boolean        // intervals
  targetPaceHit?:   boolean         // tempo/long
  isPersonalRecord?: boolean        // long run distance record
  isRacePB?:        boolean         // race PB
  raceGoalAchieved?: boolean        // race goal time achieved
  allGymSetsCompleted?: boolean     // gym
  gymWeightPR?:     boolean         // gym new weight PR
}

export function computeXPBonus(ctx: XPBonusContext): { bonus: number; reasons: string[] } {
  let bonus = 0
  const reasons: string[] = []
  const code = ctx.sessionCode

  // +5 if logged within 2 hours of completion
  if (ctx.sessionStartedAt) {
    const elapsed = (new Date(ctx.loggedAt).getTime() - new Date(ctx.sessionStartedAt).getTime()) / 3600000
    if (elapsed <= 2) { bonus += 5; reasons.push('+5 logged fresh') }
  }

  // Streak milestone bonuses
  if ([7, 14, 30].includes(ctx.streakDays)) {
    bonus += 5; reasons.push(`+5 ${ctx.streakDays}-day streak`)
  }

  if (code === 'run-int' || code === 'run-race') {
    if (ctx.allRepsCompleted) { bonus += 15; reasons.push('+15 all reps completed') }
    if (ctx.effortRating !== undefined && ctx.effortRating >= 8 && ctx.effortRating <= 9) {
      bonus += 10; reasons.push('+10 perfect effort zone')
    }
  }

  if (code === 'run-tempo' || code === 'run-mp') {
    if (ctx.targetPaceHit) { bonus += 10; reasons.push('+10 target pace hit') }
    if (ctx.effortRating !== undefined && ctx.effortRating >= 7 && ctx.effortRating <= 8) {
      bonus += 5; reasons.push('+5 well-executed effort')
    }
  }

  if (code === 'run-long') {
    if (ctx.isPersonalRecord) { bonus += 20; reasons.push('+20 personal distance record 🏆') }
    if (ctx.targetPaceHit)    { bonus += 10; reasons.push('+10 within target pace') }
  }

  if (code === 'run-race') {
    if (ctx.isRacePB)         { bonus += 50; reasons.push('+50 personal best 🏆') }
    else if (ctx.raceGoalAchieved) { bonus += 25; reasons.push('+25 goal achieved') }
  }

  if (code.startsWith('gym')) {
    if (ctx.allGymSetsCompleted) { bonus += 10; reasons.push('+10 all sets completed') }
    if (ctx.gymWeightPR)         { bonus += 5;  reasons.push('+5 new weight PR') }
  }

  return { bonus, reasons }
}

// ─── RPG Stats Computation ────────────────────────────────────────────────────

export interface RPGStats {
  xp: number
  level: RPGLevel
  totalKm: number
  totalRuns: number
  totalGym: number
  totalWellness: number
  longestRun: number
  racesComplete: number
  streak: number
  perfectWeeks: number
  // 0–100 stat bars
  endurance: number
  strength: number
  recovery: number
  nutrition: number
}

export interface LogEntry {
  done: boolean
  km: number | null
  week_n: number
  day_i: number
  session_i: number
  logged_at: string
  effort?: number | null
}

export interface WeekData {
  n: number
  days: Array<{ sessions: Array<{ c: string; km: number }> }>
}

export function computeRPGStats(
  logs: LogEntry[],
  weeks: WeekData[],
  wellnessCount: number,
  mealDays: number,
  suppStreak: number
): RPGStats {
  const done = logs.filter(l => l.done)
  const totalKm = done.reduce((a, l) => a + (l.km ?? 0), 0)

  // Build a session-type lookup from weeks data
  const sessionTypeMap = new Map<string, string>()
  for (const w of weeks) {
    for (let di = 0; di < w.days.length; di++) {
      for (let si = 0; si < w.days[di].sessions.length; si++) {
        sessionTypeMap.set(`${w.n}_${di}_${si}`, w.days[di].sessions[si].c)
      }
    }
  }

  function getSessionCode(l: LogEntry): string | null {
    // Ad-hoc sessions (session_i=99) logged via the ad-hoc modal
    if (l.session_i === 99) return null // counted separately below
    return sessionTypeMap.get(`${l.week_n}_${l.day_i}_${l.session_i}`) ?? null
  }

  const totalRuns = done.filter(l => getSessionCode(l)?.startsWith('run')).length
  const totalGym = done.filter(l => {
    const code = getSessionCode(l)
    return code?.startsWith('gym')
  }).length
  const longestRun = Math.max(0, ...done.map(l => l.km ?? 0))
  const racesComplete = done.filter(l => getSessionCode(l) === 'run-race').length

  // Streak
  const doneDays = new Set(done.map(l => l.logged_at.slice(0, 10)))
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const check = new Date(today)
  if (!doneDays.has(check.toISOString().slice(0, 10))) {
    check.setDate(check.getDate() - 1)
  }
  while (doneDays.has(check.toISOString().slice(0, 10)) && streak < 365) {
    streak++
    check.setDate(check.getDate() - 1)
  }

  // Perfect weeks — all planned sessions done (run + gym)
  let perfectWeeks = 0
  for (const week of weeks) {
    const planned = week.days.reduce((a, d) => a + d.sessions.filter(s => s.c != null && s.c !== 'rest').length, 0)
    if (planned === 0) continue
    const doneCount = done.filter(l => l.week_n === week.n && l.session_i !== 99).length
    if (doneCount >= planned) perfectWeeks++
  }

  // XP
  let xp = 0
  xp += Math.min(totalKm, 500) * 3      // 3 XP/km, cap 500km
  xp += totalRuns * 10                   // 10 XP/run
  xp += totalGym * 25                    // 25 XP/gym
  xp += wellnessCount * 5               // 5 XP/wellness
  xp += mealDays * 3                    // 3 XP/food diary day
  xp += perfectWeeks * 50               // 50 XP/perfect week
  xp += racesComplete * 100             // 100 XP/race
  xp += streak * 2                      // 2 XP/streak day
  xp += suppStreak * 1                  // 1 XP/supplement day
  xp = Math.round(xp)

  // Stat bars (0–100)
  const endurance = Math.min(100, Math.round(totalKm / 5))
  const strength  = Math.min(100, Math.round(totalGym * 4))
  const recovery  = Math.min(100, Math.round(wellnessCount * 3.5))
  const nutrition = Math.min(100, Math.round(mealDays * 4 + suppStreak * 2))

  return {
    xp,
    level: getLevelForXP(xp),
    totalKm: Math.round(totalKm * 10) / 10,
    totalRuns,
    totalGym,
    totalWellness: wellnessCount,
    longestRun: Math.round(longestRun * 10) / 10,
    racesComplete,
    streak,
    perfectWeeks,
    endurance,
    strength,
    recovery,
    nutrition,
  }
}

// ─── Badges ───────────────────────────────────────────────────────────────────

export interface RPGBadge {
  id: string
  name: string
  desc: string
  emoji: string
  cat: 'distance' | 'compliance' | 'strength' | 'recovery' | 'nutrition' | 'performance' | 'special'
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  check: (s: RPGStats) => boolean
}

export const RPG_BADGES: RPGBadge[] = [
  // Distance milestones
  { id: 'km50',    emoji: '🏃', name: 'First 50km',      desc: 'Log 50km total',             cat: 'distance',    rarity: 'common',    check: s => s.totalKm >= 50 },
  { id: 'km100',   emoji: '🌍', name: 'Century Club',    desc: 'Log 100km total',            cat: 'distance',    rarity: 'common',    check: s => s.totalKm >= 100 },
  { id: 'km250',   emoji: '⚡', name: 'Lightning 250',   desc: '250km total',                cat: 'distance',    rarity: 'rare',      check: s => s.totalKm >= 250 },
  { id: 'km500',   emoji: '🚀', name: '500km Club',      desc: '500km total',                cat: 'distance',    rarity: 'epic',      check: s => s.totalKm >= 500 },
  { id: 'km1000',  emoji: '🌟', name: 'Thousand Miles',  desc: '1000km total',               cat: 'distance',    rarity: 'legendary', check: s => s.totalKm >= 1000 },
  { id: 'lr15',    emoji: '🦁', name: '15km barrier',    desc: 'Complete a 15km+ run',       cat: 'distance',    rarity: 'common',    check: s => s.longestRun >= 15 },
  { id: 'lr20',    emoji: '🦅', name: '20km wall',       desc: 'Complete a 20km+ run',       cat: 'distance',    rarity: 'rare',      check: s => s.longestRun >= 20 },
  { id: 'lr30',    emoji: '🏔️', name: '30km warrior',   desc: 'Complete a 30km+ run',       cat: 'distance',    rarity: 'epic',      check: s => s.longestRun >= 30 },
  // Compliance / streak
  { id: 'str3',    emoji: '🔥', name: 'On fire',         desc: '3-day training streak',      cat: 'compliance',  rarity: 'common',    check: s => s.streak >= 3 },
  { id: 'str7',    emoji: '💥', name: 'Unstoppable',     desc: '7-day streak',               cat: 'compliance',  rarity: 'common',    check: s => s.streak >= 7 },
  { id: 'str14',   emoji: '⚡', name: 'Ironclad',        desc: '14-day streak',              cat: 'compliance',  rarity: 'rare',      check: s => s.streak >= 14 },
  { id: 'str30',   emoji: '🌟', name: 'Unbreakable',     desc: '30-day streak',              cat: 'compliance',  rarity: 'epic',      check: s => s.streak >= 30 },
  { id: 'pw1',     emoji: '✅', name: 'Perfect week',    desc: 'Complete every session',     cat: 'compliance',  rarity: 'common',    check: s => s.perfectWeeks >= 1 },
  { id: 'pw5',     emoji: '🏆', name: 'Five-star',       desc: '5 perfect weeks',            cat: 'compliance',  rarity: 'rare',      check: s => s.perfectWeeks >= 5 },
  { id: 'pw10',    emoji: '👑', name: 'Perfectionist',   desc: '10 perfect weeks',           cat: 'compliance',  rarity: 'epic',      check: s => s.perfectWeeks >= 10 },
  // Strength
  { id: 'gym5',    emoji: '🏋️', name: 'Gym debut',      desc: '5 gym sessions logged',      cat: 'strength',    rarity: 'common',    check: s => s.totalGym >= 5 },
  { id: 'gym25',   emoji: '💪', name: 'Gym warrior',     desc: '25 gym sessions',            cat: 'strength',    rarity: 'rare',      check: s => s.totalGym >= 25 },
  { id: 'gym50',   emoji: '🦾', name: 'Iron athlete',    desc: '50 gym sessions',            cat: 'strength',    rarity: 'epic',      check: s => s.totalGym >= 50 },
  // Recovery / wellness
  { id: 'well7',   emoji: '😴', name: 'Body aware',      desc: '7 wellness check-ins',       cat: 'recovery',    rarity: 'common',    check: s => s.totalWellness >= 7 },
  { id: 'well30',  emoji: '✨', name: 'Wellness master',  desc: '30 wellness check-ins',      cat: 'recovery',    rarity: 'rare',      check: s => s.totalWellness >= 30 },
  // Nutrition
  { id: 'nut7',    emoji: '🍽️', name: 'Fuel right',     desc: '7 meal tracking days',       cat: 'nutrition',   rarity: 'common',    check: s => s.nutrition >= 20 },
  { id: 'nut30',   emoji: '🥗', name: 'Nutrition pro',   desc: 'Consistent meal tracking',   cat: 'nutrition',   rarity: 'rare',      check: s => s.nutrition >= 60 },
  // Performance / races
  { id: 'race1',   emoji: '🏅', name: 'Race finisher',   desc: 'Complete a logged race',     cat: 'performance', rarity: 'rare',      check: s => s.racesComplete >= 1 },
  { id: 'race3',   emoji: '🎽', name: 'Racer',           desc: 'Complete 3 races',           cat: 'performance', rarity: 'epic',      check: s => s.racesComplete >= 3 },
  { id: 'race5',   emoji: '🏆', name: 'Racing machine',  desc: 'Complete 5 races',           cat: 'performance', rarity: 'legendary', check: s => s.racesComplete >= 5 },
  // Level milestones
  { id: 'lv5',     emoji: '🎉', name: 'Level 5!',        desc: 'Reach level 5',              cat: 'special',     rarity: 'rare',      check: s => s.level.level >= 5 },
  { id: 'lv10',    emoji: '🌟', name: 'Level 10!',       desc: 'Reach level 10',             cat: 'special',     rarity: 'epic',      check: s => s.level.level >= 10 },
  { id: 'lv15',    emoji: '👑', name: 'Elite status',    desc: 'Reach max level',            cat: 'special',     rarity: 'legendary', check: s => s.level.level >= 15 },
  // Stat milestones
  { id: 'end80',   emoji: '🫀', name: 'Iron lungs',      desc: 'Endurance stat 80+',         cat: 'distance',    rarity: 'epic',      check: s => s.endurance >= 80 },
  { id: 'str80',   emoji: '🦍', name: 'Powerhouse',      desc: 'Strength stat 80+',          cat: 'strength',    rarity: 'epic',      check: s => s.strength >= 80 },
  { id: 'all50',   emoji: '⚖️', name: 'Balanced',        desc: 'All stats above 50',         cat: 'special',     rarity: 'legendary', check: s => s.endurance >= 50 && s.strength >= 50 && s.recovery >= 50 && s.nutrition >= 50 },
]

export function checkNewBadges(stats: RPGStats, alreadyUnlocked: string[]): RPGBadge[] {
  return RPG_BADGES.filter(b =>
    !alreadyUnlocked.includes(b.id) && b.check(stats)
  )
}

// ─── SVG Character Renderer ───────────────────────────────────────────────────

export function renderCharSVG(charId: string, level: number, w: number, h: number, kitColourOverride?: string): string {
  const ch = RPG_CHARS.find(c => c.id === charId) ?? RPG_CHARS[0]
  const { skin, hair } = ch
  const isFemale = charId.startsWith('f')

  // Kit evolution based on level tier
  const rpgLevel = getLevelForXP(RPG_LEVELS.find(l => l.level === level)?.minXP ?? 0)
  const tier = rpgLevel?.tier ?? 0

  // Use override kit colour if provided, otherwise use character default
  const baseAccent = kitColourOverride ?? ch.accent

  // Kit colours evolve: grey → accent → dark → accent
  const kitCol  = [baseAccent, baseAccent, '#1a1a1a', baseAccent][tier]
  const shoeCol = ['#777', '#333', '#111', '#7B1FA2'][tier]

  // Accessories unlock at levels
  const hasWatch   = level >= 3
  const hasGlasses = level >= 6
  const hasBib     = level >= 9
  const hasGloves  = level >= 12

  // Dynamism: static → light stride → full stride
  const fullStride = level >= 7
  const dynamic    = level >= 4

  const legA1 = fullStride ? -22 : dynamic ? -12 : 0
  const legA2 = fullStride ?  16 : dynamic ?   8 : 0
  const armA1 = fullStride ? -32 : dynamic ? -18 : -5
  const armA2 = fullStride ?  26 : dynamic ?  15 :  5

  const s = Math.min(w, h) / 80
  const cx = w / 2
  const cy = h * 0.15
  const headR = 9 * s
  const bW = (isFemale ? 13 : 15) * s
  const bH = 16 * s
  const bX = cx - bW / 2
  const bY = cy + headR

  let svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`

  // Head
  svg += `<circle cx="${cx}" cy="${cy}" r="${headR}" fill="${skin}" stroke="#DDA06A" stroke-width="${0.8 * s}"/>`

  // Hair
  if (isFemale) {
    svg += `<ellipse cx="${cx}" cy="${cy - headR * 0.5}" rx="${headR * 1.1}" ry="${headR * 0.65}" fill="${hair}"/>`
  } else {
    svg += `<rect x="${cx - headR * 0.95}" y="${cy - headR * 1.05}" width="${headR * 1.9}" height="${headR * 0.7}" rx="${headR * 0.4}" fill="${hair}"/>`
  }

  // Sunglasses (level 6+)
  if (hasGlasses) {
    svg += `<rect x="${cx - headR * 0.85}" y="${cy - headR * 0.1}" width="${headR * 0.75}" height="${headR * 0.4}" rx="${headR * 0.2}" fill="#111" opacity=".9"/>`
    svg += `<rect x="${cx + headR * 0.08}" y="${cy - headR * 0.1}" width="${headR * 0.75}" height="${headR * 0.4}" rx="${headR * 0.2}" fill="#111" opacity=".9"/>`
    svg += `<line x1="${cx - headR * 0.1}" y1="${cy - headR * 0.1 + headR * 0.2}" x2="${cx + headR * 0.08}" y2="${cy - headR * 0.1 + headR * 0.2}" stroke="#111" stroke-width="${s * 0.8}"/>`
  }

  // Body / kit
  svg += `<rect x="${bX}" y="${bY}" width="${bW}" height="${bH}" rx="${3 * s}" fill="${kitCol}"/>`

  // GPS watch (level 3+)
  if (hasWatch) {
    svg += `<rect x="${bX - 5 * s}" y="${bY + 5 * s}" width="${5 * s}" height="${4 * s}" rx="${1.5 * s}" fill="#1a1a1a"/>`
    svg += `<rect x="${bX - 4.5 * s}" y="${bY + 5.5 * s}" width="${4 * s}" height="${3 * s}" rx="${s}" fill="${ch.accent}"/>`
  }

  // Race bib (level 9+)
  if (hasBib) {
    svg += `<rect x="${cx - 4 * s}" y="${bY + 3 * s}" width="${8 * s}" height="${6 * s}" rx="${s}" fill="#fff" opacity=".95"/>`
    svg += `<text x="${cx}" y="${bY + 7.5 * s}" text-anchor="middle" font-size="${3.5 * s}" fill="${kitCol}" font-weight="bold">NS</text>`
  }

  // Shorts
  const sY = bY + bH
  svg += `<rect x="${bX}" y="${sY}" width="${bW}" height="${7 * s}" rx="${2 * s}" fill="${tier >= 2 ? '#1a1a1a' : '#616161'}"/>`

  // Arms
  const armW = 5 * s, armH = 13 * s
  svg += `<rect x="${bX - armW + s}" y="${bY + s}" width="${armW}" height="${armH}" rx="${2 * s}" fill="${kitCol}" transform="rotate(${armA1},${bX + s},${bY + s})"/>`
  svg += `<rect x="${bX + bW - s}" y="${bY + s}" width="${armW}" height="${armH}" rx="${2 * s}" fill="${kitCol}" transform="rotate(${armA2},${bX + bW},${bY + s})"/>`

  // Legs
  const legY = sY + 7 * s, legW = 6 * s, legH = 17 * s
  const leg1X = bX + s, leg2X = bX + bW - legW - s
  svg += `<rect x="${leg1X}" y="${legY}" width="${legW}" height="${legH}" rx="${2.5 * s}" fill="${skin}" transform="rotate(${legA1},${cx},${legY})"/>`
  svg += `<rect x="${leg2X}" y="${legY}" width="${legW}" height="${legH}" rx="${2.5 * s}" fill="${skin}" transform="rotate(${legA2},${cx},${legY})"/>`

  // Shoes
  const shY = legY + legH - s
  svg += `<rect x="${leg1X - s}" y="${shY}" width="${9 * s}" height="${5 * s}" rx="${2 * s}" fill="${shoeCol}" transform="rotate(${legA1},${cx},${legY})"/>`
  svg += `<rect x="${leg2X - s}" y="${shY}" width="${9 * s}" height="${5 * s}" rx="${2 * s}" fill="${shoeCol}" transform="rotate(${legA2},${cx},${legY})"/>`

  svg += `</svg>`
  return svg
}

// ─── Rarity colour map ─────────────────────────────────────────────────────────

export const RARITY_CONFIG = {
  common:    { label: 'Common',    colour: 'bg-gray-100 text-gray-500',   border: 'border-gray-200',  glow: '' },
  rare:      { label: 'Rare',      colour: 'bg-blue-100 text-blue-700',   border: 'border-blue-300',  glow: 'shadow-blue-200' },
  epic:      { label: 'Epic',      colour: 'bg-purple-100 text-purple-700',border: 'border-purple-300',glow: 'shadow-purple-200' },
  legendary: { label: 'Legendary', colour: 'bg-amber-100 text-amber-700', border: 'border-amber-400', glow: 'shadow-amber-200 shadow-md' },
}

// ─── Class Reveal Coaching Insights ──────────────────────────────────────────
// Character System Spec Chapter 3: "personalised coaching insight attached to reveal"
// Format: what the class means for their training specifically

export const CLASS_COACHING_INSIGHTS: Record<RunnerClassId, string> = {
  warming_up:
    'Your training data is still building. Every session shapes your class — keep logging and your identity will reveal itself.',
  marathon_runner:
    'Long runs are your superpower — protect them by keeping them genuinely easy. Your aerobic engine is your biggest asset. Guard it with recovery weeks and you\'ll keep improving for years.',
  speed_merchant:
    'You thrive on intensity — that\'s a rare quality. But your easy days are just as important as your intervals. The adaptation happens in recovery, not the session. Protect your easy runs as seriously as you protect your track work.',
  trail_blazer:
    'Off-road running builds strength that tarmac can\'t match. The uneven terrain is developing stability you\'ll notice in your road races too. Keep the gym sessions — strength work is especially high-leverage for trail runners.',
  base_builder:
    'You\'re building something most runners skip. An aerobic base built over months is the foundation that lets you train harder, recover faster, and race better when it counts. This patience will pay off.',
  all_rounder:
    'A balanced training profile is harder to build than it looks. You\'re developing across multiple disciplines simultaneously. The challenge for All-Rounders is not letting any one area lag — watch your recovery score as a guide.',
  comeback_runner:
    'Starting again is harder than starting. The fitness will come back faster than you think — your body has muscle memory you can\'t see yet. The key is building gradually. Trust the plan, log every session, and don\'t chase where you were.',
}

// ─── Cosmetic Milestone Unlocks ───────────────────────────────────────────────
// Character System Spec Chapter 5: 8 specific cosmetic milestones

export interface CosmeticUnlock {
  id:          string
  trigger:     'first_session' | 'streak_7' | 'run_20km' | 'sessions_10' | 'total_100km' | 'first_interval' | 'first_race' | 'comeback'
  emoji:       string
  name:        string
  description: string
  coachNote:   string
  // What changes on the character visually
  cosmeticType: 'kit_colour' | 'accessory' | 'title' | 'badge' | 'shoes' | 'medal'
  cosmeticValue: string
}

export const COSMETIC_MILESTONES: CosmeticUnlock[] = [
  {
    id: 'first_session',
    trigger: 'first_session',
    emoji: '🏃',
    name: 'First Steps',
    description: 'Basic running kit unlocked',
    coachNote: 'Every training plan starts with one session. This one counts.',
    cosmeticType: 'kit_colour',
    cosmeticValue: 'default',
  },
  {
    id: 'streak_7',
    trigger: 'streak_7',
    emoji: '📅',
    name: 'Seven Days',
    description: 'Animated flame — persists while streak is active',
    coachNote: 'Seven consecutive days. Consistency is the most underrated quality in a runner.',
    cosmeticType: 'accessory',
    cosmeticValue: 'flame',
  },
  {
    id: 'run_20km',
    trigger: 'run_20km',
    emoji: '🎽',
    name: 'Technical Vest',
    description: 'Lightweight technical vest replaces basic kit',
    coachNote: 'Your aerobic base is developing. Runs at this distance start building the engine that powers everything faster.',
    cosmeticType: 'kit_colour',
    cosmeticValue: 'technical_vest',
  },
  {
    id: 'sessions_10',
    trigger: 'sessions_10',
    emoji: '⭐',
    name: 'Finding My Pace',
    description: 'Title appears under character name in squad view',
    coachNote: 'Double digits. The first 10 sessions are where habits are built. You\'ve built one.',
    cosmeticType: 'title',
    cosmeticValue: 'Finding My Pace',
  },
  {
    id: 'total_100km',
    trigger: 'total_100km',
    emoji: '👟',
    name: 'Trail Shoes',
    description: 'Distinctive trail shoes — visible to squad',
    coachNote: '100km done. Your body has adapted to training load it couldn\'t handle before. The base is building.',
    cosmeticType: 'shoes',
    cosmeticValue: 'trail',
  },
  {
    id: 'first_interval',
    trigger: 'first_interval',
    emoji: '🔥',
    name: 'Speed Work',
    description: 'Red accent colouring available for kit customisation',
    coachNote: 'Interval training is where speed is built. The discomfort is the point — your body is adapting.',
    cosmeticType: 'kit_colour',
    cosmeticValue: 'red_accent',
  },
  {
    id: 'first_race',
    trigger: 'first_race',
    emoji: '🏅',
    name: 'Finisher',
    description: 'Finisher medal on character permanently — colour reflects race distance',
    coachNote: 'You trained for it. You showed up. That\'s the whole thing.',
    cosmeticType: 'medal',
    cosmeticValue: 'finisher',
  },
  {
    id: 'comeback',
    trigger: 'comeback',
    emoji: '💫',
    name: 'The Return',
    description: 'Special return visual treatment on first session back',
    coachNote: 'Starting again is harder than starting. The fitness will come back faster than you think.',
    cosmeticType: 'badge',
    cosmeticValue: 'comeback',
  },
]

/**
 * Check which cosmetic milestones a runner has unlocked.
 * Returns array of unlocked milestone IDs.
 */
export function computeUnlockedCosmetics(stats: {
  totalSessions: number
  totalKm: number
  streakDays: number
  hasLoggedRace: boolean
  hasLoggedInterval: boolean
  hasRun20km: boolean        // single run ≥ 20km
  isComeback: boolean
}): string[] {
  const unlocked: string[] = []
  if (stats.totalSessions >= 1)    unlocked.push('first_session')
  if (stats.streakDays >= 7)       unlocked.push('streak_7')
  if (stats.hasRun20km)            unlocked.push('run_20km')
  if (stats.totalSessions >= 10)   unlocked.push('sessions_10')
  if (stats.totalKm >= 100)        unlocked.push('total_100km')
  if (stats.hasLoggedInterval)     unlocked.push('first_interval')
  if (stats.hasLoggedRace)         unlocked.push('first_race')
  if (stats.isComeback)            unlocked.push('comeback')
  return unlocked
}

// ─── Warming Up Anticipation ──────────────────────────────────────────────────
// Character System Spec Chapter 3: weeks 1-3 show subtle anticipation indicator

export type WarmingUpPhase =
  | 'too-early'      // < 6 sessions — no indicator yet
  | 'taking-shape'   // 6–11 sessions — "Your runner is taking shape."
  | 'almost-there'   // 12+ sessions or week 3 — "Your class reveals after next session week."
  | 'ready'          // reveal conditions met

export function getWarmingUpPhase(
  totalSessionsDone: number,
  weekCount: number,
  revealReady: boolean,
): WarmingUpPhase {
  if (revealReady) return 'ready'
  if (totalSessionsDone < 6) return 'too-early'
  if (weekCount >= 3 || totalSessionsDone >= 12) return 'almost-there'
  return 'taking-shape'
}

export const WARMING_UP_COPY: Record<WarmingUpPhase, { headline: string; sub: string } | null> = {
  'too-early':    null,
  'taking-shape': { headline: 'Your runner is taking shape.', sub: 'Keep logging — your class will reveal at week 4.' },
  'almost-there': { headline: 'Your class reveals soon.', sub: 'One more week of training data and we\'ll know who you are.' },
  'ready':        { headline: 'Your class is ready to reveal.', sub: 'Tap to discover your runner identity.' },
}
