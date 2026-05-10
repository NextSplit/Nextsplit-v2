'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Analytics } from '@/lib/analytics'

// PR N — Trial-lapsed in-app winback.
//
// Mirrors the day-14 expiry push (PR #60) for users who opened the app
// without tapping the push notification. Renders only while the lapse
// is still recent (7-day window — useSubscription handles the cutoff).
// Dismissible per-user via localStorage so it doesn't nag.
//
// Tone (Splity rule, forward never backward): the banner doesn't say
// "your trial ended" with disappointment. It frames the lock-in as the
// continuation of what they already had.
//
// Trigger gates (parent):
//   1. isTrialLapsed = true (useSubscription)
//   2. localStorage `nextsplit_winback_dismissed_<userId>` not set
//
// Inert by default for Pro / dev-mode users — useSubscription returns
// isTrialLapsed=false in both cases.

interface Props {
  show:                boolean
  userId:              string | null
  trialLapsedDaysAgo:  number | null
  trialSource:         'squad_join' | 'first_coach_message' | 'day8_auto' | null
}

function storageKey(userId: string): string {
  return `nextsplit_winback_dismissed_${userId}`
}

const SOURCE_KICKER: Record<string, string> = {
  squad_join:           'Keep your squad onboarding momentum',
  first_coach_message:  'Keep your coaching channel open',
  day8_auto:            'Keep the momentum from your first week',
}

export function TrialLapsedBanner({ show, userId, trialLapsedDaysAgo, trialSource }: Props) {
  const [dismissed, setDismissed] = useState<boolean | null>(null)

  // Read dismissed state once on mount. The null sentinel prevents a
  // hydration mismatch — the banner doesn't decide what to render until
  // localStorage has been checked client-side.
  useEffect(() => {
    if (!userId) { setDismissed(true); return }
    try {
      setDismissed(!!localStorage.getItem(storageKey(userId)))
    } catch {
      setDismissed(true)
    }
  }, [userId])

  const shouldRender = show && !dismissed && userId

  useEffect(() => {
    if (shouldRender) {
      Analytics.upgradePromptShown('trial_lapsed_banner', `home_lapsed_${trialLapsedDaysAgo ?? 0}d`)
    }
  }, [shouldRender, trialLapsedDaysAgo])

  if (!shouldRender) return null

  const daysAgoCopy = trialLapsedDaysAgo === 0
    ? 'today'
    : trialLapsedDaysAgo === 1
    ? 'yesterday'
    : `${trialLapsedDaysAgo} days ago`

  const kicker = (trialSource && SOURCE_KICKER[trialSource]) ?? 'Pick up where you left off'

  function dismiss(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!userId) return
    try { localStorage.setItem(storageKey(userId), new Date().toISOString()) } catch { /* ignore */ }
    setDismissed(true)
  }

  return (
    <Link
      href="/upgrade"
      onClick={() => Analytics.upgradeClicked('trial_lapsed_banner')}
      className="block w-full mx-4 rounded-2xl px-4 py-3.5 text-left transition-all active:scale-[0.98]"
      style={{
        background: 'linear-gradient(135deg, rgba(255,61,110,0.18), rgba(255,61,110,0.08))',
        border:     '2px solid rgba(255,61,110,0.45)',
        boxShadow:  '0 8px 24px rgba(255,61,110,0.22)',
        maxWidth:   'calc(100% - 2rem)',
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl flex-shrink-0" aria-hidden>⭐</span>
        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] font-black uppercase tracking-widest"
            style={{ color: '#ff3d6e' }}
          >
            Trial ended {daysAgoCopy}
          </p>
          <p className="text-sm font-black mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
            {kicker} · £7.99/mo
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            Founding pricing still available. Adaptive plans, ACWR, AI coaching — all back.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-base leading-none"
          style={{
            background: 'rgba(255,61,110,0.15)',
            color:      '#ff3d6e',
          }}
        >
          ×
        </button>
      </div>
    </Link>
  )
}
