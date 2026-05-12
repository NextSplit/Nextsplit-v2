'use client'

import Link from 'next/link'
import { getLevelForXP, getXPProgress } from '@/lib/rpg'

// "Chrome" components for Home — header bar, stats, race countdown,
// notifications, squad mini. Lifted from HomeClient during R2 god-component
// decomp. Shared trait: small presentational cards that wrap external state
// without owning data fetching themselves.

export function XPHeaderBar({ xp, streak, hasPlan, onShareStreak }: { xp: number; streak: number; hasPlan?: boolean; onShareStreak?: () => void }) {
  const level = getLevelForXP(xp)
  const pct   = getXPProgress(xp)
  const hour  = new Date().getHours()
  const atRisk = streak > 0 && hour >= 19

  // Day-1 users (no plan, no XP, no streak) get a single CTA pill instead
  // of the empty streak/progress/level triple. Without this, the header
  // renders as a "dead" dark strip below the user chip.
  if (xp === 0 && streak === 0 && !hasPlan) {
    return (
      <Link href="/onboarding/ai"
        className="mx-4 mb-2 flex items-center justify-between px-3.5 py-2 rounded-full active:scale-[0.98] transition-transform"
        style={{
          background: 'linear-gradient(135deg, rgba(0,212,255,0.18), rgba(0,212,255,0.08))',
          border: '2px solid rgba(0,212,255,0.5)',
        }}>
        <span className="text-[11px] font-black" style={{ color: '#00d4ff' }}>
          🚀 Build your first plan
        </span>
        <span className="text-[11px] font-black" style={{ color: '#00d4ff' }}>→</span>
      </Link>
    )
  }
  // Streak-milestone share affordance — surfaces at 7/30/100/365 day
  // milestones. Tap routes to MilestoneShareCard via parent's onShareStreak
  // handler. No localStorage gating; the surface stays visible while the
  // streak holds so users can re-share if they want.
  const showShare = streak >= 7 && !!onShareStreak
  const Wrapper: React.ElementType = showShare ? 'button' : 'div'

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <Wrapper
        type={showShare ? 'button' : undefined}
        onClick={showShare ? onShareStreak : undefined}
        aria-label={showShare ? `Share ${streak}-day streak` : undefined}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0 active:scale-95 transition-transform"
        style={{
          background: streak > 0 ? (atRisk ? 'rgba(255,61,110,0.15)' : 'rgba(255,184,0,0.12)') : 'var(--color-surface-2)',
          border: `2px solid ${streak > 0 ? (atRisk ? 'rgba(255,61,110,0.5)' : 'rgba(255,184,0,0.5)') : 'var(--color-border)'}`,
          boxShadow: streak > 0 && !atRisk ? '0 0 10px rgba(255,184,0,0.25)' : 'none',
        }}>
        <span className="text-sm">{streak > 0 ? '🔥' : '💤'}</span>
        <span className="text-[11px] font-black"
          style={{ color: streak > 0 ? (atRisk ? '#ff3d6e' : '#ffb800') : 'var(--color-text-tertiary)' }}>
          {streak > 0 ? streak : '0'}
        </span>
        {showShare && (
          <span className="text-[10px] ml-0.5" aria-hidden style={{ color: '#ffb800', opacity: 0.7 }}>↗</span>
        )}
      </Wrapper>

      <div className="flex-1 h-2 rounded-full overflow-hidden"
        style={{ background: 'var(--color-surface-2)' }}>
        <div className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${pct * 100}%`,
            background: 'linear-gradient(90deg, #ffb800, #ff8c00)',
            boxShadow: pct > 0.1 ? '0 0 8px rgba(255,184,0,0.4)' : 'none',
          }} />
      </div>

      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full flex-shrink-0"
        style={{ background: 'rgba(255,184,0,0.12)', border: '2px solid rgba(255,184,0,0.35)' }}>
        <span className="text-[9px] font-black" style={{ color: '#ffb800' }}>LV</span>
        <span className="text-sm font-black leading-none" style={{ color: '#ffb800' }}>{level.level}</span>
      </div>
    </div>
  )
}

export function RaceCountdown({ raceDate, raceName }: { raceDate: string; raceName?: string | null }) {
  const days = Math.ceil((new Date(raceDate).getTime() - Date.now()) / 86400000)
  if (days < 0 || days > 365) return null
  const urgency = days <= 7 ? '#ff2d9e' : days <= 21 ? '#ff3d6e' : days <= 42 ? '#ffb800' : '#4d8aff'

  return (
    <div className="mx-4">
      <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{ background: `${urgency}10`, border: `2px solid ${urgency}40` }}>
        <span className="text-2xl">🏁</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black truncate" style={{ color: urgency }}>
            {raceName ?? 'Race day'}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
            {days === 0 ? 'TODAY! Go get it 🔥' : `${days} day${days !== 1 ? 's' : ''} to go`}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-black" style={{ color: urgency, letterSpacing: '-0.04em' }}>{days}</p>
          <p className="text-[9px] font-bold" style={{ color: `${urgency}80` }}>days</p>
        </div>
      </div>
    </div>
  )
}

export function StatsStrip({ weeklyKm, streak }: { weeklyKm: number; streak: number }) {
  const hour = new Date().getHours()
  const atRisk = streak > 0 && hour >= 19

  return (
    <div className="flex gap-2 mx-4">
      <Link href="/train" className="flex-1 rounded-2xl py-3.5 text-center"
        style={{ background: 'var(--color-surface)', border: '2.5px solid rgba(77,138,255,0.35)' }}>
        <p className="ns-stat" style={{ color: '#4d8aff' }}>{weeklyKm.toFixed(1)}</p>
        <p className="ns-label mt-0.5" style={{ color: 'rgba(77,138,255,0.6)' }}>km / week</p>
      </Link>

      <div className="rounded-2xl py-3.5 px-4 text-center"
        style={{
          background: 'var(--color-surface)',
          border: `2.5px solid ${streak > 0 ? (atRisk ? 'rgba(255,61,110,0.5)' : 'rgba(255,184,0,0.5)') : 'var(--color-border-2)'}`,
          boxShadow: streak > 0 && !atRisk ? '0 0 16px rgba(255,184,0,0.2)' : 'none',
          minWidth: 88,
        }}>
        <p className="ns-stat" style={{ color: streak > 0 ? (atRisk ? '#ff3d6e' : '#ffb800') : 'var(--color-text-tertiary)' }}>
          {streak > 0 ? `🔥${streak}` : '—'}
        </p>
        <p className="ns-label mt-0.5"
          style={{ color: streak > 0 ? (atRisk ? 'rgba(255,61,110,0.7)' : 'rgba(255,184,0,0.7)') : 'var(--color-text-tertiary)' }}>
          {atRisk ? 'at risk!' : 'streak'}
        </p>
      </div>

      <Link href="/you" className="rounded-2xl py-3.5 px-3 text-center"
        style={{ background: 'var(--color-surface)', border: '2.5px solid var(--color-border-2)', minWidth: 60 }}>
        <p className="text-xl" style={{ lineHeight: 1.2 }}>📊</p>
        <p className="ns-label mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>stats</p>
      </Link>
    </div>
  )
}

export function SquadMini({ squad }: { squad: { name: string; colour?: string; squad_members?: unknown[] } }) {
  const colour = squad.colour ?? '#7fff4d'
  const count = squad.squad_members?.length ?? 0
  return (
    <Link href="/squad" className="mx-4 block active:scale-[0.98] transition-all">
      <div className="rounded-2xl p-4 flex items-center gap-3"
        style={{ background: 'var(--color-surface)', border: `2.5px solid ${colour}50` }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ background: `${colour}15`, border: `2px solid ${colour}40` }}>👥</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black truncate" style={{ color: colour }}>{squad.name}</p>
          <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
            {count} member{count !== 1 ? 's' : ''} · Tap to see leaderboard →
          </p>
        </div>
      </div>
    </Link>
  )
}

export function NotifStrip({ notifications, markRead, markOpened }: {
  notifications: Array<{ id: string; type: string; title: string; body: string }>
  markRead:   (id: string) => void
  markOpened: (id: string) => void
}) {
  if (!notifications.length) return null
  return (
    <div className="mx-4 space-y-2">
      {notifications.map(n => {
        const isNudge = n.type === 'squad_nudge'
        // P3.9 — squad nudges tap-through to /squad and fire opened tracking;
        // other notification types stay non-interactive (just X to dismiss).
        const Wrapper: React.ElementType = isNudge ? Link : 'div'
        const wrapperProps = isNudge
          ? { href: '/squad', onClick: () => markOpened(n.id) }
          : {}
        return (
          <Wrapper key={n.id} {...wrapperProps}
            className="flex items-start gap-3 rounded-2xl px-4 py-3 active:scale-[0.99] transition-transform"
            style={{
              background: isNudge ? 'rgba(127,255,77,0.08)' : 'rgba(77,138,255,0.08)',
              border: `2px solid ${isNudge ? 'rgba(127,255,77,0.3)' : 'rgba(77,138,255,0.25)'}`,
            }}>
            <span className="text-lg flex-shrink-0">{isNudge ? '👋' : '🔔'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black" style={{ color: 'var(--color-text-primary)' }}>{n.title}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{n.body}</p>
            </div>
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); markRead(n.id) }} aria-label="Dismiss"
              className="flex-shrink-0 text-base leading-none"
              style={{ color: 'var(--color-text-tertiary)' }}>×</button>
          </Wrapper>
        )
      })}
    </div>
  )
}
