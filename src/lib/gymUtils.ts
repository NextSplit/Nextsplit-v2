// ─── Static exercise definitions per gym type ─────────────────────────────────

export interface ExerciseDef {
  name: string
  sets: number
  reps: string
  isCompound: boolean
}

export const GYM_EXERCISES: Record<string, ExerciseDef[]> = {
  'gym-a': [
    { name: 'Back squat',           sets: 4, reps: '5',       isCompound: true  },
    { name: 'Romanian deadlift',    sets: 3, reps: '8',       isCompound: true  },
    { name: 'Bulgarian split squat',sets: 3, reps: '8 each',  isCompound: false },
    { name: 'Calf raise',           sets: 3, reps: '15',      isCompound: false },
    { name: 'Core circuit',         sets: 2, reps: '60s',     isCompound: false },
  ],
  'gym-b': [
    { name: 'Pull-ups',             sets: 4, reps: 'max',     isCompound: true  },
    { name: 'DB row',               sets: 3, reps: '10 each', isCompound: true  },
    { name: 'Bench press',          sets: 3, reps: '8',       isCompound: true  },
    { name: 'Face pulls',           sets: 3, reps: '15',      isCompound: false },
    { name: 'Core circuit',         sets: 2, reps: '60s',     isCompound: false },
  ],
  'gym-c': [
    { name: 'Hip thrust',           sets: 4, reps: '10',      isCompound: true  },
    { name: 'Leg curl',             sets: 3, reps: '12',      isCompound: false },
    { name: 'Lateral band walk',    sets: 3, reps: '20 each', isCompound: false },
    { name: 'Nordic curl',          sets: 3, reps: '5',       isCompound: false },
    { name: 'Core circuit',         sets: 2, reps: '60s',     isCompound: false },
  ],
  'gym-bw': [
    { name: 'Push-ups',             sets: 3, reps: 'max',     isCompound: true  },
    { name: 'Bodyweight squat',     sets: 3, reps: '15',      isCompound: true  },
    { name: 'Glute bridge',         sets: 3, reps: '15',      isCompound: false },
    { name: 'Core circuit',         sets: 2, reps: '60s',     isCompound: false },
  ],
}

// ─── Rest time defaults (seconds) ─────────────────────────────────────────────

export const REST_DEFAULTS = {
  compound:  120,  // 2 min for squats, deadlifts, bench etc
  accessory: 75,   // 75s for accessories
}

// ─── Parse det string into exercise list ──────────────────────────────────────
// Input: "Back squat 4x6 · RDL 4x8 · Bulgarian split squat 3x10 · Core"
// Output: ExerciseDef[]

export function parseDetToExercises(det: string, gymType: string): ExerciseDef[] {
  if (!det) return GYM_EXERCISES[gymType] ?? GYM_EXERCISES['gym-a']

  const decoded = det
    .replace(/&middot;/g, '·')
    .replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')

  const parts = decoded.split('·').map(p => p.trim()).filter(Boolean)

  // Filter out non-exercise notes (short words like "Core only", "Finisher", etc.)
  const exercises: ExerciseDef[] = parts
    .filter(p => p.length > 2)
    .map(part => {
      // Try to parse "Name NxM" or "Name Wkg NxM"
      const setsRepsMatch = part.match(/(\d+)x(\d+)/)
      const sets = setsRepsMatch ? parseInt(setsRepsMatch[1]) : 3
      const reps = setsRepsMatch ? setsRepsMatch[2] : '8'

      // Strip weight and set/rep info from name
      const name = part
        .replace(/\d+(\.\d+)?kg/gi, '')       // remove weights like 80kg
        .replace(/2x\d+(\.\d+)?kg/gi, '')     // remove 2x20kg (dumbbells)
        .replace(/\+\d+(\.\d+)?kg/gi, '')     // remove +5kg
        .replace(/\d+x\d+/g, '')               // remove NxM
        .replace(/\s+/g, ' ')
        .trim()
        // Capitalise first letter
        .replace(/^./, c => c.toUpperCase())

      const isCompound = /squat|deadlift|bench|row|pull|press|thrust|lunge/i.test(name)

      return { name, sets, reps, isCompound }
    })
    .filter(e => e.name.length > 1)

  return exercises.length > 0 ? exercises : (GYM_EXERCISES[gymType] ?? GYM_EXERCISES['gym-a'])
}

// ─── Suggest weight from previous log ─────────────────────────────────────────

export function suggestWeight(
  exerciseName: string,
  previousExercises: { name: string; sets: { weight: number | null; reps: number }[] }[]
): number | null {
  const prev = previousExercises.find(e =>
    e.name.toLowerCase() === exerciseName.toLowerCase()
  )
  if (!prev || !prev.sets.length) return null

  const lastWeight = prev.sets[prev.sets.length - 1].weight
  if (!lastWeight) return null

  // Suggest same weight (user can increment)
  return lastWeight
}

// ─── Is compound exercise? (for rest time) ────────────────────────────────────

export function getRestTime(exerciseName: string, customSecs?: number): number {
  if (customSecs !== undefined) return customSecs
  const isCompound = /squat|deadlift|bench|row|pull|press|thrust|lunge/i.test(exerciseName)
  return isCompound ? REST_DEFAULTS.compound : REST_DEFAULTS.accessory
}
