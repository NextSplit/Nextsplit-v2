'use client'

import Link from 'next/link'
import { useSquad } from '@/hooks/useSquad'

// R1 — Buried-route close-out. Previously a 4-tab hub (Coaches | Squads |
// Plans | AI) that mostly cross-linked to other surfaces and contained a
// stub AI tab calling /api/ai/coach. Stripped to a thin landing hub that
// points at the three real surfaces: /coaches, /marketplace, /squad.
// Back-links from /coaches, /squad/create, /squad/join still resolve here.

export default function ExploreClient() {
  const { squad } = useSquad()

  return (
    <div className="min-h-screen pb-28" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 border-b"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-lg mx-auto px-4 pt-12 pb-4">
          <h1 className="text-xl font-black" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
            Explore
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            Find a coach, browse plans, or train with a squad.
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-3">

        {/* Coaches */}
        <Link href="/coaches"
          className="block rounded-2xl p-5 active:scale-[0.98] transition-all"
          style={{ background: 'rgba(139,92,246,0.08)', border: '1.5px solid rgba(139,92,246,0.25)' }}>
          <div className="flex items-center gap-4">
            <span className="text-3xl flex-shrink-0">🎓</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: '#8b5cf6' }}>
                Verified coaches
              </p>
              <p className="text-base font-black mb-0.5" style={{ color: 'var(--color-text-primary)' }}>
                Find a coach
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                Hire a real coach who sees your logs, ACWR and wellness.
              </p>
            </div>
            <span className="text-lg flex-shrink-0" style={{ color: '#8b5cf6' }}>→</span>
          </div>
        </Link>

        {/* Plans / Marketplace */}
        <Link href="/marketplace"
          className="block rounded-2xl p-5 active:scale-[0.98] transition-all"
          style={{ background: 'rgba(37,99,235,0.08)', border: '1.5px solid rgba(37,99,235,0.25)' }}>
          <div className="flex items-center gap-4">
            <span className="text-3xl flex-shrink-0">📋</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: '#2563eb' }}>
                Coach marketplace
              </p>
              <p className="text-base font-black mb-0.5" style={{ color: 'var(--color-text-primary)' }}>
                Browse plans
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                Plans built by verified coaches — run them in the app.
              </p>
            </div>
            <span className="text-lg flex-shrink-0" style={{ color: '#2563eb' }}>→</span>
          </div>
        </Link>

        {/* Squad — smart variant: open vs start/join */}
        {squad ? (
          <Link href="/squad"
            className="block rounded-2xl p-5 active:scale-[0.98] transition-all"
            style={{ background: `${squad.colour ?? '#84cc16'}14`, border: `1.5px solid ${squad.colour ?? '#84cc16'}40` }}>
            <div className="flex items-center gap-4">
              <span className="text-3xl flex-shrink-0">👥</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: squad.colour ?? '#84cc16' }}>
                  Your squad
                </p>
                <p className="text-base font-black mb-0.5" style={{ color: 'var(--color-text-primary)' }}>
                  {squad.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  Open the leaderboard, season standings and feed.
                </p>
              </div>
              <span className="text-lg flex-shrink-0" style={{ color: squad.colour ?? '#84cc16' }}>→</span>
            </div>
          </Link>
        ) : (
          <div className="rounded-2xl p-5"
            style={{ background: 'rgba(132,204,22,0.08)', border: '1.5px solid rgba(132,204,22,0.25)' }}>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-3xl flex-shrink-0">👥</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: '#84cc16' }}>
                  Split Leader system
                </p>
                <p className="text-base font-black mb-0.5" style={{ color: 'var(--color-text-primary)' }}>
                  Train with a squad
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  Weekly leaderboards, collective goals, season standings.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/squad/create"
                className="text-center py-3 rounded-xl font-black text-xs"
                style={{ background: '#84cc16', color: '#0d1a05' }}>
                👑 Start a squad
              </Link>
              <Link href="/squad/join"
                className="text-center py-3 rounded-xl font-black text-xs"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
                🔗 Join with a code
              </Link>
            </div>
          </div>
        )}

        {/* Coach onboarding pointer */}
        <div className="rounded-2xl p-4"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-black mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
            Are you a coach?
          </p>
          <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Build plans, manage athletes, earn revenue — all inside NextSplit.
          </p>
          <Link href="/coach/setup"
            className="inline-block text-xs font-black px-4 py-2 rounded-xl text-white"
            style={{ background: '#8b5cf6' }}>
            Apply to coach →
          </Link>
        </div>
      </div>
    </div>
  )
}
