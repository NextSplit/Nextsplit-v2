'use client'

import Link from 'next/link'
import { useSquad } from '@/hooks/useSquad'
import SquadLeaderboard from '@/app/squad/SquadLeaderboard'

interface Props { userId: string }

// Passive leaderboard — uses existing useSquad hook + SquadLeaderboard
// component (squad weekly-km ranking). Adds a global-rankings teaser card
// that locks behind Phase 3+ character launch (no new RPC, no new schema).
//
// /forge v1 + council /council R2 — the marketing lens called this out as
// a zero-engineering-risk way to seed the Race surface vocabulary before
// the full character system ships.

export default function LeaderboardClient({ userId }: Props) {
  const { squad, loading } = useSquad()

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40 border-b"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="max-w-lg mx-auto px-4 pt-12 pb-3 flex items-center justify-between">
          <h1 className="text-base font-black" style={{ color: 'var(--color-text-primary)' }}>
            🏆 Leaderboard
          </h1>
          <Link
            href="/squad"
            className="text-xs font-bold px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}
          >
            Squad →
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto pt-4 px-4">
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-tertiary)' }}>
          Weekly km ranking across your squad. Reset every Monday at 00:00 UTC.
        </p>
      </div>

      {/* Squad weekly km leaderboard (existing component) */}
      {loading && (
        <div className="text-center py-10">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3"
            style={{ borderColor: 'var(--ns-lime)', borderTopColor: 'transparent' }}
          />
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            Loading…
          </p>
        </div>
      )}

      {!loading && !squad && (
        <div className="max-w-sm mx-auto px-4">
          <div
            className="rounded-2xl p-6 text-center"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="text-3xl mb-3">👥</div>
            <h2 className="text-base font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
              Join a squad to see the leaderboard
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-tertiary)' }}>
              Training is better together. Start or join a squad to see weekly rankings.
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="/squad/create"
                className="py-3 rounded-2xl text-sm font-black"
                style={{ background: 'var(--ns-lime)', color: '#0d1a05' }}
              >
                👑 Start a squad
              </Link>
              <Link
                href="/squad/join"
                className="py-3 rounded-2xl text-sm font-bold"
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                🔗 Join with a code
              </Link>
            </div>
          </div>
        </div>
      )}

      {!loading && squad && (
        <SquadLeaderboard
          squad={squad}
          members={(squad.squad_members ?? []) as unknown as never[]}
          myUserId={userId}
        />
      )}

      {/* Global leaderboard teaser — locks behind Phase 3+ character launch */}
      <div className="max-w-sm mx-auto px-4 mt-6">
        <div
          className="rounded-2xl overflow-hidden relative"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div className="px-4 pt-3 pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2">
              <span className="text-base">🌍</span>
              <p
                className="text-xs font-black uppercase tracking-widest"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Global rankings
              </p>
            </div>
          </div>
          <div className="px-4 py-6 text-center">
            <div className="text-3xl mb-2">🔒</div>
            <p className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
              Coming with character launch
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              Cross-squad rankings + division leagues unlock when your runner
              character ships.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-4 mt-3">
        <p className="text-[10px] text-center" style={{ color: 'var(--color-text-tertiary)' }}>
          Leaderboard reflects sessions logged with{' '}
          <span className="font-semibold">share_logs_with_squad</span> enabled.
          Adjust under Settings → Privacy.
        </p>
      </div>
    </div>
  )
}
