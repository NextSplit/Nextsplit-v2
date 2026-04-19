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
