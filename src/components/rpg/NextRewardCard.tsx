'use client'

import {
  RPG_CHARS, RPG_BADGES, RPG_LEVELS, RARITY_CONFIG, SESSION_XP,
  computeRPGStats, getLevelForXP, getXPProgress, getXPToNext,
  checkNewBadges, renderCharSVG,
  type RPGStats, type RPGBadge,
} from '@/lib/rpg'

function NextRewardCard({ stats, unlockedIds }: { stats: RPGStats; unlockedIds: Set<string> }) {
  const toNextLevel = getXPToNext(stats.xp)
  const progressPct = getXPProgress(stats.xp)

  // Find the closest unearned badge by checking proximity to check conditions
  const nearestBadge = RPG_BADGES
    .filter(b => !unlockedIds.has(b.id))
    .map(b => {
      // Compute a 0–1 proximity score for each badge
      let proximity = 0
      const s = stats
      if (b.id === 'km50')   proximity = Math.min(s.totalKm / 50, 1)
      if (b.id === 'km100')  proximity = Math.min(s.totalKm / 100, 1)
      if (b.id === 'km250')  proximity = Math.min(s.totalKm / 250, 1)
      if (b.id === 'km500')  proximity = Math.min(s.totalKm / 500, 1)
      if (b.id === 'km1000') proximity = Math.min(s.totalKm / 1000, 1)
      if (b.id === 'lr15')   proximity = Math.min(s.longestRun / 15, 1)
      if (b.id === 'lr20')   proximity = Math.min(s.longestRun / 20, 1)
      if (b.id === 'lr30')   proximity = Math.min(s.longestRun / 30, 1)
      if (b.id === 'str3')   proximity = Math.min(s.streak / 3, 1)
      if (b.id === 'str7')   proximity = Math.min(s.streak / 7, 1)
      if (b.id === 'str14')  proximity = Math.min(s.streak / 14, 1)
      if (b.id === 'str30')  proximity = Math.min(s.streak / 30, 1)
      if (b.id === 'pw1')    proximity = Math.min(s.perfectWeeks / 1, 1)
      if (b.id === 'pw5')    proximity = Math.min(s.perfectWeeks / 5, 1)
      if (b.id === 'pw10')   proximity = Math.min(s.perfectWeeks / 10, 1)
      if (b.id === 'gym5')   proximity = Math.min(s.totalGym / 5, 1)
      if (b.id === 'gym25')  proximity = Math.min(s.totalGym / 25, 1)
      if (b.id === 'gym50')  proximity = Math.min(s.totalGym / 50, 1)
      if (b.id === 'well7')  proximity = Math.min(s.totalWellness / 7, 1)
      if (b.id === 'well30') proximity = Math.min(s.totalWellness / 30, 1)
      if (b.id === 'lv5')    proximity = Math.min(s.level.level / 5, 1)
      if (b.id === 'lv10')   proximity = Math.min(s.level.level / 10, 1)
      if (b.id === 'race1')  proximity = Math.min(s.racesComplete / 1, 1)
      if (b.id === 'race3')  proximity = Math.min(s.racesComplete / 3, 1)
      return { badge: b, proximity }
    })
    .filter(x => x.proximity > 0)
    .sort((a, b) => b.proximity - a.proximity)[0]

  // What action earns the most XP right now
  const actionTip = stats.streak === 0
    ? 'Log a session today to start your streak (+2 XP/day)'
    : stats.totalGym < 5
    ? 'Log a gym session (+25 XP — highest per session)'
    : stats.perfectWeeks < 1
    ? 'Complete every session this week (+50 XP)'
    : `Keep your ${stats.streak}-day streak going (+2 XP today)`

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
      <div className="px-4 py-3 border-b border-amber-100 flex items-center gap-2">
        <span className="text-base">🎯</span>
        <span className="text-sm font-bold text-amber-900">Next rewards</span>
      </div>
      <div className="p-4 space-y-3">
        {/* Next level */}
        {stats.level.level < 15 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-amber-800">
                Level {stats.level.level + 1} — {RPG_LEVELS.find(l => l.level === stats.level.level + 1)?.name}
              </span>
              <span className="text-[10px] font-bold text-amber-600">{toNextLevel} XP to go</span>
            </div>
            <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full transition-all"
                style={{ width: `${progressPct}%` }} />
            </div>
            {/* Level unlock teaser */}
            {[3,6,7,9,12].includes(stats.level.level + 1) && (
              <p className="text-[10px] text-amber-600 mt-1">
                ✦ Unlocks: {
                  stats.level.level + 1 === 3 ? 'GPS watch on your character' :
                  stats.level.level + 1 === 6 ? 'Sunglasses unlocked' :
                  stats.level.level + 1 === 7 ? 'Full running stride animation' :
                  stats.level.level + 1 === 9 ? 'Race bib unlocked' :
                  'New kit tier'
                }
              </p>
            )}
          </div>
        )}

        {/* Nearest badge */}
        {nearestBadge && (
          <div className="flex items-center gap-3 bg-white/60 rounded-xl px-3 py-2">
            <div className="text-2xl">{nearestBadge.badge.emoji}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-800">{nearestBadge.badge.name}</p>
              <p className="text-[10px] text-[var(--color-text-tertiary)]">{nearestBadge.badge.desc}</p>
              <div className="mt-1 h-1 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${nearestBadge.badge.rarity === 'legendary' ? 'bg-amber-400' : nearestBadge.badge.rarity === 'epic' ? 'bg-purple-400' : nearestBadge.badge.rarity === 'rare' ? 'bg-blue-400' : 'bg-gray-400'}`}
                  style={{ width: `${Math.round(nearestBadge.proximity * 100)}%` }} />
              </div>
            </div>
            <span className="text-[10px] font-black text-amber-600">
              {Math.round(nearestBadge.proximity * 100)}%
            </span>
          </div>
        )}

        {/* Action tip */}
        <div className="flex items-start gap-2 text-xs text-amber-700">
          <span className="flex-shrink-0">💡</span>
          <span>{actionTip}</span>
        </div>
      </div>
    </div>
  )
}


export default NextRewardCard
