'use client'

import Link from 'next/link'
import type { FeatureKey } from '@/lib/features'

/**
 * K37 — paywall modal surfaced when a user attempts to access a
 * feature they're not entitled to. Driven by useEntitlement().
 *
 * Per-feature copy lives in FEATURE_COPY so each gate explains
 * what's being offered, not a generic "upgrade" message.
 *
 * Tier-aware: features that require the Coach Pro tier specifically
 * surface the £29/mo Coach Pro upgrade path; everything else routes
 * to the standard £9.99 Pro upgrade.
 */

interface Props {
  open:    boolean
  feature: FeatureKey | null
  onClose: () => void
}

interface FeatureCopy {
  title:    string
  blurb:    string
  cta:      string
  tier:     'pro' | 'coach'
}

const FEATURE_COPY: Partial<Record<FeatureKey, FeatureCopy>> = {
  split_forecast: {
    title: 'Unlock SplitForecast',
    blurb: 'Upload your race GPX, see a course-aware finish-time prediction informed by elevation, weather, and your recent training.',
    cta:   'Get SplitForecast with Pro',
    tier:  'pro',
  },
  adaptive_plan_refit: {
    title: 'Adaptive training',
    blurb: 'Your plan adapts every week based on how much you actually ran. No more weeks that don\'t fit your reality.',
    cta:   'Adapt my plan with Pro',
    tier:  'pro',
  },
  ai_chat_coach: {
    title: 'Conversational AI coach',
    blurb: 'Ask anything: “What should I run tomorrow?” “Should I race this weekend?” Reads your plan, history, and recent logs.',
    cta:   'Chat with the AI coach',
    tier:  'pro',
  },
  ai_voice_coach: {
    title: 'Voice coach',
    blurb: 'Pre-run audio briefs and race-day commentary, generated for your specific session.',
    cta:   'Hear your coach with Pro',
    tier:  'pro',
  },
  apple_health_sync: {
    title: 'Auto-import from Apple Watch',
    blurb: 'Skip the manual log. Your sessions sync from Apple Health within seconds of finishing.',
    cta:   'Auto-import with Pro',
    tier:  'pro',
  },
  coros_sync: {
    title: 'COROS Watch sync',
    blurb: 'Activities flow from your COROS straight into your training log and squad feed.',
    cta:   'Auto-import with Pro',
    tier:  'pro',
  },
  strava_sync: {
    title: 'Strava auto-sync',
    blurb: 'Every Strava run lands in NextSplit automatically. Squad pings, plan progress, splits — no copy-paste.',
    cta:   'Connect Strava with Pro',
    tier:  'pro',
  },
  garmin_export: {
    title: 'Garmin auto-sync',
    blurb: 'Garmin Connect activities import within seconds. Match planned vs actual without thinking about it.',
    cta:   'Connect Garmin with Pro',
    tier:  'pro',
  },
  whoop_oura_sync: {
    title: 'Whoop + Oura sync',
    blurb: 'Recovery and sleep data feed the daily plan suggestion. Red day? You\'ll know before you lace up.',
    cta:   'Sync recovery with Pro',
    tier:  'pro',
  },
  peer_benchmarking: {
    title: 'How do you compare?',
    blurb: 'See how your weekly volume + paces stack up against runners in your age, sex, and region cohort. Anonymised.',
    cta:   'Unlock benchmarks',
    tier:  'pro',
  },
  ai_race_strategy: {
    title: 'AI race-day strategy',
    blurb: 'A 200-word pacing plan written for your race, factoring in weather, course profile, and your current fitness.',
    cta:   'Get your race strategy',
    tier:  'pro',
  },
  ai_strength_prescriber: {
    title: 'AI strength prescriber',
    blurb: 'Specific exercises per session, tailored to your running load and soreness. No more generic gym sessions.',
    cta:   'Unlock with Pro',
    tier:  'pro',
  },
  coach_dashboard: {
    title: 'Coach Pro',
    blurb: 'Read your athletes’ training charts, drop comments on individual sessions, write notes.',
    cta:   'Become a Coach Pro — £29/mo',
    tier:  'coach',
  },
  coach_assigned_plans: {
    title: 'Push custom plans to athletes',
    blurb: 'Override the AI generator with your own training plan, assigned 1-on-1.',
    cta:   'Upgrade to Coach Pro',
    tier:  'coach',
  },
  coach_stripe_payouts: {
    title: 'Get paid via Stripe Connect',
    blurb: '80% of your athletes’ subscription revenue lands in your bank account, paid out by Stripe.',
    cta:   'Upgrade to Coach Pro',
    tier:  'coach',
  },
}

const DEFAULT_COPY: FeatureCopy = {
  title: 'NextSplit Pro',
  blurb: 'This feature is part of the Pro tier — SplitForecast, adaptive plans, AI coach, auto-import, and peer benchmarks.',
  cta:   'Upgrade to Pro',
  tier:  'pro',
}

export function PaywallModal({ open, feature, onClose }: Props) {
  if (!open || !feature) return null

  const copy = FEATURE_COPY[feature] ?? DEFAULT_COPY
  const upgradeHref = copy.tier === 'coach'
    ? '/settings?upgrade=coach'
    : '/settings?upgrade=pro'

  return (
    <div
      className="fixed inset-0 z-[120] flex flex-col items-center justify-end sm:justify-center"
      style={{ background: 'rgba(10,14,26,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div
        className="w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{
          background: 'var(--color-surface)',
          border:     '1px solid var(--color-border)',
          marginBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        role="dialog"
        aria-labelledby="paywall-title"
        onClick={e => e.stopPropagation()}>

        <div className="w-10 h-1 rounded-full mx-auto my-3 sm:hidden"
          style={{ background: 'var(--color-border-2)' }} />

        <div className="px-6 pb-6">
          <div className="text-2xl mb-2">{copy.tier === 'coach' ? '🏆' : '⚡'}</div>
          <h2 id="paywall-title" className="text-xl font-black mb-2"
            style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
            {copy.title}
          </h2>
          <p className="text-sm leading-relaxed mb-5"
            style={{ color: 'var(--color-text-secondary)' }}>
            {copy.blurb}
          </p>

          <Link href={upgradeHref} onClick={onClose}
            className="block w-full py-3.5 rounded-2xl text-center text-sm font-black text-white active:scale-95 transition-transform"
            style={{ background: 'var(--ns-ember)' }}>
            {copy.cta}
          </Link>

          <button onClick={onClose}
            className="block w-full mt-2 py-2.5 text-xs font-semibold"
            style={{ color: 'var(--color-text-tertiary)' }}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
