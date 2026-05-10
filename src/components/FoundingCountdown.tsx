'use client'

import { useEffect, useState } from 'react'
import { useSubscription } from '@/hooks/useSubscription'
import { UpgradeModal } from '@/components/UpgradeModal'
import { Analytics } from '@/lib/analytics'

const FOUNDING_LIMIT = 500

// P4.5 — Founding-tier urgency widget.
// Two display modes driven by `remaining`:
//   remaining > 0:  countdown copy ("Only X founding spots remaining")
//   remaining = 0:  social proof ("Joined by 500 founding members")
//
// Inert today: same gate as EliteTriggerBanner — only renders when paywall
// is live (PREMIUM_ENFORCED=true → !isDevMode) AND user is non-Pro.
// Founders shouldn't see "10 spots left" while in dev mode and isPro=false
// for them by default; gate keeps the widget silent until the flip.
//
// Tap opens UpgradeModal (single canonical upgrade flow, same as
// EliteTriggerBanner). foundingLeft passed through so the modal copy
// stays consistent.

export default function FoundingCountdown() {
  const { isPro, isDevMode, foundingLeft, loading } = useSubscription()
  const [count, setCount] = useState<number | null>(null)
  const [open, setOpen]   = useState(false)

  useEffect(() => {
    fetch('/api/stripe/founding-count')
      .then(r => r.ok ? r.json() : null)
      .then((d) => { if (d?.count != null) setCount(d.count) })
      .catch(() => {})
  }, [])

  if (loading || isPro || isDevMode) return null

  const remaining = count !== null ? Math.max(0, FOUNDING_LIMIT - count) : null
  const isFull    = remaining === 0
  // Final-stretch tier — under 100 spots → high urgency badge + amber→ember pulse.
  const isFinalStretch = remaining !== null && remaining > 0 && remaining < 100

  return (
    <>
      <button
        onClick={() => {
          Analytics.upgradePromptShown('founding_tier', 'home_founding_countdown')
          setOpen(true)
        }}
        className="flex items-center gap-3 w-full rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-all text-left"
        style={{
          background: isFull
            ? 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(168,85,247,0.04))'
            : isFinalStretch
              ? 'linear-gradient(135deg, rgba(255,184,0,0.18), rgba(255,61,110,0.10))'
              : 'linear-gradient(135deg, rgba(255,184,0,0.12), rgba(255,140,0,0.06))',
          border: `2.5px solid ${isFull
            ? 'rgba(168,85,247,0.45)'
            : isFinalStretch
              ? 'rgba(255,61,110,0.55)'
              : 'rgba(255,184,0,0.5)'}`,
          boxShadow: isFinalStretch
            ? '0 4px 24px rgba(255,61,110,0.22)'
            : '0 4px 24px rgba(255,184,0,0.15)',
        }}
      >
        <span className="text-2xl flex-shrink-0">{isFull ? '👑' : '⭐'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black" style={{ color: isFull ? '#a855f7' : '#ffb800' }}>
            {isFull ? 'Elite — £9.99/mo standard' : 'Elite — £7.99/mo founding price'}
          </p>
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {isFull
              ? `Joined by ${count ?? FOUNDING_LIMIT} founding members. Lock in monthly today.`
              : remaining !== null
                ? `Only ${remaining} founding spot${remaining === 1 ? '' : 's'} remaining`
                : 'AI coaching · adaptive plans · pace trends'}
          </p>
        </div>
        {isFinalStretch && (
          <div
            className="flex-shrink-0 rounded-xl px-2.5 py-1"
            style={{ background: '#ff3d6e', boxShadow: '0 0 12px rgba(255,61,110,0.5)' }}
          >
            <p className="text-[10px] font-black text-white">{remaining} left</p>
          </div>
        )}
      </button>
      {open && <UpgradeModal onClose={() => setOpen(false)} foundingLeft={foundingLeft} />}
    </>
  )
}
