'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useTrainingLog } from '@/hooks/useTrainingLog'
import { useAllTrainingLogs } from '@/hooks/useAllTrainingLogs'
import { useProfile } from '@/hooks/useProfile'
import { useWellness } from '@/hooks/useWellness'
import { useMealPlan } from '@/hooks/useMealPlan'
import { signout } from '@/app/auth/actions'
import { computePersonalBests } from '@/lib/personalBests'
import { computeStreak, computeConsistency } from '@/lib/streak'
import {
  RPG_CHARS, RPG_BADGES, RPG_LEVELS, RARITY_CONFIG, SESSION_XP,
  computeRPGStats, getLevelForXP, getXPProgress, getXPToNext,
  checkNewBadges, renderCharSVG,
  type RPGStats, type RPGBadge,
} from '@/lib/rpg'
import type { TrainingLog } from '@/types/database'

const RACE_DISTANCES = [
  { label: '5K', km: 5 },
  { label: '10K', km: 10 },
  { label: 'Half', km: 21.0975 },
  { label: 'Marathon', km: 42.195 },
]

// ─── Level Up Screen ──────────────────────────────────────────────────────────

function LevelUpScreen({
  level, charId, onDismiss
}: {
  level: number
  charId: string
  onDismiss: () => void
}) {
  const rpgLevel = RPG_LEVELS.find(l => l.level === level)
  const ch = RPG_CHARS.find(c => c.id === charId) ?? RPG_CHARS[0]

  // What unlocked at this level
  const unlocks: string[] = []
  if (level === 3)  unlocks.push('GPS watch equipped')
  if (level === 6)  unlocks.push('Sunglasses unlocked')
  if (level === 7)  unlocks.push('Full running stride')
  if (level === 9)  unlocks.push('Race bib unlocked')
  if (level === 4)  unlocks.push('Light stride animation')

  useEffect(() => {
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onDismiss}
    >
      <div className="text-center px-8" onClick={e => e.stopPropagation()}>
        {/* Burst animation */}
        <div className="relative mb-4">
          <div className="text-6xl animate-bounce">⚡</div>
        </div>

        <div className="text-white text-xs font-bold uppercase tracking-widest mb-2 text-yellow-300">
          Level up!
        </div>
        <div className="text-white text-5xl font-black mb-1">Lv.{level}</div>
        <div className="text-teal-300 text-lg font-bold mb-6">{rpgLevel?.name}</div>

        {/* Character at new level */}
        <div className="flex justify-center mb-4">
          <div dangerouslySetInnerHTML={{ __html: renderCharSVG(charId, level, 120, 150) }} />
        </div>

        {/* Unlocks */}
        {unlocks.length > 0 && (
          <div className="mb-6 space-y-1">
            {unlocks.map(u => (
              <div key={u} className="text-yellow-300 text-sm font-semibold">
                ✦ {u}
              </div>
            ))}
          </div>
        )}

        <button onClick={onDismiss}
          className="px-8 py-3 rounded-2xl bg-[#0D9488] text-white text-sm font-black">
          Let&apos;s go →
        </button>
        <div className="text-gray-500 text-[10px] mt-3">tap anywhere to dismiss</div>
      </div>
    </div>
  )
}

// ─── Character Select Modal ───────────────────────────────────────────────────

function CharSelectModal({
  currentCharId, currentLevel, onSelect, onClose
}: {
  currentCharId: string
  currentLevel: number
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState(currentCharId)
  const [previewLevel, setPreviewLevel] = useState(currentLevel)

  const PREVIEW_LEVELS = [1, 4, 7, 10, 14]

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
          <h2 className="text-lg font-black text-gray-900 mb-1">Choose your runner</h2>
          <p className="text-xs text-gray-400 mb-4">Your character evolves as you level up</p>

          {/* Level evolution preview */}
          <div className="bg-gray-50 rounded-2xl p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Level preview</span>
              <div className="flex gap-1">
                {PREVIEW_LEVELS.map(l => (
                  <button key={l} onClick={() => setPreviewLevel(l)}
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full transition-all ${previewLevel === l ? 'bg-[#0D9488] text-white' : 'bg-white text-gray-400 border border-gray-200'}`}>
                    L{l}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-center">
              <div dangerouslySetInnerHTML={{ __html: renderCharSVG(selected, previewLevel, 80, 100) }} />
            </div>
            <div className="text-center text-[10px] text-gray-400 mt-1">
              {previewLevel >= 9 ? '🎽 Race bib' : previewLevel >= 6 ? '🕶️ Sunglasses' : previewLevel >= 3 ? '⌚ GPS watch' : 'Base kit'}
              {previewLevel >= 7 ? ' · Full stride' : previewLevel >= 4 ? ' · Light stride' : ''}
            </div>
          </div>

          {/* Character grid */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {RPG_CHARS.map(ch => {
              const isSel = selected === ch.id
              return (
                <button key={ch.id}
                  onClick={() => setSelected(ch.id)}
                  className={`rounded-2xl border-2 p-3 text-center transition-all ${isSel ? 'border-[#0D9488] bg-teal-50 shadow-md' : 'border-gray-100 bg-white'}`}
                >
                  <div dangerouslySetInnerHTML={{ __html: renderCharSVG(ch.id, previewLevel, 60, 76) }} />
                  <div className={`text-xs font-bold mt-1 ${isSel ? 'text-[#0D9488]' : 'text-gray-700'}`}>{ch.label}</div>
                  <div className="text-[9px] text-gray-400 mt-0.5">{ch.specialty}</div>
                </button>
              )
            })}
          </div>

          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">
              Cancel
            </button>
            <button onClick={() => { onSelect(selected); onClose() }}
              className="flex-1 py-3 rounded-xl bg-[#0D9488] text-white text-sm font-bold">
              Select character
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Badge Unlock Toast ───────────────────────────────────────────────────────

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
          <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Badge unlocked!</div>
          <div className="text-sm font-black text-gray-900">{badge.name}</div>
          <div className="text-[10px] text-gray-500">{badge.desc}</div>
        </div>
        <div className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${rarity.colour}`}>
          {rarity.label}
        </div>
      </div>
    </div>
  )
}

// ─── Next Reward Card ──────────────────────────────────────────────────────────

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
              <p className="text-[10px] text-gray-500">{nearestBadge.badge.desc}</p>
              <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
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

// ─── Weekly XP Chart ──────────────────────────────────────────────────────────

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
        <span className="text-sm font-bold text-gray-900">⚡ This week&apos;s XP</span>
        <div className="text-right">
          <span className="text-sm font-black text-teal-600">+{totalWeekXP}</span>
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
                    bar.isToday ? 'bg-[#0D9488]' :
                    bar.xp > 0 ? 'bg-teal-200' : 'bg-gray-100'
                  }`}
                  style={{ height: bar.xp > 0 ? `${Math.max(heightPct, 15)}%` : '6px' }}
                />
              </div>
              <span className={`text-[9px] font-bold ${bar.isToday ? 'text-[#0D9488]' : 'text-gray-400'}`}>
                {bar.dayLabel}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Stat Bar (enhanced with tooltip) ─────────────────────────────────────────

function StatBar({ label, value, colour, tip }: {
  label: string; value: number; colour: string; tip: string
}) {
  const [showTip, setShowTip] = useState(false)
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setShowTip(s => !s)}
        className="text-[10px] text-gray-400 w-16 flex-shrink-0 text-left hover:text-gray-600 transition-colors"
      >
        {label} <span className="text-[8px] text-gray-300">ⓘ</span>
      </button>
      <div className="flex-1 h-2 bg-gray-100/50 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${colour}`}
          style={{ width: `${value}%` }} />
      </div>
      <span className={`text-[10px] font-black w-6 text-right ${colour.replace('bg-', 'text-')}`}>{value}</span>
      {showTip && (
        <div className="absolute mt-6 ml-16 z-10 bg-gray-900 text-white text-[10px] rounded-lg px-2.5 py-1.5 max-w-[180px] shadow-lg">
          {tip}
        </div>
      )}
    </div>
  )
}

// ─── Badge Grid ───────────────────────────────────────────────────────────────

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

// ─── Hero Card (character + XP + level) ──────────────────────────────────────

function HeroCard({
  charId, stats, displayName, onEditChar
}: {
  charId: string
  stats: RPGStats
  displayName: string
  onEditChar: () => void
}) {
  const progress = getXPProgress(stats.xp)
  const toNext = getXPToNext(stats.xp)
  const ch = RPG_CHARS.find(c => c.id === charId) ?? RPG_CHARS[0]

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f3460 100%)' }}>
      <div className="p-5">
        <div className="flex items-start gap-4 mb-4">
          {/* Character avatar */}
          <div className="relative flex-shrink-0">
            <button onClick={onEditChar}
              className="block" title="Change character">
              <div dangerouslySetInnerHTML={{ __html: renderCharSVG(charId, stats.level.level, 88, 108) }} />
            </button>
            {/* Level badge */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#0D9488] text-white text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg">
              Lv.{stats.level.level}
            </div>
            {/* Edit hint */}
            <button onClick={onEditChar}
              className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full border border-gray-200 flex items-center justify-center text-[10px] text-gray-500 shadow">
              ✎
            </button>
          </div>

          {/* Name + level + XP */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="text-white font-black text-lg leading-tight">{displayName}</div>
            <div className="text-teal-300 text-xs font-semibold mt-0.5">{stats.level.name}</div>
            <div className="text-gray-400 text-[10px] mt-0.5">{ch.specialty}</div>

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
                    background: 'linear-gradient(90deg, #0D9488, #818cf8)'
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

        {/* Quick stats strip */}
        <div className="grid grid-cols-4 gap-2">
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
      </div>
    </div>
  )
}

// ─── XP Feed (recent gains) ───────────────────────────────────────────────────

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
            <div className="text-sm font-black text-teal-600">+{r.xp} XP</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Training Summary ──────────────────────────────────────────────────────────

function TrainingSummary({ logs }: { logs: Record<string, TrainingLog> }) {
  const all = Object.values(logs)
  const done = all.filter(l => l.done)
  const km = done.reduce((a, l) => a + (l.km ?? 0), 0)
  const runs = done.filter(l => l.done).length

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <p className="text-sm font-bold text-gray-900 mb-3">Training summary</p>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-2xl font-black text-gray-900">{Math.round(km)}</div>
          <div className="text-[10px] text-gray-400">km logged</div>
        </div>
        <div>
          <div className="text-2xl font-black text-gray-900">{runs}</div>
          <div className="text-[10px] text-gray-400">sessions done</div>
        </div>
        <div>
          <div className="text-2xl font-black text-gray-900">
            {done.length > 0 ? Math.round(done.reduce((a, l) => a + (l.effort ?? 7), 0) / done.length * 10) / 10 : '—'}
          </div>
          <div className="text-[10px] text-gray-400">avg RPE</div>
        </div>
      </div>
    </div>
  )
}

// ─── Strava Section ───────────────────────────────────────────────────────────

function StravaSection({ isConnected, clientId }: { clientId: string | null; isConnected: boolean }) {
  const STRAVA_CLIENT_ID = clientId ?? process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID
  const redirectUri = typeof window !== 'undefined' ? window.location.origin + '/api/strava/callback' : ''

  function connectStrava() {
    if (!STRAVA_CLIENT_ID) return
    const url = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=activity:read_all`
    window.location.href = url
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-900">Strava</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {isConnected ? 'Connected — sync from Today tab' : 'Connect to auto-import activities'}
          </p>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
          {isConnected ? '✓ Connected' : 'Not connected'}
        </span>
      </div>
      {!isConnected && STRAVA_CLIENT_ID && (
        <button onClick={connectStrava}
          className="mt-3 w-full py-2 rounded-xl border border-orange-200 text-orange-600 text-xs font-bold">
          Connect Strava →
        </button>
      )}
    </div>
  )
}

// ─── Athlete Profile Section ───────────────────────────────────────────────────

function AthleteProfileSection() {
  const supabase = useSupabase()
  const { profile, refresh } = useProfile()
  const [saving, setSaving] = useState(false)
  const [weightKg, setWeightKg] = useState('')
  const [injuryNotes, setInjuryNotes] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (profile && !loaded) {
      setWeightKg(profile.weight_kg?.toString() ?? '')
      setInjuryNotes(profile.injury_notes ?? '')
      setLoaded(true)
    }
  }, [profile, loaded])

  async function save() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await (supabase as any).from('profiles').upsert({
        id: user.id,
        weight_kg: weightKg ? Number(weightKg) : null,
        injury_notes: injuryNotes || null,
      })
      refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <p className="text-sm font-bold text-gray-900 mb-3">Athlete profile</p>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-semibold text-gray-500 block mb-1">Weight (kg)</label>
          <input type="number" value={weightKg}
            onChange={e => setWeightKg(e.target.value)}
            placeholder="e.g. 75"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 block mb-1">Injury notes</label>
          <textarea value={injuryNotes}
            onChange={e => setInjuryNotes(e.target.value)}
            rows={2} placeholder="Any current niggles or injury history..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-[#0D9488]" />
        </div>
        <button onClick={save} disabled={saving}
          className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold disabled:opacity-50">
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </div>
  )
}

// ─── Main ProfileClient ───────────────────────────────────────────────────────

export default function ProfileClient({
  email,
  displayName: initialDisplayName,
  isStravaConnected,
  stravaStatus,
}: {
  email: string
  displayName: string
  isStravaConnected: boolean
  stravaStatus?: string
}) {
  const router = useRouter()
  const supabase = useSupabase()
  const { plan, weeks } = useActivePlan()
  const { logs } = useTrainingLog(plan?.id ?? null)          // plan-scoped: for PBs, streak, training summary
  const { logs: allPlanLogs } = useAllTrainingLogs()         // cross-plan: for RPG XP (persists across plan switches)
  const { profile } = useProfile()
  const { recent: wellnessLogs } = useWellness()

  // Meal plan — current week for mealDays count
  const mealWeekStart = useMemo(() => {
    if (!plan) return new Date().toISOString().slice(0, 10)
    const s = new Date(plan.start_date + 'T00:00:00')
    s.setDate(s.getDate() + (plan.current_week - 1) * 7)
    return s.toISOString().slice(0, 10)
  }, [plan])
  const mealWeekEnd = useMemo(() => {
    const e = new Date(mealWeekStart + 'T00:00:00')
    e.setDate(e.getDate() + 6)
    return e.toISOString().slice(0, 10)
  }, [mealWeekStart])
  const { byDate: mealsByDate } = useMealPlan(mealWeekStart, mealWeekEnd)

  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(initialDisplayName)
  const [savingName, setSavingName] = useState(false)
  const [stravaClientId, setStravaClientId] = useState<string | null>(null)
  const [levelUpShow, setLevelUpShow] = useState(false)
  const [levelUpLevel, setLevelUpLevel] = useState(0)
  const [prevLevel, setPrevLevel] = useState<number | null>(null)

  // RPG state — persisted in localStorage, charId optionally in Supabase
  const [charId, setCharId] = useState('m1')
  const [showCharSelect, setShowCharSelect] = useState(false)
  const [badgeToast, setBadgeToast] = useState<RPGBadge | null>(null)
  const [seenBadgeIds, setSeenBadgeIds] = useState<string[]>([])

  useEffect(() => {
    setStravaClientId(localStorage.getItem('strava_client_id'))
    // Load RPG char selection from localStorage
    const saved = localStorage.getItem('nextsplit_rpg_char')
    if (saved) setCharId(saved)
    const seen = localStorage.getItem('nextsplit_rpg_seen_badges')
    if (seen) setSeenBadgeIds(JSON.parse(seen))
  }, [])

  function handleCharSelect(id: string) {
    setCharId(id)
    localStorage.setItem('nextsplit_rpg_char', id)
  }

  async function saveDisplayName() {
    if (!nameInput.trim()) return
    setSavingName(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await (supabase as any).from('profiles').upsert({ id: user.id, display_name: nameInput.trim() })
        setDisplayName(nameInput.trim())
        router.refresh()
      }
    } finally {
      setSavingName(false)
      setEditingName(false)
    }
  }

  // Compute RPG stats from Supabase logs
  // allLogs = current plan only (for PBs, streak, training summary)
  const allLogs = useMemo(() => Object.values(logs), [logs])
  // allPlanLogsArr = all plans ever (for cross-plan RPG XP)
  const allPlanLogsArr = useMemo(() => allPlanLogs, [allPlanLogs])

  const rpgStats: RPGStats = useMemo(() => {
    // Real wellness count from Supabase (last 90 days)
    const wellnessCount = wellnessLogs.length

    // Real meal days — distinct dates with at least one meal assigned this week
    const mealDays = Object.keys(mealsByDate).filter(d => (mealsByDate[d] ?? []).length > 0).length

    // Supplement streak from localStorage (written by supplement tracker in Fuel tab)
    const suppStreak = parseInt(localStorage.getItem('nextsplit_supp_streak') || '0')

    return computeRPGStats(
      allPlanLogsArr.map(l => ({
        done: l.done,
        km: l.km ?? null,
        week_n: l.week_n,
        day_i: l.day_i,
        session_i: l.session_i,
        logged_at: l.logged_at,
        effort: l.effort ?? null,
      })),
      weeks.map(w => ({
        n: w.n,
        days: w.days.map(d => ({
          sessions: d.sessions.map(s => ({ c: s.c, km: s.km })),
        })),
      })),
      wellnessCount,
      mealDays,
      suppStreak,
    )
  }, [allPlanLogsArr, weeks, wellnessLogs, mealsByDate])

  // Level-up detection — fires when level increases
  useEffect(() => {
    const currentLevel = rpgStats.level.level
    if (prevLevel !== null && currentLevel > prevLevel) {
      setLevelUpLevel(currentLevel)
      setLevelUpShow(true)
    }
    setPrevLevel(currentLevel)
  }, [rpgStats.level.level]) // eslint-disable-line react-hooks/exhaustive-deps

  // Badge unlocking
  const unlockedIds = useMemo(() => {
    return new Set(RPG_BADGES.filter(b => b.check(rpgStats)).map(b => b.id))
  }, [rpgStats])

  // Check for newly unlocked badges and show toast
  useEffect(() => {
    const newBadges = checkNewBadges(rpgStats, seenBadgeIds)
    if (newBadges.length > 0) {
      setBadgeToast(newBadges[0])
      const updated = [...seenBadgeIds, ...newBadges.map(b => b.id)]
      setSeenBadgeIds(updated)
      localStorage.setItem('nextsplit_rpg_seen_badges', JSON.stringify(updated))
    }
  }, [rpgStats, seenBadgeIds])

  // Personal bests
  const personalBests = useMemo(() => computePersonalBests(allLogs), [allLogs])

  // Streak + consistency
  const streak = useMemo(() => computeStreak(allLogs), [allLogs])
  const consistency = useMemo(() => plan
    ? computeConsistency(allLogs, weeks, plan.current_week)
    : { thisWeekPct: 0, last4WeekPct: 0 },
    [allLogs, weeks, plan]
  )

  // Data export
  function handleExport() {
    const exportData = {
      exported_at: new Date().toISOString(),
      plan: plan ? { name: plan.name, current_week: plan.current_week, total_weeks: plan.total_weeks } : null,
      personal_bests: personalBests,
      rpg: { level: rpgStats.level.level, xp: rpgStats.xp, character: charId },
      training_logs: allLogs.map(l => ({
        week: l.week_n, day: l.day_i, session: l.session_i,
        done: l.done, effort: l.effort, km: l.km, pace: l.pace,
        logged_at: l.logged_at,
      })),
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nextsplit-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const heroDisplayName = displayName || (RPG_CHARS.find(c => c.id === charId)?.label ?? 'Runner')

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input value={nameInput} onChange={e => setNameInput(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  autoFocus onKeyDown={e => { if (e.key === 'Enter') saveDisplayName() }} />
                <button onClick={saveDisplayName} disabled={savingName}
                  className="text-[11px] font-bold text-[#0D9488]">{savingName ? '…' : 'Save'}</button>
                <button onClick={() => setEditingName(false)}
                  className="text-[11px] text-gray-400">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gray-900">{displayName || 'Profile'}</h1>
                <button onClick={() => { setNameInput(displayName); setEditingName(true) }}
                  className="text-gray-300 text-sm">✎</button>
              </div>
            )}
            <p className="text-[11px] text-gray-400">{email}</p>
          </div>
          {plan && (
            <span className="text-[11px] bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">
              W{plan.current_week}/{plan.total_weeks}
            </span>
          )}
          <a href="/settings" aria-label="Settings"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </a>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* Hero RPG Card */}
        <HeroCard
          charId={charId}
          stats={rpgStats}
          displayName={heroDisplayName}
          onEditChar={() => setShowCharSelect(true)}
        />

        {/* Next Reward Card — immediately below hero for motivation */}
        <NextRewardCard stats={rpgStats} unlockedIds={unlockedIds} />

        {/* Weekly XP chart — replaces raw feed */}
        <WeeklyXPChart logs={logs} weeks={weeks} />

        {/* Streak + consistency */}
        {(streak.current > 0 || streak.totalDaysLogged > 0) && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-gray-50">
              <div className="px-4 py-4 text-center">
                <div className={`text-3xl font-black ${streak.current >= 7 ? 'text-amber-500' : streak.current >= 3 ? 'text-orange-500' : 'text-gray-700'}`}>
                  {streak.current > 0 ? `🔥 ${streak.current}` : '—'}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">day streak</div>
                {streak.longest > streak.current && (
                  <div className="text-[9px] text-gray-300 mt-0.5">best: {streak.longest}</div>
                )}
              </div>
              <div className="px-4 py-4 text-center">
                <div className={`text-3xl font-black ${consistency.last4WeekPct >= 80 ? 'text-emerald-600' : consistency.last4WeekPct >= 60 ? 'text-amber-500' : 'text-gray-500'}`}>
                  {consistency.last4WeekPct}%
                </div>
                <div className="text-[10px] text-gray-400 mt-1">4-week consistency</div>
                <div className="text-[9px] text-gray-300 mt-0.5">this week: {consistency.thisWeekPct}%</div>
              </div>
            </div>
          </div>
        )}

        {/* Badges — with proximity indicators */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-sm font-bold text-gray-900 mb-3">🏆 Badges</p>
          <BadgeGrid unlockedIds={unlockedIds} stats={rpgStats} />
        </div>

        {/* Personal bests */}
        {personalBests.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-sm font-bold text-gray-900 mb-3">Personal Bests</p>
            <div className="grid grid-cols-2 gap-2">
              {personalBests.map(pb => (
                <div key={pb.distanceKm} className="bg-gray-50 rounded-xl p-3">
                  <div className="text-[10px] text-gray-400">{RACE_DISTANCES.find(d => Math.abs(d.km - pb.distanceKm) < 0.1)?.label ?? `${pb.distanceKm}km`}</div>
                  <div className="text-sm font-black text-gray-900">{pb.timeStr}</div>
                  <div className="text-[9px] text-gray-400">{pb.pacePerKm}/km</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Training summary */}
        <TrainingSummary logs={logs} />

        {/* Strava */}
        <StravaSection clientId={stravaClientId} isConnected={isStravaConnected} />

        {/* Athlete profile */}
        <AthleteProfileSection />

        {/* Data export */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Export data</p>
              <p className="text-xs text-gray-400 mt-0.5">Download all logs as JSON</p>
            </div>
            <button onClick={handleExport}
              className="py-2 px-3 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold">
              ↓ Export
            </button>
          </div>
        </div>

        {/* Sign out */}
        <form action={signout} onSubmit={() => {
          localStorage.removeItem('nextsplit_wellness')
          localStorage.removeItem('nextsplit_rpg_char')
        }}>
          <button type="submit"
            className="w-full py-3 rounded-2xl border border-red-100 text-red-500 text-sm font-semibold bg-white">
            Sign out
          </button>
        </form>

      </div>

      {/* Character select modal */}
      {showCharSelect && (
        <CharSelectModal
          currentCharId={charId}
          currentLevel={rpgStats.level.level}
          onSelect={handleCharSelect}
          onClose={() => setShowCharSelect(false)}
        />
      )}

      {/* Level-up screen */}
      {levelUpShow && (
        <LevelUpScreen
          level={levelUpLevel}
          charId={charId}
          onDismiss={() => setLevelUpShow(false)}
        />
      )}

      {/* Badge unlock toast */}
      {badgeToast && (
        <BadgeToast badge={badgeToast} onDismiss={() => setBadgeToast(null)} />
      )}
    </div>
  )
}
