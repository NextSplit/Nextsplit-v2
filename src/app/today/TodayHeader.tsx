'use client'

import DarkModeToggle from '@/components/DarkModeToggle'
import Splity from '@/components/Splity'
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
  readiness?:      number | null
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

  const firstName    = displayName?.split(' ')[0] ?? null
  const greeting     = getTimeGreeting()
  const allDone      = todaySessions.length > 0 && doneTodayCount === todaySessions.length
  const primarySession = todaySessions[0]
  const isLowReadiness = readiness !== null && readiness !== undefined && readiness <= 2

  const sessionLine = primarySession
    ? isLowReadiness
      ? `Easy option today — ${getSessionPlainEnglish(primarySession.c ?? '', primarySession.n ?? '')} if you feel up to it`
      : getSessionPlainEnglish(primarySession.c ?? '', primarySession.n ?? '')
    : null

  const daysToRace = plan?.race_date
    ? Math.ceil((new Date(plan.race_date).getTime() - new Date().setHours(0,0,0,0)) / 86400000)
    : null

  const progressPct = plan ? (weekN / plan.total_weeks) * 100 : 0
  const nearEnd = progressPct >= 80

  return (
    <div className="sticky top-0 z-40 border-b"
      style={{ background: 'linear-gradient(180deg, #fff5f7 0%, var(--color-surface) 100%)', borderColor: 'var(--color-border)' }}>
      <div className="max-w-lg mx-auto px-4 pt-12 pb-3">

        {/* Top row — brand + streak + settings */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            {/* NextSplit wordmark */}
            <span className="font-display text-xl tracking-tight"
              style={{ color: 'var(--ns-cyan)', letterSpacing: '-0.03em' }}>
              NextSplit
            </span>
            {/* Streak pill — only if active */}
            {streak.current >= 3 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{
                  background: streak.current >= 7 ? 'var(--ns-ember-light)' : 'var(--ns-track-light)',
                  color:      streak.current >= 7 ? 'var(--ns-ember)'       : 'var(--ns-track)',
                }}>
                🔥 {streak.current}
              </span>
            )}
          </div>

          {/* Right side — race countdown + dark mode */}
          <div className="flex items-center gap-2">
            {plan && (
              <span className="font-data text-[11px] font-bold"
                style={{ color: 'var(--color-text-tertiary)' }}>
                W{weekN}<span style={{ color: 'var(--color-border-2)' }}>/{plan.total_weeks}</span>
              </span>
            )}
            {daysToRace !== null && daysToRace > 0 && daysToRace <= 30 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'var(--ns-ember-light)', color: 'var(--ns-ember)' }}>
                {daysToRace}d 🏁
              </span>
            )}
            <DarkModeToggle />
          </div>
        </div>

        {/* Splity coaching line — today only */}
        {isToday && (
          <div className="mb-3">
            {sessionLine ? (
              <div className="flex items-start gap-2">
                {/* Splity avatar */}
                <div className="flex-shrink-0 mt-0.5">
                  <Splity size={28} mood={allDone ? 'celebrating' : isLowReadiness ? 'encouraging' : 'default'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold mb-0.5"
                    style={{ color: 'var(--color-text-tertiary)' }}>
                    Splity{firstName ? ` · ${greeting}, ${firstName}` : ''}
                  </p>
                  <p className="font-display text-lg leading-tight"
                    style={{
                      color: allDone ? '#16a34a' : isLowReadiness ? '#d97706' : 'var(--color-text-primary)',
                      letterSpacing: '-0.02em',
                    }}>
                    {allDone
                      ? `All done today ✓`
                      : sessionLine}
                  </p>
                  {isLowReadiness && !allDone && (
                    <p className="text-[10px] mt-0.5 font-medium" style={{ color: '#d97706' }}>
                      Readiness is low — listen to your body.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="font-display text-lg" style={{ color: 'var(--color-text-secondary)', letterSpacing: '-0.02em' }}>
                {greeting}{firstName ? `, ${firstName}` : ''}
              </p>
            )}
          </div>
        )}

        {/* Plan progress bar */}
        {plan && (
          <div className="mb-3">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progressPct}%`,
                  background: nearEnd
                    ? 'linear-gradient(90deg, var(--ns-ember), var(--ns-ember-mid))'
                    : 'linear-gradient(90deg, var(--ns-cyan), var(--ns-cyan-mid))',
                }} />
            </div>
          </div>
        )}

        {/* Date navigation */}
        <div className="flex items-center gap-3">
          <button onClick={() => setDateOffset(o => o - 1)}
            aria-label="Previous day"
            className="w-8 h-8 flex items-center justify-center rounded-full text-lg transition-all active:scale-90"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
            ‹
          </button>
          <div className="flex-1 text-center">
            <div className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {dateLabel}
            </div>
            <div className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
              {formatDate(viewDate)}
              {plan && todaySessions.length > 0 && isToday && (
                <span style={{ color: allDone ? '#16a34a' : 'var(--ns-ember)' }}>
                  {' '}· {doneTodayCount}/{todaySessions.length} sessions
                </span>
              )}
            </div>
          </div>
          <button onClick={() => setDateOffset(o => Math.min(o + 1, 0))}
            aria-label="Next day"
            className="w-8 h-8 flex items-center justify-center rounded-full text-lg transition-all active:scale-90"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
            ›
          </button>
        </div>
      </div>
    </div>
  )
}
