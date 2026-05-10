/**
 * NextSplit — API Input Schemas
 * Phase A1: Zod validation on all critical API routes.
 *
 * Every route that accepts a request body uses safeParse() from this file.
 * Returns 400 with a structured error message on validation failure.
 * No business logic here — schemas only.
 */

import { z, ZodError } from 'zod'

// ─── Shared primitives ────────────────────────────────────────────────────────

const uuid      = z.string().uuid()
const weekN     = z.number().int().min(1).max(52)
const dayI      = z.number().int().min(0).max(6)
const sessionI  = z.number().int().min(0).max(9)
const effort    = z.number().int().min(1).max(10)
const km        = z.number().min(0).max(500)
const pace      = z.string().regex(/^\d{1,2}:\d{2}$/).optional()

// Future-date logging guard (mirrors phase-future-date-guard-v1.sql DB
// CHECK constraint with the same +18h IANA-timezone tolerance). Use
// `loggedAt` on any API route that accepts a user-supplied logged_at
// timestamp (no such routes today; this is for future date-picker UI).
export const loggedAt = z.string()
  .datetime({ offset: true })
  .refine(
    (s) => new Date(s).getTime() <= Date.now() + 18 * 3600 * 1000,
    { message: 'logged_at cannot be more than 18 hours in the future' },
  )

// ─── AI routes ───────────────────────────────────────────────────────────────

export const AdaptPlanSchema = z.object({
  plan_id:            uuid,
  week_n:             weekN,
  missed_day_indices: z.array(dayI).max(7).optional(),
  reason:             z.enum(['life', 'injury', 'illness', 'travel', 'other']).optional(),
  feeling:            z.string().max(500).optional(),
})
export type AdaptPlanInput = z.infer<typeof AdaptPlanSchema>

export const GeneratePlanSchema = z.object({
  prompt: z.string().min(10).max(2000),
})
export type GeneratePlanInput = z.infer<typeof GeneratePlanSchema>

export const WeeklySummarySchema = z.object({
  plan_id: uuid.optional(),
  week_n:  weekN.optional(),
}).optional()

// ─── Plan routes ─────────────────────────────────────────────────────────────

export const ActivatePlanSchema = z.object({
  template_id:  uuid.optional(),
  plan_id:      uuid.optional(),
  start_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  race_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine(d => d.template_id || d.plan_id, {
  message: 'Either template_id or plan_id is required',
})
export type ActivatePlanInput = z.infer<typeof ActivatePlanSchema>

export const ResetPlanSchema = z.object({
  plan_id: uuid,
})
export type ResetPlanInput = z.infer<typeof ResetPlanSchema>

// ─── Marketplace ──────────────────────────────────────────────────────────────

export const PurchasePlanSchema = z.object({
  template_id:               uuid,
  stripe_payment_intent_id:  z.string().startsWith('pi_').min(10),
})
export type PurchasePlanInput = z.infer<typeof PurchasePlanSchema>

// ─── Coach routes ─────────────────────────────────────────────────────────────

export const CoachInviteSchema = z.object({
  athlete_goal:  z.string().max(500).optional(),
  coach_notes:   z.string().max(500).optional(),
})
export type CoachInviteInput = z.infer<typeof CoachInviteSchema>

export const CoachMessageSchema = z.object({
  coach_id:   uuid,
  athlete_id: uuid,
  body:       z.string().min(1).max(2000),
})
export type CoachMessageInput = z.infer<typeof CoachMessageSchema>

export const CoachAnnotateSchema = z.object({
  athlete_id: uuid,
  plan_id:    uuid,
  week_n:     weekN,
  day_i:      dayI,
  session_i:  sessionI,
  note:       z.string().max(1000).optional(),
  reaction:   z.enum(['fire', 'strong', 'easy', 'talk', 'great']).optional(),
}).refine(
  // BL-C2 — 2-tap reaction path sends reaction-only; typed-note path sends
  // note-only. At least one must be present (mirrors the DB CHECK in
  // phase-blc2-annotation-reaction-only-v1.sql).
  d => (d.note && d.note.trim().length > 0) || !!d.reaction,
  { message: 'Provide a note or a reaction', path: ['note'] },
)
export type CoachAnnotateInput = z.infer<typeof CoachAnnotateSchema>

export const CoachReviewSchema = z.object({
  coach_id:    uuid,
  plan_id:     uuid,
  rating:      z.number().int().min(1).max(5),
  review_text: z.string().min(10).max(1000).optional(),
})
export type CoachReviewInput = z.infer<typeof CoachReviewSchema>

// ─── Community ────────────────────────────────────────────────────────────────

export const CreateClubSchema = z.object({
  name:        z.string().min(2).max(60),
  description: z.string().max(300).optional(),
  emoji:       z.string().max(4).default('🏃'),
  is_public:   z.boolean().default(true),
})
export type CreateClubInput = z.infer<typeof CreateClubSchema>

export const JoinClubSchema = z.object({
  join_code: z.string().min(4).max(20).optional(),
  club_id:   uuid.optional(),
  action:    z.enum(['join', 'leave']).default('join'),
}).refine(d => d.join_code || d.club_id, {
  message: 'Either join_code or club_id is required',
})
export type JoinClubInput = z.infer<typeof JoinClubSchema>

// ─── Referral ────────────────────────────────────────────────────────────────

export const ReferralCodeSchema = z.object({
  code: z.string().min(6).max(6).regex(/^[A-Z0-9]+$/, 'Must be 6 uppercase alphanumeric characters'),
})
export type ReferralCodeInput = z.infer<typeof ReferralCodeSchema>

// ─── Notifications ────────────────────────────────────────────────────────────

export const PushSubscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh:   z.string().min(10),
  auth:     z.string().min(10),
})
export type PushSubscribeInput = z.infer<typeof PushSubscribeSchema>

// ─── Voice messages ───────────────────────────────────────────────────────────

export const VoiceMessageListenSchema = z.object({
  message_id: uuid,
})
export type VoiceMessageListenInput = z.infer<typeof VoiceMessageListenSchema>

// ─── Helper: standard validation error response ───────────────────────────────

import { NextResponse } from 'next/server'

export function zodError(err: ZodError<unknown>): NextResponse {
  return NextResponse.json(
    {
      error:   'Invalid request',
      details: err.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`),
    },
    { status: 400 }
  )
}

// ─── Additional route schemas ─────────────────────────────────────────────────

export const AiCoachSchema = z.object({
  message:    z.string().max(2000).optional(),
  context:    z.string().max(5000).optional(),
  plan_id:    z.string().uuid().optional(),
  mode:       z.enum(['insight', 'question', 'summary', 'advice']).optional(),
})

export const AiCoachDigestSchema = z.object({
  athlete_id: z.string().uuid(),
})

export const AiFuelSchema = z.object({
  dayType:  z.string().max(50),
  planName: z.string().max(200).optional(),
  targets:  z.record(z.string(), z.number()).optional(),
  totals:   z.record(z.string(), z.number()).optional(),
})

export const AiPreRaceBriefSchema = z.object({
  context: z.string().min(10).max(3000),
})

export const AiSuggestionsSchema = z.object({
  analysisData: z.record(z.string(), z.unknown()),
})

export const CoachAcceptSchema = z.object({
  token:               z.string().min(10).max(200),
  share_nutrition:     z.boolean().default(false),
  share_body_weight:   z.boolean().default(false),
})

export const CoachApplySchema = z.object({
  display_name:    z.string().min(2).max(100),
  bio:             z.string().max(1000).optional(),
  specialties:     z.array(z.string()).max(10).optional(),
  slug:            z.string().min(2).max(60).regex(/^[a-z0-9-]+$/).optional(),
  tier:            z.enum(['split_leader', 'professional']),
  website_url:     z.string().url().optional(),
  instagram_handle: z.string().max(50).optional(),
})

export const CoachFeaturedPlansSchema = z.object({
  template_ids: z.array(z.string().uuid()).min(1).max(20),
  week_start:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  feature_type: z.enum(['editorial', 'seasonal', 'coach_pick']).default('editorial'),
})

export const CoachSavePlanSchema = z.object({
  name:           z.string().min(2).max(200),
  description:    z.string().max(2000).optional(),
  subtitle:       z.string().max(200).optional(),
  distance:       z.string().max(50).optional(),
  level:          z.string().max(50).optional(),
  weeks_data:     z.array(z.unknown()),
  price_gbp:      z.number().min(0).max(999).optional(),
  is_public:      z.boolean().default(false),
  template_id:    z.string().uuid().optional(),
  runs_per_week:  z.number().int().min(1).max(14).optional(),
  peak_km_week:   z.number().min(0).max(300).optional(),
  longest_run_km: z.number().min(0).max(100).optional(),
})

export const ChallengeActionSchema = z.object({
  challenge_id: z.string().uuid(),
  action:       z.enum(['join', 'leave']).default('join'),
})

export const CommunityProgressSchema = z.object({
  km:           z.number().min(0).max(500).default(0),
  done:         z.boolean().default(true),
  session_type: z.string().max(30).optional(),
  session_name: z.string().max(100).optional(),
  duration_secs: z.number().int().min(0).optional(),
  pace:         z.string().max(10).optional(),
  effort:       z.number().int().min(1).max(10).optional(),
})

export const RaceActionSchema = z.object({
  race_id:          z.string().uuid(),
  action:           z.enum(['enter', 'withdraw', 'finish', 'submit']),
  finish_time_secs: z.number().int().min(0).optional(),
})

export const MarketplacePublishSchema = z.object({
  name:           z.string().min(2).max(200).optional(),
  subtitle:       z.string().max(200).optional(),
  distance:       z.string().max(50).optional(),
  level:          z.string().max(50).optional(),
  description:    z.string().max(2000).optional(),
  weeks_min:      z.number().int().min(1).max(52).optional(),
  weeks_max:      z.number().int().min(1).max(52).optional(),
  weeks_data:     z.array(z.unknown()).optional(),
  price_gbp:      z.number().min(0).max(999).optional(),
  is_public:      z.boolean().default(false),
  meta:           z.record(z.string(), z.unknown()).optional(),
  runs_per_week:  z.number().int().min(1).max(14).optional(),
  peak_km_week:   z.number().min(0).max(300).optional(),
  longest_run_km: z.number().min(0).max(100).optional(),
  template_id:    z.string().uuid().optional(),
})

export const AiRecommendSchema = z.object({
  goal:           z.string().max(500).optional(),
  experience:     z.string().max(100).optional(),
  weekly_km:      z.number().min(0).max(300).optional(),
  distance:       z.string().max(50).optional(),
  weeksAvailable: z.number().int().min(1).max(52).optional(),
  daysPerWeek:    z.number().int().min(1).max(7).optional(),
})

export const SquadTransferSchema = z.object({
  squad_id: z.string().uuid(),
})

// ─── Stripe checkout ─────────────────────────────────────────────────────────

export const StripeCheckoutSchema = z.object({
  interval: z.enum(['monthly', 'annual']),
})
