// Session type codes from plan JSON → display config
export interface SessionTypeConfig {
  label: string
  colour: string      // bg colour class
  textColour: string  // text colour class
  dot: string         // solid dot colour class
  emoji: string
}

/** Decode HTML entities from plan data strings */
export function decodeHtml(str: string): string {
  return str
    .replace(/&middot;/g, '·')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

const SESSION_TYPES: Record<string, SessionTypeConfig> = {
  'run-easy':   { label: 'Easy Run',   colour: 'bg-emerald-50',  textColour: 'text-emerald-700', dot: 'bg-emerald-400', emoji: '🟢' },
  'run-tempo':  { label: 'Tempo',      colour: 'bg-orange-50',   textColour: 'text-orange-700',  dot: 'bg-orange-400',  emoji: '🟠' },
  'run-int':    { label: 'Intervals',  colour: 'bg-red-50',      textColour: 'text-red-700',     dot: 'bg-red-400',     emoji: '🔴' },
  'run-long':   { label: 'Long Run',   colour: 'bg-blue-50',     textColour: 'text-blue-700',    dot: 'bg-blue-400',    emoji: '🔵' },
  'run-mp':     { label: 'Marathon P', colour: 'bg-violet-50',   textColour: 'text-violet-700',  dot: 'bg-violet-400',  emoji: '🟣' },
  'run-race':   { label: 'Race',       colour: 'bg-yellow-50',   textColour: 'text-yellow-700',  dot: 'bg-yellow-400',  emoji: '🏁' },
  'gym-a':      { label: 'Gym A',      colour: 'bg-slate-50',    textColour: 'text-slate-700',   dot: 'bg-slate-400',   emoji: '🏋️' },
  'gym-b':      { label: 'Gym B',      colour: 'bg-slate-50',    textColour: 'text-slate-700',   dot: 'bg-slate-400',   emoji: '🏋️' },
  'gym-c':      { label: 'Gym C',      colour: 'bg-slate-50',    textColour: 'text-slate-700',   dot: 'bg-slate-400',   emoji: '🏋️' },
  'gym-bw':     { label: 'Bodyweight', colour: 'bg-slate-50',    textColour: 'text-slate-700',   dot: 'bg-slate-400',   emoji: '💪' },
  'pilates':    { label: 'Pilates',    colour: 'bg-pink-50',     textColour: 'text-pink-700',    dot: 'bg-pink-400',    emoji: '🧘' },
  'sauna':      { label: 'Sauna',      colour: 'bg-amber-50',    textColour: 'text-amber-700',   dot: 'bg-amber-400',   emoji: '🧖' },
  'rest':       { label: 'Rest',       colour: 'bg-gray-50',     textColour: 'text-gray-500',    dot: 'bg-gray-300',    emoji: '😴' },
}

const DEFAULT_TYPE: SessionTypeConfig = {
  label: 'Session', colour: 'bg-gray-50', textColour: 'text-gray-700', dot: 'bg-gray-400', emoji: '🏃'
}

export function getSessionType(code: string | number): SessionTypeConfig {
  // Handle legacy numeric codes from plan data (9-14 = threshold/quality runs)
  if (typeof code === 'number' || /^\d+$/.test(String(code))) {
    const n = Number(code)
    if (n <= 10) return SESSION_TYPES['run-tempo'] ?? DEFAULT_TYPE
    return SESSION_TYPES['run-int'] ?? DEFAULT_TYPE
  }
  return SESSION_TYPES[code as string] ?? DEFAULT_TYPE
}

/** Format a km value nicely */
export function fmtKm(km: number): string {
  if (km === 0) return ''
  return `${km}km`
}

/** Today's day-of-week index (0=Mon...6=Sun) for matching plan days */
export function todayDayIndex(): number {
  const d = new Date().getDay() // 0=Sun
  return d === 0 ? 6 : d - 1   // convert to Mon=0
}

/** Format date as "Mon 18 Apr" */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Get date offset from today */
export function offsetDate(offset: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d
}
