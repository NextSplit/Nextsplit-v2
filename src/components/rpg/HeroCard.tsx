'use client'

import { useState } from 'react'
import StatBar from '@/components/rpg/StatBar'
import { CharacterAccessoryOverlay } from './CharacterAccessoryOverlay'
import Character3DDynamic from './Character3DDynamic'
import {
  RPG_CHARS, RPG_LEVELS, RARITY_CONFIG,
  getLevelForXP, getXPProgress, getXPToNext,
  type RPGStats,
} from '@/lib/rpg'

function HeroCard({
  charId, stats, displayName, kitColour, charState, medal, runnerColour, onEditChar, onCustomise
}: {
  charId: string
  stats: RPGStats
  displayName: string
  kitColour: string
  runnerColour?: string
  charState: 'idle' | 'running' | 'celebrating'
  medal: string | null
  onEditChar: () => void
  onCustomise: () => void
}) {
  const progress = getXPProgress(stats.xp)
  const toNext   = getXPToNext(stats.xp)
  const ch       = RPG_CHARS.find(c => c.id === charId) ?? RPG_CHARS[0]
  const charWithKit = { ...ch, accent: kitColour }

  const stateConfig = {
    celebrating: { label: 'Plan complete! 🎉', color: 'var(--ns-track)' },
    running:     { label: 'Training today 🏃', color: 'var(--ns-ember)' },
    idle:        { label: 'Ready to run',       color: 'var(--color-text-tertiary)' },
  }[charState]

  const xpPct = Math.round(progress * 100)

  return (
    <div className="rounded-3xl overflow-hidden"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

      {/* Subtle ember/forest gradient accent at top */}
      <div className="h-1.5 w-full"
        style={{ background: `linear-gradient(90deg, ${runnerColour ?? 'var(--ns-cyan)'} 0%, var(--ns-ember) 60%, var(--ns-track) 100%)` }} />

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Character avatar — wrapped in CharacterAccessoryOverlay so
              active banner / shoes / accessory cosmetics layer in. */}
          <div className="relative flex-shrink-0">
            <CharacterAccessoryOverlay>
              <button onClick={onEditChar}
                className="block"
                title="Change character">
                {/* PR J9b — 3D character (SVG fallback while three.js loads).
                    Tier + class colour drive the J9c aura + rim. Removed the
                    outer `animate-bounce` since the celebrating state itself
                    plays a V-jump in the canvas. */}
                <Character3DDynamic
                  charId={charWithKit.id}
                  level={stats.level.level}
                  kitHex={kitColour}
                  state={charState}
                  classHex={runnerColour ?? null}
                  tier={stats.level.tier}
                  size={84}
                />
              </button>
            </CharacterAccessoryOverlay>
            {/* Level badge */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-white text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap"
              style={{ background: 'var(--ns-ember)' }}>
              Lv.{stats.level.level}
            </div>
            {medal && (
              <div className="absolute -top-2 -right-2 text-xl leading-none drop-shadow-lg">{medal}</div>
            )}
            <button onClick={onEditChar}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)' }}>
              ✎
            </button>
          </div>

          {/* Name + level info */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-xl leading-tight"
                  style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
                  {displayName}
                </h2>
                <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--ns-ember)' }}>
                  {stats.level.name}
                </p>
                <p className="text-[10px] mt-0.5 font-semibold" style={{ color: stateConfig.color }}>
                  {stateConfig.label}
                </p>
              </div>
              {/* Customise kit button */}
              <button onClick={onCustomise}
                className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 mt-1"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                🎨 Kit
              </button>
            </div>

            {/* XP bar */}
            <div className="mt-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-data font-bold" style={{ color: 'var(--color-text-tertiary)' }}>
                  {stats.xp.toLocaleString()} XP
                </span>
                {stats.level.level < 15 && (
                  <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                    {toNext} to Lv.{stats.level.level + 1}
                  </span>
                )}
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${xpPct}%`,
                    background: `linear-gradient(90deg, ${runnerColour ?? 'var(--ns-cyan)'}, var(--ns-track))`,
                  }} />
              </div>
              <p className="text-[9px] mt-0.5 text-right" style={{ color: 'var(--color-text-tertiary)' }}>
                {xpPct}% to next level
              </p>
            </div>
          </div>
        </div>

        {/* Stat bars */}
        <div className="mt-4 space-y-2">
          <StatBar label="Endurance" value={stats.endurance} colour="bg-blue-400" tip="Built through long runs and consistent mileage" />
          <StatBar label="Strength"  value={stats.strength}  colour="bg-purple-400" tip="Built through gym sessions and hill runs" />
          <StatBar label="Recovery"  value={stats.recovery}  colour="bg-green-400" tip="Built through rest days and wellness check-ins" />
          <StatBar label="Nutrition" value={stats.nutrition} colour="bg-amber-400" tip="Built through logging fuel plan entries" />
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { label: 'Total runs',  value: stats.totalRuns },
            { label: 'Total km',    value: `${Math.round(stats.totalKm)}` },
            { label: 'Streak',      value: stats.streak },
            { label: 'Perfect wks', value: stats.perfectWeeks },
          ].map(s => (
            <div key={s.label} className="rounded-xl py-2.5 text-center"
              style={{ background: 'var(--color-surface-2)' }}>
              <p className="font-data text-base font-black" style={{ color: 'var(--color-text-primary)' }}>
                {s.value}
              </p>
              <p className="text-[8px] mt-0.5 leading-tight" style={{ color: 'var(--color-text-tertiary)' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default HeroCard
