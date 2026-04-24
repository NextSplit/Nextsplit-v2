'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { useSquad } from '@/hooks/useSquad'
import { useMyCoach } from '@/hooks/useCoach'
import { getLevelForXP, getXPProgress } from '@/lib/rpg'
import type { PlanWeek, PlanSession } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  profile:    Record<string, unknown> | null
  activePlan: Record<string, unknown> | null
  coachProfile: Record<string, unknown> | null
  hasCoach:   boolean
  squad:      Record<string, unknown> | null
  isCoach:    boolean
  recentLogs: Array<{ done: boolean; km: number | null; created_at: string; week_n: number; day_i: number; session_i: number }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTodayDayIndex() {
  const d = new Date().getDay()
  return d === 0 ? 6 : d - 1  // Mon=0 … Sun=6
}

function getWeeklyKm(logs: Props['recentLogs']) {
  const monday = new Date()
  monday.setDate(monday.getDate() - (monday.getDay() === 0 ? 6 : monday.getDay() - 1))
  monday.setHours(0, 0, 0, 0)
  return logs
    .filter((l: { done: boolean; km: number | null; created_at: string; week_n: number; day_i: number; session_i: number }) => l.done && new Date(l.created_at) >= monday)
    .reduce((s, l) => s + (l.km ?? 0), 0)
}

function computeStreak(logs: Props['recentLogs']) {
  const days = new Set(logs.filter((l: { done: boolean; created_at: string }) => l.done).map((l: { done: boolean; created_at: string }) => l.created_at.slice(0, 10)))
  let streak = 0
  const d = new Date()
  while (true) {
    const key = d.toISOString().slice(0, 10)
    if (days.has(key)) { streak++; d.setDate(d.getDate() - 1) }
    else if (streak === 0) { d.setDate(d.getDate() - 1); if (streak === 0 && !days.has(d.toISOString().slice(0, 10))) break }
    else break
  }
  return streak
}

function getTodaySessions(plan: Record<string, unknown> | null) {
  if (!plan) return []
  const weeks = plan.weeks_data as PlanWeek[]
  if (!Array.isArray(weeks)) return []
  const currentWeek = weeks.find((w: PlanWeek) => w.n === (plan.current_week as number))
  if (!currentWeek) return []
  const dayIdx = getTodayDayIndex()
  const day = currentWeek.days?.[dayIdx]
  if (!day) return []
  return (day.sessions ?? []).filter((s: PlanSession) => s.c && s.c !== 'rest')
}

const SESSION_COLOURS: Record<string, { dot: string; label: string; bg: string }> = {
  easy:     { dot: '#22c55e', label: 'Easy',      bg: 'rgba(34,197,94,0.15)'   },
  tempo:    { dot: '#eab308', label: 'Tempo',     bg: 'rgba(234,179,8,0.15)'   },
  interval: { dot: '#f97316', label: 'Intervals', bg: 'rgba(249,115,22,0.15)'  },
  long:     { dot: '#3b82f6', label: 'Long Run',  bg: 'rgba(59,130,246,0.15)'  },
  recovery: { dot: '#4ade80', label: 'Recovery',  bg: 'rgba(74,222,128,0.15)'  },
  gym:      { dot: '#8b5cf6', label: 'Strength',  bg: 'rgba(139,92,246,0.15)'  },
  race:     { dot: '#ec4899', label: 'Race',       bg: 'rgba(236,72,153,0.15)'  },
  rest:     { dot: '#6b7280', label: 'Rest',       bg: 'rgba(107,114,128,0.10)' },
}

function getSessionColour(code: string | null | undefined) {
  if (!code) return SESSION_COLOURS.easy
  const c = code.toLowerCase()
  if (c.includes('tempo')) return SESSION_COLOURS.tempo
  if (c.includes('interval') || c.includes('speed')) return SESSION_COLOURS.interval
  if (c.includes('long')) return SESSION_COLOURS.long
  if (c.includes('recovery')) return SESSION_COLOURS.recovery
  if (c.includes('gym') || c.includes('strength')) return SESSION_COLOURS.gym
  if (c.includes('race')) return SESSION_COLOURS.race
  return SESSION_COLOURS.easy
}

// ── Sub-components ────────────────────────────────────────────────────────────

function XPBar({ xp, streak }: { xp: number; streak: number }) {
  const level   = getLevelForXP(xp)
  const pct     = Math.round(getXPProgress(xp) * 100)

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {streak > 0 && (
        <div className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black flex-shrink-0"
          style={{ background: 'rgba(255,77,109,0.15)', color: '#ff4d6d', border: '1px solid rgba(255,77,109,0.25)' }}>
          🔥 {streak}
        </div>
      )}
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#f0a500,#eab308)' }} />
      </div>
      <div className="text-xs font-black flex-shrink-0" style={{ color: '#f0a500' }}>Lv {level.level}</div>
    </div>
  )
}

// ── Hero cards (one per state) ─────────────────────────────────────────────────

function HeroTraining({ sessions, plan }: { sessions: PlanSession[]; plan: Record<string, unknown> }) {
  const totalKm = sessions.reduce((s, sess) => s + (sess.km ?? 0), 0)
  const weekN   = plan.current_week as number
  const totalW  = plan.total_weeks as number

  return (
    <Link href="/train" className="block rounded-2xl overflow-hidden active:scale-[0.99] transition-all"
      style={{ background: 'rgba(255,77,109,0.12)', border: '1.5px solid rgba(255,77,109,0.35)', boxShadow: '0 4px 24px rgba(255,77,109,0.15)' }}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#ff4d6d' }}>
              Today · Week {weekN} of {totalW}
            </p>
            <p className="text-2xl font-black leading-none text-white mb-1">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''} · {totalKm > 0 ? `${totalKm}km` : 'active day'}
            </p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {sessions.map(s => getSessionColour(s.c).label).join(' · ')}
            </p>
          </div>
          <div className="rounded-xl px-4 py-2 font-black text-sm text-white"
            style={{ background: '#ff4d6d' }}>
            Start →
          </div>
        </div>

        {/* Session type mini-pills */}
        <div className="flex gap-2 flex-wrap">
          {sessions.map((s, i) => {
            const col = getSessionColour(s.c)
            return (
              <div key={i} className="flex items-center gap-1.5 rounded-lg px-3 py-2"
                style={{ background: col.bg, border: `1px solid ${col.dot}40` }}>
                <div className="w-2 h-2 rounded-full" style={{ background: col.dot }} />
                <span className="text-xs font-bold text-white">{col.label}{s.km ? ` ${s.km}km` : ''}</span>
              </div>
            )
          })}
        </div>
      </div>
    </Link>
  )
}

function HeroRestDay({ plan }: { plan: Record<string, unknown> }) {
  const weekN  = plan.current_week as number
  const totalW = plan.total_weeks as number
  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(156,163,175,0.08)', border: '1.5px solid rgba(156,163,175,0.15)' }}>
      <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
        Today · Week {weekN} of {totalW}
      </p>
      <p className="text-2xl font-black text-white mb-1">Rest day 😴</p>
      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Recovery is training. Your next session is tomorrow.</p>
    </div>
  )
}

function HeroCoach({ coachProfile }: { coachProfile: Record<string, unknown> }) {
  return (
    <Link href="/train" className="block rounded-2xl overflow-hidden active:scale-[0.99] transition-all"
      style={{ background: 'rgba(139,92,246,0.12)', border: '1.5px solid rgba(139,92,246,0.35)', boxShadow: '0 4px 24px rgba(139,92,246,0.12)' }}>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: 'rgba(139,92,246,0.2)', border: '1.5px solid rgba(139,92,246,0.4)' }}>
            🎓
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: '#8b5cf6' }}>
              Your Coach
            </p>
            <p className="text-base font-black text-white">{coachProfile.display_name as string}</p>
          </div>
          <div className="ml-auto rounded-xl px-3 py-1.5 text-xs font-black text-white"
            style={{ background: '#8b5cf6' }}>
            Message →
          </div>
        </div>
        <p className="text-sm rounded-xl px-3 py-2.5" style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.05)' }}>
          Tap to see your coach's latest message and today's coached session.
        </p>
      </div>
    </Link>
  )
}

function HeroSquadLeader({ squad }: { squad: Record<string, unknown> }) {
  const colour = (squad.colour as string) || '#84cc16'
  return (
    <Link href="/explore" className="block rounded-2xl overflow-hidden active:scale-[0.99] transition-all"
      style={{ background: `${colour}12`, border: `1.5px solid ${colour}40`, boxShadow: `0 4px 24px ${colour}20` }}>
      <div className="p-4">
        <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: colour }}>
          Your Squad · Split Leader
        </p>
        <p className="text-2xl font-black text-white mb-1">{squad.name as string} 👑</p>
        <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Tap to check in on your squad — see who's run today and who needs a nudge.
        </p>
        <div className="flex gap-2">
          <div className="flex-1 rounded-xl px-3 py-2 text-center" style={{ background: `${colour}20`, border: `1px solid ${colour}30` }}>
            <p className="text-[10px] font-bold" style={{ color: colour }}>Leaderboard</p>
          </div>
          <div className="flex-1 rounded-xl px-3 py-2 text-center" style={{ background: `${colour}20`, border: `1px solid ${colour}30` }}>
            <p className="text-[10px] font-bold" style={{ color: colour }}>Nudge team →</p>
          </div>
        </div>
      </div>
    </Link>
  )
}

function HeroNewUser() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(6,182,212,0.10)', border: '1.5px solid rgba(6,182,212,0.3)' }}>
      <div className="p-4">
        <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#06b6d4' }}>
          Welcome to NextSplit
        </p>
        <p className="text-2xl font-black text-white mb-1">Pick your path. 🚀</p>
        <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Four ways to start training. Takes 3 minutes.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { href: '/onboarding/predetermined', label: 'Expert plans', icon: '📋', colour: '#ff4d6d', desc: '17 plans, 5K to ultra' },
            { href: '/onboarding/ai',            label: 'AI bespoke',   icon: '🧠', colour: '#06b6d4', desc: 'Built around your life' },
            { href: '/explore',                  label: 'Find a coach', icon: '🎓', colour: '#8b5cf6', desc: 'From £30/month' },
            { href: '/onboarding/manual',        label: 'Build my own', icon: '✏️', colour: '#84cc16', desc: 'Total control' },
          ].map(p => (
            <Link key={p.href} href={p.href}
              className="rounded-xl p-3 active:scale-[0.97] transition-all"
              style={{ background: `${p.colour}12`, border: `1px solid ${p.colour}30` }}>
              <div className="text-lg mb-1">{p.icon}</div>
              <div className="text-xs font-black text-white mb-0.5">{p.label}</div>
              <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{p.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function HeroStreakAtRisk({ streak }: { streak: number }) {
  return (
    <Link href="/train" className="block rounded-2xl overflow-hidden active:scale-[0.99] transition-all"
      style={{ background: 'rgba(240,165,0,0.10)', border: '1.5px solid rgba(240,165,0,0.35)', boxShadow: '0 4px 24px rgba(240,165,0,0.15)' }}>
      <div className="p-4">
        <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#f0a500' }}>
          ⚠️ Streak at risk
        </p>
        <p className="text-2xl font-black text-white mb-1">{streak} days. Don't stop now.</p>
        <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Log today's session before midnight to keep your streak alive.
        </p>
        <div className="rounded-xl px-4 py-2.5 text-center font-black text-white text-sm"
          style={{ background: '#f0a500' }}>
          Log now → +25 XP
        </div>
      </div>
    </Link>
  )
}

// ── Persistent cards ──────────────────────────────────────────────────────────

function StatsStrip({ weeklyKm }: { weeklyKm: number }) {
  return (
    <Link href="/train" className="block">
      <div className="flex gap-2">
        {[
          { value: `${weeklyKm.toFixed(1)}`, label: 'km this week', colour: '#2563eb' },
          { value: 'ACWR',                   label: 'tap for load',  colour: '#2563eb' },
          { value: 'Stats →',                label: 'full analytics', colour: '#2563eb' },
        ].map(s => (
          <div key={s.label} className="flex-1 rounded-xl py-3 text-center"
            style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)' }}>
            <p className="text-sm font-black" style={{ color: s.colour }}>{s.value}</p>
            <p className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.label}</p>
          </div>
        ))}
      </div>
    </Link>
  )
}

function SquadCard({ squad }: { squad: Record<string, unknown> }) {
  const colour = (squad.colour as string) || '#84cc16'
  return (
    <Link href="/explore" className="block rounded-2xl p-4 active:scale-[0.99] transition-all"
      style={{ background: `${colour}08`, border: `1px solid ${colour}25` }}>
      <div className="flex items-center gap-3">
        <div className="text-2xl">👥</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black" style={{ color: colour }}>{squad.name as string}</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Tap to see squad activity →</p>
        </div>
      </div>
    </Link>
  )
}

function FindCoachCard() {
  return (
    <Link href="/explore" className="block rounded-2xl p-4 active:scale-[0.99] transition-all"
      style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
      <div className="flex items-center gap-3">
        <div className="text-2xl">🎓</div>
        <div className="flex-1">
          <p className="text-sm font-black" style={{ color: '#8b5cf6' }}>Get a coach</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Verified coaches from £30/mo</p>
        </div>
        <div className="text-xs font-black rounded-lg px-3 py-1.5 text-white" style={{ background: '#8b5cf6' }}>Browse</div>
      </div>
    </Link>
  )
}

function StartSquadCard() {
  return (
    <Link href="/explore" className="block rounded-2xl p-4 active:scale-[0.99] transition-all"
      style={{ background: 'rgba(132,204,22,0.08)', border: '1px solid rgba(132,204,22,0.2)' }}>
      <div className="flex items-center gap-3">
        <div className="text-2xl">👥</div>
        <div className="flex-1">
          <p className="text-sm font-black" style={{ color: '#84cc16' }}>Join a squad</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Train together, go further</p>
        </div>
        <div className="text-xs font-black rounded-lg px-3 py-1.5 text-white" style={{ background: '#84cc16', color: '#0d1a05' }}>Find one</div>
      </div>
    </Link>
  )
}

function PremiumCard() {
  return (
    <Link href="/explore" className="block rounded-2xl p-4 active:scale-[0.99] transition-all"
      style={{ background: 'rgba(240,165,0,0.08)', border: '1px solid rgba(240,165,0,0.2)' }}>
      <div className="flex items-center gap-3">
        <div className="text-2xl">⭐</div>
        <div className="flex-1">
          <p className="text-sm font-black" style={{ color: '#f0a500' }}>Go Elite — £7.99/mo</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>AI coaching, ACWR, adapt engine — founding price</p>
        </div>
        <div className="text-xs font-black rounded-lg px-3 py-1.5" style={{ background: '#f0a500', color: '#1a0e00' }}>Upgrade</div>
      </div>
    </Link>
  )
}

// ── Main HomeClient ────────────────────────────────────────────────────────────

export default function HomeClient({ profile, activePlan, coachProfile, hasCoach, squad, isCoach, recentLogs }: Props) {
  const router = useRouter()

  // Live hooks for real-time data
  const { squad: liveSquad, role: squadRole } = useSquad()
  const { coach: liveCoach, hasCoach: liveHasCoach } = useMyCoach()

  // Derived signals
  const allLogs   = useMemo(() => recentLogs, [recentLogs])
  const streak    = useMemo(() => computeStreak(allLogs), [allLogs])
  const weeklyKm  = useMemo(() => getWeeklyKm(allLogs), [allLogs])
  const sessions  = useMemo(() => getTodaySessions(activePlan), [activePlan])
  const xp        = useMemo(() => {
    const total = allLogs.filter((l: { done: boolean; created_at: string }) => l.done).length * 15
    return total
  }, [allLogs])

  // Merge server + live data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeSquad   = (liveSquad ?? squad) as Record<string, unknown> | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeCoach   = (liveCoach ?? coachProfile) as Record<string, unknown> | null
  const activeHasCoach = liveHasCoach || hasCoach
  const isLeader      = squadRole === 'leader'

  // Determine greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const displayName = (profile?.display_name as string)?.split(' ')[0] ?? 'runner'

  // Determine hero state
  // Priority: 1. No plan (new user) 2. Has coach + unread 3. Leader with inactive member
  // 4. Active training day 5. Streak at risk 6. Rest day
  const heroState: 'new' | 'training' | 'rest' | 'coach' | 'leader' | 'streak' = (() => {
    if (!activePlan) return 'new'
    if (activeHasCoach && activeCoach) return 'coach'
    if (isLeader && activeSquad) return 'leader'
    if (sessions.length > 0) return 'training'
    if (streak >= 3 && allLogs.filter((l: { done: boolean; created_at: string }) => l.done && l.created_at.startsWith(new Date().toISOString().slice(0, 10))).length === 0) return 'streak'
    return 'rest'
  })()

  const isPremium = !!(profile?.subscription_status === 'active' || profile?.is_pro)

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-40 border-b"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>

        {/* Wordmark + icons */}
        <div className="max-w-lg mx-auto px-4 pt-12 pb-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-base font-black tracking-tight" style={{ color: '#06b6d4' }}>
              NextSplit
            </span>
            <div className="flex items-center gap-2">
              <Link href="/you" className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                ⚙
              </Link>
            </div>
          </div>

          {/* XP + streak bar */}
          <XPBar xp={xp} streak={streak} />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-3">

        {/* Greeting */}
        <div className="mb-1">
          <p className="text-2xl font-black text-white leading-tight">
            {greeting}, {displayName} 👋
          </p>
          {activePlan && (
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {activePlan.name as string} · Week {activePlan.current_week as number} of {activePlan.total_weeks as number}
            </p>
          )}
        </div>

        {/* ── Hero card — state-driven ── */}
        {heroState === 'new'      && <HeroNewUser />}
        {heroState === 'training' && activePlan && <HeroTraining sessions={sessions} plan={activePlan} />}
        {heroState === 'rest'     && activePlan && <HeroRestDay plan={activePlan} />}
        {heroState === 'coach'    && activeCoach && <HeroCoach coachProfile={activeCoach} />}
        {heroState === 'leader'   && activeSquad && <HeroSquadLeader squad={activeSquad} />}
        {heroState === 'streak'   && <HeroStreakAtRisk streak={streak} />}

        {/* ── Stats strip (always when has plan) ── */}
        {activePlan && <StatsStrip weeklyKm={weeklyKm} />}

        {/* ── Contextual cards below hero ── */}

        {/* Squad card — show if in squad and it wasn't the hero */}
        {activeSquad && heroState !== 'leader' && <SquadCard squad={activeSquad} />}

        {/* Coach nudge — show if no coach and not the hero */}
        {!activeHasCoach && heroState !== 'new' && <FindCoachCard />}

        {/* Start squad — if no squad */}
        {!activeSquad && heroState !== 'new' && <StartSquadCard />}

        {/* Premium upsell — if free user and has a plan */}
        {activePlan && !isPremium && <PremiumCard />}

        {/* If is coach — quick link to coach dashboard */}
        {isCoach && (
          <Link href="/coach" className="block rounded-2xl p-4 active:scale-[0.99] transition-all"
            style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <div className="flex items-center gap-3">
              <div className="text-2xl">🎓</div>
              <div className="flex-1">
                <p className="text-sm font-black" style={{ color: '#8b5cf6' }}>Coach dashboard</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>View athletes, messages, earnings</p>
              </div>
              <span style={{ color: '#8b5cf6' }}>→</span>
            </div>
          </Link>
        )}

      </div>
    </div>
  )
}
