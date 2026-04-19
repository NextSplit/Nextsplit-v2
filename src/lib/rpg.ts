// ─── NextSplit RPG Engine ─────────────────────────────────────────────────────
// Full RPG character progression: 6 characters, 15 levels, 4 stat bars,
// 32 badges, evolving SVG avatars, cross-plan XP persistence

// ─── Characters ───────────────────────────────────────────────────────────────

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
  { id: 'm1', label: 'Alex',   skin: '#FFCC99', hair: '#3E2723', body: 'lean',   accent: '#0D9488', specialty: 'Endurance specialist' },
  { id: 'm2', label: 'Marcus', skin: '#8D5524', hair: '#1a1a1a', body: 'stocky', accent: '#DC2626', specialty: 'Power athlete' },
  { id: 'm3', label: 'Kai',    skin: '#F1C27D', hair: '#4E342E', body: 'tall',   accent: '#7C3AED', specialty: 'Versatile runner' },
  { id: 'f1', label: 'Sarah',  skin: '#FFCC99', hair: '#5D4037', body: 'lean',   accent: '#0D9488', specialty: 'Marathon machine' },
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

export const SESSION_XP: Record<string, number> = {
  'run-easy':  10,
  'run-tempo': 20,
  'run-int':   25,
  'run-long':  40,
  'run-mp':    30,
  'run-race':  100,
  'gym-a':     20,
  'gym-b':     20,
  'gym-c':     20,
  'gym-bw':    12,
  'cross':     15,   // cross-training (cycling, swimming etc.)
  'walk':      8,    // walking / hiking
  'pilates':   8,
  'sauna':     5,
  'rest':      2,
}

export function getSessionXP(code: string): number {
  return SESSION_XP[code] ?? 10
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
