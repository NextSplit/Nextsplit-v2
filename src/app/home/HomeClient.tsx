'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useAllTrainingLogs } from '@/hooks/useAllTrainingLogs'
import { useProfile } from '@/hooks/useProfile'
import { useSquad } from '@/hooks/useSquad'
import { useMyCoach } from '@/hooks/useCoach'
import { useSubscription } from '@/hooks/useSubscription'
import { useNotifications } from '@/hooks/useNotifications'
import { computeStreak } from '@/lib/streak'
import { getLevelForXP, getXPProgress } from '@/lib/rpg'
import type { PlanSession, PlanWeek, TrainingLog } from '@/types/database'
import Splity from '@/components/Splity'
import DailyQuests from '@/components/DailyQuests'

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayDayIndex() {
  const d = new Date().getDay()
  return d === 0 ? 6 : d - 1
}

function getWeeklyKm(logs: TrainingLog[]): number {
  const mon = new Date()
  mon.setDate(mon.getDate() - (mon.getDay() === 0 ? 6 : mon.getDay() - 1))
  mon.setHours(0, 0, 0, 0)
  return logs
    .filter(l => l.done && new Date(l.created_at) >= mon)
    .reduce((s, l) => s + (l.km ?? 0), 0)
}

function getTodaySessions(plan: { current_week: number; weeks_data: unknown } | null): PlanSession[] {
  if (!plan?.weeks_data) return []
  const weeks = plan.weeks_data as unknown as PlanWeek[]
  if (!Array.isArray(weeks)) return []
  const cw = weeks.find(w => w.n === plan.current_week)
  if (!cw) return []
  const dayI = todayDayIndex()
  return (cw.days?.[dayI]?.sessions ?? []).filter((s: PlanSession) => s.c && s.c !== 'rest')
}

function getSessionColour(code: string | null | undefined) {
  const c = (code ?? '').toLowerCase()
  if (c.includes('tempo'))                           return '#ffb800'
  if (c.includes('interval') || c.includes('speed')) return '#ff7438'
  if (c.includes('long'))                            return '#4d8aff'
  if (c.includes('recovery'))                        return '#00e676'
  if (c.includes('gym') || c.includes('strength'))   return '#a855f7'
  if (c.includes('race'))                            return '#ff2d9e'
  return '#00e676'
}

// ── XP Header Bar ─────────────────────────────────────────────────────────────

function XPHeaderBar({ xp, streak }: { xp: number; streak: number }) {
  const level = getLevelForXP(xp)
  const pct   = getXPProgress(xp)
  const hour  = new Date().getHours()
  const atRisk = streak > 0 && hour >= 19

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      {/* Streak */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0"
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
      </div>

      {/* XP bar */}
      <div className="flex-1 h-2 rounded-full overflow-hidden"
        style={{ background: 'var(--color-surface-2)' }}>
        <div className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${pct * 100}%`,
            background: 'linear-gradient(90deg, #ffb800, #ff8c00)',
            boxShadow: pct > 0.1 ? '0 0 8px rgba(255,184,0,0.4)' : 'none',
          }} />
      </div>

      {/* Level */}
      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full flex-shrink-0"
        style={{ background: 'rgba(255,184,0,0.12)', border: '2px solid rgba(255,184,0,0.35)' }}>
        <span className="text-[9px] font-black" style={{ color: '#ffb800' }}>LV</span>
        <span className="text-sm font-black leading-none" style={{ color: '#ffb800' }}>{level.level}</span>
      </div>
    </div>
  )
}

// ── Hero: Training day ────────────────────────────────────────────────────────

function HeroTraining({ sessions, planName, weekN, totalWeeks, daysToRace }: {
  sessions: PlanSession[]
  planName: string
  weekN: number
  totalWeeks: number
  daysToRace: number | null
}) {
  const primary = sessions[0]
  const colour  = getSessionColour(primary?.c)
  const isMulti = sessions.length > 1
  const totalKm = sessions.reduce((s, s2) => s + (s2.km ?? 0), 0)

  return (
    <Link href="/train" className="block mx-4 active:scale-[0.98] transition-all">
      <div className="rounded-3xl overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${colour}18, ${colour}08)`,
          border: `3px solid ${colour}`,
          boxShadow: `0 0 0 1px ${colour}15, 0 8px 32px ${colour}30`,
        }}>
        <div className="p-5">
          {/* Session label */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: colour }} />
            <span className="ns-label" style={{ color: colour }}>
              Today · Week {weekN}/{totalWeeks}
            </span>
            {daysToRace !== null && daysToRace <= 30 && (
              <span className="ns-label ml-auto" style={{ color: '#ff2d9e' }}>
                🏁 {daysToRace}d
              </span>
            )}
          </div>

          {/* Primary session — massive type */}
          <div className="mb-1">
            <span style={{
              fontSize: totalKm >= 20 ? 52 : 60,
              fontWeight: 900,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.04em',
              lineHeight: 1,
            }}>
              {totalKm > 0 ? totalKm : primary?.km ?? 0}
            </span>
            <span className="text-2xl font-black ml-1" style={{ color: 'var(--color-text-secondary)' }}>km</span>
          </div>

          <p className="text-base font-black mb-1" style={{ color: colour }}>
            {isMulti ? `${sessions.length} sessions today` : primary?.n ?? 'Session'}
          </p>

          {/* Session pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            {sessions.map((s, i) => (
              <span key={i} className="ns-pill"
                style={{
                  background: `${getSessionColour(s.c)}15`,
                  borderColor: `${getSessionColour(s.c)}40`,
                  color: getSessionColour(s.c),
                }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: getSessionColour(s.c) }} />
                {s.n ?? s.c} {s.km > 0 ? `· ${s.km}km` : ''}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="py-4 rounded-2xl text-center font-black text-base"
            style={{ background: colour, color: 'white', boxShadow: `0 4px 20px ${colour}60` }}>
            Start today&apos;s session →
          </div>
        </div>

        {/* Plan name footer */}
        <div className="px-5 py-3 border-t flex items-center justify-between"
          style={{ borderColor: `${colour}20` }}>
          <span className="text-xs font-bold" style={{ color: 'var(--color-text-tertiary)' }}>
            📋 {planName}
          </span>
          <span className="text-xs font-bold" style={{ color: colour }}>
            View full plan →
          </span>
        </div>
      </div>
    </Link>
  )
}

// ── Hero: Rest day ────────────────────────────────────────────────────────────

function HeroRest({ planName, nextSessions }: { planName: string; nextSessions: PlanSession[] }) {
  return (
    <div className="mx-4">
      <div className="rounded-3xl overflow-hidden"
        style={{
          background: 'var(--color-surface)',
          border: '2.5px solid var(--color-border-2)',
        }}>
        <div className="p-5 flex items-center gap-4">
          <div className="flex-shrink-0">
            <Splity size={64} mood="sleepy" animate />
          </div>
          <div className="flex-1 min-w-0">
            <span className="ns-label" style={{ color: 'var(--color-text-tertiary)' }}>Rest day</span>
            <p className="text-2xl font-black mt-1" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
              Recovery is training 💤
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              {planName}
            </p>
          </div>
        </div>
        {nextSessions.length > 0 && (
          <Link href="/train"
            className="flex items-center justify-between px-5 py-3 border-t"
            style={{ borderColor: 'var(--color-border)' }}>
            <span className="text-xs font-bold" style={{ color: 'var(--color-text-tertiary)' }}>
              Tomorrow: {nextSessions[0]?.n}
            </span>
            <span className="text-xs font-black" style={{ color: 'var(--ns-cobalt)' }}>See plan →</span>
          </Link>
        )}
      </div>
    </div>
  )
}

// ── Hero: Streak at risk ──────────────────────────────────────────────────────

function HeroStreakAtRisk({ streak }: { streak: number }) {
  return (
    <Link href="/train" className="block mx-4 active:scale-[0.98] transition-all">
      <div className="rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255,184,0,0.12), rgba(255,61,110,0.08))',
          border: '3px solid #ffb800',
          boxShadow: '0 0 0 1px rgba(255,184,0,0.1), 0 8px 32px rgba(255,184,0,0.2)',
        }}>
        <div className="p-5 flex items-start gap-4">
          <Splity size={72} mood="worried" animate />
          <div className="flex-1 min-w-0">
            <span className="ns-label" style={{ color: '#ffb800' }}>🔥 Streak at risk</span>
            <p className="text-3xl font-black mt-1 mb-1"
              style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.03em' }}>
              {streak} days at stake
            </p>
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Log before midnight or your streak resets to zero.
            </p>
            <div className="py-3.5 rounded-2xl text-center font-black text-sm"
              style={{ background: '#ffb800', color: '#0a0e1a', boxShadow: '0 4px 16px rgba(255,184,0,0.5)' }}>
              Save my streak →
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Hero: No plan ─────────────────────────────────────────────────────────────

function HeroNoPlan() {
  return (
    <div className="mx-4">
      <div className="rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(77,138,255,0.06))',
          border: '3px solid rgba(0,212,255,0.5)',
          boxShadow: '0 8px 32px rgba(0,212,255,0.15)',
        }}>
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Splity size={56} mood="excited" animate label="Let's run!" />
            <div>
              <span className="ns-label" style={{ color: '#00d4ff' }}>Welcome to NextSplit</span>
              <p className="text-2xl font-black mt-0.5"
                style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.03em' }}>
                Pick your path 🚀
              </p>
            </div>
          </div>

          {/* AI plan — primary, full width */}
          <Link href="/onboarding/ai"
            className="flex items-center gap-3 rounded-2xl p-4 mb-2 active:scale-[0.98] transition-all"
            style={{ background: '#00d4ff', boxShadow: '0 4px 24px rgba(0,212,255,0.5)' }}>
            <span className="text-2xl">🧠</span>
            <div className="flex-1">
              <p className="text-sm font-black" style={{ color: '#0a0e1a' }}>Build AI bespoke plan</p>
              <p className="text-[10px]" style={{ color: 'rgba(10,14,26,0.6)' }}>
                Built around your life, goals and schedule
              </p>
            </div>
            <span style={{ color: 'rgba(10,14,26,0.5)', fontWeight: 900 }}>→</span>
          </Link>

          {/* Secondary options */}
          <div className="grid grid-cols-2 gap-2">
            <Link href="/onboarding/predetermined"
              className="rounded-2xl p-3.5 active:scale-[0.97] transition-all"
              style={{ background: 'rgba(255,61,110,0.1)', border: '2px solid rgba(255,61,110,0.35)' }}>
              <div className="text-xl mb-1.5">📋</div>
              <p className="text-xs font-black" style={{ color: '#ff3d6e' }}>Expert plans</p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>17 plans, 5K to ultra</p>
            </Link>
            <Link href="/coaches"
              className="rounded-2xl p-3.5 active:scale-[0.97] transition-all"
              style={{ background: 'rgba(168,85,247,0.1)', border: '2px solid rgba(168,85,247,0.35)' }}>
              <div className="text-xl mb-1.5">🎓</div>
              <p className="text-xs font-black" style={{ color: '#a855f7' }}>Find a coach</p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>From £30/month</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Hero: Has coach ───────────────────────────────────────────────────────────

function HeroCoach({ coach }: { coach: { display_name: string; photo_url?: string | null; slug?: string } }) {
  return (
    <Link href="/coach/messages" className="block mx-4 active:scale-[0.98] transition-all">
      <div className="rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(168,85,247,0.06))',
          border: '3px solid rgba(168,85,247,0.5)',
          boxShadow: '0 8px 32px rgba(168,85,247,0.2)',
        }}>
        <div className="p-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0"
            style={{ border: '2.5px solid rgba(168,85,247,0.5)' }}>
            {coach.photo_url
              ? <img src={coach.photo_url} className="w-full h-full object-cover" alt="" />
              : <div className="w-full h-full flex items-center justify-center text-2xl"
                  style={{ background: 'rgba(168,85,247,0.2)' }}>🎓</div>}
          </div>
          <div className="flex-1 min-w-0">
            <span className="ns-label" style={{ color: '#a855f7' }}>Your coach</span>
            <p className="text-xl font-black mt-0.5" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
              {coach.display_name}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              Tap to see latest messages →
            </p>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Race countdown strip ──────────────────────────────────────────────────────

function RaceCountdown({ raceDate, raceName }: { raceDate: string; raceName?: string | null }) {
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

// ── Stats strip ───────────────────────────────────────────────────────────────

function StatsStrip({ weeklyKm, streak }: { weeklyKm: number; streak: number }) {
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

// ── Squad mini card ───────────────────────────────────────────────────────────

function SquadMini({ squad }: { squad: { name: string; colour?: string; squad_members?: unknown[] } }) {
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

// ── Conversion cards ──────────────────────────────────────────────────────────

function CoachNudge() {
  return (
    <Link href="/coaches" className="mx-4 block active:scale-[0.98] transition-all">
      <div className="rounded-2xl p-4 flex items-center gap-3"
        style={{ background: 'var(--color-surface)', border: '2.5px solid rgba(168,85,247,0.35)' }}>
        <div className="text-2xl">🎓</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black" style={{ color: '#a855f7' }}>Get a verified coach</p>
          <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
            They see your logs, ACWR and pace trends · from £30/mo
          </p>
        </div>
        <span style={{ color: '#a855f7', fontWeight: 900 }}>→</span>
      </div>
    </Link>
  )
}

function SquadNudge() {
  return (
    <Link href="/squad" className="mx-4 block active:scale-[0.98] transition-all">
      <div className="rounded-2xl p-4 flex items-center gap-3"
        style={{ background: 'var(--color-surface)', border: '2.5px solid rgba(127,255,77,0.35)' }}>
        <div className="text-2xl">👥</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black" style={{ color: '#7fff4d' }}>Start a squad</p>
          <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
            Train together · weekly leaderboard · nudges
          </p>
        </div>
        <span style={{ color: '#7fff4d', fontWeight: 900 }}>→</span>
      </div>
    </Link>
  )
}

function EliteNudge() {
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

// ── Notification strip ────────────────────────────────────────────────────────

function NotifStrip({ notifications, markRead }: {
  notifications: Array<{ id: string; type: string; title: string; body: string }>
  markRead: (id: string) => void
}) {
  if (!notifications.length) return null
  return (
    <div className="mx-4 space-y-2">
      {notifications.map(n => (
        <div key={n.id} className="flex items-start gap-3 rounded-2xl px-4 py-3"
          style={{
            background: n.type === 'squad_nudge' ? 'rgba(127,255,77,0.08)' : 'rgba(77,138,255,0.08)',
            border: `2px solid ${n.type === 'squad_nudge' ? 'rgba(127,255,77,0.3)' : 'rgba(77,138,255,0.25)'}`,
          }}>
          <span className="text-lg flex-shrink-0">{n.type === 'squad_nudge' ? '👋' : '🔔'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black" style={{ color: 'var(--color-text-primary)' }}>{n.title}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{n.body}</p>
          </div>
          <button onClick={() => markRead(n.id)} aria-label="Dismiss"
            className="flex-shrink-0 text-base leading-none"
            style={{ color: 'var(--color-text-tertiary)' }}>×</button>
        </div>
      ))}
    </div>
  )
}

// ── Main HomeClient ───────────────────────────────────────────────────────────

export default function HomeClient() {
  const { plan }          = useActivePlan()
  const { logs: allLogs } = useAllTrainingLogs()
  const { profile }       = useProfile()
  const { squad, role }   = useSquad()
  const { coach, hasCoach } = useMyCoach()
  const { isPro }         = useSubscription()
  const { notifications, markRead } = useNotifications()

  const streak   = useMemo(() =>
    computeStreak(allLogs.map((l: TrainingLog) => ({ logged_at: l.created_at, done: l.done }))).current,
    [allLogs])
  const weeklyKm = useMemo(() => getWeeklyKm(allLogs), [allLogs])
  const xp       = useMemo(() => allLogs.filter((l: TrainingLog) => l.done).length * 15, [allLogs])

  const firstName = (profile?.display_name as string | null)?.split(' ')[0] ?? 'runner'
  const hour      = new Date().getHours()

  const greeting  = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'

  const todaySessions = useMemo(() => getTodaySessions(plan), [plan])
  const isRestDay     = plan && todaySessions.length === 0
  const hasLoggedToday = allLogs.some((l: TrainingLog) =>
    l.done && l.created_at.startsWith(new Date().toISOString().slice(0, 10)))
  const streakAtRisk = streak > 0 && hour >= 19 && !hasLoggedToday

  // Next day sessions for rest day preview
  const nextSessions = useMemo((): PlanSession[] => {
    if (!plan?.weeks_data) return []
    const weeks = plan.weeks_data as unknown as PlanWeek[]
    const cw    = weeks.find(w => w.n === plan.current_week)
    if (!cw) return []
    const tomorrowI = (todayDayIndex() + 1) % 7
    return (cw.days?.[tomorrowI]?.sessions ?? []).filter((s: PlanSession) => s.c && s.c !== 'rest')
  }, [plan])

  // Race date info
  const daysToRace = plan?.race_date
    ? Math.ceil((new Date(plan.race_date).getTime() - Date.now()) / 86400000)
    : null

  // Hero state priority
  type HeroState = 'no_plan' | 'streak_risk' | 'coach' | 'training' | 'rest'
  const heroState: HeroState = !plan
    ? 'no_plan'
    : streakAtRisk
      ? 'streak_risk'
      : hasCoach && coach && !plan
        ? 'coach'
        : !isRestDay
          ? 'training'
          : 'rest'

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-40"
        style={{ background: 'var(--color-surface)', borderBottom: '2.5px solid var(--color-border-2)' }}>
        <div className="max-w-lg mx-auto px-4 pt-12 pb-1 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Splity size={32} mood={streakAtRisk ? 'worried' : plan ? 'happy' : 'idle'} animate={false} />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: 'var(--color-text-tertiary)' }}>
                {greeting}, {firstName}
              </p>
              <p className="text-base font-black leading-tight"
                style={{ color: '#00d4ff', letterSpacing: '-0.02em' }}>NextSplit</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/settings" aria-label="Settings"
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--color-surface-2)', border: '2px solid var(--color-border-2)' }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
                stroke="var(--color-text-tertiary)" strokeWidth={2}>
                <circle cx={12} cy={12} r={3} />
                <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            </Link>
          </div>
        </div>
        <XPHeaderBar xp={xp} streak={streak} />
      </div>

      {/* ── Content ── */}
      <div className="max-w-lg mx-auto py-4 space-y-3">

        {/* Notification strip */}
        <NotifStrip notifications={notifications} markRead={markRead} />

        {/* Race countdown */}
        {plan?.race_date && daysToRace !== null && daysToRace >= 0 && (
          <RaceCountdown
            raceDate={plan.race_date}
            raceName={(plan as unknown as { goal?: string }).goal ?? null}
          />
        )}

        {/* ── Hero (full-bleed, one dominant action) ── */}
        {heroState === 'no_plan'     && <HeroNoPlan />}
        {heroState === 'streak_risk' && <HeroStreakAtRisk streak={streak} />}
        {heroState === 'coach'       && coach && <HeroCoach coach={coach} />}
        {heroState === 'training'    && plan && (
          <HeroTraining
            sessions={todaySessions}
            planName={plan.name}
            weekN={plan.current_week}
            totalWeeks={plan.total_weeks}
            daysToRace={daysToRace}
          />
        )}
        {heroState === 'rest'        && plan && (
          <HeroRest planName={plan.name} nextSessions={nextSessions} />
        )}

        {/* ── Stats strip ── */}
        {plan && <StatsStrip weeklyKm={weeklyKm} streak={streak} />}

        {/* ── Daily quests ── */}
        {plan && (
          <DailyQuests
            logs={allLogs}
            weeklyKm={weeklyKm}
            streak={streak}
            hasPlan={!!plan}
          />
        )}

        {/* ── Squad mini ── */}
        {squad && <SquadMini squad={squad} />}

        {/* ── Conversion nudges (contextual) ── */}
        {!hasCoach && plan && <CoachNudge />}
        {!squad   && plan && <SquadNudge />}
        {!isPro   && plan && <EliteNudge />}

      </div>
    </div>
  )
}
