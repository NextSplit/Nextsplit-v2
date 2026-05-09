'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useTodayRace } from '@/hooks/useTodayRace'
import { useCharacter } from '@/hooks/useCharacter'
import { BUILD_CLASS_META, type BuildClass } from '@/lib/character'

// Today's race surface. Three states:
//   1. No character yet            → CTA to /you to pick a build class
//   2. Race open, not entered       → entry CTA + countdown to entries_close
//   3. Race open, entered           → entered confirmation + countdown to resolve
//   4. Race finalized               → result preview (rank + finish_secs) +
//                                     link to /race for full replay
//
// Variant prop controls layout: 'full' (used on /race surface) vs 'compact'
// (used on Home as a teaser linking to /race).

interface Props {
  variant?: 'full' | 'compact'
}

export function RaceCard({ variant = 'full' }: Props) {
  const { data, loading, enter } = useTodayRace()
  const { character }            = useCharacter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  if (loading || !data) {
    return (
      <div
        className="rounded-2xl animate-pulse"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          height: variant === 'compact' ? 80 : 160,
        }}
      />
    )
  }

  if (!data.race) {
    return (
      <div
        className="rounded-2xl px-4 py-4 text-sm"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-tertiary)',
        }}
      >
        No race scheduled today.
      </div>
    )
  }

  const race            = data.race
  const isEntered       = !!data.my_entry
  const isFinalized     = !!race.finalized_at
  const hasResult       = !!data.result
  const closesAt        = new Date(race.entries_close_at)
  const resolvesAt      = new Date(race.resolves_at)
  const now             = Date.now()
  const closesInMs      = Math.max(0, closesAt.getTime() - now)
  const resolvesInMs    = Math.max(0, resolvesAt.getTime() - now)
  const entriesOpen     = closesInMs > 0 && !isFinalized

  // Self lookup in finishing_order — match by user_id (provided by the API
  // as me_user_id). build_class match would collide when multiple users
  // share a class.
  const myRank = data.result && data.me_user_id
    ? data.result.finishing_order.find(f => f.user_id === data.me_user_id) ?? null
    : null

  const handleEnter = async () => {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await enter()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enter')
    } finally {
      setSubmitting(false)
    }
  }

  if (variant === 'compact') {
    return (
      <Link
        href="/race"
        className="block rounded-2xl px-4 py-3 transition-all active:scale-[0.98]"
        style={{
          background: 'linear-gradient(135deg, var(--ns-magenta-light) 0%, var(--color-surface) 100%)',
          border: '1.5px solid var(--ns-magenta)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--ns-magenta)' }}>
              {isFinalized ? '🏁 Today\'s race finished' : isEntered ? '✓ Entered' : '🏃 Race today'}
            </p>
            <p className="text-sm font-black truncate" style={{ color: 'var(--color-text-primary)' }}>
              {race.name}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              {isFinalized
                ? `${data.entry_count} entries · view replay`
                : entriesOpen
                  ? `${data.entry_count} entered · closes in ${formatDelta(closesInMs)}`
                  : `Resolves in ${formatDelta(resolvesInMs)}`}
            </p>
          </div>
          <span className="text-xl" aria-hidden>→</span>
        </div>
      </Link>
    )
  }

  // Full variant
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div className="px-4 pt-3 pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--ns-magenta)' }}>
          🏁 {race.format.replace('_', ' ').toUpperCase()}
        </p>
        <p className="text-base font-black mt-1" style={{ color: 'var(--color-text-primary)' }}>
          {race.name}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
          {(race.distance_m / 1000).toFixed(1)} km · {data.entry_count} {data.entry_count === 1 ? 'entry' : 'entries'}
        </p>
      </div>

      <div className="px-4 py-3">
        {/* No character yet */}
        {!character && (
          <div className="text-center py-2">
            <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              Pick a build class on /you to enter races.
            </p>
            <Link
              href="/you"
              className="inline-block px-4 py-2 rounded-lg text-sm font-black text-white"
              style={{ background: 'var(--ns-magenta)' }}
            >
              Pick build class →
            </Link>
          </div>
        )}

        {/* Has character + finalized */}
        {character && isFinalized && hasResult && (
          <div>
            {myRank ? (
              <div
                className="rounded-xl px-3 py-3 mb-2 text-center"
                style={{
                  background: myRank.rank === 1 ? 'var(--ns-amber)' : 'var(--color-surface-2)',
                  color: myRank.rank === 1 ? 'var(--color-bg)' : 'var(--color-text-primary)',
                }}
              >
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Your finish</p>
                <p className="text-2xl font-black mt-1">#{myRank.rank}</p>
                <p className="text-sm font-mono mt-0.5">{formatFinishSecs(myRank.finish_secs)}</p>
              </div>
            ) : (
              <p className="text-sm text-center mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
                You did not enter today's race.
              </p>
            )}
            <p className="text-xs text-center" style={{ color: 'var(--color-text-tertiary)' }}>
              View replay below ↓
            </p>
          </div>
        )}

        {/* Has character + entered + not finalized */}
        {character && !isFinalized && isEntered && (
          <div className="text-center py-1">
            <p className="text-sm font-black" style={{ color: 'var(--ns-forest)' }}>
              ✓ Entered
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              Resolves in {formatDelta(resolvesInMs)}
            </p>
            <p className="text-[10px] mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
              Snapshot frozen at {data.my_entry?.character_snapshot.speed_stat ?? 0}/{data.my_entry?.character_snapshot.endurance_stat ?? 0}/{data.my_entry?.character_snapshot.resilience_stat ?? 0}
            </p>
          </div>
        )}

        {/* Has character + not entered + entries open */}
        {character && !isFinalized && !isEntered && entriesOpen && (
          <div>
            <button
              onClick={handleEnter}
              disabled={submitting}
              className="w-full py-3 rounded-lg text-sm font-black text-white disabled:opacity-50"
              style={{ background: 'var(--ns-magenta)' }}
            >
              {submitting ? 'Entering…' : `Enter as ${BUILD_CLASS_META[character.build_class as BuildClass]?.name ?? character.build_class}`}
            </button>
            <p className="text-[10px] text-center mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
              Entries close in {formatDelta(closesInMs)}
            </p>
            {error && <p className="text-xs text-red-500 mt-2 text-center">{error}</p>}
          </div>
        )}

        {/* Has character + not entered + entries closed but not finalized yet */}
        {character && !isFinalized && !isEntered && !entriesOpen && (
          <div className="text-center py-2">
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
              Entries closed for today. Resolves in {formatDelta(resolvesInMs)}.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function formatDelta(ms: number): string {
  if (ms <= 0) return 'now'
  const totalSecs = Math.floor(ms / 1000)
  const hours = Math.floor(totalSecs / 3600)
  const mins  = Math.floor((totalSecs % 3600) / 60)
  if (hours > 0) return `${hours}h ${mins}m`
  if (mins > 0)  return `${mins}m`
  return `${totalSecs}s`
}

function formatFinishSecs(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
