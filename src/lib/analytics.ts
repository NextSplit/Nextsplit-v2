/**
 * NextSplit Analytics
 * All PostHog events go through here — single source of truth.
 * Server-side events use posthog-node, client-side use posthog-js.
 *
 * Key funnels tracked (AARRR):
 *   Acquisition:  signup → onboarding_complete → plan_activated
 *   Activation:   session_logged → week_advanced → adaptation_requested
 *   Retention:    session_logged → week_2 → week_4 → class_revealed
 *   Revenue:      upgrade_prompt_shown → upgrade_clicked → subscription_started
 *                 plan_purchased → marketplace_browse
 *   Referral:     referral_sent → referral_converted
 */

import posthog from 'posthog-js'

// ── Client-side events ────────────────────────────────────────────────────────

// P1.6 property enrichment: every client event automatically carries the
// user's timezone (Intl-derived; no permission needed) so funnel reports
// can slice by region without a per-event manual prop. Computed once per
// page lifetime (lazy, memoised in the closure) — Intl is fast but
// repeating the call on every track() is wasteful.
let cachedTimezone: string | null = null
function getTimezone(): string | undefined {
  if (typeof window === 'undefined') return undefined
  if (cachedTimezone !== null) return cachedTimezone
  try {
    cachedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  } catch {
    cachedTimezone = ''
  }
  return cachedTimezone || undefined
}

function track(event: string, props?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  if (process.env.NODE_ENV !== 'production') {
    // Analytics debug logging disabled in production
    return
  }
  const enriched = { ...(props ?? {}), timezone: getTimezone() }
  posthog.capture(event, enriched)
}

function identify(userId: string, traits?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  posthog.identify(userId, traits)
}

function reset() {
  if (typeof window === 'undefined') return
  posthog.reset()
}

export const Analytics = {
  identify,
  reset,

  // ── Onboarding ────────────────────────────────────────────────────────────
  onboardingStarted:    ()                          => track('onboarding_started'),
  onboardingStep:       (step: number, name: string, path?: string) =>
                          track('onboarding_step_completed', { step, name, training_path: path }),
  onboardingStepViewed: (step: number, name: string) =>
                          track('onboarding_step_viewed', { step, name }),
  onboardingPathSelected: (path: string)            => track('onboarding_path_selected', { training_path: path }),
  onboardingAbandoned:  (lastStep: number, stepName: string) =>
                          track('onboarding_abandoned', { last_step: lastStep, step_name: stepName }),
  stravaConnected:      (source: 'onboarding' | 'settings') => track('strava_connected', { source }),
  onboardingCompleted:  (path: string)              => track('onboarding_completed', { training_path: path }),

  // ── NPS ───────────────────────────────────────────────────────────────────
  npsShown:             (trigger: 'day_7' | 'day_30') => track('nps_shown', { trigger }),
  npsSubmitted:         (score: number, trigger: 'day_7' | 'day_30', comment?: string) =>
                          track('nps_submitted', { score, trigger, comment, promoter: score >= 9, detractor: score <= 6 }),
  npsDismissed:         (trigger: 'day_7' | 'day_30') => track('nps_dismissed', { trigger }),

  // ── Plans ─────────────────────────────────────────────────────────────────
  planActivated:        (type: string, name: string) => track('plan_activated',  { plan_type: type, plan_name: name }),
  planArchived:         (type: string, reason: string) => track('plan_archived', { plan_type: type, reason }),
  planCompleted:        (type: string)               => track('plan_completed',   { plan_type: type }),
  weekAdvanced:         (weekN: number, totalWeeks: number) =>
                          track('week_advanced', { week_n: weekN, total_weeks: totalWeeks }),

  // ── Sessions ──────────────────────────────────────────────────────────────
  sessionLogged:        (type: string, km?: number, effort?: number) =>
                          track('session_logged', { session_type: type, km, effort }),
  gymSessionLogged:     (exercises: number)         => track('gym_session_logged', { exercises }),
  sessionSkipped:       (type: string)              => track('session_skipped',   { session_type: type }),
  sessionUndone:        ()                          => track('session_undone'),

  // ── THE CONVERSION MOMENT — most important event in the product ───────────
  adaptationRequested:  (missedSessions: number)    =>
                          track('adaptation_requested', { missed_sessions: missedSessions }),
  adaptationCompleted:  ()                          => track('adaptation_completed'),

  // ── Runner class ──────────────────────────────────────────────────────────
  classRevealed:        (classId: string)           => track('class_revealed', { runner_class: classId }),
  classShared:          (classId: string)           => track('class_shared',   { runner_class: classId }),

  // ── AI usage ──────────────────────────────────────────────────────────────
  aiCoachUsed:          (mode?: string)             => track('ai_coach_used', { mode }),
  aiFuelUsed:           ()                          => track('ai_fuel_used'),
  aiPlanGenerated:      (path: string)              => track('ai_plan_generated', { training_path: path }),
  aiWeeklySummaryUsed:  ()                          => track('ai_weekly_summary_used'),
  aiRateLimited:        ()                          => track('ai_rate_limited'),

  // ── Goals ─────────────────────────────────────────────────────────────────
  goalAdded:            (type: string, priority: string) => track('goal_added',   { goal_type: type, priority }),
  goalCompleted:        (type: string)               => track('goal_completed',   { goal_type: type }),

  // ── Revenue ───────────────────────────────────────────────────────────────
  upgradePromptShown:   (feature: string, location: string) => track('upgrade_prompt_shown', { feature, location }),
  upgradeClicked:       (feature: string)            => track('upgrade_clicked',  { feature }),
  subscriptionStarted:  (plan: 'monthly' | 'annual') => track('subscription_started', { plan }),
  subscriptionCancelled: ()                          => track('subscription_cancelled'),
  splitLeaderActivated: ()                           => track('split_leader_activated'),
  proCoachApplied:      ()                           => track('pro_coach_applied'),

  // ── Marketplace ───────────────────────────────────────────────────────────
  marketplaceBrowsed:   ()                          => track('marketplace_browsed'),
  planPurchased:        (templateId: string, priceGbp: number, isFree: boolean) =>
                          track('plan_purchased', { template_id: templateId, price_gbp: priceGbp, is_free: isFree }),
  planPublished:        (priceGbp: number)          => track('plan_published', { price_gbp: priceGbp }),

  // ── Share moments ─────────────────────────────────────────────────────────
  raceResultShared:     ()                          => track('race_result_shared'),
  sessionShared:        ()                          => track('session_shared'),
  weeklyCardShared:     ()                          => track('weekly_card_shared'),

  // ── Voice messages ────────────────────────────────────────────────────────
  voiceMessageSent:     ()                          => track('voice_message_sent'),
  voiceMessageListened: ()                          => track('voice_message_listened'),

  // ── Wellness ──────────────────────────────────────────────────────────────
  wellnessLogged:       ()                          => track('wellness_logged'),

  // ── Community ─────────────────────────────────────────────────────────────
  coachConnected:       ()                          => track('coach_connected'),
  splitLeaderFollowed:  ()                          => track('split_leader_followed'),
  clubJoined:           ()                          => track('club_joined'),
  challengeEntered:     ()                          => track('challenge_entered'),

  // ── Referral (Phase 2 — not built yet, tracking ready) ───────────────────
  referralSent:         ()                          => track('referral_sent'),
  referralConverted:    ()                          => track('referral_converted'),

  // ── Feedback ──────────────────────────────────────────────────────────────
  feedbackSubmitted:    (type: 'bug' | 'feature' | 'general', rating?: number) =>
                          track('feedback_submitted', { feedback_type: type, rating }),
  bugReported:          (page: string)              => track('bug_reported', { page }),

  // ── Engagement ────────────────────────────────────────────────────────────
  pageViewed:           (page: string)              => track('page_viewed', { page }),
  notificationReceived: (type: string)              => track('notification_received', { type }),

  // ── Squad accountability loop (P1.1) ──────────────────────────────────────
  // Anonymous→authenticated stitching is handled by useProfile.ts:64 calling
  // posthog.identify(user.id, ...) on profile load. PostHog auto-aliases the
  // previous anonymous distinct_id, so the funnel from pre-auth → signup →
  // first log is contiguous without explicit alias calls.
  //
  // Privacy: recipient_user_id is always the opaque uuid (auth.users.id),
  // never an email or display_name.
  logCompleted: (props: {
    km?: number
    effort?: number
    session_type?: string
    squad_count: number
    share_logs_with_squad: boolean
    week_number: number
    runner_class?: string
  }) => track('log_completed', props),

  squadFeedCardShown: (props: {
    recipient_user_id: string  // opaque uuid — never email
    squad_id: string
    feed_card_id: string
    milestone_type: string
  }) => track('squad_feed_card_shown', props),

  nudgeSent: (props: {
    template_id: string  // e.g. 'streak_v2' — see squad-nudges.ts:nudgeTemplateId
    is_leader_nudge: boolean
    squad_id: string
  }) => track('nudge_sent', props),

  nudgeOpened: (props: {
    template_id: string
    is_leader_nudge: boolean
    squad_id: string
  }) => track('nudge_opened', props),

  // ── Celebration + share funnel (P1.6) ─────────────────────────────────────
  // celebration_screen_shown fires once per SessionCelebration mount; pairs
  // with log_completed in funnel reports to measure how often the rich
  // celebration actually surfaces (vs. being skipped via offline-queue or
  // fast-dismiss).
  celebrationScreenShown: (props: {
    session_type?: string
    leveled_up:    boolean
    has_pb:        boolean
    in_acwr_band:  boolean   // 0.8 ≤ acwr ≤ 1.3 — true means the Splity
                              // reaction line cited the figure
  }) => track('celebration_screen_shown', props),

  // share_card_generated fires when ShareSessionCard mounts (the card
  // the user might screenshot or trigger native-share from).
  // share_card_shared fires only when navigator.share resolves successfully
  // OR the clipboard fallback runs — i.e. an actual share intent was
  // expressed. Cancellations don't fire.
  shareCardGenerated: (props: { session_type?: string; km?: number }) =>
    track('share_card_generated', props),
  shareCardShared:    (props: { session_type?: string; km?: number; method: 'web_share' | 'clipboard' }) =>
    track('share_card_shared', props),

  // P2.7 Third-Week Hold-the-Line: fires once per Week3Reanchor mount.
  // Funnel pairs with log_completed @ week_number=3+ to measure how the
  // re-anchor moment shifts continuation rates through weeks 4-6.
  week3ReanchorShown: (props: {
    sessions_done:   number
    sessions_total:  number
    total_km:        number
    in_acwr_band:    boolean
  }) => track('week3_reanchor_shown', props),

  // P2.7 soft-deload: ACWR advisory banner fires once per day when the
  // user's latest ACWR is above the danger threshold (1.3). Per-day
  // localStorage gate prevents echo across same-day mounts. session_type
  // tells the council which prescribed sessions trigger the warning most
  // often — informs the eventual hard-override design.
  acwrAdvisoryShown: (props: {
    acwr:          number
    session_type?: string
  }) => track('acwr_advisory_shown', props),

  // P2.7 soft-deload: gap-recovery banner fires when the user returns
  // after a 7+ day gap. Dismiss is keyed to the last-log timestamp so a
  // fresh gap re-fires the banner. gap_days lets retention funnels
  // segment re-engagement quality vs gap length.
  gapRecoveryShown: (props: { gap_days: number }) => track('gap_recovery_shown', props),
}
