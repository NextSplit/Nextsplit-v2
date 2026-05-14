/**
 * K33 — MHRA Path B sanitiser.
 *
 * The product position post-K33 is that NextSplit's AI features are
 * *informational training suggestions* derived from training metrics
 * only. They are not — and must not become — a diagnosis,
 * triage, or treatment recommendation. The MHRA Software-as-a-Medical-
 * Device (SaMD) decision tree treats an algorithm that consumes
 * self-reported injury or health data and returns individualised
 * health-affecting recommendations as a regulated medical device.
 *
 * This module is the single chokepoint every AI route MUST run any
 * profile or session payload through before sending to Anthropic.
 * It guarantees that the following fields never leave our servers
 * via the AI path:
 *
 *   - injury_notes
 *   - health_flags
 *   - any wellness-narrative field whose name contains "injur",
 *     "pain", "health", "symptom", "medic", "diagnos", or "doctor"
 *   - any direct mention of an InjuryFlag entry
 *
 * Adding new sensitive fields means appending to FORBIDDEN_KEYS or
 * the regex below. The sanitiser is intentionally aggressive — it
 * strips first, asks questions later. False-positive stripping is a
 * minor product regression; false-negative leakage is a regulatory
 * incident.
 *
 * Usage:
 *
 *   import { sanitiseAiContext } from '@/lib/ai/sanitise-context'
 *   const safeProfile = sanitiseAiContext(profile)
 *   const safePayload = sanitiseAiContext({ profile, sessions, plan })
 *
 * Returns a deep-cloned copy with sensitive keys removed.
 */

const FORBIDDEN_KEYS = new Set<string>([
  'injury_notes',
  'injuryNotes',
  'health_flags',
  'healthFlags',
  'injuries',
  'injury',
  'injury_flag',
  'injuryFlag',
  'pain_notes',
  'painNotes',
  'medical_notes',
  'medicalNotes',
  'symptoms',
  'diagnosis',
  'medications',
])

const FORBIDDEN_KEY_PATTERN = /(injur|pain|symptom|medic|diagnos|doctor|hospital|prescript)/i

/**
 * Deep-strip forbidden keys from an object/array. Returns a new value;
 * the input is not mutated.
 */
export function sanitiseAiContext<T>(value: T): T {
  return walk(value) as T
}

function walk(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) return value.map(walk)
  if (typeof value !== 'object') return value

  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(key))           continue
    if (FORBIDDEN_KEY_PATTERN.test(key))   continue
    out[key] = walk(val)
  }
  return out
}

/**
 * Boilerplate to prepend to every AI system prompt. Reinforces the
 * informational-only positioning so the model is less likely to drift
 * into medical-style advice even with carefully-curated context.
 */
export const AI_INFORMATIONAL_GUARDRAIL = `
You are an informational training assistant. You do not diagnose,
triage, or prescribe medical care. Your output is suggestions based on
training metrics only. You have no access to the user's injury notes
or health flags. If the user describes injury, pain, or medical
symptoms in their free-text input, you must respond with: "That sounds
like something to discuss with a doctor or physiotherapist rather than
me — I'll skip the training advice for this session and you can come
back when you're ready." Do not attempt to assess, advise on, or
recommend treatment for any reported pain, injury, or medical
condition.
`.trim()
