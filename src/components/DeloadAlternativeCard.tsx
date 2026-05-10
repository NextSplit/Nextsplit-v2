'use client'

import { useEffect } from 'react'
import { Analytics } from '@/lib/analytics'

// P2.7 hard-deload — show-both UX (OQ#7 = B per founder vote 2026-05-10).
//
// When the user's ACWR is above the danger threshold AND today's prescribed
// session is high-volume (tempo / interval / long), this card sits next to
// the original session card on /train. The athlete picks: stick with the
// prescribed hard session OR take the suggested deload.
//
// Why "show both" beats "auto-replace": athletes have context the algorithm
// doesn't (taper week, race tomorrow, just a busy life day). Removing the
// hard session entirely robs them of the choice. Showing both keeps the
// athlete in control while making the safer path obvious.
//
// Logging the deload alternative still completes the day's session slot
// (same week_n / day_i / session_i as the original) so the streak / done
// counts treat it as completed. The actual session_type logged is the
// deload variant, so character XP + ACWR-future calc reflects the lighter
// load.
//
// Suppression rule (mirrors AcwrAdvisoryBanner BL-B3):
//   · ACWR ≤ 1.3 → no card
//   · chronic baseline < 12 km/week → no card (ratio not meaningful)
//   · prescribed session not high-volume → no card (rest day, easy run, gym
//     don't need a deload alternative)

interface PrescribedSession {
  c:  string  // session code, e.g. 'tempo_8x400'
  km: number
  n?: string | null
}

interface Props {
  prescribed:        PrescribedSession
  latestAcwr:        number
  chronicBaselineKm: number
  alreadyDone:       boolean   // hide once user has logged the original
  onSelectDeload:    (deload: { km: number; sessionType: string; label: string }) => void
}

const DANGER_THRESHOLD    = 1.3
const CHRONIC_BASELINE_KM = 12

function isHighVolume(code: string | undefined): boolean {
  if (!code) return false
  const c = code.toLowerCase()
  return c.includes('tempo') || c.includes('interval') || c.includes('long')
}

// Map prescribed session → recommended deload alternative. Volume cut to
// roughly 60% of prescribed km, capped at 8km. Type drops to 'easy'.
function deriveDeload(prescribed: PrescribedSession): { km: number; sessionType: string; label: string } {
  const km    = Math.max(3, Math.min(8, Math.round(prescribed.km * 0.6)))
  const isLong = (prescribed.c ?? '').toLowerCase().includes('long')
  return {
    km,
    sessionType: 'easy',
    label:       isLong
      ? `Easy ${km} km`
      : `Easy ${km} km — keep it conversational`,
  }
}

export function DeloadAlternativeCard({
  prescribed, latestAcwr, chronicBaselineKm, alreadyDone, onSelectDeload,
}: Props) {
  // Suppression
  const shouldRender =
    !alreadyDone
    && latestAcwr > DANGER_THRESHOLD
    && chronicBaselineKm >= CHRONIC_BASELINE_KM
    && isHighVolume(prescribed.c)

  const deload = shouldRender ? deriveDeload(prescribed) : null

  useEffect(() => {
    if (shouldRender && deload) {
      Analytics.hardDeloadShown({
        acwr:                latestAcwr,
        chronic_baseline_km: Math.round(chronicBaselineKm * 10) / 10,
        prescribed_type:     prescribed.c,
        prescribed_km:       prescribed.km,
        deload_km:           deload.km,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRender])

  if (!shouldRender || !deload) return null

  return (
    <div
      className="rounded-2xl overflow-hidden active:scale-[0.99] transition-all cursor-pointer"
      style={{
        background:  'linear-gradient(135deg, #059669, #047857)',
        boxShadow:   '0 4px 20px rgba(34,197,94,0.30)',
        border:      '2px dashed rgba(255,255,255,0.18)',
      }}
      onClick={() => {
        Analytics.hardDeloadAccepted({
          acwr:           latestAcwr,
          prescribed_km:  prescribed.km,
          deload_km:      deload.km,
        })
        onSelectDeload(deload)
      }}
    >
      <div className="flex">
        <div className="w-1.5 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.3)' }} />
        <div className="flex-1 p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            🧊
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest mb-0.5"
               style={{ color: 'rgba(255,255,255,0.85)' }}>
              Deload alternative · ACWR {latestAcwr.toFixed(2)}
            </p>
            <p className="text-base font-black text-white leading-tight"
               style={{ letterSpacing: '-0.01em' }}>
              {deload.label}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Tap to log this instead. Original above is still yours to choose.
            </p>
          </div>
          <button
            type="button"
            className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)' }}
            aria-label="Log deload session"
          >
            <div className="w-3 h-3 rounded-full bg-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
