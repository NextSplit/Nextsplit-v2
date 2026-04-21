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
    <div className="border-b px-4 pt-12 pb-4 sticky top-0 z-40" style={{ background: "var(--color-bg)", borderColor: "var(--color-border)" }}>
      <div className="max-w-lg mx-auto">

        {/* Time-aware greeting — Today only, spec: "Good morning, Alex — session in plain English" */}
        {isToday && sessionLine && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-400 mb-0.5">
              {greeting}{firstName ? `, ${firstName}` : ''} —
            </p>
            <p className={`font-display text-base leading-snug ${isLowReadiness ? 'text-amber-600' : ''}`}
              style={isLowReadiness ? {} : { color: 'var(--ns-forest)' }}>
              {allDone
                ? `All done today. ${todaySessions.length === 1 ? 'One session' : `${todaySessions.length} sessions`} complete. ✓`
                : sessionLine}
            </p>
            {/* Low readiness note — coach voice, preserves autonomy */}
            {isLowReadiness && !allDone && (
              <p className="text-[10px] text-amber-500 mt-0.5">
                Your readiness is low today — listen to how you feel.
              </p>
            )}
          </div>
        )}

        {/* Top bar — brand + streak + plan progress */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-black" style={{ color: 'var(--ns-forest)', fontFamily: 'var(--font-cormorant), serif' }}>
            NextSplit
          </span>
          <div className="flex items-center gap-2">
            {/* Streak pill */}
            {streak.current > 0 && (
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                streak.current >= 7 ? 'bg-amber-100 text-amber-700' :
                streak.current >= 3 ? 'bg-orange-50 text-orange-600' :
                'bg-gray-100 text-gray-500'
              }`}>
                🔥 {streak.current}
              </span>
            )}

            {/* Plan progress */}
            {plan && (
              <div className="flex flex-col items-end gap-0.5">
                <span className="font-data text-[11px] text-gray-500">
                  W{weekN}/{plan.total_weeks}
                  {daysToRace !== null && daysToRace > 0 && (
                    <span className="text-gray-400 ml-1">· {daysToRace}d</span>
                  )}
                </span>
                <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(weekN / plan.total_weeks) * 100}%`,
                      background: (weekN / plan.total_weeks) >= 0.8
                        ? 'var(--ns-ember)' : 'var(--ns-forest)',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Session count */}
            {plan && todaySessions.length > 0 && isToday && (
              <span className={`text-xs font-semibold ${
                allDone ? 'text-emerald-500' : 'text-gray-400'
              }`}>
                {doneTodayCount}/{todaySessions.length}
              </span>
            )}
            <DarkModeToggle />
          </div>
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDateOffset(o => o - 1)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-lg font-light"
          >‹</button>
          <div className="flex-1 text-center">
            <div className="text-sm font-semibold text-gray-900">{dateLabel}</div>
            <div className="text-[11px] text-gray-400">{formatDate(viewDate)}</div>
          </div>
          <button
            onClick={() => setDateOffset(o => o + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-lg font-light"
          >›</button>
        </div>

        {/* Context strip — spec: "Week X of Y · sessions this week · days to race" */}
        {plan && isToday && (
          <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-gray-400 font-medium">
            <span>Week {weekN} of {plan.total_weeks}</span>
            <span>·</span>
            <span>{doneTodayCount} of {todaySessions.length} today</span>
            {daysToRace !== null && daysToRace > 0 && (
              <>
                <span>·</span>
                <span>Race in {daysToRace}d</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
