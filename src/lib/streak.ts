// ─── Streak & Consistency ─────────────────────────────────────────────────────

export interface StreakData {
  current: number        // consecutive days with a logged session
  longest: number        // all-time longest streak
  thisWeekPct: number    // % of planned sessions done this week (0–100)
  last4WeekPct: number   // % of planned sessions done over last 4 weeks (0–100)
  totalDaysLogged: number
}

/** Get all unique calendar dates where at least one session was logged */
function loggedDays(logs: Array<{ logged_at: string; done: boolean }>): Set<string> {
  return new Set(
    logs.filter(l => l.done).map(l => l.logged_at.slice(0, 10))
  )
}

/** Calculate current and longest streaks */
export function computeStreak(
  logs: Array<{ logged_at: string; done: boolean }>
): StreakData {
  const done = loggedDays(logs)
  const totalDaysLogged = done.size

  if (done.size === 0) {
    return { current: 0, longest: 0, thisWeekPct: 0, last4WeekPct: 0, totalDaysLogged: 0 }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Current streak — walk backwards from today
  let current = 0
  const check = new Date(today)

  // If today has no log yet, still count streak from yesterday
  if (!done.has(check.toISOString().slice(0, 10))) {
    check.setDate(check.getDate() - 1)
  }

  while (done.has(check.toISOString().slice(0, 10))) {
    current++
    check.setDate(check.getDate() - 1)
    if (current > 365) break // safety
  }

  // Longest streak — scan all logged days sorted
  const sorted = [...done].sort()
  let longest = 0
  let run = 1

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const curr = new Date(sorted[i])
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000)
    if (diffDays === 1) {
      run++
      if (run > longest) longest = run
    } else {
      run = 1
    }
  }
  if (longest === 0 && sorted.length > 0) longest = 1

  return {
    current,
    longest,
    thisWeekPct: 0, // computed separately with plan data
    last4WeekPct: 0,
    totalDaysLogged,
  }
}

/** Compute this-week and 4-week completion percentages */
export function computeConsistency(
  logs: Array<{ week_n: number; done: boolean }>,
  weeks: Array<{ n: number; days: Array<{ sessions: unknown[] }> }>,
  currentWeekN: number
): { thisWeekPct: number; last4WeekPct: number } {
  function weekStats(weekN: number) {
    const week = weeks.find(w => w.n === weekN)
    if (!week) return { planned: 0, done: 0 }
    const planned = week.days.reduce((a, d) => a + d.sessions.length, 0)
    const done = logs.filter(l => l.week_n === weekN && l.done).length
    return { planned, done }
  }

  const thisWeek = weekStats(currentWeekN)
  const thisWeekPct = thisWeek.planned > 0
    ? Math.round((thisWeek.done / thisWeek.planned) * 100)
    : 0

  // Last 4 weeks (including current)
  let totalPlanned = 0, totalDone = 0
  for (let wn = currentWeekN - 3; wn <= currentWeekN; wn++) {
    const { planned, done } = weekStats(wn)
    totalPlanned += planned
    totalDone += done
  }
  const last4WeekPct = totalPlanned > 0
    ? Math.round((totalDone / totalPlanned) * 100)
    : 0

  return { thisWeekPct, last4WeekPct }
}

// ─── Predicted Race Time ──────────────────────────────────────────────────────

export interface RacePrediction {
  distanceLabel: string
  distanceKm: number
  predictedTimeStr: string
  predictedPaceStr: string
  basisLabel: string   // e.g. "based on your 5K PB"
  confidence: 'high' | 'medium' | 'low'
}

/** Riegel's formula: T2 = T1 × (D2/D1)^1.06 */
function riegelPredict(t1Secs: number, d1Km: number, d2Km: number): number {
  return t1Secs * Math.pow(d2Km / d1Km, 1.06)
}

function secsToHMS(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.round(secs % 60)
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${m}:${String(s).padStart(2,'0')}`
}

function paceToSecs(pace: string): number {
  const parts = pace.split(':')
  if (parts.length !== 2) return 0
  return parseInt(parts[0]) * 60 + parseInt(parts[1])
}

const RACE_DISTANCES = [
  { label: '5K',       km: 5 },
  { label: '10K',      km: 10 },
  { label: 'Half',     km: 21.0975 },
  { label: 'Marathon', km: 42.195 },
]

/**
 * Predict race time for a target distance using best logged pace as basis.
 * Uses Riegel's formula. Falls back to recent average pace if no PB.
 */
export function predictRaceTime(
  targetKm: number,
  logs: Array<{ km: number | null; pace: string | null; done: boolean; week_n: number }>,
  currentWeekN: number
): RacePrediction | null {
  const targetLabel = RACE_DISTANCES.find(d => Math.abs(d.km - targetKm) < 1)?.label
    ?? `${targetKm}km`

  // Collect all runs with pace + km
  const runs = logs
    .filter(l => l.done && l.km && l.km >= 3 && l.pace)
    .map(l => {
      const paceSecs = paceToSecs(l.pace!)
      return { km: l.km!, paceSecs, totalSecs: paceSecs * l.km!, week_n: l.week_n }
    })
    .filter(r => r.paceSecs > 0)

  if (runs.length === 0) return null

  // Find the run closest in distance to any known reference distance
  // Prefer runs of longer distances for more accurate Riegel projection
  const TOLERANCE = 0.15
  let bestBasis: { run: typeof runs[0]; dist: typeof RACE_DISTANCES[0] } | null = null

  // Try each reference distance from longest to shortest (longer = more accurate Riegel)
  for (const dist of [...RACE_DISTANCES].reverse()) {
    const matching = runs.filter(r => Math.abs(r.km - dist.km) / dist.km <= TOLERANCE)
    if (matching.length === 0) continue
    // Pick the fastest (most optimistic — true performance potential)
    const fastest = matching.reduce((a, b) => a.totalSecs < b.totalSecs ? a : b)
    // Don't extrapolate to much shorter distances (less reliable)
    if (dist.km <= targetKm * 0.4) continue
    bestBasis = { run: fastest, dist }
    break
  }

  // Fallback: use best recent pace from any run ≥ 3km
  if (!bestBasis) {
    const recentRuns = runs
      .filter(r => r.week_n >= currentWeekN - 4)
      .sort((a, b) => a.paceSecs - b.paceSecs)
    if (recentRuns.length === 0) return null

    const best = recentRuns[0]
    const projectedSecs = riegelPredict(best.totalSecs, best.km, targetKm)
    const projectedPaceSecs = projectedSecs / targetKm

    return {
      distanceLabel: targetLabel,
      distanceKm: targetKm,
      predictedTimeStr: secsToHMS(projectedSecs),
      predictedPaceStr: secsToHMS(projectedPaceSecs),
      basisLabel: `based on recent ${best.km}km run`,
      confidence: best.km < targetKm * 0.5 ? 'low' : 'medium',
    }
  }

  const projectedSecs = riegelPredict(
    bestBasis.run.totalSecs,
    bestBasis.run.km,
    targetKm
  )
  const projectedPaceSecs = projectedSecs / targetKm

  // Confidence: high if basis distance is ≥ 50% of target, medium if 30–50%, low if < 30%
  const ratio = bestBasis.run.km / targetKm
  const confidence: 'high' | 'medium' | 'low' =
    ratio >= 0.5 ? 'high' : ratio >= 0.3 ? 'medium' : 'low'

  return {
    distanceLabel: targetLabel,
    distanceKm: targetKm,
    predictedTimeStr: secsToHMS(projectedSecs),
    predictedPaceStr: secsToHMS(projectedPaceSecs),
    basisLabel: `based on your ${bestBasis.dist.label} pace`,
    confidence,
  }
}

// ─── Monday Weekly Report ─────────────────────────────────────────────────────

export interface WeeklyReport {
  weekN: number
  weekTitle: string
  sessionsPlanned: number
  sessionsDone: number
  kmPlanned: number
  kmLogged: number
  avgEffort: number | null
  bestSession: string | null       // name of highest-effort session
  vsLastWeek: 'up' | 'down' | 'same' | 'first'
  lastWeekKm: number
  completionPct: number
  lookAheadNote: string            // from next week's plan
}

export function computeWeeklyReport(
  logs: Array<{ week_n: number; done: boolean; km: number | null; effort: number | null; day_i: number; session_i: number }>,
  weeks: Array<{ n: number; title: string; note: string; kl: [number, number]; days: Array<{ sessions: Array<{ n: string; km: number }> }> }>,
  currentWeekN: number
): WeeklyReport | null {
  const lastWeekN = currentWeekN - 1
  const lastWeek = weeks.find(w => w.n === lastWeekN)
  if (!lastWeek) return null

  const thisWeek = weeks.find(w => w.n === currentWeekN)
  const lastWeekLogs = logs.filter(l => l.week_n === lastWeekN && l.done)

  const sessionsPlanned = lastWeek.days.reduce((a, d) => a + d.sessions.length, 0)
  const sessionsDone = lastWeekLogs.length
  const kmPlanned = lastWeek.kl[0]
  const kmLogged = lastWeekLogs.reduce((a, l) => a + (l.km ?? 0), 0)
  const completionPct = sessionsPlanned > 0
    ? Math.round((sessionsDone / sessionsPlanned) * 100)
    : 0

  const effortLogs = lastWeekLogs.filter(l => l.effort != null)
  const avgEffort = effortLogs.length > 0
    ? Math.round(effortLogs.reduce((a, l) => a + l.effort!, 0) / effortLogs.length * 10) / 10
    : null

  // Best session = highest effort
  let bestSession: string | null = null
  if (effortLogs.length > 0) {
    const best = effortLogs.reduce((a, b) => (a.effort! > b.effort! ? a : b))
    const day = lastWeek.days[best.day_i]
    bestSession = day?.sessions[best.session_i]?.n ?? null
  }

  // vs last week km
  const prevWeekLogs = logs.filter(l => l.week_n === lastWeekN - 1 && l.done)
  const prevKm = prevWeekLogs.reduce((a, l) => a + (l.km ?? 0), 0)
  const vsLastWeek: WeeklyReport['vsLastWeek'] =
    prevKm === 0 ? 'first' :
    kmLogged > prevKm * 1.05 ? 'up' :
    kmLogged < prevKm * 0.95 ? 'down' : 'same'

  return {
    weekN: lastWeekN,
    weekTitle: lastWeek.title,
    sessionsPlanned,
    sessionsDone,
    kmPlanned,
    kmLogged: Math.round(kmLogged * 10) / 10,
    avgEffort,
    bestSession,
    vsLastWeek,
    lastWeekKm: Math.round(prevKm * 10) / 10,
    completionPct,
    lookAheadNote: thisWeek?.note ?? '',
  }
}
