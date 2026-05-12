'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useTodayRace } from '@/hooks/useTodayRace'
import { useCommunity } from '@/hooks/useCommunity'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useAllTrainingLogs } from '@/hooks/useAllTrainingLogs'
import { useProfile } from '@/hooks/useProfile'
import { useWellness } from '@/hooks/useWellness'
import { useMealPlan } from '@/hooks/useMealPlan'
import { useActiveCosmetics, activeKitColour } from '@/hooks/useActiveCosmetics'
import { RaceCard } from '@/components/race/RaceCard'
import { RaceResultReplay, type RaceTimelineRunner } from '@/components/race/RaceResultReplay'
import HeroCard from '@/components/rpg/HeroCard'
import { BuildClassCard } from '@/components/rpg/BuildClassCard'
import CharacterProfileModal from '@/components/CharacterProfileModal'
import { computeRPGStats, RUNNER_CLASSES } from '@/lib/rpg'
import type { BuildClass } from '@/lib/character'
import type { TrainingLog } from '@/types/database'

// /race surface — character home + virtual races + season leaderboard.
// PR B re-shuffle: moved RPG character + cosmetics from /you and moved
// virtual races + global leaderboard from /squad. The premise: every
// gamified surface that culminates in "compete" lives here.

const LEAGUE_CONFIG = {
  bronze:   { label: 'Bronze',   emoji: '🥉', colour: '#cd7f32' },
  silver:   { label: 'Silver',   emoji: '🥈', colour: '#c0c0c0' },
  gold:     { label: 'Gold',     emoji: '🥇', colour: '#ffd700' },
  platinum: { label: 'Platinum', emoji: '💎', colour: '#60a5fa' },
  elite:    { label: 'Elite',    emoji: '👑', colour: '#a855f7' },
}

export default function RaceClient() {
  const { data, loading: raceLoading } = useTodayRace()
  const { races, leaderboard, season, loading: communityLoading, refresh } = useCommunity()
  const { plan, weeks } = useActivePlan()
  const { logs: allPlanLogs } = useAllTrainingLogs()
  const { profile } = useProfile()
  const { recent: wellnessLogs } = useWellness()
  const { active: activeCosmetics } = useActiveCosmetics()

  const [charId, setCharId] = useState('m1')
  const [baseKitColour, setKitColour] = useState('var(--ns-cyan)')
  const [viewingCharacter, setViewingCharacter] = useState<{ userId: string; displayName: string; handle?: string } | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('nextsplit_rpg_char')
    if (saved) setCharId(saved)
    const savedKit = localStorage.getItem('nextsplit_kit_colour')
    if (savedKit) setKitColour(savedKit)
  }, [])

  const kitColour = activeKitColour(activeCosmetics) ?? baseKitColour
  const userId = (profile as { id?: string } | null)?.id ?? ''
  const profileTyped = profile as {
    display_name: string | null
    handle?: string | null
    runner_colour?: string | null
    season_xp?: number | null
    current_league?: string | null
  } | null

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

  const rpgStats = useMemo(() => {
    const suppStreak = (() => {
      try { return parseInt(localStorage.getItem('nextsplit_supp_streak') || '0') } catch { return 0 }
    })()
    return computeRPGStats(
      (allPlanLogs as TrainingLog[]).map(l => ({
        done: l.done, km: l.km ?? null, week_n: l.week_n,
        day_i: l.day_i, session_i: l.session_i, logged_at: l.logged_at,
        effort: l.effort ?? null,
      })),
      weeks.map(w => ({
        n: w.n, days: w.days.map(d => ({ sessions: d.sessions.map(s => ({ c: s.c, km: s.km })) })),
      })),
      wellnessLogs?.length ?? 0,
      Object.keys(mealsByDate ?? {}).length,
      suppStreak,
    )
  }, [allPlanLogs, weeks, wellnessLogs, mealsByDate])

  const displayName = profileTyped?.display_name ?? 'You'
  const charState: 'idle' | 'running' | 'celebrating' =
    rpgStats.streak === 0 ? 'idle' : rpgStats.streak < 7 ? 'running' : 'celebrating'
  const medal = plan?.status === 'completed' ? '🥇' : rpgStats.streak >= 30 ? '🥈' : rpgStats.streak >= 7 ? '🥉' : null

  const league = ((profileTyped?.current_league ?? 'bronze') as keyof typeof LEAGUE_CONFIG)
  const leagueCfg = LEAGUE_CONFIG[league] ?? LEAGUE_CONFIG.bronze
  const seasonXP = profileTyped?.season_xp ?? 0
  const nextLeagueAt = league === 'bronze' ? 500 : league === 'silver' ? 1500 : league === 'gold' ? 3000 : league === 'platinum' ? 6000 : Infinity
  const myRank = leaderboard.findIndex(l => l.user_id === userId) + 1
  const daysLeft = season ? Math.max(0, Math.ceil((new Date(season.ends_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24))) : null

  const enterRace = async (id: string) => {
    await fetch('/api/community/races', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ race_id: id, action: 'enter' }),
    })
    refresh()
  }

  const fmtTime = (secs: number) => {
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60
    return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-lg mx-auto px-4 pt-12 pb-3 flex items-center justify-between"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}>
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>Race</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            Your runner, today&apos;s race, the season leaderboard.
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4">

        {/* Character showcase — moved from /you, wrapped in glow ring
            tinted by active kit colour for the gamified "this is YOUR
            runner" feel. */}
        <div className="rounded-3xl p-[2px]"
          style={{
            background: `linear-gradient(135deg, ${kitColour}aa, ${kitColour}33)`,
            boxShadow: `0 0 0 1px ${kitColour}25, 0 8px 32px ${kitColour}30`,
          }}>
          <HeroCard
            charId={charId}
            stats={rpgStats}
            displayName={displayName}
            kitColour={kitColour}
            runnerColour={profileTyped?.runner_colour ?? '#06b6d4'}
            charState={charState}
            medal={medal}
            onEditChar={() => { /* deep-link via /you/inventory cosmetics flow */ }}
            onCustomise={() => { /* deep-link via /you/inventory cosmetics flow */ }}
          />
        </div>

        {/* Build class picker / stat card */}
        <BuildClassCard />

        {/* Inventory teaser */}
        <Link href="/you/inventory"
          className="flex items-center justify-between rounded-2xl px-4 py-3 active:scale-[0.99] transition-transform"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>🎁</span>
            <div>
              <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>Cosmetics &amp; inventory</p>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Equip kits, auras, and unlocked drops</p>
            </div>
          </div>
          <span className="text-xl" style={{ color: 'var(--color-text-tertiary)' }} aria-hidden>→</span>
        </Link>

        {/* Today's daily 5K race — existing */}
        <RaceCard variant="full" />

        {/* Race replay — only when finalized */}
        {!raceLoading && data?.result && data.race && (
          <div className="rounded-2xl px-3 py-3"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-3 px-1"
              style={{ color: 'var(--color-text-tertiary)' }}>🎬 Replay</p>
            <RaceResultReplay
              runners={mergeForReplay(data.result.finishing_order, data.result.result_timeline)}
              distanceM={data.race.distance_m}
              selfUserId={data.me_user_id ?? undefined}
              runnerCosmetics={data.runner_cosmetics ?? {}}
            />
          </div>
        )}

        {/* Season + league chip */}
        <div className="rounded-2xl p-4"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: 'var(--color-text-tertiary)' }}>
                {season?.name ?? 'Season'}
              </p>
              {daysLeft !== null && (
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{daysLeft}d remaining</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: `${leagueCfg.colour}20`, color: leagueCfg.colour, border: `1.5px solid ${leagueCfg.colour}55` }}>
                {leagueCfg.emoji} {leagueCfg.label}
              </span>
              {myRank > 0 && (
                <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>#{myRank}</span>
              )}
            </div>
          </div>
          <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
            <span>{seasonXP} season XP</span>
            <span>{nextLeagueAt === Infinity ? 'Top league' : `Next league at ${nextLeagueAt} XP`}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (seasonXP / (nextLeagueAt === Infinity ? 1 : nextLeagueAt)) * 100)}%`,
                background: leagueCfg.colour,
              }} />
          </div>
        </div>

        {/* Virtual races */}
        <section>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1"
            style={{ color: 'var(--color-text-tertiary)' }}>🏁 Virtual races</p>
          <div className="space-y-2">
            {races.length === 0 && !communityLoading && (
              <div className="rounded-2xl p-6 text-center"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  No upcoming races. Check back soon.
                </p>
              </div>
            )}
            {races.map(r => {
              const isActive = new Date(r.starts_at) <= new Date()
              const racedaysLeft = Math.max(0, Math.ceil((new Date(r.ends_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24)))
              const isFull = r.max_entries ? r.entry_count >= r.max_entries : false
              return (
                <div key={r.id} className="rounded-2xl p-4 space-y-3"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{r.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                        {r.distance_km}km · {racedaysLeft}d left
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>
                        {r.entry_fee_gbp > 0 ? `£${r.entry_fee_gbp}` : 'Free'}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{r.entry_count} entered</p>
                    </div>
                  </div>
                  {r.description && (
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{r.description}</p>
                  )}
                  {r.my_entry ? (
                    r.my_entry.finish_time_secs ? (
                      <div className="rounded-xl p-3 text-center"
                        style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.30)' }}>
                        <p className="text-sm font-black font-data" style={{ color: '#10b981' }}>
                          {fmtTime(r.my_entry.finish_time_secs)}
                        </p>
                        <p className="text-xs" style={{ color: '#10b981' }}>
                          {r.my_entry.position === 1 ? '🥇 1st place' :
                           r.my_entry.position === 2 ? '🥈 2nd place' :
                           r.my_entry.position === 3 ? '🥉 3rd place' :
                           r.my_entry.position ? `#${r.my_entry.position} place` : 'Time submitted'}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl p-3 text-center"
                        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                        <p className="text-xs font-bold" style={{ color: 'var(--ns-ember)' }}>
                          ✓ Entered — submit your time when done
                        </p>
                      </div>
                    )
                  ) : (
                    <button onClick={() => !isFull && isActive && enterRace(r.id)}
                      disabled={isFull || !isActive}
                      className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 active:scale-95"
                      style={{ background: 'var(--ns-ember)' }}>
                      {isFull ? 'Race full' : !isActive ? 'Opens soon' : 'Enter race →'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Global season leaderboard */}
        <section>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1"
            style={{ color: 'var(--color-text-tertiary)' }}>🏆 Global season leaderboard</p>
          <div className="space-y-2">
            {leaderboard.length === 0 && !communityLoading && (
              <div className="rounded-2xl p-6 text-center"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  No runners yet this season. Be the first!
                </p>
              </div>
            )}
            {leaderboard.map((entry, i) => {
              const isMe = entry.user_id === userId
              const entryLeagueCfg = LEAGUE_CONFIG[(entry.current_league as keyof typeof LEAGUE_CONFIG) ?? 'bronze']
              const name = entry.display_name ?? (entry.handle ? `@${entry.handle}` : 'Runner')
              const medalEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
              const cls = entry.runner_class
                ? (RUNNER_CLASSES as Record<string, typeof RUNNER_CLASSES[keyof typeof RUNNER_CLASSES]>)[entry.runner_class]
                : null
              return (
                <button key={entry.user_id}
                  onClick={() => !isMe && setViewingCharacter({
                    userId: entry.user_id, displayName: name, handle: entry.handle ?? undefined,
                  })}
                  className={`w-full flex items-center gap-3 rounded-2xl p-3 text-left transition-all active:scale-[0.98] ${
                    isMe ? 'border-2 border-[var(--ns-ember)]' : 'border border-[var(--color-border)]'
                  }`}
                  style={{ background: isMe ? 'rgba(255,109,46,0.08)' : 'var(--color-surface)' }}>
                  <div className="w-7 text-center shrink-0">
                    {medalEmoji
                      ? <span className="text-lg">{medalEmoji}</span>
                      : <span className="text-xs font-bold" style={{ color: 'var(--color-text-tertiary)' }}>#{i + 1}</span>}
                  </div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0"
                    style={{ background: 'var(--color-surface-2)' }}>
                    {cls ? cls.emoji : '🏃'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate"
                      style={{ color: isMe ? 'var(--ns-ember)' : 'var(--color-text-primary)' }}>
                      {name}{isMe && ' (you)'}
                      {entry.is_split_leader && <span title="Split Leader" className="ml-1 inline-block leading-none">👑</span>}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                        {entryLeagueCfg.emoji} {entryLeagueCfg.label}
                      </span>
                      {cls && (
                        <>
                          <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>·</span>
                          <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{cls.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-black shrink-0"
                    style={{ color: isMe ? 'var(--ns-ember)' : 'var(--color-text-secondary)' }}>
                    {entry.season_xp} XP
                  </p>
                </button>
              )
            })}
          </div>
        </section>
      </div>

      {viewingCharacter && (
        <CharacterProfileModal
          userId={viewingCharacter.userId}
          displayName={viewingCharacter.displayName}
          handle={viewingCharacter.handle}
          onClose={() => setViewingCharacter(null)}
        />
      )}
    </div>
  )
}

function mergeForReplay(
  finishingOrder: Array<{ user_id: string; build_class: string; finish_secs: number; rank: number }>,
  timeline:       Array<{ user_id: string; splits: number[] }>,
): RaceTimelineRunner[] {
  const splitsByUser = new Map(timeline.map(t => [t.user_id, t.splits]))
  return finishingOrder.map(f => ({
    user_id:     f.user_id,
    build_class: f.build_class as BuildClass,
    finish_secs: f.finish_secs,
    rank:        f.rank,
    splits:      splitsByUser.get(f.user_id) ?? Array(11).fill(0),
  }))
}
