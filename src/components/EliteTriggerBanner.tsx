'use client'

import { useState } from 'react'
import { useSubscription } from '@/hooks/useSubscription'
import { UpgradeModal } from '@/components/UpgradeModal'
import { Analytics } from '@/lib/analytics'

// Contextual Elite-upsell banner — P4.3.
// Appears at three trigger points (per roadmap):
//   four_weeks   → 4+ weeks of done logs           → /train
//   plan_complete → user has a status='completed' plan → /you (or post-ceremony)
//   seven_streak  → streak >= 7                       → /home
//
// Inert today: banner only renders when both (a) the user is NOT Pro and
// (b) PREMIUM_ENFORCED is true (i.e. the paywall is live, isDevMode=false).
// This means in dev (PREMIUM_ENFORCED=false), every user is in dev-mode,
// the banners stay hidden, and users can keep using the features they're
// trying to upsell on. When paywall flips, the banners light up
// automatically — no follow-up PR needed.
//
// Tap-through opens UpgradeModal with founding-tier urgency wired in
// (foundingLeft from useSubscription).

export type EliteTriggerKind = 'four_weeks' | 'plan_complete' | 'seven_streak'

interface CopyVariant {
  emoji:    string
  eyebrow:  string
  title:    string
  body:     string
  feature:  string  // analytics label
  bg:       string  // gradient
}

const VARIANTS: Record<EliteTriggerKind, CopyVariant> = {
  four_weeks: {
    emoji:   '📊',
    eyebrow: '4 weeks logged',
    title:   'See pace trends + wellness charts',
    body:    'Pro unlocks the analytics that turn 4 weeks of training into a story.',
    feature: 'four_weeks_advanced_stats',
    bg:      'linear-gradient(135deg, var(--ns-cobalt), var(--ns-violet))',
  },
  plan_complete: {
    emoji:   '🏁',
    eyebrow: 'Plan complete',
    title:   'AI-bespoke plan for your next goal',
    body:    'Pro tailors every session to your form, pace, and recovery — no two plans the same.',
    feature: 'plan_complete_ai_bespoke',
    bg:      'linear-gradient(135deg, var(--ns-magenta), var(--ns-ember))',
  },
  seven_streak: {
    emoji:   '🔥',
    eyebrow: '7-day streak',
    title:   'Adaptive plans match your effort',
    body:    'Pro plans adjust week-to-week based on RPE + ACWR + how your last session actually went.',
    feature: 'seven_streak_adaptive_plans',
    bg:      'linear-gradient(135deg, var(--ns-amber), var(--ns-ember))',
  },
}

interface Props {
  kind: EliteTriggerKind
  /** Override the default trigger gate — useful when the parent already
   *  knows the condition is true (e.g. HomeClient with computed streak). */
  show?: boolean
}

export function EliteTriggerBanner({ kind, show = true }: Props) {
  const { isPro, isDevMode, foundingLeft, loading } = useSubscription()
  const [open, setOpen] = useState(false)

  // Gate: banner only renders when paywall is live AND user is non-Pro.
  // !show short-circuits when the parent's trigger condition isn't met.
  if (loading || isPro || isDevMode || !show) return null

  const v = VARIANTS[kind]

  return (
    <>
      <button
        onClick={() => {
          Analytics.upgradePromptShown(v.feature, `elite_banner_${kind}`)
          setOpen(true)
        }}
        className="block w-full mx-4 rounded-2xl px-4 py-3.5 text-left transition-all active:scale-[0.98]"
        style={{
          background: v.bg,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          maxWidth: 'calc(100% - 2rem)',
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl flex-shrink-0" aria-hidden>{v.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {v.eyebrow}
            </p>
            <p className="text-sm font-black mt-0.5" style={{ color: 'white' }}>
              {v.title}
            </p>
            <p className="text-xs mt-1 line-clamp-2" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {v.body}
            </p>
          </div>
          <span className="text-xl flex-shrink-0" aria-hidden style={{ color: 'rgba(255,255,255,0.85)' }}>→</span>
        </div>
      </button>
      {open && <UpgradeModal onClose={() => setOpen(false)} foundingLeft={foundingLeft} />}
    </>
  )
}
