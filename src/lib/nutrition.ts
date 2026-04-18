// ─── Shared Nutrition Logic ────────────────────────────────────────────────────
// Used by both the Fuel tab (NutritionClient) and Plan tab (PlanClient)

export type DayType = 'rest' | 'easy' | 'quality' | 'long' | 'race'

export function getDayType(sessions: Array<{ c: string; km?: number }>): DayType {
  if (!sessions || sessions.length === 0) return 'rest'
  const codes = sessions.map(s => s.c)
  if (codes.some(c => c === 'run-race')) return 'race'
  const totalKm = sessions.reduce((a, s) => a + (s.km || 0), 0)
  if (codes.some(c => c === 'run-long') || totalKm >= 16) return 'long'
  if (codes.some(c => c === 'run-tempo' || c === 'run-int' || c === 'run-mp')) return 'quality'
  return 'easy'
}

export const DAY_TYPE_CONFIG: Record<DayType, {
  label: string; emoji: string; colour: string; text: string
  cals: number; carbs: number; protein: number; fat: number
  note: string
}> = {
  rest:    { label: 'Rest Day',     emoji: '😴', colour: 'bg-gray-50',    text: 'text-gray-600',   cals: 1.0, carbs: 45, protein: 25, fat: 30, note: 'Focus on protein and vegetables.' },
  easy:    { label: 'Easy Run',     emoji: '🟢', colour: 'bg-emerald-50', text: 'text-emerald-700', cals: 1.3, carbs: 50, protein: 20, fat: 30, note: 'Moderate carbs. Hydrate well.' },
  quality: { label: 'Quality Day',  emoji: '🟠', colour: 'bg-orange-50',  text: 'text-orange-700', cals: 1.5, carbs: 60, protein: 20, fat: 20, note: 'Carb-up. Quality fuel = quality performance.' },
  long:    { label: 'Long Run',     emoji: '🔵', colour: 'bg-blue-50',    text: 'text-blue-700',   cals: 1.7, carbs: 65, protein: 20, fat: 15, note: 'High carbs. Big recovery meal after.' },
  race:    { label: 'Race Day! 🏁', emoji: '🏆', colour: 'bg-yellow-50',  text: 'text-yellow-700', cals: 1.6, carbs: 65, protein: 20, fat: 15, note: 'Familiar foods only. Nothing new on race day.' },
}

/** BMR × activity factor → daily calorie target (Mifflin-St Jeor simplified) */
export function calcCalories(weightKg: number, dayType: DayType): number {
  const bmr = 10 * weightKg + 6.25 * 170 - 5 * 30 + 50
  return Math.round(bmr * DAY_TYPE_CONFIG[dayType].cals / 100) * 100
}
