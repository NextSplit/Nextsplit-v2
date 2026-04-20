'use client'

import DarkModeToggle from '@/components/DarkModeToggle'
import { formatDate } from '@/lib/sessionUtils'
import type { UserPlan } from '@/types/database'

interface Props {
  plan:            UserPlan | null
  weekN:           number
  streak:          { current: number }
  dateOffset:      number
  setDateOffset:   (fn: (o: number) => number) => void
  viewDate:        Date
  isToday:         boolean
  todaySessions:   unknown[]
  doneTodayCount:  number
}

export function TodayHeader({
  plan, weekN, streak, dateOffset, setDateOffset,
  viewDate, isToday, todaySessions, doneTodayCount,
}: Props) {
  const dateLabel =
    isToday       ? 'Today'
    : dateOffset === -1 ? 'Yesterday'
    : dateOffset === 1  ? 'Tomorrow'
    : formatDate(viewDate)

  return (
    <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-40">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-gray-900">NextSplit</span>
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
            {plan && (
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[11px] text-gray-500 font-semibold">
                  W{weekN}/{plan.total_weeks}
                </span>
                <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (weekN / plan.total_weeks) >= 0.8 ? 'bg-emerald-400' : 'bg-teal-500'
                    }`}
                    style={{ width: `${(weekN / plan.total_weeks) * 100}%` }}
                  />
                </div>
              </div>
            )}
            {plan && todaySessions.length > 0 && isToday && (
              <span className={`text-xs font-semibold ${doneTodayCount === todaySessions.length ? 'text-emerald-500' : 'text-gray-400'}`}>
                {doneTodayCount}/{todaySessions.length} done
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
            disabled={dateOffset >= 0}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-lg font-light disabled:opacity-30"
          >›</button>
        </div>
      </div>
    </div>
  )
}
