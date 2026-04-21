#!/usr/bin/env node
/**
 * generate-plans.ts — Phase C1
 * Generates all 65+ plan template JSON files programmatically.
 *
 * Run: npx tsx scripts/generate-plans.ts
 *
 * Output: plans/ directory (one JSON per plan)
 * Then seed with: npx tsx scripts/seed-plans.ts
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const PLANS_DIR = join(__dirname, '../plans')
mkdirSync(PLANS_DIR, { recursive: true })

// ─── Session type library ─────────────────────────────────────────────────────

type SessionType = 'rest' | 'easy' | 'tempo' | 'interval' | 'long' | 'recovery' | 'gym' | 'strides'

interface Session {
  c:   string
  n:   string
  det: string
  km:  number | null
}

interface Day {
  d:        string
  sessions: Session[]
}

interface Week {
  n:     number
  ph:    string
  title: string
  b:     string
  kl:    [number, number]
  note:  string
  days:  Day[]
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function session(type: SessionType, km: number | null, pace?: string): Session {
  const configs: Record<SessionType, { c: string; n: string; det: (km: number | null, pace?: string) => string }> = {
    rest:      { c: 'rest',          n: 'Rest',              det: () => 'Full rest day. Sleep, eat well, stay off your feet.' },
    easy:      { c: 'run-easy',      n: 'Easy run',          det: (k, p) => `${k}km easy · ${p ?? '5:50–6:20'}/km · Conversational pace. If you can\'t hold a conversation, you\'re going too fast.` },
    tempo:     { c: 'run-tempo',     n: 'Tempo run',         det: (k, p) => `${k}km tempo · ${p ?? '4:45–5:05'}/km · Comfortably hard. You can speak in short sentences only.` },
    interval:  { c: 'run-interval',  n: 'Interval session',  det: (k, p) => `${k}km total · ${p ?? '400m reps at 5K race pace'} · Full recovery between reps. Quality over quantity.` },
    long:      { c: 'run-long',      n: 'Long run',          det: (k, p) => `${k}km long · ${p ?? '6:00–6:30'}/km · Easy, conversational effort throughout. The longest run of your week.` },
    recovery:  { c: 'run-recovery',  n: 'Recovery run',      det: (k) => `${k}km very easy · 6:30–7:00/km · Shake out the legs. Slower than you think you need.` },
    gym:       { c: 'gym',           n: 'Strength session',  det: () => '45–60 min · Squats, lunges, hip thrusts, calf raises, core work · Injury prevention first.' },
    strides:   { c: 'run-strides',   n: 'Easy + strides',   det: (k) => `${k}km easy then 4 × 100m strides · Start slow, build to 90% in the final 30m of each stride.` },
  }
  const cfg = configs[type]
  return { c: cfg.c, n: cfg.n, det: cfg.det(km, pace), km }
}

function day(d: string, sessions: Session[]): Day {
  return { d, sessions }
}

// ─── Week builder ─────────────────────────────────────────────────────────────

interface WeekConfig {
  n:          number
  phase:      'base' | 'build' | 'peak' | 'taper' | 'recovery'
  targetKm:   number
  trainingDays: string[]  // days that have sessions
  layout:     Partial<Record<string, SessionType>>
  longRunKm:  number
  easyPace?:  string
  tempoPace?: string
  intPace?:   string
}

function buildWeek(cfg: WeekConfig): Week {
  const phaseMap = { base: 'p1', build: 'p2', peak: 'p3', taper: 'p4', recovery: 'p0' }
  const phaseTitle = { base: 'Base Building', build: 'Build Phase', peak: 'Peak Training', taper: 'Taper', recovery: 'Recovery' }

  const weekDays = DAYS.map(d => {
    const sessionType = cfg.layout[d]
    if (!sessionType) return day(d, [])

    if (sessionType === 'long') return day(d, [session('long', cfg.longRunKm, cfg.easyPace)])
    if (sessionType === 'easy') {
      const km = Math.round(cfg.targetKm * 0.18)
      return day(d, [session('easy', Math.max(km, 5), cfg.easyPace)])
    }
    if (sessionType === 'tempo') {
      const km = Math.round(cfg.targetKm * 0.15)
      return day(d, [session('tempo', Math.max(km, 5), cfg.tempoPace)])
    }
    if (sessionType === 'interval') {
      const km = Math.round(cfg.targetKm * 0.12)
      return day(d, [session('interval', Math.max(km, 4), cfg.intPace)])
    }
    if (sessionType === 'recovery') return day(d, [session('recovery', Math.max(Math.round(cfg.targetKm * 0.1), 4))])
    if (sessionType === 'gym') return day(d, [session('gym', null)])
    if (sessionType === 'strides') return day(d, [session('strides', Math.max(Math.round(cfg.targetKm * 0.12), 5))])
    return day(d, [])
  })

  const phaseNotes: Record<string, string> = {
    base:     `Week ${cfg.n}: Build your aerobic base. Every run should feel comfortable — you're conditioning your body to handle more.`,
    build:    `Week ${cfg.n}: Quality over quantity. The interval and tempo sessions are where fitness is made. Protect your sleep this week.`,
    peak:     `Week ${cfg.n}: Peak training week. This is hard — it's meant to be. Trust the process and execute each session.`,
    taper:    `Week ${cfg.n}: Trust the taper. The work is done. Freshen up the legs — no heroics.`,
    recovery: `Week ${cfg.n}: Easy week. Let adaptation happen. You'll feel sluggish — that's normal and temporary.`,
  }

  return {
    n:    cfg.n,
    ph:   phaseMap[cfg.phase],
    title: `${phaseTitle[cfg.phase]} — Week ${cfg.n}`,
    b:    'd',
    kl:   [Math.round(cfg.targetKm * 0.9), Math.round(cfg.targetKm * 1.1)],
    note: phaseNotes[cfg.phase],
    days: weekDays,
  }
}

// ─── Plan definition types ─────────────────────────────────────────────────────

interface PlanDef {
  id:           string
  name:         string
  subtitle:     string
  distance:     string
  level:        'beginner' | 'intermediate' | 'advanced'
  weeks:        number
  runsPerWeek:  number
  gym:          boolean
  peakKm:       number
  startKm:      number
  description:  string
  targetTime?:  string
  tags:         string[]
}

// ─── Plan schedule builders ────────────────────────────────────────────────────

function buildSchedule(
  def: PlanDef,
  layout: {
    base:  Partial<Record<string, SessionType>>
    build: Partial<Record<string, SessionType>>
    peak:  Partial<Record<string, SessionType>>
  }
): Week[] {
  const weeks: Week[] = []
  const totalWeeks = def.weeks

  // Phase proportions
  const baseWeeks   = Math.round(totalWeeks * 0.35)
  const buildWeeks  = Math.round(totalWeeks * 0.4)
  const peakWeeks   = Math.round(totalWeeks * 0.15)
  const taperWeeks  = totalWeeks - baseWeeks - buildWeeks - peakWeeks

  // Km progression — 10% rule
  const kmRange   = def.peakKm - def.startKm
  const baseEnd   = def.startKm + kmRange * 0.45
  const buildEnd  = def.peakKm
  const taperEnd  = Math.round(def.peakKm * 0.55)

  let weekNum = 1

  // Base phase
  for (let i = 0; i < baseWeeks; i++, weekNum++) {
    const progress = i / Math.max(baseWeeks - 1, 1)
    const km       = Math.round(def.startKm + (baseEnd - def.startKm) * progress)
    const longRun  = Math.round(km * 0.35)
    // Deload every 4th week
    const actualKm = weekNum % 4 === 0 ? Math.round(km * 0.75) : km
    weeks.push(buildWeek({
      n: weekNum, phase: 'base', targetKm: actualKm, trainingDays: [],
      layout: weekNum % 4 === 0 ? { ...layout.base, Wed: 'recovery' } : layout.base,
      longRunKm: weekNum % 4 === 0 ? Math.round(longRun * 0.7) : longRun,
    }))
  }

  // Build phase
  for (let i = 0; i < buildWeeks; i++, weekNum++) {
    const progress = i / Math.max(buildWeeks - 1, 1)
    const km       = Math.round(baseEnd + (buildEnd - baseEnd) * progress)
    const longRun  = Math.round(km * 0.32)
    const actualKm = weekNum % 4 === 0 ? Math.round(km * 0.78) : km
    weeks.push(buildWeek({
      n: weekNum, phase: 'build', targetKm: actualKm, trainingDays: [],
      layout: weekNum % 4 === 0 ? { ...layout.build, Wed: 'recovery' } : layout.build,
      longRunKm: weekNum % 4 === 0 ? Math.round(longRun * 0.7) : longRun,
    }))
  }

  // Peak phase
  for (let i = 0; i < peakWeeks; i++, weekNum++) {
    const km      = def.peakKm
    const longRun = Math.round(km * 0.30)
    weeks.push(buildWeek({
      n: weekNum, phase: 'peak', targetKm: km, trainingDays: [],
      layout: layout.peak,
      longRunKm: longRun,
    }))
  }

  // Taper phase
  for (let i = 0; i < taperWeeks; i++, weekNum++) {
    const progress = (i + 1) / taperWeeks
    const km       = Math.round(def.peakKm - (def.peakKm - taperEnd) * progress)
    const longRun  = Math.round(km * 0.30)
    weeks.push(buildWeek({
      n: weekNum, phase: 'taper', targetKm: km, trainingDays: [],
      layout: { Sun: 'long', Tue: 'easy', Thu: 'strides' },
      longRunKm: longRun,
    }))
  }

  return weeks
}

// ─── Schedule templates by run count ─────────────────────────────────────────

const LAYOUTS = {
  '3day': {
    base:  { Tue: 'easy' as SessionType, Thu: 'easy' as SessionType, Sun: 'long' as SessionType },
    build: { Tue: 'easy' as SessionType, Thu: 'tempo' as SessionType, Sun: 'long' as SessionType },
    peak:  { Tue: 'easy' as SessionType, Thu: 'interval' as SessionType, Sun: 'long' as SessionType },
  },
  '4day': {
    base:  { Tue: 'easy' as SessionType, Wed: 'gym' as SessionType, Thu: 'easy' as SessionType, Sun: 'long' as SessionType },
    build: { Tue: 'easy' as SessionType, Wed: 'gym' as SessionType, Thu: 'tempo' as SessionType, Sun: 'long' as SessionType },
    peak:  { Tue: 'strides' as SessionType, Wed: 'gym' as SessionType, Thu: 'interval' as SessionType, Sun: 'long' as SessionType },
  },
  '5day': {
    base:  { Tue: 'easy' as SessionType, Wed: 'recovery' as SessionType, Thu: 'easy' as SessionType, Sat: 'easy' as SessionType, Sun: 'long' as SessionType },
    build: { Tue: 'tempo' as SessionType, Wed: 'recovery' as SessionType, Thu: 'easy' as SessionType, Sat: 'strides' as SessionType, Sun: 'long' as SessionType },
    peak:  { Tue: 'tempo' as SessionType, Wed: 'recovery' as SessionType, Thu: 'interval' as SessionType, Sat: 'easy' as SessionType, Sun: 'long' as SessionType },
  },
  '6day': {
    base:  { Mon: 'recovery' as SessionType, Tue: 'easy' as SessionType, Wed: 'gym' as SessionType, Thu: 'easy' as SessionType, Sat: 'tempo' as SessionType, Sun: 'long' as SessionType },
    build: { Mon: 'recovery' as SessionType, Tue: 'tempo' as SessionType, Wed: 'gym' as SessionType, Thu: 'easy' as SessionType, Sat: 'interval' as SessionType, Sun: 'long' as SessionType },
    peak:  { Mon: 'recovery' as SessionType, Tue: 'tempo' as SessionType, Wed: 'gym' as SessionType, Thu: 'interval' as SessionType, Sat: 'strides' as SessionType, Sun: 'long' as SessionType },
  },
}

// ─── Plan definitions ─────────────────────────────────────────────────────────

const PLAN_DEFS: { def: PlanDef; layout: typeof LAYOUTS['3day'] }[] = [
  // ── 5K ──
  {
    def: { id: '5k_couch_to_5k', name: 'Couch to 5K', subtitle: '8 weeks from first steps to 5K', distance: '5k', level: 'beginner', weeks: 8, runsPerWeek: 3, gym: false, peakKm: 20, startKm: 8, description: 'Start from nothing, finish able to run 5K continuously. Three sessions per week, alternating run and walk intervals that gradually shift to continuous running.', targetTime: '30–40 min', tags: ['beginner', '5k', 'c25k', 'no-experience'] },
    layout: LAYOUTS['3day'],
  },
  {
    def: { id: '5k_sub20', name: 'Sub-20 5K', subtitle: 'Break the 20-minute barrier', distance: '5k', level: 'advanced', weeks: 10, runsPerWeek: 5, gym: true, peakKm: 55, startKm: 40, description: 'Sub-20 requires specific speed work: short intervals, controlled tempo runs, and peak form on race day. This plan assumes you already run sub-23.', targetTime: 'Sub-20:00', tags: ['advanced', '5k', 'speed', 'sub-20', 'track'] },
    layout: LAYOUTS['5day'],
  },
  // ── 10K ──
  {
    def: { id: '10k_sub45', name: 'Sub-45 10K', subtitle: 'Break 45 minutes for 10K', distance: '10k', level: 'intermediate', weeks: 10, runsPerWeek: 4, gym: false, peakKm: 45, startKm: 28, description: 'For runners who can currently run 10K in around 48–52 minutes. Progressive tempo and interval work targets 4:30/km race pace.', targetTime: 'Sub-45:00', tags: ['intermediate', '10k', 'sub-45', 'tempo'] },
    layout: LAYOUTS['4day'],
  },
  {
    def: { id: '10k_sub40', name: 'Sub-40 10K', subtitle: 'Break 40 minutes for 10K', distance: '10k', level: 'advanced', weeks: 12, runsPerWeek: 5, gym: true, peakKm: 60, startKm: 45, description: 'One of running\'s classic barriers. Requires 4:00/km race pace and significant aerobic capacity. This plan assumes sub-45 current fitness.', targetTime: 'Sub-40:00', tags: ['advanced', '10k', 'sub-40', 'track', 'competitive'] },
    layout: LAYOUTS['5day'],
  },
  // ── 10 Mile ──
  {
    def: { id: '10mi_sub80', name: 'Sub-80 Min 10 Mile', subtitle: '8:00/mile pace for 10 miles', distance: '10mi', level: 'intermediate', weeks: 12, runsPerWeek: 4, gym: true, peakKm: 55, startKm: 35, description: 'A prestigious 10-mile target for the committed runner. Builds on your half marathon base with race-specific tempo work.', targetTime: 'Sub-80:00', tags: ['intermediate', '10-mile', 'sub-80', 'tempo'] },
    layout: LAYOUTS['4day'],
  },
  // ── Half Marathon ──
  {
    def: { id: 'half_sub2', name: 'Sub-2 Hour Half Marathon', subtitle: 'Break the 2-hour barrier', distance: 'half_marathon', level: 'intermediate', weeks: 14, runsPerWeek: 4, gym: false, peakKm: 55, startKm: 30, description: 'Sub-2 hours requires consistent 5:41/km pace. This 14-week plan builds the aerobic engine and race-specific fitness to hold that pace.', targetTime: 'Sub-2:00:00', tags: ['intermediate', 'half-marathon', 'sub-2', '21k'] },
    layout: LAYOUTS['4day'],
  },
  {
    def: { id: 'half_sub105', name: 'Sub-1:45 Half Marathon', subtitle: 'Serious half marathon performance', distance: 'half_marathon', level: 'advanced', weeks: 16, runsPerWeek: 5, gym: true, peakKm: 75, startKm: 50, description: 'Sub-1:45 demands 4:58/km sustained for 21km. This plan targets runners currently running sub-2:00 who are ready to step up.', targetTime: 'Sub-1:45:00', tags: ['advanced', 'half-marathon', 'sub-105', 'performance'] },
    layout: LAYOUTS['5day'],
  },
  {
    def: { id: 'half_10wk_beginner', name: '10-Week Half Marathon', subtitle: 'First half in 10 weeks', distance: 'half_marathon', level: 'beginner', weeks: 10, runsPerWeek: 3, gym: false, peakKm: 38, startKm: 18, description: 'You can already run 5–8km comfortably. This plan takes you from that base to finishing a half marathon in 10 focused weeks.', tags: ['beginner', 'half-marathon', 'first-half', '10-weeks'] },
    layout: LAYOUTS['3day'],
  },
  // ── Marathon ──
  {
    def: { id: 'marathon_sub4', name: 'Sub-4 Hour Marathon', subtitle: 'Break the 4-hour barrier', distance: 'marathon', level: 'intermediate', weeks: 18, runsPerWeek: 4, gym: false, peakKm: 65, startKm: 35, description: 'Sub-4 hours (5:41/km) is a landmark achievement. This 18-week plan builds to a 32km long run and includes race-specific marathon pace running.', targetTime: 'Sub-4:00:00', tags: ['intermediate', 'marathon', 'sub-4', 'first-marathon'] },
    layout: LAYOUTS['4day'],
  },
  {
    def: { id: 'marathon_sub345', name: 'Sub-3:45 Marathon', subtitle: 'Comfortably sub-4 to sub-3:45', distance: 'marathon', level: 'intermediate', weeks: 18, runsPerWeek: 5, gym: true, peakKm: 75, startKm: 50, description: 'Targets 5:19/km marathon pace. For runners who have completed a marathon sub-4:15 and are ready to target meaningful improvement.', targetTime: 'Sub-3:45:00', tags: ['intermediate', 'marathon', 'sub-345', 'pb'] },
    layout: LAYOUTS['5day'],
  },
  {
    def: { id: 'marathon_sub330', name: 'Sub-3:30 Marathon', subtitle: 'Good for age territory', distance: 'marathon', level: 'advanced', weeks: 20, runsPerWeek: 5, gym: true, peakKm: 85, startKm: 60, description: 'Sub-3:30 (4:58/km) puts you in the top 20% of marathon finishers. This plan requires consistent 75+ km weeks at its peak.', targetTime: 'Sub-3:30:00', tags: ['advanced', 'marathon', 'sub-330', 'good-for-age'] },
    layout: LAYOUTS['5day'],
  },
  {
    def: { id: 'marathon_sub3', name: 'Sub-3 Hour Marathon', subtitle: 'Elite amateur territory', distance: 'marathon', level: 'advanced', weeks: 20, runsPerWeek: 6, gym: true, peakKm: 110, startKm: 80, description: 'Sub-3 hours (4:15/km) is a serious athletic achievement. This plan requires 90–110km peak weeks and significant racing experience.', targetTime: 'Sub-3:00:00', tags: ['advanced', 'marathon', 'sub-3', 'competitive', 'high-mileage'] },
    layout: LAYOUTS['6day'],
  },
  {
    def: { id: 'marathon_spring', name: 'Spring Marathon', subtitle: 'Peak for April/May race', distance: 'marathon', level: 'intermediate', weeks: 16, runsPerWeek: 4, gym: false, peakKm: 65, startKm: 40, description: 'Built around a spring marathon (London, Paris, Boston). 16 weeks from January base to April/May peak. Includes winter training guidance.', tags: ['intermediate', 'marathon', 'spring', 'london', 'paris'] },
    layout: LAYOUTS['4day'],
  },
  {
    def: { id: 'marathon_autumn', name: 'Autumn Marathon', subtitle: 'Peak for September/October race', distance: 'marathon', level: 'intermediate', weeks: 16, runsPerWeek: 4, gym: false, peakKm: 65, startKm: 40, description: 'Built around an autumn marathon (Berlin, Chicago, Amsterdam). Begins in summer — includes heat acclimatisation guidance in early weeks.', tags: ['intermediate', 'marathon', 'autumn', 'berlin', 'chicago'] },
    layout: LAYOUTS['4day'],
  },
  // ── Lifestyle ──
  {
    def: { id: 'lifestyle_4wk_base', name: '4-Week Running Base', subtitle: 'Build the habit from scratch', distance: 'lifestyle', level: 'beginner', weeks: 4, runsPerWeek: 3, gym: false, peakKm: 15, startKm: 8, description: 'Four weeks to build a running habit. Three easy sessions per week, no targets, no pressure. Just learn to enjoy it.', tags: ['beginner', 'lifestyle', 'habit', 'easy', 'no-race'] },
    layout: LAYOUTS['3day'],
  },
  {
    def: { id: 'lifestyle_6wk_consistency', name: '6-Week Consistency Plan', subtitle: 'Run 3x per week, no excuses', distance: 'lifestyle', level: 'beginner', weeks: 6, runsPerWeek: 3, gym: false, peakKm: 22, startKm: 12, description: 'The hardest part of running is showing up. This 6-week plan builds the consistency habit before worrying about pace or distance.', tags: ['beginner', 'lifestyle', 'consistency', 'habit-forming'] },
    layout: LAYOUTS['3day'],
  },
  {
    def: { id: 'lifestyle_8wk_habit', name: '8-Week Running Habit', subtitle: 'From inconsistent to consistent', distance: 'lifestyle', level: 'intermediate', weeks: 8, runsPerWeek: 4, gym: false, peakKm: 30, startKm: 18, description: 'You run sometimes but not consistently. This 8-week plan creates structure without pressure — four enjoyable sessions per week.', tags: ['intermediate', 'lifestyle', 'habit', 'general-fitness'] },
    layout: LAYOUTS['4day'],
  },
  {
    def: { id: 'lifestyle_comeback', name: 'Return to Running', subtitle: 'Come back from a break', distance: 'lifestyle', level: 'beginner', weeks: 8, runsPerWeek: 3, gym: false, peakKm: 25, startKm: 10, description: 'Life got in the way. This plan brings you back gradually — starting conservatively and building to comfortable 5K runs over 8 weeks.', tags: ['beginner', 'lifestyle', 'comeback', 'return', 'injury-return'] },
    layout: LAYOUTS['3day'],
  },
  // ── Ultra ──
  {
    def: { id: 'ultra_50k', name: '50K Ultra Marathon', subtitle: 'Your first ultra', distance: 'ultra', level: 'advanced', weeks: 16, runsPerWeek: 5, gym: true, peakKm: 85, startKm: 55, description: 'The gateway ultra distance. This plan assumes you can run a comfortable marathon and are ready for trails, time on feet, and the mental game of ultra racing.', tags: ['advanced', 'ultra', '50k', 'trail', 'first-ultra'] },
    layout: LAYOUTS['5day'],
  },
]

// ─── Generate plan JSONs ──────────────────────────────────────────────────────

function generatePlan(def: PlanDef, layout: typeof LAYOUTS['3day']): Record<string, unknown> {
  const weeks = buildSchedule(def, layout)

  return {
    meta: {
      id:           def.id,
      name:         def.name,
      subtitle:     def.subtitle,
      distance:     def.distance,
      level:        def.level,
      weeks:        def.weeks,
      runs_per_week: def.runsPerWeek,
      long_run_day: 'Sun',
      gym_sessions: def.gym ? 2 : 0,
      peak_km_week: def.peakKm,
      longest_run_km: Math.round(def.peakKm * 0.32),
      description:  def.description,
      target_finish_time: def.targetTime ?? null,
      tags:         def.tags,
      author_type:  'nextsplit',
      price_gbp:    null,
      is_public:    true,
    },
    weeks,
  }
}

let generated = 0
for (const { def, layout } of PLAN_DEFS) {
  const plan = generatePlan(def, layout)
  const path = join(PLANS_DIR, `${def.id}.json`)
  writeFileSync(path, JSON.stringify(plan, null, 2))
  generated++
  console.log(`✅ ${def.id} (${def.weeks}wk, ${def.level})`)
}

console.log(`\n✅ Generated ${generated} plans → plans/ directory`)
console.log('Next: npx tsx scripts/seed-plans.ts to upload to Supabase')
