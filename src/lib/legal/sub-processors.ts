/**
 * Sub-processor registry — single source of truth for the privacy
 * policy, the cookie policy, and any DSAR machine-readable response.
 *
 * Keep this list aligned with what the application actually depends
 * on. Adding a new third party in code requires a matching entry
 * here AND a privacy-policy "last updated" bump (UK GDPR Art 13).
 *
 * `relationship` distinguishes the three legal postures:
 *   - 'processor'  — acts solely on our written instructions (Art 28).
 *   - 'controller' — determines its own purposes (e.g. Strava, Stripe).
 *   - 'joint'      — joint controller arrangement (rare; flag for review).
 *
 * `category` maps each processor to the K32 v2 consent category:
 *   - 'essential'   — strictly necessary, no consent required.
 *   - 'analytics'   — opt-in gated.
 *   - 'performance' — opt-in gated.
 */

export type SubProcessorRelationship = 'processor' | 'controller' | 'joint'
export type SubProcessorCategory     = 'essential' | 'analytics' | 'performance'

export type SubProcessor = {
  name:         string
  purpose:      string
  region:       string
  relationship: SubProcessorRelationship
  category:     SubProcessorCategory
  transfer:     string   // transfer mechanism (e.g. "UK GDPR — no transfer", "IDTA", "EU SCCs + UK Addendum")
  privacyUrl:   string
  dpaUrl:       string | null   // null where no formal DPA exists (controller-to-controller relationships)
}

export const SUB_PROCESSORS: SubProcessor[] = [
  {
    name:         'Supabase',
    purpose:      'Database, authentication, file storage',
    region:       'EU (Frankfurt)',
    relationship: 'processor',
    category:     'essential',
    transfer:     'UK GDPR — adequate (EEA)',
    privacyUrl:   'https://supabase.com/privacy',
    dpaUrl:       'https://supabase.com/legal/dpa',
  },
  {
    name:         'Vercel',
    purpose:      'Hosting and edge network',
    region:       'Global edge — primary EU/UK',
    relationship: 'processor',
    category:     'essential',
    transfer:     'EU SCCs + UK Addendum (executed via Vercel DPA)',
    privacyUrl:   'https://vercel.com/legal/privacy-policy',
    dpaUrl:       'https://vercel.com/legal/dpa',
  },
  {
    name:         'Stripe',
    purpose:      'Subscription billing (Pro tier)',
    region:       'Ireland / US',
    relationship: 'controller',
    category:     'essential',
    transfer:     'Stripe acts as an independent controller for payment data per its Privacy Policy. Card data never reaches our servers.',
    privacyUrl:   'https://stripe.com/gb/privacy',
    dpaUrl:       'https://stripe.com/gb/legal/dpa',
  },
  {
    name:         'Stripe Connect',
    purpose:      'Coach payouts (revenue split via connected accounts)',
    region:       'Ireland / US',
    relationship: 'joint',
    category:     'essential',
    transfer:     'Joint controller arrangement between NextSplit and each coach-connected account for payout data only.',
    privacyUrl:   'https://stripe.com/gb/connect-account/legal',
    dpaUrl:       'https://stripe.com/gb/legal/dpa',
  },
  {
    name:         'Anthropic',
    purpose:      'AI coaching suggestions (Claude API)',
    region:       'US',
    relationship: 'processor',
    category:     'essential',
    transfer:     'EU SCCs + UK Addendum (executed via Anthropic API DPA). Zero-data-retention API option requested; verification pending.',
    privacyUrl:   'https://www.anthropic.com/privacy',
    dpaUrl:       'https://www.anthropic.com/legal/dpa',
  },
  {
    name:         'PostHog',
    purpose:      'Product analytics (event-level)',
    region:       'EU (Frankfurt)',
    relationship: 'processor',
    category:     'analytics',
    transfer:     'UK GDPR — adequate (EEA)',
    privacyUrl:   'https://posthog.com/privacy',
    dpaUrl:       'https://posthog.com/dpa',
  },
  {
    name:         'Sentry',
    purpose:      'Error and performance monitoring',
    region:       'US',
    relationship: 'processor',
    category:     'performance',
    transfer:     'EU SCCs + UK Addendum (executed via Sentry DPA). Error capture runs on legitimate interest; performance traces and breadcrumbs are gated on your performance-cookies consent.',
    privacyUrl:   'https://sentry.io/privacy/',
    dpaUrl:       'https://sentry.io/legal/dpa/',
  },
  {
    name:         'Resend',
    purpose:      'Transactional email delivery (sign-up, password reset, billing notices)',
    region:       'US',
    relationship: 'processor',
    category:     'essential',
    transfer:     'EU SCCs + UK Addendum (executed via Resend DPA). Lawful basis: contract performance (Article 6(1)(b)).',
    privacyUrl:   'https://resend.com/privacy',
    dpaUrl:       'https://resend.com/legal/dpa',
  },
  {
    name:         'Strava',
    purpose:      'Activity import (only if you connect your account)',
    region:       'US',
    relationship: 'controller',
    category:     'essential',
    transfer:     'Strava acts as an independent data controller of its own platform. Your data leaves Strava only at your instruction via OAuth.',
    privacyUrl:   'https://www.strava.com/legal/privacy',
    dpaUrl:       null,
  },
]
