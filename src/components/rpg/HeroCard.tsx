'use client'

import { useState } from 'react'
import StatBar from '@/components/rpg/StatBar'
import {
  RPG_CHARS, RPG_BADGES, RPG_LEVELS, RARITY_CONFIG, SESSION_XP,
  computeRPGStats, getLevelForXP, getXPProgress, getXPToNext,
  checkNewBadges, renderCharSVG,
  type RPGStats, type RPGBadge,
} from '@/lib/rpg'

function HeroCard({
  charId, stats, displayName, kitColour, charState, medal, onEditChar, onCustomise
}: {
  charId: string
  stats: RPGStats
  displayName: string
  kitColour: string
  charState: 'idle' | 'running' | 'celebrating'
  medal: string | null
  onEditChar: () => void
  onCustomise: () => void
}) {
  const progress = getXPProgress(stats.xp)
  const toNext = getXPToNext(stats.xp)
  const ch = RPG_CHARS.find(c => c.id === charId) ?? RPG_CHARS[0]
  // Override the character's accent with the chosen kit colour
  const charWithKit = { ...ch, accent: kitColour }

  // State label
  const stateLabel = charState === 'celebrating' ? '🎉 Plan complete!' : charState === 'running' ? '🏃 Training today' : '😴 Rest day'
  const stateLabelColour = charState === 'celebrating' ? 'text-yellow-300' : charState === 'running' ? 'text-emerald-300' : 'text-gray-400'

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f3460 100%)' }}>
      <div className="p-5">
        <div className="flex items-start gap-4 mb-4">
          {/* Character avatar */}
          <div className="relative flex-shrink-0">
            <button onClick={onEditChar} className="block" title="Change character">
              <div
                className={charState === 'celebrating' ? 'animate-bounce' : ''}
                dangerouslySetInnerHTML={{ __html: renderCharSVG(charWithKit.id, stats.level.level, 88, 108, kitColour) }}
              />
            </button>
            {/* Level badge */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#0D9488] text-white text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg">
              Lv.{stats.level.level}
            </div>
            {/* Medal overlay */}
            {medal && (
              <div className="absolute -top-2 -right-2 text-xl leading-none drop-shadow-lg">
                {medal}
              </div>
            )}
            {/* Edit hint */}
            <button onClick={onEditChar}
              className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full border border-gray-200 flex items-center justify-center text-[10px] text-gray-500 shadow">
              ✎
            </button>
          </div>

          {/* Name + level + XP */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2">
              <div className="text-white font-black text-lg leading-tight">{displayName}</div>
            </div>
            <div className="text-teal-300 text-xs font-semibold mt-0.5">{stats.level.name}</div>
            <div className={`text-[10px] mt-0.5 font-medium ${stateLabelColour}`}>{stateLabel}</div>

            {/* XP bar */}
            <div className="mt-3">
              <div className="flex justify-between text-[9px] mb-1">
                <span className="text-gray-400">{stats.xp.toLocaleString()} XP</span>
                {stats.level.level < 15 && (
                  <span className="text-gray-400">{toNext} to Lv.{stats.level.level + 1}</span>
                )}
              </div>
              <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${kitColour}, #818cf8)`
                  }} />
              </div>
            </div>
          </div>
        </div>

        {/* 4 stat bars */}
        <div className="space-y-2 mb-4 relative">
          <StatBar label="Endurance" value={stats.endurance} colour="bg-emerald-500" tip="↑ Log more km — caps at 500km total" />
          <StatBar label="Strength"  value={stats.strength}  colour="bg-red-500"     tip="↑ Log gym sessions — 25 XP each" />
          <StatBar label="Recovery"  value={stats.recovery}  colour="bg-blue-500"    tip="↑ Complete wellness check-ins daily" />
          <StatBar label="Nutrition" value={stats.nutrition} colour="bg-amber-500"   tip="↑ Track meals and supplement days" />
        </div>

        {/* Quick stats strip + customise button */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: 'km',          value: stats.totalKm + '',    colour: 'text-emerald-400' },
            { label: 'sessions',    value: stats.totalRuns + '',  colour: 'text-blue-400' },
            { label: 'streak',      value: stats.streak + 'd',    colour: 'text-orange-400' },
            { label: 'perfect wks', value: stats.perfectWeeks+'', colour: 'text-purple-400' },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl p-2 text-center">
              <div className={`text-sm font-black ${s.colour}`}>{s.value}</div>
              <div className="text-[8px] text-gray-400 mt-0.5 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Customise kit button */}
        <button
          onClick={onCustomise}
          className="w-full py-1.5 rounded-xl bg-white/10 text-gray-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 hover:bg-white/20 transition-colors"
        >
          <span style={{ color: kitColour }}>●</span> Customise kit
        </button>
      </div>
    </div>
  )
}


export default HeroCard
