'use client'

// ACWR Advisory Banner — P2.7 soft-version (council 2026-05-07).
//
// Fires on /train when the user's latest computed ACWR is above the
// danger threshold (1.3). Surfaces the warning at the BEFORE-the-session
// surface where it could prevent injury, rather than the celebration
// screen where it only acknowledges post hoc.
//
// Forward-only copy per content-copy R1: never "you over-trained" or
// "you ignored your rest"; always the forward action ("today's session
// could be eased without breaking the plan").
//
// Hard override (auto-replacing the prescribed session) is OUT of scope
// here — that's the product decision the council still owes. This banner
// is INFORMATIONAL: the user retains agency over today's choice.
//
// Per-day dismiss via localStorage so a single dismissal doesn't echo
// across every TrainClient mount of the same day.

import { useEffect, useState } from 'react'
import { Analytics } from '@/lib/analytics'

interface Props {
  latestAcwr:   number
  todaySessionType?: string
}

const DANGER_THRESHOLD = 1.3

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

export default function AcwrAdvisoryBanner({ latestAcwr, todaySessionType }: Props) {
  const [dismissed, setDismissed] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`nextsplit_acwr_advisory_dismissed_${todayKey()}`)
      setDismissed(stored === '1')
    } catch {
      setDismissed(false)
    }
  }, [])

  useEffect(() => {
    if (dismissed === false) {
      Analytics.acwrAdvisoryShown({
        acwr: latestAcwr,
        session_type: todaySessionType,
      })
    }
    // Fire-once per mount. eslint-disable not needed since dismissed/latestAcwr are deps
  }, [dismissed, latestAcwr, todaySessionType])

  if (latestAcwr <= DANGER_THRESHOLD) return null
  if (dismissed !== false) return null  // hide while loading or already dismissed

  function dismiss() {
    try { localStorage.setItem(`nextsplit_acwr_advisory_dismissed_${todayKey()}`, '1') } catch {}
    setDismissed(true)
  }

  const isHighVolume =
    todaySessionType?.includes('tempo') ||
    todaySessionType?.includes('interval') ||
    todaySessionType?.includes('long')

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl px-4 py-3"
      style={{
        background: 'rgba(234,179,8,0.10)',
        border: '1px solid rgba(234,179,8,0.35)',
      }}>
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0" aria-hidden="true">⚖️</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Training load elevated — ACWR {latestAcwr.toFixed(2)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            {isHighVolume
              ? `Today's session is high-volume. Consider easing it without breaking the plan — easy run, fewer reps, or moving it to tomorrow.`
              : `You're above the safe band (0.8 – 1.3). Today's a good day to keep it light.`}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss advisory"
          className="text-[10px] font-bold px-2 py-1 rounded-md flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-tertiary)' }}>
          Got it
        </button>
      </div>
    </div>
  )
}
