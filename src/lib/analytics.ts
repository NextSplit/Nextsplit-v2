/**
 * NextSplit Analytics
 * All PostHog events go through here — single source of truth.
 * Server-side events use posthog-node, client-side use posthog-js.
 *
 * Key funnels tracked:
 *   Acquisition:  signup → onboarding_complete → plan_activated
 *   Retention:    session_logged → week_2 → week_4 → 30_day_active
 *   Revenue:      upgrade_prompt_shown → upgrade_clicked → subscription_started
 *   Engagement:   ai_coach_used → strava_connected → goal_added
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

// ── Onboarding funnel ─────────────────────────────────────────────────────────
export const Analytics = {
  identify,
  reset,

  // Onboarding
  onboardingStarted:    ()                          => track('onboarding_started'),
  onboardingStep:       (step: number, name: string) => track('onboarding_step_completed', { step, name }),
  stravaConnected:      (source: 'onboarding' | 'settings') => track('strava_connected', { source }),
  onboardingCompleted:  (path: string)              => track('onboarding_completed', { training_path: path }),

  // Plans
  planActivated:        (type: string, name: string) => track('plan_activated',  { plan_type: type, plan_name: name }),
  planArchived:         (type: string, reason: string) => track('plan_archived', { plan_type: type, reason }),
  planCompleted:        (type: string)               => track('plan_completed',   { plan_type: type }),

  // Sessions
  sessionLogged:        (type: string, km?: number) => track('session_logged',   { session_type: type, km }),
  gymSessionLogged:     (exercises: number)         => track('gym_session_logged', { exercises }),
  sessionSkipped:       (type: string)              => track('session_skipped',   { session_type: type }),

  // AI usage
  aiCoachUsed:          ()                          => track('ai_coach_used'),
  aiFuelUsed:           ()                          => track('ai_fuel_used'),
  aiPlanGenerated:      (path: string)              => track('ai_plan_generated', { training_path: path }),
  aiRateLimited:        ()                          => track('ai_rate_limited'),

  // Goals
  goalAdded:            (type: string, priority: string) => track('goal_added',   { goal_type: type, priority }),
  goalCompleted:        (type: string)               => track('goal_completed',   { goal_type: type }),

  // Revenue
  upgradePromptShown:   (feature: string, location: string) => track('upgrade_prompt_shown', { feature, location }),
  upgradeClicked:       (feature: string)            => track('upgrade_clicked',  { feature }),
  subscriptionStarted:  (plan: 'monthly' | 'annual') => track('subscription_started', { plan }),
  subscriptionCancelled: ()                          => track('subscription_cancelled'),

  // Community
  coachConnected:       ()                          => track('coach_connected'),
  splitLeaderFollowed:  ()                          => track('split_leader_followed'),
  clubJoined:           ()                          => track('club_joined'),

  // Feedback
  feedbackSubmitted:    (type: 'bug' | 'feature' | 'general', rating?: number) =>
                          track('feedback_submitted', { feedback_type: type, rating }),
  bugReported:          (page: string)              => track('bug_reported', { page }),

  // Engagement
  pageViewed:           (page: string)              => track('page_viewed', { page }),
  notificationReceived: (type: string)              => track('notification_received', { type }),
}
