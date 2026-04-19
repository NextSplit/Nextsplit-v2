'use client'

import { useState } from 'react'
import {
  RPG_CHARS, RPG_BADGES, RPG_LEVELS, RARITY_CONFIG, SESSION_XP,
  computeRPGStats, getLevelForXP, getXPProgress, getXPToNext,
  checkNewBadges, renderCharSVG,
  type RPGStats, type RPGBadge,
} from '@/lib/rpg'

function BadgeGrid({ unlockedIds, stats }: { unlockedIds: Set<string>; stats: RPGStats }) {
  const [filter, setFilter] = useState<string>('all')
  const cats = ['all', 'distance', 'compliance', 'strength', 'recovery', 'nutrition', 'performance', 'special']

  // Compute proximity for each badge
  function getBadgeProximity(id: string): number {
    const s = stats
    const map: Record<string, number> = {
      km50: s.totalKm / 50, km100: s.totalKm / 100, km250: s.totalKm / 250,
      km500: s.totalKm / 500, km1000: s.totalKm / 1000,
      lr15: s.longestRun / 15, lr20: s.longestRun / 20, lr30: s.longestRun / 30,
      str3: s.streak / 3, str7: s.streak / 7, str14: s.streak / 14, str30: s.streak / 30,
      pw1: s.perfectWeeks / 1, pw5: s.perfectWeeks / 5, pw10: s.perfectWeeks / 10,
      gym5: s.totalGym / 5, gym25: s.totalGym / 25, gym50: s.totalGym / 50,
      well7: s.totalWellness / 7, well30: s.totalWellness / 30,
      lv5: s.level.level / 5, lv10: s.level.level / 10, lv15: s.level.level / 15,
      race1: s.racesComplete / 1, race3: s.racesComplete / 3, race5: s.racesComplete / 5,
    }
    return Math.min(map[id] ?? 0, 1)
  }

  const shown = filter === 'all' ? RPG_BADGES : RPG_BADGES.filter(b => b.cat === filter)
  const sorted = [...shown].sort((a, b) => {
    const au = unlockedIds.has(a.id) ? 2 : getBadgeProximity(a.id)
    const bu = unlockedIds.has(b.id) ? 2 : getBadgeProximity(b.id)
    return bu - au
  })

  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        {cats.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-bold capitalize transition-all ${filter === c ? 'bg-[#0D9488] text-white' : 'bg-gray-100 text-gray-500'}`}>
            {c === 'all' ? `All (${unlockedIds.size}/${RPG_BADGES.length})` : c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {sorted.map(b => {
          const unlocked = unlockedIds.has(b.id)
          const rarity = RARITY_CONFIG[b.rarity]
          const proximity = unlocked ? 1 : getBadgeProximity(b.id)
          const showProgress = !unlocked && proximity > 0

          return (
            <div key={b.id} title={unlocked ? `${b.name}: ${b.desc}` : `${b.desc} (${Math.round(proximity * 100)}%)`}
              className={`rounded-xl border-2 p-2 text-center transition-all relative ${
                unlocked ? `${rarity.border} bg-white ${rarity.glow}` :
                proximity > 0.5 ? 'border-amber-200 bg-amber-50/50' :
                'border-gray-100 bg-gray-50 opacity-40 grayscale'
              }`}>
              <div className={`text-xl mb-0.5 ${!unlocked && proximity === 0 ? 'grayscale' : ''}`}>{b.emoji}</div>
              <div className={`text-[8px] font-bold leading-tight ${unlocked ? 'text-gray-800' : proximity > 0.5 ? 'text-amber-800' : 'text-gray-400'}`}>
                {b.name}
              </div>
              {unlocked && (
                <div className={`text-[7px] font-bold mt-0.5 ${rarity.colour.split(' ')[1]}`}>
                  {rarity.label}
                </div>
              )}
              {showProgress && proximity > 0.2 && (
                <div className="mt-1 h-0.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${Math.round(proximity * 100)}%` }} />
                </div>
              )}
              {showProgress && proximity > 0.5 && (
                <div className="text-[7px] text-amber-600 font-bold mt-0.5">
                  {Math.round(proximity * 100)}%
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


export default BadgeGrid
