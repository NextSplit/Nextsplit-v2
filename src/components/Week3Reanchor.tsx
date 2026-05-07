'use client'

// Week-3 Hold-the-Line re-anchor (P2.7, council 2026-05-07 OPTION B headline).
//
// Why this exists: training-plan dropout peaks at week 3 — the inflection
// where novelty has worn off but adaptation hasn't shown up yet. The runner
// has logged 1-2 sessions, missed 1-2, and is one excuse away from quitting.
// This screen is the structured re-anchor moment: progress made (no shame
// about gaps), Splity in supportive voice, "this is the week most people
// quit, and you're still here" framing, no streak shame.
//
// Trigger conditions (caller decides when to render):
//   - User is on plan week 3
//   - Within day 14-21 of plan start
//   - Has missed at least one session OR has a 4+ day gap since last log
//   - Hasn't seen the re-anchor in this plan instance
//
// Caller persists "seen" via localStorage (reanchor_seen_<plan_id>) so the
// screen fires once per plan, not once per app launch.
//
// Forward-only copy per content-copy R1 mandate. Never references "you
// missed N sessions" or "your streak is broken" — only "the week" and
// "the next run".

import { useEffect } from 'react'
import { Analytics } from '@/lib/analytics'
import Splity from './Splity'

interface Props {
  sessionsDone:  number
  sessionsTotal: number
  totalKm:       number
  acwr:          number | null
  onDismiss:     () => void
}

export default function Week3Reanchor({
  sessionsDone, sessionsTotal, totalKm, acwr, onDismiss,
}: Props) {
  // Fire week3_reanchor_shown once per mount (P1.6 deferred event, now wired).
  useEffect(() => {
    Analytics.week3ReanchorShown({
      sessions_done:  sessionsDone,
      sessions_total: sessionsTotal,
      total_km:       totalKm,
      in_acwr_band:   typeof acwr === 'number' && acwr >= 0.8 && acwr <= 1.3,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const inBand = typeof acwr === 'number' && acwr >= 0.8 && acwr <= 1.3

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="week3-reanchor-title"
      className="fixed inset-0 z-[110] flex flex-col items-center justify-center px-6"
      style={{
        background: 'radial-gradient(ellipse at 50% 30%, rgba(255,61,110,0.18) 0%, #0c0c0c 70%)',
        animation: 'fadeIn 0.4s ease-out forwards',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
      <div className="w-full max-w-sm flex flex-col items-center text-center"
        style={{ animation: 'slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>

        <div style={{ animation: 'splityBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both' }}>
          <Splity mood="happy" size={108} />
        </div>

        <h2 id="week3-reanchor-title"
          className="mt-6 text-2xl font-black"
          style={{ color: 'white', letterSpacing: '-0.02em' }}>
          You&apos;re still here.
        </h2>

        <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
          Week three is where most people stop showing up. You&apos;ve logged{' '}
          <span className="font-bold" style={{ color: 'var(--ns-cyan)' }}>
            {sessionsDone} session{sessionsDone === 1 ? '' : 's'}
          </span>
          {totalKm > 0 && (
            <>
              {' '}and{' '}
              <span className="font-bold" style={{ color: 'var(--ns-cyan)' }}>
                {Math.round(totalKm)}km
              </span>
            </>
          )}
          . That&apos;s the foundation.
        </p>

        {/* Stats card */}
        <div className="mt-6 w-full rounded-2xl p-4 flex gap-4"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex-1 text-center">
            <p className="text-2xl font-black text-white">{sessionsDone}/{sessionsTotal}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>sessions</p>
          </div>
          {totalKm > 0 && (
            <div className="flex-1 text-center">
              <p className="text-2xl font-black text-white">{Math.round(totalKm)}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>km</p>
            </div>
          )}
          {inBand && (
            <div className="flex-1 text-center">
              <p className="text-2xl font-black" style={{ color: '#22c55e' }}>{acwr!.toFixed(2)}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>ACWR</p>
            </div>
          )}
        </div>

        {/* ACWR-band gated copy */}
        {inBand ? (
          <p className="mt-4 text-xs" style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
            Your training load is dialled in — ACWR {acwr!.toFixed(2)} is exactly where injury risk stays low. Keep going.
          </p>
        ) : (
          <p className="mt-4 text-xs" style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
            The next run is the only one that matters. Run when you&apos;re ready.
          </p>
        )}

        <button
          onClick={onDismiss}
          aria-label="Continue training"
          className="mt-6 w-full py-4 rounded-2xl text-sm font-black active:scale-[0.98] transition-all"
          style={{
            background: 'linear-gradient(135deg,#ff3d6e,#c41a4a)',
            color: 'white',
            boxShadow: '0 8px 24px rgba(255,61,110,0.45)',
          }}>
          Keep going 🏃
        </button>

        <button
          onClick={onDismiss}
          className="mt-3 text-xs"
          style={{ color: 'rgba(255,255,255,0.35)' }}>
          Dismiss
        </button>
      </div>
    </div>
  )
}
