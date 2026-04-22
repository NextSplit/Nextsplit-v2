'use client'

import DarkModeToggle from '@/components/DarkModeToggle'
import { formatDate, getTimeGreeting, getSessionPlainEnglish } from '@/lib/sessionUtils'
import type { UserPlan, PlanSession } from '@/types/database'

interface Props {
  plan:            UserPlan | null
  weekN:           number
  streak:          { current: number }
  dateOffset:      number
  setDateOffset:   (fn: (o: number) => number) => void
  viewDate:        Date
  isToday:         boolean
  todaySessions:   PlanSession[]
  doneTodayCount:  number
  displayName:     string | null
  readiness?:      number | null   // 1–5 from wellness log (5 = great, 1 = low)
}

export function TodayHeader({
  plan, weekN, streak, dateOffset, setDateOffset,
  viewDate, isToday, todaySessions, doneTodayCount, displayName,
  readiness,
}: Props) {
  const dateLabel =
    isToday       ? 'Today'
    : dateOffset === -1 ? 'Yesterday'
    : dateOffset === 1  ? 'Tomorrow'
    : formatDate(viewDate)

  // Time-aware greeting — only shown on Today view, not past/future days
  const firstName    = displayName?.split(' ')[0] ?? null
  const greeting     = getTimeGreeting()
  const allDone      = todaySessions.length > 0 && doneTodayCount === todaySessions.length
  const primarySession = todaySessions[0]

  // Readiness-adjusted session line — Product Pillar spec:
  // "Low readiness (1-2): soften the session line, suggest but don't push"
  const isLowReadiness = readiness !== null && readiness !== undefined && readiness <= 2

  // Plain-English session line — from Product & UX Pillar spec
  const sessionLine = primarySession
    ? isLowReadiness
      ? `Easy option today — ${getSessionPlainEnglish(primarySession.c ?? '', primarySession.n ?? '')} if you feel up to it`
      : getSessionPlainEnglish(primarySession.c ?? '', primarySession.n ?? '')
    : null

  // Race countdown — computed outside render via prop, stable reference
  const daysToRace = plan?.race_date
    ? Math.ceil((new Date(plan.race_date).getTime() - new Date().setHours(0,0,0,0)) / 86400000)
    : null

  return (
    <div className="sticky top-0 z-40 border-b" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
      <div className="max-w-lg mx-auto px-4 pt-12 pb-3">

        {/* Brand row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {/* NextSplit wordmark — Cormorant display font */}
            <span className="font-display text-2xl tracking-tight" style={{ color: 'var(--ns-forest)', letterSpacing: '-0.02em' }}>
              NextSplit
            </span>
            {streak.current >= 3 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: streak.current >= 7 ? 'rgba(232,93,38,0.15)' : 'rgba(196,154,60,0.15)',
                  color: streak.current >= 7 ? 'var(--ns-ember)' : 'var(--ns-track)',
                }}>
                🔥 {streak.current}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {plan && (
              <div className="flex items-center gap-2">
                <span className="font-data text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                  W{weekN}<span style={{ color: 'var(--color-border-2)' }}>/{plan.total_weeks}</span>
                </span>
                {daysToRace !== null && daysToRace > 0 && daysToRace <= 30 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(232,93,38,0.12)', color: 'var(--ns-ember)' }}>
                    {daysToRace}d 🏁
                  </span>
                )}
              </div>
            )}
            <DarkModeToggle />
          </div>
        </div>

        {/* Greeting + coaching line — Cormorant display, larger than before */}
        {isToday && (
          <div className="mb-4">
            {sessionLine ? (
              <>
                <p className="text-[11px] font-semibold mb-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                  {greeting}{firstName ? `, ${firstName}` : ''}
                </p>
                <p className={`font-display text-xl leading-tight ${isLowReadiness ? '' : ''}`}
                  style={{
                    color: allDone ? '#4ade80' : isLowReadiness ? '#f59e0b' : 'var(--color-text-primary)',
                    fontStyle: 'italic',
                  }}>
                  {allDone
                    ? `All done today ✓`
                    : sessionLine}
                </p>
                {isLowReadiness && !allDone && (
                  <p className="text-[10px] mt-1" style={{ color: '#f59e0b' }}>
                    Readiness is low — listen to your body today.
                  </p>
                )}
              </>
            ) : (
              <p className="font-display text-xl italic" style={{ color: 'var(--color-text-tertiary)' }}>
                {greeting}{firstName ? `, ${firstName}` : ''}
              </p>
            )}
          </div>
        )}

        {/* Plan progress bar — thin, full width */}
        {plan && (
          <div className="mb-3">
            <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${(weekN / plan.total_weeks) * 100}%`,
                  background: weekN / plan.total_weeks >= 0.8
                    ? 'linear-gradient(90deg, var(--ns-ember), #ff8c5a)'
                    : 'linear-gradient(90deg, var(--ns-forest), var(--ns-forest-mid))',
                }}
              />
            </div>
          </div>
        )}

        {/* Date navigation — refined */}
        <div className="flex items-center gap-3">
          <button onClick={() => setDateOffset(o => o - 1)}
            className="w-8 h-8 flex items-center justify-center rounded-full text-lg transition-all"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border)' }}>
            ‹
          </button>
          <div className="flex-1 text-center">
            <div className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{dateLabel}</div>
            <div className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
              {formatDate(viewDate)}
              {plan && todaySessions.length > 0 && isToday && (
                <span style={{ color: allDone ? '#4ade80' : 'var(--ns-ember)' }}>
                  {' '}· {doneTodayCount}/{todaySessions.length} sessions
                </span>
              )}
            </div>
          </div>
          <button onClick={() => setDateOffset(o => o + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-full text-lg transition-all"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border)' }}>
            ›
          </button>
        </div>
      </div>
    </div>
  )
}
