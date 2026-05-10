'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Analytics } from '@/lib/analytics'

// PR K — One-shot welcome modal that fires the first time a user lands
// on Home with isTrialing=true. Closes the BL-C6 onboarding gap: the
// welcome push tells the user "you've got Pro for 14 days" but on
// open-app they previously had no in-product handoff explaining what's
// unlocked. This modal lists the four headline Pro features so the user
// actually uses the trial.
//
// Trigger gates (parent computes `show`):
//   1. isTrialing = true (subscription_status = 'trialing')
//   2. localStorage `nextsplit_trial_welcomed_<userId>` not set
//
// Once dismissed, the localStorage flag prevents re-show. The flag is
// userId-scoped so account switches on shared devices show the modal
// for each user independently.

interface Props {
  show:           boolean
  userId:         string | null
  trialDaysLeft:  number | null
  trialSource:    'squad_join' | 'first_coach_message' | null
  onDismiss:      () => void
}

const SOURCE_HEADER: Record<string, { kicker: string; lead: string }> = {
  squad_join: {
    kicker: 'WELCOME FROM YOUR SQUAD',
    lead:   "You've unlocked NextSplit Pro for 14 days.",
  },
  first_coach_message: {
    kicker: 'YOUR COACH UNLOCKED PRO',
    lead:   "14 days of NextSplit Pro on us — make the most of it.",
  },
}

const FEATURES = [
  {
    emoji: '📈',
    title: 'Adaptive plans',
    body:  'Miss a session? Your plan rebalances overnight so you never come back to a wall of red.',
  },
  {
    emoji: '⚡',
    title: 'ACWR load monitor',
    body:  'See your acute-to-chronic ratio in real time. Avoid the over-training spike before it hits you.',
  },
  {
    emoji: '🤖',
    title: 'AI coaching',
    body:  'Ask the coach anything. Plan tweaks, fueling, taper. Powered by Claude with your data as context.',
  },
  {
    emoji: '🏁',
    title: 'Race-day brief',
    body:  "Get a tailored pre-race brief seven days out — pacing, kit, fuel, the lot.",
  },
]

function storageKey(userId: string): string {
  return `nextsplit_trial_welcomed_${userId}`
}

export function TrialWelcomeModal({ show, userId, trialDaysLeft, trialSource, onDismiss }: Props) {
  const [mounted, setMounted] = useState(false)

  // Skip render on the first SSR pass — we read localStorage synchronously
  // in the parent gate, but the modal itself only mounts client-side
  // (animations, focus trap). The mounted flag avoids a hydration flash.
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (mounted && show) {
      Analytics.upgradePromptShown('trial_welcome_modal', `home_trial_${trialDaysLeft ?? 14}d`)
    }
  }, [mounted, show, trialDaysLeft])

  if (!mounted || !show || !userId) return null

  const header = (trialSource && SOURCE_HEADER[trialSource]) || {
    kicker: 'TRIAL ACTIVE',
    lead:   "You've got NextSplit Pro for 14 days.",
  }

  function dismiss() {
    if (userId) {
      try { localStorage.setItem(storageKey(userId), new Date().toISOString()) } catch { /* ignore */ }
    }
    onDismiss()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Trial welcome"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={dismiss}
    >
      <div
        className="rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, #0a0e1a 0%, #0d3d38 100%)',
          border: '2px solid rgba(0,212,255,0.45)',
          boxShadow: '0 24px 64px rgba(0,212,255,0.22)',
        }}
      >
        <div className="p-6">
          {/* Hero */}
          <div className="text-center mb-6">
            <div className="text-5xl mb-3" aria-hidden>⭐</div>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#00d4ff' }}>
              {header.kicker}
            </p>
            <p className="text-2xl font-black mt-2" style={{ color: '#7fff4d', letterSpacing: '-0.02em' }}>
              {header.lead}
            </p>
            {trialDaysLeft !== null && (
              <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} remaining · no card required
              </p>
            )}
          </div>

          {/* Feature list */}
          <ul className="space-y-3 mb-6">
            {FEATURES.map(f => (
              <li
                key={f.title}
                className="flex gap-3 rounded-2xl p-3"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <span className="text-2xl flex-shrink-0" aria-hidden>{f.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black" style={{ color: 'white' }}>{f.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>{f.body}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* CTAs */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={dismiss}
              className="w-full py-3.5 rounded-2xl font-black text-sm active:scale-[0.98] transition-transform"
              style={{ background: '#00d4ff', color: '#0a0e1a' }}
            >
              Start exploring →
            </button>
            <Link
              href="/upgrade"
              onClick={() => {
                Analytics.upgradeClicked('trial_welcome_modal')
                dismiss()
              }}
              className="w-full py-3 rounded-2xl text-center font-bold text-xs"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)' }}
            >
              Lock in founding £7.99/mo →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper for parents — checks localStorage to decide whether to show the
// modal. SSR-safe (returns false during render with no window). Call
// from useEffect on mount.
export function shouldShowTrialWelcome(userId: string | null): boolean {
  if (typeof window === 'undefined') return false
  if (!userId) return false
  try {
    return !localStorage.getItem(storageKey(userId))
  } catch {
    return false
  }
}
