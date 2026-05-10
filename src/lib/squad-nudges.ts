// Squad-nudge message bank.
//
// Rule (from /council 2026-05-07, content-copy + visual-brand R1): always
// forward, never backward. Never reference past failure ("you didn't run",
// "without you", "broke the streak") or generate obligation pressure ("prove
// them", "champions"). Tone: supportive, invitational, specific.
//
// Keys are stable identifiers (referenced by squad_nudges.message_key in
// existing DB rows and by the Zod enum in /api/squad/nudge/route.ts). Each
// key has TWO copy variants (A/B) — the chosen variant lands in
// squad_nudges.template_variant, and the analytics layer suffixes
// `template_id = key_v2_a` / `key_v2_b` for funnel comparison.
//
// Bump NUDGE_TEMPLATE_VERSION on copy edits so funnel comparisons stay clean
// across versions.
//
// Cap: 1 nudge per (from_user, to_user) pair per 24h, enforced server-side
// by the `can_nudge` SQL function (phase-sl1-squads.sql:333).

export type NudgeVariant = 'a' | 'b'

// Variant A — original copy (was NUDGE_MESSAGES at v2).
const NUDGE_MESSAGES_A: Record<string, string> = {
  missing:    "Your squad's lacing up. Want in?",
  week:       "One run can change your whole week. Let's go.",
  ran:        "Squad's been busy today. Fresh run waiting for you.",
  checkin:    "Quick check-in — squad's thinking of you.",
  streak:     "Big day ahead. Squad's behind your next run.",
  champion:   "Get your kit on. Squad's ready when you are.",
  day:        "Your leader thinks today's your day. Run when you're ready.",
  motivation: "Every run counts. Squad's behind you.",
}

// Variant B — alternative phrasing for P3.9 A/B test. Same forward-tone rule;
// experiments with concrete invitations + specific time/format hooks.
const NUDGE_MESSAGES_B: Record<string, string> = {
  missing:    "Squad's heading out — there's a spot for you.",
  week:       "Half a mile is still a run. Want to start there?",
  ran:        "Three of your squad ran today. Yours is waiting.",
  checkin:    "Hey — what would make today's run easy?",
  streak:     "Easy 20 minutes today and you're back rolling.",
  champion:   "Lace, doorstep, ten minutes. That's the whole ask.",
  day:        "Coach picked you for today. Pace is yours to set.",
  motivation: "One run unlocks the next. Pick a short one.",
}

// Public registry — keyed for variant lookup at runtime.
export const NUDGE_MESSAGES: Record<NudgeVariant, Record<string, string>> = {
  a: NUDGE_MESSAGES_A,
  b: NUDGE_MESSAGES_B,
}

export const NUDGE_KEYS = Object.keys(NUDGE_MESSAGES_A) as (keyof typeof NUDGE_MESSAGES_A)[]

// Bump on copy changes so PostHog funnels can compare bank versions cleanly.
export const NUDGE_TEMPLATE_VERSION = 'v2'

export function nudgeTemplateId(key: string, variant: NudgeVariant = 'a'): string {
  return `${key}_${NUDGE_TEMPLATE_VERSION}_${variant}`
}

export function nudgeMessage(key: string, variant: NudgeVariant): string {
  return NUDGE_MESSAGES[variant][key] ?? NUDGE_MESSAGES_A[key] ?? ''
}

// Deterministic per-(from_user, to_user) variant pick. Same pair always lands
// on the same variant — clean A/B comparison without contaminating one user
// with both copy banks (within-pair copy stability matters more than
// per-send randomness for the metric we care about: "does B copy land
// better than A copy for this relationship").
export function pickNudgeVariant(fromUser: string, toUser: string): NudgeVariant {
  const seed = `${fromUser}:${toUser}`
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0
  }
  return (h & 1) === 0 ? 'a' : 'b'
}
