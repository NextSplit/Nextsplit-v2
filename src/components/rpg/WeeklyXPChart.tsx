'use client'

import { useMemo } from 'react'

import type { TrainingLog, PlanWeek } from '@/types/database'
import {
  RPG_CHARS, RPG_BADGES, RPG_LEVELS, RARITY_CONFIG, SESSION_XP,
  computeRPGStats, getLevelForXP, getXPProgress, getXPToNext,
  checkNewBadges, renderCharSVG,
  type RPGStats, type RPGBadge,
} from '@/lib/rpg'

function WeeklyXPChart({ logs, weeks }: {
  logs: Record<string, TrainingLog>
  weeks: import('@/types/database').PlanWeek[]
}) {
  const bars = useMemo(() => {
    const today = new Date()
    const result = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const dayLabel = d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 1)
      const isToday = i === 0

      // Sum XP from all logs on this date
      const dayXP = Object.values(logs)
        .filter(l => l.done && l.logged_at.slice(0, 10) === dateStr)
        .reduce((sum, l) => {
          const week = weeks.find(w => w.n === l.week_n)
          const session = week?.days[l.day_i]?.sessions[l.session_i]
          const code = session?.c ?? 'run-easy'
          return sum + (SESSION_XP[code] ?? 10)
        }, 0)

      result.push({ dateStr, dayLabel, xp: dayXP, isToday })
    }
    return result
  }, [logs, weeks])

  const maxXP = Math.max(...bars.map(b => b.xp), 40)
  const totalWeekXP = bars.reduce((a, b) => a + b.xp, 0)
  const activeDays = bars.filter(b => b.xp > 0).length

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-gray-900">⚡ This week's XP</span>
        <div className="text-right">
          <span className="text-sm font-black text-[var(--ns-ember)]">+{totalWeekXP}</span>
          <span className="text-[10px] text-gray-400 ml-1">{activeDays}/7 days</span>
        </div>
      </div>
      <div className="flex items-end gap-1.5 h-16">
        {bars.map(bar => {
          const heightPct = maxXP > 0 ? (bar.xp / maxXP) * 100 : 0
          return (
            <div key={bar.dateStr} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end" style={{ height: '48px' }}>
                <div
                  className={`w-full rounded-t-lg transition-all duration-500 ${
                    bar.isToday ? 'bg-[var(--ns-ember)]' :
                    bar.xp > 0 ? 'bg-teal-200' : 'bg-gray-100'
                  }`}
                  style={{ height: bar.xp > 0 ? `${Math.max(heightPct, 15)}%` : '6px' }}
                />
              </div>
              <span className={`text-[9px] font-bold ${bar.isToday ? 'text-[var(--ns-ember)]' : 'text-gray-400'}`}>
                {bar.dayLabel}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}


export default WeeklyXPChart
