'use client'

// Gap-recovery banner — P2.7 soft version (council 2026-05-07).
//
// Fires when the user's last logged session was 7+ days ago. Welcomes
// them back without the streak-shame frame ("you broke your streak"
// → never; "pick up where you are" → always). Forward-only copy per
// content-copy R1.
//
// The plan-adapt flow is the underlying behaviour: NextSplit plans
// already adjust to your actual start point rather than your signup
// date. This banner just surfaces that promise to a returning user
// at the moment they need to hear it.
//
// Per-gap dismiss: localStorage stores the date of the most recent log
// at dismiss time; if a NEW gap opens (last log advances past the
// stored marker), the banner can fire again. One dismiss covers one
// gap, not all future gaps.

import { useEffect, useState } from 'react'
import { Analytics } from '@/lib/analytics'

interface Props {
  lastLoggedAt: string | null  // ISO timestamp of most recent done log
}

const GAP_DAYS_THRESHOLD = 7

const STORAGE_KEY = 'nextsplit_gap_recovery_dismissed_for'

export default function GapRecoveryBanner({ lastLoggedAt }: Props) {
  const [dismissed, setDismissed] = useState<boolean | null>(null)

  // gapDays — null if no log ever (don't fire; that's a fresh-account state,
  // which is a different surface).
  const gapDays = lastLoggedAt
    ? Math.floor((Date.now() - new Date(lastLoggedAt).getTime()) / 86400000)
    : null

  useEffect(() => {
    if (!lastLoggedAt) { setDismissed(true); return }
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      // Dismissed for THIS gap if the stored timestamp matches the current
      // last log. A new log → new gap → stored marker is stale → re-show.
      setDismissed(stored === lastLoggedAt)
    } catch {
      setDismissed(false)
    }
  }, [lastLoggedAt])

  useEffect(() => {
    if (dismissed === false && gapDays !== null && gapDays >= GAP_DAYS_THRESHOLD) {
      Analytics.gapRecoveryShown({ gap_days: gapDays })
    }
  }, [dismissed, gapDays])

  if (gapDays === null || gapDays < GAP_DAYS_THRESHOLD) return null
  if (dismissed !== false) return null

  function dismiss() {
    try {
      if (lastLoggedAt) localStorage.setItem(STORAGE_KEY, lastLoggedAt)
    } catch { /* noop */ }
    setDismissed(true)
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl px-4 py-3"
      style={{
        background: 'rgba(0,212,255,0.10)',
        border: '1px solid rgba(0,212,255,0.35)',
      }}>
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0" aria-hidden="true">👋</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Welcome back.
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            {gapDays} days since your last run. Don&apos;t catch up — pick up where you are.
            The plan adapts to today, not the day you signed up.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss welcome back"
          className="text-[10px] font-bold px-2 py-1 rounded-md flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-tertiary)' }}>
          Thanks
        </button>
      </div>
    </div>
  )
}
