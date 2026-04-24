'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useSquad } from '@/hooks/useSquad'
import { useMyCoach } from '@/hooks/useCoach'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useAllTrainingLogs } from '@/hooks/useAllTrainingLogs'
import { useProfile } from '@/hooks/useProfile'
import { useSubscription } from '@/hooks/useSubscription'
import { getLevelForXP, getXPProgress, getSessionXP } from '@/lib/rpg'
import { computeStreak } from '@/lib/streak'
import { getSessionType, fmtKm } from '@/lib/sessionUtils'
import type { Squad } from '@/hooks/useSquad'
import type { CoachProfile, TrainingLog, PlanSession, PlanWeek } from '@/types/database'

// ── Helpers ─────────────────────────────────────────────────────────────────

function getTodayDayIndex() {
  const d = new Date().getDay(); return d === 0 ? 6 : d - 1
}

function getWeeklyKm(logs: TrainingLog[]) {
  const mon = new Date()
  mon.setDate(mon.getDate() - (mon.getDay() === 0 ? 6 : mon.getDay() - 1))
  mon.setHours(0, 0, 0, 0)
  return logs
    .filter(l => l.done && new Date(l.created_at) >= mon)
    .reduce((s, l) => s + (l.km ?? 0), 0)
}

function getTodaySessions(plan: { current_week: number; weeks_data: unknown } | null): PlanSession[] {
  if (!plan?.weeks_data) return []
  const weeks = plan.weeks_data as PlanWeek[]
  if (!Array.isArray(weeks)) return []
  const cw = weeks.find(w => w.n === plan.current_week)
  if (!cw) return []
  const dayIdx = getTodayDayIndex()
  return (cw.days?.[dayIdx]?.sessions ?? []).filter((s: PlanSession) => s.c && s.c !== 'rest')
}

const SESSION_COLOURS: Record<string, { dot: string; label: string; bg: string; border: string }> = {
  easy:     { dot: '#22c55e', label: 'Easy',      bg: 'rgba(34,197,94,0.18)',   border: 'rgba(34,197,94,0.4)'  },
  tempo:    { dot: '#eab308', label: 'Tempo',     bg: 'rgba(234,179,8,0.18)',   border: 'rgba(234,179,8,0.4)'  },
  interval: { dot: '#f97316', label: 'Intervals', bg: 'rgba(249,115,22,0.18)',  border: 'rgba(249,115,22,0.4)' },
  long:     { dot: '#3b82f6', label: 'Long Run',  bg: 'rgba(59,130,246,0.18)',  border: 'rgba(59,130,246,0.4)' },
  recovery: { dot: '#4ade80', label: 'Recovery',  bg: 'rgba(74,222,128,0.18)',  border: 'rgba(74,222,128,0.4)' },
  gym:      { dot: '#8b5cf6', label: 'Strength',  bg: 'rgba(139,92,246,0.18)',  border: 'rgba(139,92,246,0.4)' },
  race:     { dot: '#ec4899', label: 'Race',      bg: 'rgba(236,72,153,0.18)',  border: 'rgba(236,72,153,0.4)' },
  rest:     { dot: '#9ca3af', label: 'Rest',      bg: 'rgba(156,163,175,0.10)', border: 'rgba(156,163,175,0.2)'},
}

function getCol(code: string | null | undefined) {
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

// ── XP Bar ──────────────────────────────────────────────────────────────────

function XPBar({ xp, streak }: { xp: number; streak: number }) {
  const level = getLevelForXP(xp)
  const pct   = Math.round(getXPProgress(xp) * 100)
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      {streak > 0 && (
        <div className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black flex-shrink-0"
          style={{ background: 'rgba(255,77,109,0.15)', color: '#ff4d6d', border: '1px solid rgba(255,77,109,0.25)' }}>
          🔥 {streak}
        </div>
      )}
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#f0a500,#eab308)' }} />
      </div>
      <div className="text-xs font-black flex-shrink-0" style={{ color: '#f0a500' }}>
        Lv {level.level}
      </div>
    </div>
  )
}

// ── Hero cards ───────────────────────────────────────────────────────────────

function HeroTraining({ sessions, planName, weekN, totalWeeks }: {
  sessions: PlanSession[]; planName: string; weekN: number; totalWeeks: number
}) {
  const totalKm = sessions.reduce((s, sess) => s + (sess.km ?? 0), 0)
  return (
    <Link href="/train" className="block rounded-2xl overflow-hidden active:scale-[0.99] transition-all"
      style={{ background: 'rgba(255,77,109,0.12)', border: '1.5px solid rgba(255,77,109,0.4)', boxShadow: '0 4px 24px rgba(255,77,109,0.15)' }}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#ff4d6d' }}>
              Today · Week {weekN} of {totalWeeks}
            </p>
            <p className="text-2xl font-black text-white leading-tight" style={{ letterSpacing: '-0.02em' }}>
              {sessions.length} session{sessions.length !== 1 ? 's' : ''}
              {totalKm > 0 ? ` · ${fmtKm(totalKm)}` : ''}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {planName}
            </p>
          </div>
          <div className="rounded-xl px-4 py-2 font-black text-sm text-white flex-shrink-0"
            style={{ background: '#ff4d6d' }}>
            Start →
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {sessions.map((s, i) => {
            const col = getCol(s.c)
            return (
              <div key={i} className="flex items-center gap-1.5 rounded-lg px-3 py-2"
                style={{ background: col.bg, border: `1px solid ${col.border}` }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: col.dot }} />
                <span className="text-xs font-bold text-white">
                  {col.label}{s.km > 0 ? ` ${fmtKm(s.km)}` : ''}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </Link>
  )
}

function HeroRestDay({ planName, weekN, totalWeeks }: { planName: string; weekN: number; totalWeeks: number }) {
  return (
    <div className="rounded-2xl p-4"
      style={{ background: 'rgba(156,163,175,0.08)', border: '1.5px solid rgba(156,163,175,0.15)' }}>
      <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
        Today · Week {weekN} of {totalWeeks}
      </p>
      <p className="text-2xl font-black text-white mb-1">Rest day 😴</p>
      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {planName} · Recovery is training. Next session tomorrow.
      </p>
    </div>
  )
}

function HeroCoach({ coach }: { coach: CoachProfile }) {
  return (
    <Link href="/train" className="block rounded-2xl overflow-hidden active:scale-[0.99] transition-all"
      style={{ background: 'rgba(139,92,246,0.12)', border: '1.5px solid rgba(139,92,246,0.4)', boxShadow: '0 4px 24px rgba(139,92,246,0.12)' }}>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0 overflow-hidden"
            style={{ background: 'rgba(139,92,246,0.2)', border: '2px solid rgba(139,92,246,0.4)' }}>
            {coach.photo_url
              ? <img src={coach.photo_url} className="w-full h-full object-cover" alt="" />
              : '🎓'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: '#8b5cf6' }}>Your coach</p>
            <p className="text-base font-black text-white">{coach.display_name}</p>
          </div>
          <div className="rounded-xl px-3 py-1.5 text-xs font-black text-white flex-shrink-0"
            style={{ background: '#8b5cf6' }}>
            Message →
          </div>
        </div>
        <p className="text-xs rounded-xl px-3 py-2.5"
          style={{ color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
          Tap to see your coached plan and latest messages.
        </p>
      </div>
    </Link>
  )
}

function HeroSquadLeader({ squad }: { squad: Squad }) {
  const colour = squad.colour || '#84cc16'
  const isLeader = true
  const memberCount = squad.squad_members?.length ?? 0
  return (
    <Link href="/squad" className="block rounded-2xl overflow-hidden active:scale-[0.99] transition-all"
      style={{ background: `${colour}12`, border: `2px solid ${colour}45`, boxShadow: `0 4px 24px ${colour}20` }}>
      <div className="p-4">
        <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: colour }}>
          Your squad · {isLeader ? 'Split Leader 👑' : 'Member'}
        </p>
        <p className="text-2xl font-black text-white mb-1" style={{ letterSpacing: '-0.02em' }}>{squad.name}</p>
        <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {memberCount} member{memberCount !== 1 ? 's' : ''} · Tap to check in on your squad
        </p>
        <div className="flex gap-2">
          <div className="flex-1 rounded-xl px-3 py-2 text-center"
            style={{ background: `${colour}20`, border: `1px solid ${colour}35` }}>
            <p className="text-[10px] font-bold" style={{ color: colour }}>Leaderboard</p>
          </div>
          <div className="flex-1 rounded-xl px-3 py-2 text-center"
            style={{ background: `${colour}20`, border: `1px solid ${colour}35` }}>
            <p className="text-[10px] font-bold" style={{ color: colour }}>Nudge team →</p>
          </div>
        </div>
      </div>
    </Link>
  )
}

function HeroNewUser() {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(6,182,212,0.10)', border: '1.5px solid rgba(6,182,212,0.3)' }}>
      <div className="p-4">
        <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#06b6d4' }}>
          Welcome to NextSplit
        </p>
        <p className="text-2xl font-black text-white mb-1" style={{ letterSpacing: '-0.02em' }}>
          Pick your path. 🚀
        </p>
        <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Four ways to start training — takes 3 minutes.
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
      style={{ background: 'rgba(240,165,0,0.10)', border: '1.5px solid rgba(240,165,0,0.4)', boxShadow: '0 4px 24px rgba(240,165,0,0.15)' }}>
      <div className="p-4">
        <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#f0a500' }}>
          ⚠️ Streak at risk
        </p>
        <p className="text-2xl font-black text-white mb-1" style={{ letterSpacing: '-0.02em' }}>
          {streak} days. Don&apos;t stop now.
        </p>
        <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Log today&apos;s session before midnight to keep your streak alive.
        </p>
        <div className="rounded-xl px-4 py-2.5 text-center font-black text-white text-sm"
          style={{ background: '#f0a500' }}>
          Log session → +25 XP
        </div>
      </div>
    </Link>
  )
}

// ── Persistent cards ─────────────────────────────────────────────────────────

function StatsStrip({ weeklyKm }: { weeklyKm: number }) {
  return (
    <Link href="/train" className="block">
      <div className="flex gap-2">
        <div className="flex-1 rounded-xl py-3 text-center"
          style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)' }}>
          <p className="text-lg font-black" style={{ color: '#2563eb' }}>{weeklyKm.toFixed(1)}</p>
          <p className="text-[9px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>km this week</p>
        </div>
        <div className="flex-1 rounded-xl py-3 text-center"
          style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)' }}>
          <p className="text-sm font-black" style={{ color: '#2563eb' }}>Full stats →</p>
          <p className="text-[9px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>ACWR · pace · load</p>
        </div>
      </div>
    </Link>
  )
}

function SquadCard({ squad }: { squad: Squad }) {
  const colour = squad.colour || '#84cc16'
  return (
    <Link href="/squad" className="block rounded-2xl p-4 active:scale-[0.99] transition-all"
      style={{ background: `${colour}08`, border: `1px solid ${colour}25` }}>
      <div className="flex items-center gap-3">
        <div className="text-2xl">👥</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black" style={{ color: colour }}>{squad.name}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            {squad.squad_members?.length ?? 0} members · Tap to open →
          </p>
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
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Verified coaches from £30/mo</p>
        </div>
        <div className="text-xs font-black rounded-lg px-3 py-1.5 text-white flex-shrink-0"
          style={{ background: '#8b5cf6' }}>Browse</div>
      </div>
    </Link>
  )
}

function StartSquadCard() {
  return (
    <Link href="/explore?tab=squads" className="block rounded-2xl p-4 active:scale-[0.99] transition-all"
      style={{ background: 'rgba(132,204,22,0.08)', border: '1px solid rgba(132,204,22,0.2)' }}>
      <div className="flex items-center gap-3">
        <div className="text-2xl">👥</div>
        <div className="flex-1">
          <p className="text-sm font-black" style={{ color: '#84cc16' }}>Join a squad</p>
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Train together, go further</p>
        </div>
        <div className="text-xs font-black rounded-lg px-3 py-1.5 flex-shrink-0"
          style={{ background: '#84cc16', color: '#0d1a05' }}>Find one</div>
      </div>
    </Link>
  )
}

function PremiumCard() {
  return (
    <Link href="/settings" className="block rounded-2xl p-4 active:scale-[0.99] transition-all"
      style={{ background: 'rgba(240,165,0,0.08)', border: '1px solid rgba(240,165,0,0.2)' }}>
      <div className="flex items-center gap-3">
        <div className="text-2xl">⭐</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black" style={{ color: '#f0a500' }}>Go Elite — £7.99/mo</p>
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            AI coaching · ACWR · adaptive plans · founding price
          </p>
        </div>
        <span className="text-xs font-black rounded-lg px-3 py-1.5 flex-shrink-0"
          style={{ background: '#f0a500', color: '#1a0e00' }}>Upgrade</span>
      </div>
    </Link>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function HomeClient() {
  const { plan, currentWeek }   = useActivePlan()
  const { logs: allLogs }       = useAllTrainingLogs()
  const { profile }             = useProfile()
  const { squad, role }         = useSquad()
  const { coach, hasCoach }     = useMyCoach()
  const { isPro }               = useSubscription()

  const streak    = useMemo(() =>
    computeStreak(allLogs.map((l: TrainingLog) => ({ logged_at: l.created_at, done: l.done }))).current,
  [allLogs])

  const weeklyKm  = useMemo(() => getWeeklyKm(allLogs), [allLogs])

  const sessions  = useMemo(() =>
    plan ? getTodaySessions({ current_week: plan.current_week, weeks_data: plan.weeks_data }) : [],
  [plan])

  const xp = useMemo(() =>
    allLogs.filter((l: TrainingLog) => l.done).length * 15,
  [allLogs])

  const isLeader = role === 'leader'

  // Greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = (profile?.display_name as string | null)?.split(' ')[0] ?? 'runner'

  // Hero state priority:
  // new user → coach (if has coach) → leader (if leading squad) →
  // training day → streak at risk → rest day
  type HeroState = 'new' | 'training' | 'rest' | 'coach' | 'leader' | 'streak'
  const heroState: HeroState = (() => {
    if (!plan) return 'new'
    if (hasCoach && coach) return 'coach'
    if (isLeader && squad) return 'leader'
    if (sessions.length > 0) return 'training'
    const todayStr = new Date().toISOString().slice(0, 10)
    const loggedToday = allLogs.some((l: TrainingLog) => l.done && l.created_at.startsWith(todayStr))
    if (streak >= 3 && !loggedToday) return 'streak'
    return 'rest'
  })()

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-40 border-b"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-lg mx-auto px-4 pt-12 pb-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-base font-black tracking-tight" style={{ color: '#06b6d4', letterSpacing: '-0.02em' }}>
              NextSplit
            </span>
            <Link href="/you" className="text-lg" style={{ color: 'var(--color-text-tertiary)' }} aria-label="Settings">
              ⚙
            </Link>
          </div>
          <XPBar xp={xp} streak={streak} />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-3">

        {/* Greeting */}
        <div className="mb-1">
          <p className="text-2xl font-black text-white leading-tight" style={{ letterSpacing: '-0.02em' }}>
            {greeting}, {firstName} 👋
          </p>
          {plan && (
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {plan.name} · Week {plan.current_week} of {plan.total_weeks}
            </p>
          )}
        </div>

        {/* ── Hero card (state-driven) ── */}
        {heroState === 'new'      && <HeroNewUser />}
        {heroState === 'training' && plan && (
          <HeroTraining sessions={sessions} planName={plan.name} weekN={plan.current_week} totalWeeks={plan.total_weeks} />
        )}
        {heroState === 'rest'     && plan && (
          <HeroRestDay planName={plan.name} weekN={plan.current_week} totalWeeks={plan.total_weeks} />
        )}
        {heroState === 'coach'    && coach && <HeroCoach coach={coach} />}
        {heroState === 'leader'   && squad && <HeroSquadLeader squad={squad} />}
        {heroState === 'streak'   && <HeroStreakAtRisk streak={streak} />}

        {/* ── Stats strip (if has plan) ── */}
        {plan && <StatsStrip weeklyKm={weeklyKm} />}

        {/* ── Contextual persistent cards ── */}

        {/* Squad — show if in squad and wasn't the hero */}
        {squad && heroState !== 'leader' && <SquadCard squad={squad} />}

        {/* Coach nudge — if no coach */}
        {!hasCoach && heroState !== 'new' && <FindCoachCard />}

        {/* Squad nudge — if no squad */}
        {!squad && heroState !== 'new' && <StartSquadCard />}

        {/* Premium upsell — if free + has plan */}
        {plan && !isPro && <PremiumCard />}

      </div>
    </div>
  )
}
