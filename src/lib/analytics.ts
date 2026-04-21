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

function track(event: string, props?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[Analytics]', event, props)
    return
  }
  posthog.capture(event, props)
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
}
