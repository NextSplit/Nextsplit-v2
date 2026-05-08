// src/app/onboarding/events.ts
//
// S10 (audit roadmap-integration v1, council-added) — unified onboarding event
// taxonomy. Before this, F1 friend-test users path-switching across the AI /
// manual / predetermined / lifestyle flows would emit inconsistent funnel
// events, making D1/D7/D30 analysis unreadable.
//
// Single source of truth for:
//   - the event names PostHog receives at onboarding start + finish
//   - the canonical path identifiers fired with `onboarding_path_selected`
//     and `onboarding_completed`
//
// Usage:
//   import { ONBOARDING_STARTED, ONBOARDING_COMPLETED, ONBOARDING_PATH } from '@/app/onboarding/events'
//   import { Analytics } from '@/lib/analytics'
//   Analytics.onboardingStarted()                                 // → ONBOARDING_STARTED
//   Analytics.onboardingCompleted(ONBOARDING_PATH.AI_BESPOKE)     // → ONBOARDING_COMPLETED with training_path

export const ONBOARDING_STARTED   = 'onboarding_started'   as const
export const ONBOARDING_COMPLETED = 'onboarding_completed' as const

// Path identifiers — must match the values in the `TrainingPath` union in
// src/app/onboarding/context/OnboardingContext.tsx so the funnel value matches
// the choice fired by `onboarding_path_selected`.
export const ONBOARDING_PATH = {
  PREDETERMINED:     'predetermined',
  AI_BESPOKE:        'ai_bespoke',
  MANUAL:            'manual',
  LIFESTYLE:         'lifestyle',
  COACH_MARKETPLACE: 'coach_marketplace',
} as const

export type OnboardingPath = (typeof ONBOARDING_PATH)[keyof typeof ONBOARDING_PATH]
