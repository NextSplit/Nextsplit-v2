'use client'

import Link from 'next/link'

// Conversion nudges shown on the Home surface. Lifted from HomeClient
// during R2 god-component decomp.
//
// PR X — onboarding trial-eligible CTA. CoachNudge + SquadNudge surface
// a "+14 days Pro free" line for users who haven't yet had a trial AND
// aren't already Pro. The parent computes `showTrialUnlock` once and
// passes it down so both nudges stay consistent.

export function CoachNudge({ showTrialUnlock }: { showTrialUnlock: boolean }) {
  return (
    <Link href="/coaches" className="mx-4 block active:scale-[0.98] transition-all">
      <div className="rounded-2xl p-4 flex items-center gap-3"
        style={{
          background: 'linear-gradient(135deg, rgba(168,85,247,0.14), rgba(168,85,247,0.05))',
          border: '2.5px solid rgba(168,85,247,0.5)',
          boxShadow: '0 4px 24px rgba(168,85,247,0.12)',
        }}>
        <div className="text-2xl">🎓</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black" style={{ color: '#a855f7' }}>Get a verified coach</p>
          <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
            They see your logs, ACWR and pace trends · from £30/mo
          </p>
          {showTrialUnlock && (
            <p className="text-[10px] font-black mt-1" style={{ color: '#7fff4d' }}>
              🎁 First coach message unlocks 14 days Pro free
            </p>
          )}
        </div>
        <span style={{ color: '#a855f7', fontWeight: 900 }}>→</span>
      </div>
    </Link>
  )
}

export function SquadNudge({ showTrialUnlock }: { showTrialUnlock: boolean }) {
  return (
    <Link href="/squad" className="mx-4 block active:scale-[0.98] transition-all">
      <div className="rounded-2xl p-4 flex items-center gap-3"
        style={{
          background: 'linear-gradient(135deg, rgba(127,255,77,0.14), rgba(127,255,77,0.05))',
          border: '2.5px solid rgba(127,255,77,0.5)',
          boxShadow: '0 4px 24px rgba(127,255,77,0.12)',
        }}>
        <div className="text-2xl">👥</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black" style={{ color: '#7fff4d' }}>Start a squad</p>
          <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
            Train together · weekly leaderboard · nudges
          </p>
          {showTrialUnlock && (
            <p className="text-[10px] font-black mt-1" style={{ color: '#7fff4d' }}>
              🎁 Joining a squad unlocks 14 days Pro free
            </p>
          )}
        </div>
        <span style={{ color: '#7fff4d', fontWeight: 900 }}>→</span>
      </div>
    </Link>
  )
}

export function EliteNudge() {
  return (
    <Link href="/settings" className="mx-4 block active:scale-[0.98] transition-all">
      <div className="rounded-2xl p-4 flex items-center gap-3"
        style={{
          background: 'linear-gradient(135deg, rgba(255,184,0,0.1), rgba(255,140,0,0.06))',
          border: '2.5px solid rgba(255,184,0,0.45)',
        }}>
        <span className="text-2xl">⭐</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black" style={{ color: '#ffb800' }}>
            Go Elite — £7.99/mo
          </p>
          <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
            AI coaching · ACWR · adaptive plans · founding price
          </p>
        </div>
        <div className="rounded-xl px-3 py-1.5 font-black text-xs"
          style={{ background: '#ffb800', color: '#0a0e1a' }}>
          Upgrade
        </div>
      </div>
    </Link>
  )
}
