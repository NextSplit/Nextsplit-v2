'use client'

import { useEffect } from 'react'
import {
  RPG_CHARS, RPG_BADGES, RPG_LEVELS, RARITY_CONFIG, SESSION_XP,
  computeRPGStats, getLevelForXP, getXPProgress, getXPToNext,
  checkNewBadges, renderCharSVG,
  type RPGStats, type RPGBadge,
} from '@/lib/rpg'

function BadgeToast({ badge, onDismiss }: { badge: RPGBadge; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])

  const rarity = RARITY_CONFIG[badge.rarity]

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-bounce-once">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border ${rarity.border} bg-white max-w-xs`}>
        <div className="text-3xl">{badge.emoji}</div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">Badge unlocked!</div>
          <div className="text-sm font-black text-gray-900">{badge.name}</div>
          <div className="text-[10px] text-[var(--color-text-tertiary)]">{badge.desc}</div>
        </div>
        <div className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${rarity.colour}`}>
          {rarity.label}
        </div>
      </div>
    </div>
  )
}


export default BadgeToast
