'use client'

import { useMemo } from 'react'

import type { TrainingLog, PlanWeek } from '@/types/database'
import {
  RPG_CHARS, RPG_BADGES, RPG_LEVELS, RARITY_CONFIG, SESSION_XP,
  computeRPGStats, getLevelForXP, getXPProgress, getXPToNext,
  checkNewBadges, renderCharSVG,
  type RPGStats, type RPGBadge,
} from '@/lib/rpg'

function XPFeed({ logs, weeks }: {
  logs: Record<string, TrainingLog>
  weeks: import('@/types/database').PlanWeek[]
}) {

  const recent = useMemo(() => {
    return Object.values(logs)
      .filter(l => l.done && l.logged_at)
      .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())
      .slice(0, 5)
      .map(l => {
        const week = weeks.find(w => w.n === l.week_n)
        const session = week?.days[l.day_i]?.sessions[l.session_i]
        const code = session?.c ?? 'run-easy'
        const xp = SESSION_XP[code] ?? 10
        const bonus = l.km && l.km > 10 ? Math.round(l.km) : 0
        return {
          name: session?.n ?? 'Session',
          xp: xp + bonus,
          date: l.logged_at.slice(0, 10),
          km: l.km,
        }
      })
  }, [logs, weeks])

  if (recent.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50">
        <span className="text-sm font-bold text-gray-900">⚡ Recent XP</span>
      </div>
      <div className="divide-y divide-gray-50">
        {recent.map((r, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-2.5">
            <div>
              <p className="text-xs font-semibold text-gray-800">{r.name}</p>
              <p className="text-[10px] text-gray-400">{r.date}{r.km ? ` · ${r.km}km` : ''}</p>
            </div>
            <div className="text-sm font-black text-[var(--ns-forest)]">+{r.xp} XP</div>
          </div>
        ))}
      </div>
    </div>
  )
}


export default XPFeed
