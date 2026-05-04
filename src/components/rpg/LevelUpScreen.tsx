'use client'

import { useEffect } from 'react'
import {
  RPG_CHARS, RPG_BADGES, RPG_LEVELS, RARITY_CONFIG, SESSION_XP,
  computeRPGStats, getLevelForXP, getXPProgress, getXPToNext,
  checkNewBadges, renderCharSVG,
  type RPGStats, type RPGBadge,
} from '@/lib/rpg'

function LevelUpScreen({
  level, charId, onDismiss
}: {
  level: number
  charId: string
  onDismiss: () => void
}) {
  const rpgLevel = RPG_LEVELS.find(l => l.level === level)

  const unlocks: string[] = []
  if (level === 3)  unlocks.push('GPS watch equipped')
  if (level === 6)  unlocks.push('Sunglasses unlocked')
  if (level === 7)  unlocks.push('Full running stride')
  if (level === 9)  unlocks.push('Race bib unlocked')
  if (level === 4)  unlocks.push('Light stride animation')

  useEffect(() => {
    const t = setTimeout(onDismiss, 6000)
    return () => clearTimeout(t)
  }, [onDismiss])

  // 8 star particles evenly spaced around the centre
  const stars = Array.from({ length: 8 }, (_, i) => ({
    angle: i * 45,
    colour: ['#FCD34D','#34D399','#60A5FA','#F87171','#A78BFA','#FBBF24','#2DD4BF','#F472B6'][i],
    delay: `${i * 0.07}s`,
  }))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.88)' }}
      onClick={onDismiss}
    >
      <div className="text-center px-8 animate-card-up" onClick={e => e.stopPropagation()}>
        {/* Star burst */}
        <div className="relative flex justify-center mb-2" style={{ height: 80 }}>
          <div className="relative" style={{ width: 80, height: 80 }}>
            {stars.map((s, i) => (
              <span
                key={i}
                className="star-particle"
                style={{
                  '--a': `${s.angle}deg`,
                  backgroundColor: s.colour,
                  animationDelay: s.delay,
                } as React.CSSProperties}
              />
            ))}
            <div className="absolute inset-0 flex items-center justify-center text-5xl animate-bounce">⚡</div>
          </div>
        </div>

        <div className="text-yellow-300 text-xs font-black uppercase tracking-widest mb-2">
          Level up!
        </div>

        {/* Animated level number */}
        <div className="text-white text-6xl font-black mb-1 animate-level-in">
          Lv.{level}
        </div>
        <div className="text-[var(--ns-magenta-light)] text-lg font-bold mb-5">{rpgLevel?.name}</div>

        {/* Character at new level */}
        <div className="flex justify-center mb-4">
          <div dangerouslySetInnerHTML={{ __html: renderCharSVG(charId, level, 120, 150) }} />
        </div>

        {/* Unlocks */}
        {unlocks.length > 0 && (
          <div className="mb-5 space-y-1">
            {unlocks.map((u, i) => (
              <div key={u} className="text-yellow-300 text-sm font-semibold animate-slide-up"
                style={{ animationDelay: `${0.4 + i * 0.1}s` }}>
                ✦ {u}
              </div>
            ))}
          </div>
        )}

        <button onClick={onDismiss}
          className="px-8 py-3 rounded-2xl bg-[var(--ns-ember)] text-white text-sm font-black animate-slide-up"
          style={{ animationDelay: '0.5s' }}>
          Let's go →
        </button>
        <div className="text-[var(--color-text-tertiary)] text-[10px] mt-3">tap anywhere to dismiss</div>
      </div>
    </div>
  )
}


export default LevelUpScreen
