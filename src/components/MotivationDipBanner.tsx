'use client'

import Link from 'next/link'
import { Analytics } from '@/lib/analytics'

// P4.4 — Coach upsell at motivation dip.
// Roadmap copy: "3-day no-log → soft 'Talk to a coach' banner on Home."
//
// Distinct from the Pro/Elite upsell stack (P4.3 + P4.5):
//   · This routes to the COACH economy (£29/mo platform fee + plan
//     sales), not the Pro subscription
//   · No PREMIUM_ENFORCED gate — coaches make money even when the Pro
//     paywall is off
//   · Soft tone — the user is already drifting; aggressive copy makes
//     it worse. "Stuck? A coach can help you back on track" not "BUY
//     COACHING NOW"
//
// Trigger conditions (all required):
//   · Has active plan (otherwise the gap is by design — beginner pre-plan)
//   · No done log in last 3 days (the dip itself)
//   · Has NO active coach (would be redundant; insulting even if they
//     already pay for one and aren't being supported)
//
// Parent computes the conditions + passes show. This component just
// renders the banner.

interface Props {
  show: boolean
}

export function MotivationDipBanner({ show }: Props) {
  if (!show) return null

  return (
    <Link
      href="/coaches"
      onClick={() => {
        Analytics.upgradePromptShown('coach_marketplace', 'home_motivation_dip')
      }}
      className="block w-full mx-4 rounded-2xl px-4 py-3.5 text-left transition-all active:scale-[0.98]"
      style={{
        background: 'linear-gradient(135deg, var(--ns-violet), var(--ns-cobalt))',
        boxShadow: '0 8px 24px rgba(168,85,247,0.22)',
        maxWidth: 'calc(100% - 2rem)',
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl flex-shrink-0" aria-hidden>👋</span>
        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] font-black uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            Stuck this week?
          </p>
          <p className="text-sm font-black mt-0.5" style={{ color: 'white' }}>
            A coach can help you back on track
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Browse coaches who specialise in your distance + level.
          </p>
        </div>
        <span className="text-xl flex-shrink-0" aria-hidden style={{ color: 'rgba(255,255,255,0.85)' }}>→</span>
      </div>
    </Link>
  )
}
