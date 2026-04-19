'use client'

import { useSubscription } from '@/hooks/useSubscription'
import { PREMIUM_ENFORCED, type FeatureKey } from '@/lib/features'
import type { ReactNode } from 'react'

interface ProGateProps {
  feature: FeatureKey
  /** Content shown when user has access */
  children: ReactNode
  /**
   * What to show when access is blocked.
   * Defaults to a tasteful upgrade prompt.
   * Pass null to render nothing (silent gate).
   */
  fallback?: ReactNode | null
  /** If true, renders children but visually dimmed with an upgrade badge */
  preview?: boolean
}

/**
 * ProGate — wraps any feature behind a subscription check.
 *
 * When NEXT_PUBLIC_PREMIUM_ENFORCED=false (dev mode), always renders children.
 * When enforced, checks the user's tier against FEATURE_TIERS[feature].
 *
 * Usage:
 *   <ProGate feature="ai_coaching_card">
 *     <CoachingCard />
 *   </ProGate>
 *
 *   <ProGate feature="advanced_stats" fallback={null}>
 *     <ACWRChart />
 *   </ProGate>
 *
 *   <ProGate feature="pace_trends" preview>
 *     <PaceTrend />
 *   </ProGate>
 */
export default function ProGate({ feature, children, fallback, preview = false }: ProGateProps) {
  const { canUseFeature, loading, isDevMode } = useSubscription()

  // Dev mode or loading — always show content
  if (isDevMode || loading) return <>{children}</>

  const hasAccess = canUseFeature(feature)

  // Full access
  if (hasAccess) return <>{children}</>

  // Preview mode — show dimmed content with upgrade badge
  if (preview) {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none opacity-40 blur-[1px]">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <UpgradeBadge feature={feature} />
        </div>
      </div>
    )
  }

  // Custom fallback
  if (fallback !== undefined) return <>{fallback}</>

  // Default upgrade prompt
  return <DefaultUpgradePrompt feature={feature} />
}

// ─── Upgrade badge (used in preview mode) ─────────────────────────────────────

function UpgradeBadge({ feature: _ }: { feature: FeatureKey }) {
  return (
    <a
      href="/settings?tab=subscription"
      className="flex items-center gap-2 bg-[#0D9488] text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg"
    >
      <span>✦</span>
      <span>Pro feature — upgrade to unlock</span>
    </a>
  )
}

// ─── Default upgrade prompt ────────────────────────────────────────────────────

const FEATURE_LABELS: Partial<Record<FeatureKey, { title: string; description: string; emoji: string }>> = {
  ai_pre_race_brief:         { emoji: '🎯', title: 'Race Day Brief',        description: 'AI-powered race day coaching and strategy' },
  ai_adaptive_suggestions:   { emoji: '🧠', title: 'Adaptive Coaching',     description: 'AI suggestions that adapt to your training load' },
  ai_coaching_card:          { emoji: '💬', title: 'AI Coach',              description: 'Personalised coaching insights after every session' },
  ai_post_session_feedback:  { emoji: '⚡', title: 'Session Feedback',      description: 'Instant AI feedback on your effort and performance' },
  ai_bespoke_plan:           { emoji: '📋', title: 'Bespoke AI Plan',       description: 'A training plan built entirely around you by AI' },
  advanced_stats:            { emoji: '📊', title: 'Advanced Analytics',    description: 'Deep training load analysis and trend detection' },
  pace_trends:               { emoji: '📈', title: 'Pace Trends',           description: 'Track your pace improvement over time' },
  acwr_chart:                { emoji: '⚖️', title: 'Training Load',         description: 'Acute:chronic workload ratio to prevent injury' },
  strava_sync:               { emoji: '🔗', title: 'Strava Sync',           description: 'Import activities automatically from Strava' },
  multiple_active_plans:     { emoji: '📚', title: 'Multiple Plans',        description: 'Run multiple training plans simultaneously' },
}

function DefaultUpgradePrompt({ feature }: { feature: FeatureKey }) {
  const meta = FEATURE_LABELS[feature] ?? {
    emoji: '✦',
    title: 'Pro Feature',
    description: 'Upgrade to NextSplit Pro to unlock this feature',
  }

  // Only show if premium is actually enforced — in dev this never renders
  if (!PREMIUM_ENFORCED) return null

  return (
    <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl border border-teal-100 p-5 text-center">
      <div className="text-3xl mb-2">{meta.emoji}</div>
      <div className="text-sm font-bold text-gray-900 mb-1">{meta.title}</div>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">{meta.description}</p>
      <a
        href="/settings?tab=subscription"
        className="inline-flex items-center gap-1.5 bg-[#0D9488] text-white px-5 py-2.5 rounded-xl text-sm font-bold"
      >
        <span>✦</span> Upgrade to Pro
      </a>
      <p className="text-[10px] text-gray-400 mt-2">£4.99/month · Cancel anytime</p>
    </div>
  )
}
