'use client'

import Link from 'next/link'
import Splity from '@/components/Splity'
import type { PlanSession } from '@/types/database'
import { getSessionColour } from './_helpers'

// All 5 hero variants for the Home daily-action surface. Lifted from
// HomeClient during R2 god-component decomp. The discriminator
// (heroState) stays in the parent; this module just provides the shapes.

export type HeroState = 'no_plan' | 'streak_risk' | 'coach' | 'training' | 'training_done' | 'rest'

export function HeroTraining({ sessions, planName, weekN, totalWeeks, daysToRace }: {
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
    <div className="mx-4">
      <div className="rounded-3xl overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${colour}18, ${colour}08)`,
          border: `3px solid ${colour}`,
          boxShadow: `0 0 0 1px ${colour}15, 0 8px 32px ${colour}30`,
        }}>
        <div className="p-5">
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

          <Link href="/train?logToday=1"
            className="block py-4 rounded-2xl text-center font-black text-base active:scale-[0.98] transition-all"
            style={{ background: colour, color: 'white', boxShadow: `0 4px 20px ${colour}60` }}>
            Start today&apos;s session →
          </Link>
        </div>

        <Link href="/train"
          className="px-5 py-3 border-t flex items-center justify-between active:opacity-70 transition-opacity"
          style={{ borderColor: `${colour}20` }}>
          <span className="text-xs font-bold" style={{ color: 'var(--color-text-tertiary)' }}>
            📋 {planName}
          </span>
          <span className="text-xs font-bold" style={{ color: colour }}>
            View full plan →
          </span>
        </Link>
      </div>
    </div>
  )
}

export function HeroTrainingDone({ planName, nextSessions, streak }: {
  planName: string
  nextSessions: PlanSession[]
  streak: number
}) {
  const tomorrow = nextSessions[0]
  const tomorrowColour = getSessionColour(tomorrow?.c)
  return (
    <div className="mx-4">
      <div className="rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.14), rgba(34,197,94,0.06))',
          border: '3px solid #22c55e',
          boxShadow: '0 0 0 1px rgba(34,197,94,0.12), 0 8px 32px rgba(34,197,94,0.25)',
        }}>
        <div className="p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#22c55e', boxShadow: '0 4px 16px rgba(34,197,94,0.5)' }}>
            <span className="text-3xl">✓</span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="ns-label" style={{ color: '#22c55e' }}>Today · Complete</span>
            <p className="text-2xl font-black mt-0.5"
              style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
              Nice work {streak > 0 ? `· ${streak}d streak 🔥` : ''}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              {planName}
            </p>
          </div>
        </div>
        {tomorrow && (
          <Link href="/train"
            className="flex items-center justify-between px-5 py-3 border-t active:opacity-70 transition-opacity"
            style={{ borderColor: 'rgba(34,197,94,0.25)' }}>
            <span className="text-xs font-bold" style={{ color: 'var(--color-text-tertiary)' }}>
              Tomorrow: <span style={{ color: tomorrowColour }}>{tomorrow.n ?? tomorrow.c}</span>
              {tomorrow.km > 0 ? ` · ${tomorrow.km}km` : ''}
            </span>
            <span className="text-xs font-black" style={{ color: '#22c55e' }}>See plan →</span>
          </Link>
        )}
      </div>
    </div>
  )
}

export function HeroRest({ planName, nextSessions }: { planName: string; nextSessions: PlanSession[] }) {
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

export function HeroStreakAtRisk({ streak }: { streak: number }) {
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

export function HeroNoPlan() {
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

export function HeroCoach({ coach }: { coach: { display_name: string; photo_url?: string | null; slug?: string } }) {
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
