'use client'

import { useEffect, useRef, useState } from 'react'
import { BUILD_CLASS_META, type BuildClass } from '@/lib/character'

// Renders the per-runner lane animation from result_timeline waypoints
// (11 splits per runner, 0% → 100% of distance). Drives a CSS transition on
// each lane so the dot animates from split to split. Animation duration is
// scaled — the slowest finisher takes ~6s of real time regardless of their
// in-race finish_secs; the rest finish proportionally earlier.
//
// finishing_order drives the lane order (top = winner). Self lane is
// highlighted via selfUserId match.

export interface RaceTimelineRunner {
  user_id:     string
  build_class: BuildClass | string
  finish_secs: number
  rank:        number
  splits:      number[]  // 11 ints, 0..distance_m
}

interface Props {
  runners:      RaceTimelineRunner[]
  distanceM:    number
  selfUserId?:  string
  /** Display name lookup (user_id → @handle or fallback "Runner #N"). */
  displayName?: (userId: string) => string
}

const ANIMATION_TOTAL_MS = 6000   // total replay length, slowest finisher

export function RaceResultReplay({ runners, distanceM, selfUserId, displayName }: Props) {
  const [step, setStep]   = useState(0)
  const [done, setDone]   = useState(false)
  const timerRef          = useRef<ReturnType<typeof setInterval> | null>(null)

  // Drive the step counter 0 → 10 over ANIMATION_TOTAL_MS.
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setStep(0)
    setDone(false)
    const interval = ANIMATION_TOTAL_MS / 10
    timerRef.current = setInterval(() => {
      setStep(s => {
        if (s >= 10) {
          if (timerRef.current) clearInterval(timerRef.current)
          setDone(true)
          return 10
        }
        return s + 1
      })
    }, interval)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [runners])

  if (!runners.length) {
    return (
      <div className="text-center py-6 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
        No entries to replay.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {runners.map((runner) => {
        const meta = BUILD_CLASS_META[runner.build_class as BuildClass]
        const positionM = runner.splits[step] ?? 0
        const pct = Math.min(100, (positionM / distanceM) * 100)
        const isSelf = selfUserId && runner.user_id === selfUserId
        const finishedAtThisStep = positionM >= distanceM

        return (
          <div key={runner.user_id} className="relative">
            <div className="flex items-center justify-between mb-1 px-1">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="text-[10px] font-black w-5 text-center"
                  style={{ color: runner.rank === 1 ? 'var(--ns-amber)' : 'var(--color-text-tertiary)' }}
                >
                  #{runner.rank}
                </span>
                <span className="text-base" aria-hidden>{meta?.emoji ?? '🏃'}</span>
                <span
                  className="text-xs font-bold truncate"
                  style={{ color: isSelf ? 'var(--ns-magenta)' : 'var(--color-text-primary)' }}
                >
                  {displayName ? displayName(runner.user_id) : `Runner ${runner.rank}`}
                  {isSelf && <span className="ml-1 text-[9px]" style={{ color: 'var(--ns-magenta)' }}>(YOU)</span>}
                </span>
              </div>
              <span
                className="text-xs font-mono tabular-nums"
                style={{
                  color: finishedAtThisStep ? 'var(--ns-amber)' : 'var(--color-text-tertiary)',
                  opacity: done ? 1 : finishedAtThisStep ? 1 : 0.4,
                }}
              >
                {done || finishedAtThisStep
                  ? formatFinishSecs(runner.finish_secs)
                  : '—'}
              </span>
            </div>
            <div
              className="relative h-3 rounded-full overflow-hidden"
              style={{
                background: 'var(--color-surface-2)',
                border: isSelf ? '1px solid var(--ns-magenta)' : '1px solid var(--color-border)',
              }}
            >
              {/* Track lines */}
              <div className="absolute inset-y-0 left-1/4 w-px opacity-20"  style={{ background: 'var(--color-text-tertiary)' }} />
              <div className="absolute inset-y-0 left-1/2 w-px opacity-20"  style={{ background: 'var(--color-text-tertiary)' }} />
              <div className="absolute inset-y-0 left-3/4 w-px opacity-20"  style={{ background: 'var(--color-text-tertiary)' }} />
              {/* Runner position dot */}
              <div
                className="absolute top-0 bottom-0 rounded-full transition-all ease-linear"
                style={{
                  width: `${Math.max(2, pct)}%`,
                  background: isSelf
                    ? 'linear-gradient(90deg, transparent 0%, var(--ns-magenta-light) 70%, var(--ns-magenta) 100%)'
                    : 'linear-gradient(90deg, transparent 0%, var(--color-surface-3) 70%, var(--ns-cyan) 100%)',
                  transitionDuration: `${ANIMATION_TOTAL_MS / 10}ms`,
                }}
              />
            </div>
          </div>
        )
      })}

      {/* Replay restart button (after animation completes) */}
      {done && (
        <button
          onClick={() => { setStep(0); setDone(false); /* useEffect will re-trigger */ }}
          className="w-full text-xs font-bold py-2 mt-2 rounded-lg"
          style={{
            background: 'var(--color-surface-2)',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          ▶ Replay
        </button>
      )}
    </div>
  )
}

function formatFinishSecs(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
