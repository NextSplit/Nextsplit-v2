// Squad-nudge message bank.
//
// Rule (from /council 2026-05-07, content-copy + visual-brand R1): always
// forward, never backward. Never reference past failure ("you didn't run",
// "without you", "broke the streak") or generate obligation pressure ("prove
// them", "champions"). Tone: supportive, invitational, specific.
//
// Keys are stable identifiers (referenced by squad_nudges.message_key in
// existing DB rows and by the Zod enum in /api/squad/nudge/route.ts). The
// version suffix is appended at the analytics layer to form `template_id` for
// the `nudgeSent` PostHog event — bump NUDGE_TEMPLATE_VERSION on copy edits
// so funnel comparisons stay clean across A/B copy iterations.
//
// Cap: 1 nudge per (from_user, to_user) pair per 24h, enforced server-side
// by the `can_nudge` SQL function (phase-sl1-squads.sql:333).

export const NUDGE_MESSAGES: Record<string, string> = {
  missing:    "Your squad's lacing up. Want in?",
  week:       "One run can change your whole week. Let's go.",
  ran:        "Squad's been busy today. Fresh run waiting for you.",
  checkin:    "Quick check-in — squad's thinking of you.",
  streak:     "Big day ahead. Squad's behind your next run.",
  champion:   "Get your kit on. Squad's ready when you are.",
  day:        "Your leader thinks today's your day. Run when you're ready.",
  motivation: "Every run counts. Squad's behind you.",
}

export const NUDGE_KEYS = Object.keys(NUDGE_MESSAGES) as (keyof typeof NUDGE_MESSAGES)[]

// Bump on copy changes so PostHog funnels can compare bank versions cleanly.
export const NUDGE_TEMPLATE_VERSION = 'v2'

export function nudgeTemplateId(key: string): string {
  return `${key}_${NUDGE_TEMPLATE_VERSION}`
}
