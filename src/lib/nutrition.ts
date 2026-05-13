// ─── Shared Nutrition Logic ────────────────────────────────────────────────────
// Used by both the Fuel tab (NutritionClient) and Plan tab (PlanClient)

export type DayType = 'rest' | 'easy' | 'quality' | 'long' | 'race' | 'strength'

export function getDayType(sessions: Array<{ c?: string | null; km?: number }>): DayType {
  if (!sessions || sessions.length === 0) return 'rest'
  // Filter out null/undefined codes defensively
  const codes = sessions.map(s => s.c).filter((c): c is string => typeof c === 'string' && c.length > 0)
  if (codes.some(c => c === 'run-race')) return 'race'
  const totalKm = sessions.reduce((a, s) => a + (s.km || 0), 0)
  if (codes.some(c => c === 'run-long') || totalKm >= 16) return 'long'
  if (codes.some(c => c === 'run-tempo' || c === 'run-int' || c === 'run-mp')) return 'quality'
  if (codes.some(c => c.startsWith('run-'))) return 'easy'
  if (codes.some(c => c.startsWith('gym'))) return 'strength'
  return 'rest'
}

export const DAY_TYPE_CONFIG: Record<DayType, {
  label: string; emoji: string; colour: string; text: string
  cals: number; carbs: number; protein: number; fat: number
  note: string
}> = {
  rest:     { label: 'Rest Day',      emoji: '😴', colour: 'bg-gray-50',    text: 'text-gray-600',   cals: 1.0, carbs: 45, protein: 25, fat: 30, note: 'Focus on protein and vegetables. Keep it light.' },
  easy:     { label: 'Easy Run',      emoji: '🟢', colour: 'bg-emerald-50', text: 'text-emerald-700', cals: 1.3, carbs: 50, protein: 20, fat: 30, note: 'Moderate carbs. Hydrate well.' },
  strength: { label: 'Strength Day',  emoji: '🏋️', colour: 'bg-amber-50',   text: 'text-amber-700',  cals: 1.3, carbs: 45, protein: 30, fat: 25, note: 'Protein is the priority today. Aim for your protein target first, then carbs to fuel the session.' },
  quality:  { label: 'Quality Day',   emoji: '🟠', colour: 'bg-orange-50',  text: 'text-orange-700', cals: 1.5, carbs: 60, protein: 20, fat: 20, note: 'Carb-up. Quality fuel = quality performance.' },
  long:     { label: 'Long Run',      emoji: '🔵', colour: 'bg-blue-50',    text: 'text-blue-700',   cals: 1.7, carbs: 65, protein: 20, fat: 15, note: 'High carbs. Big recovery meal after.' },
  race:     { label: 'Race Day! 🏁',  emoji: '🏆', colour: 'bg-yellow-50',  text: 'text-yellow-700', cals: 1.6, carbs: 65, protein: 20, fat: 15, note: 'Familiar foods only. Nothing new on race day.' },
}

/** Full Mifflin-St Jeor BMR × activity factor → daily calorie target.
 *  weightKg required. heightCm/ageyears/sex optional — defaults to 175cm/32yo/male
 *  if not provided (reasonable midpoint for a mixed running user base).
 */
export function calcCalories(
  weightKg: number,
  dayType: DayType,
  heightCm?: number,
  ageYears?: number,
  sex?: 'male' | 'female'
): number {
  const h = heightCm ?? 175
  const a = ageYears ?? 32
  const s = sex ?? 'male'
  // Mifflin-St Jeor: male +5, female −161
  const bmr = 10 * weightKg + 6.25 * h - 5 * a + (s === 'male' ? 5 : -161)
  const target = bmr * DAY_TYPE_CONFIG[dayType].cals
  return Math.round(target / 50) * 50
}

// ─── PR C1 Nutrition Planner v2 ────────────────────────────────────────
// Foundation layer for the rebuilt nutrition surface (after PR #80
// pivoted the original ~1602 LOC stack to race-week-only). Adds:
//   • TDEE settings shape (weight + height + age + sex + activity + goal)
//   • Goal-aware macro split (cut / maintain / build)
//   • Per-session-type fuel suggestions (pre-run carbs + post-run protein)
//   • Default meal-slot template (5 slots, % of daily calories)
//
// Settings live in localStorage via useNutritionSettings until cloud sync
// becomes worth the migration. Keep this module pure (no I/O).

export type NutritionGoal = 'cut' | 'maintain' | 'build'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type NutritionSex  = 'male' | 'female' | 'other'

export interface NutritionSettings {
  weight_kg:      number
  height_cm:      number
  age:            number
  sex:            NutritionSex
  activity_level: ActivityLevel
  goal:           NutritionGoal
}

export interface MacroTargets {
  calories:  number
  protein_g: number
  carbs_g:   number
  fat_g:     number
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary:   1.2,
  light:       1.375,
  moderate:    1.55,
  active:      1.725,
  very_active: 1.9,
}

const GOAL_DELTA: Record<NutritionGoal, number> = {
  cut:      -500,
  maintain:  0,
  build:    +300,
}

const GOAL_MACROS: Record<NutritionGoal, { protein_pct: number; fat_pct: number }> = {
  cut:      { protein_pct: 0.35, fat_pct: 0.30 },
  maintain: { protein_pct: 0.25, fat_pct: 0.30 },
  build:    { protein_pct: 0.25, fat_pct: 0.25 },
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary:   'Sedentary — desk job, no exercise',
  light:       'Light — 1-3 short runs/week',
  moderate:    'Moderate — 3-5 runs/week',
  active:      'Active — 6-7 runs/week',
  very_active: 'Very active — 2x/day or ultras',
}

export const GOAL_LABELS: Record<NutritionGoal, string> = {
  cut:      'Cut · lose fat',
  maintain: 'Maintain · stay sharp',
  build:    'Build · gain muscle',
}

export function calculateBMR(s: Pick<NutritionSettings, 'weight_kg' | 'height_cm' | 'age' | 'sex'>): number {
  const base = 10 * s.weight_kg + 6.25 * s.height_cm - 5 * s.age
  return s.sex === 'male' ? base + 5 : s.sex === 'female' ? base - 161 : base - 78
}

export function calculateTDEE(s: NutritionSettings): number {
  return Math.round(calculateBMR(s) * ACTIVITY_MULTIPLIERS[s.activity_level])
}

export function calculateMacroTargets(s: NutritionSettings): MacroTargets {
  const tdee     = calculateTDEE(s)
  const calories = Math.max(1200, tdee + GOAL_DELTA[s.goal])
  const macros   = GOAL_MACROS[s.goal]
  const protein_g = Math.round((calories * macros.protein_pct) / 4)
  const fat_g     = Math.round((calories * macros.fat_pct)     / 9)
  const carbs_g   = Math.round((calories - protein_g * 4 - fat_g * 9) / 4)
  return { calories, protein_g, carbs_g, fat_g }
}

const SESSION_FUEL_SUGGESTIONS: Record<string, { pre_carbs_g: number; post_protein_g: number; note: string }> = {
  easy:      { pre_carbs_g: 30, post_protein_g: 20, note: 'Light carb top-up if hungry; recovery protein optional.' },
  steady:    { pre_carbs_g: 45, post_protein_g: 25, note: 'Banana 60-90min before; protein + carbs after.' },
  tempo:     { pre_carbs_g: 60, post_protein_g: 30, note: 'Full meal 2-3h before; recovery within 30min.' },
  threshold: { pre_carbs_g: 70, post_protein_g: 30, note: 'Carb-load the meal before; recovery essential.' },
  intervals: { pre_carbs_g: 70, post_protein_g: 30, note: 'Same as threshold — high glycolytic demand.' },
  long:      { pre_carbs_g: 80, post_protein_g: 35, note: 'Pre-load night before + morning of; gels during.' },
  race:      { pre_carbs_g: 90, post_protein_g: 40, note: 'Race-day fuel strategy — see race-week pivot card.' },
  rest:      { pre_carbs_g: 0,  post_protein_g: 0,  note: 'Maintenance day — eat to target, no special timing.' },
}

export function getSessionFuelSuggestion(sessionCode: string | null | undefined) {
  return SESSION_FUEL_SUGGESTIONS[sessionCode ?? 'rest'] ?? SESSION_FUEL_SUGGESTIONS.rest
}

export interface MealSlot {
  id:     string
  label:  string
  emoji:  string
  pct:    number
  timing: string
}

export const DEFAULT_MEAL_SLOTS: MealSlot[] = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🍳', pct: 0.25, timing: 'Morning' },
  { id: 'pre_run',   label: 'Pre-run',   emoji: '🍌', pct: 0.10, timing: '60-90min before' },
  { id: 'lunch',     label: 'Lunch',     emoji: '🥗', pct: 0.30, timing: 'Midday' },
  { id: 'post_run',  label: 'Post-run',  emoji: '💪', pct: 0.15, timing: 'Within 30min after' },
  { id: 'dinner',    label: 'Dinner',    emoji: '🍝', pct: 0.20, timing: 'Evening' },
]
