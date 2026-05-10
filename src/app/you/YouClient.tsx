'use client'

// Character-focused /you tab — P2.2 (council /council 2026-05-07).
// The pre-existing ProfileClient is the kitchen sink (814 lines covering
// RPG hero, Strava integration, PWA install, athlete profile, data export,
// sign-out). It still serves /profile as the legacy combined view; the new
// /you renders only the gamified subset, and Account-style content lives
// at /settings (already 959 lines, full settings UI).
//
// What renders here:
//   - HeroCard (RPG character + level + XP + kit colour)
//   - WeeklyXPChart (last 6 weeks)
//   - BadgeGrid (unlocked + locked badges)
//   - NextRewardCard (carrot for next badge)
//   - Settings link (CTA to /settings for everything else)
//
// What doesn't render here:
//   - Strava integration → /settings
//   - PWA install card → /settings
//   - Athlete profile fields → /settings
//   - Data export, sign out → /settings
//   - Subscription / billing → /settings

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useTrainingLog } from '@/hooks/useTrainingLog'
import { useAllTrainingLogs } from '@/hooks/useAllTrainingLogs'
import { useProfile } from '@/hooks/useProfile'
import { useWellness } from '@/hooks/useWellness'
import { useMealPlan } from '@/hooks/useMealPlan'
import { computeRPGStats, RPG_BADGES } from '@/lib/rpg'
// RPG_BADGES is the canonical badge catalogue; each entry's `check(stats)`
// predicate decides unlock. RPGStats itself doesn't carry a badges field
// (intentional — badges are derived, not stored).
import HeroCard from '@/components/rpg/HeroCard'
import { BuildClassCard } from '@/components/rpg/BuildClassCard'
import { useActiveCosmetics, activeKitColour } from '@/hooks/useActiveCosmetics'
import { EliteTriggerBanner } from '@/components/EliteTriggerBanner'
import WeeklyXPChart from '@/components/rpg/WeeklyXPChart'
import XPFeed from '@/components/rpg/XPFeed'
import BadgeGrid from '@/components/rpg/BadgeGrid'
import NextRewardCard from '@/components/rpg/NextRewardCard'
import LevelUpScreen from '@/components/rpg/LevelUpScreen'
import type { TrainingLog } from '@/types/database'

interface Props {
  email:        string
  displayName:  string
}

export default function YouClient({ displayName: initialDisplayName }: Props) {
  const { plan, weeks } = useActivePlan()
  const { logs }                         = useTrainingLog(plan?.id ?? null)
  const { logs: allPlanLogs, loading: allLogsLoading } = useAllTrainingLogs()
  const { profile }                      = useProfile()
  const { recent: wellnessLogs }         = useWellness()

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

  const [charId, setCharId]                 = useState('m1')
  const [baseKitColour, setKitColour]       = useState('var(--ns-cyan)')
  const { active: activeCosmetics }         = useActiveCosmetics()
  // Active kit_colour cosmetic overrides the localStorage default — drives
  // the runner's SVG accent inside HeroCard. Falls through to baseKitColour
  // when no cosmetic is active.
  const kitColour = activeKitColour(activeCosmetics) ?? baseKitColour
  const [levelUpShow, setLevelUpShow]       = useState(false)
  const [levelUpLevel, setLevelUpLevel]     = useState(0)
  const [prevLevel, setPrevLevel]           = useState<number | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('nextsplit_rpg_char')
    if (saved) setCharId(saved)
    const savedKit = localStorage.getItem('nextsplit_kit_colour')
    if (savedKit) setKitColour(savedKit)
  }, [])

  // Cross-plan logs power XP (RPG persists across plan resets); plan-scoped
  // logs power streak. useAllTrainingLogs returns an array; XPFeed wants a
  // keyed Record (it does its own Object.values internally), so build that
  // shape once for it.
  const allPlanLogsArr = useMemo(
    () => (Array.isArray(allPlanLogs) ? allPlanLogs : Object.values(allPlanLogs ?? {})) as TrainingLog[],
    [allPlanLogs],
  )
  const allPlanLogsRecord = useMemo(() => {
    const rec: Record<string, TrainingLog> = {}
    for (const l of allPlanLogsArr) {
      rec[`${l.week_n}_${l.day_i}_${l.session_i}`] = l
    }
    return rec
  }, [allPlanLogsArr])
  const wellnessCount  = wellnessLogs?.length ?? 0
  const mealDays       = Object.keys(mealsByDate ?? {}).length

  const rpgStats = useMemo(() => {
    const suppStreak = (() => {
      try { return parseInt(localStorage.getItem('nextsplit_supp_streak') || '0') } catch { return 0 }
    })()
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPlanLogsArr, weeks, wellnessLogs, mealsByDate])

  // Level-up detection
  useEffect(() => {
    const currentLevel = rpgStats.level.level
    if (prevLevel !== null && currentLevel > prevLevel) {
      setLevelUpLevel(currentLevel)
      setLevelUpShow(true)
    }
    setPrevLevel(currentLevel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rpgStats.level.level])

  const heroDisplayName = profile?.display_name ?? initialDisplayName
  const planComplete    = plan?.status === 'completed'
  const medal           = planComplete ? '🥇' : rpgStats.streak >= 30 ? '🥈' : rpgStats.streak >= 7 ? '🥉' : null
  const charState       = rpgStats.streak === 0 ? 'idle' : rpgStats.streak < 7 ? 'running' : 'celebrating'
  const unlockedIds     = useMemo(
    () => new Set(RPG_BADGES.filter(b => b.check(rpgStats)).map(b => b.id)),
    [rpgStats],
  )

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>

      {/* Header */}
      <div className="sticky top-0 z-40 border-b"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-lg mx-auto px-4 pt-12 pb-3 flex items-center justify-between">
          <h1 className="text-base font-black" style={{ color: 'var(--color-text-primary)' }}>You</h1>
          <Link href="/settings"
            className="text-xs font-bold px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
            ⚙ Settings
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto pt-4 px-4 space-y-4">

        {/* Hero RPG Card */}
        {allLogsLoading ? (
          <div className="rounded-3xl overflow-hidden animate-pulse"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', height: 280 }} />
        ) : (
          <HeroCard
            charId={charId}
            stats={rpgStats}
            displayName={heroDisplayName}
            kitColour={kitColour}
            runnerColour={(profile as { runner_colour?: string })?.runner_colour ?? '#06b6d4'}
            charState={charState}
            medal={medal}
            onEditChar={() => { /* deferred — tap settings to change */ }}
            onCustomise={() => { /* deferred — tap settings to customise */ }}
          />
        )}

        {/* P4.3 — plan-completion Elite trigger. Inert today; lights up
            when paywall enforced. Trigger: user's current plan has
            status='completed' (most recent plan in useActivePlan returns
            it briefly until they archive + start a new one). */}
        <EliteTriggerBanner kind="plan_complete" show={planComplete} />

        {/* Build class picker / stat card (Phase 3+ Race tab foundation) */}
        <BuildClassCard />

        {/* Inventory link — Phase 3+ boost + cosmetic surface */}
        <Link
          href="/you/inventory"
          className="flex items-center justify-between rounded-2xl px-4 py-3"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>🎁</span>
            <div>
              <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>
                Inventory
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                Boosts, kits, and unlocked drops
              </p>
            </div>
          </div>
          <span className="text-xl" style={{ color: 'var(--color-text-tertiary)' }} aria-hidden>→</span>
        </Link>

        {/* Weekly XP chart */}
        <WeeklyXPChart logs={logs} weeks={weeks} />

        {/* XP feed (recent earnings) — XPFeed wants Record<string, TrainingLog>;
            we build it from the array above keyed on week_n/day_i/session_i. */}
        <XPFeed logs={allPlanLogsRecord} weeks={weeks} />

        {/* Next reward — the carrot */}
        <NextRewardCard stats={rpgStats} unlockedIds={unlockedIds} />

        {/* Badges */}
        <BadgeGrid unlockedIds={unlockedIds} stats={rpgStats} />

        {/* Settings CTA — bigger surface than the header link */}
        <Link href="/settings"
          className="flex items-center justify-between rounded-2xl px-4 py-4 mt-2"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div>
            <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>Account &amp; settings</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
              Strava, notifications, data export, sign out
            </p>
          </div>
          <span className="text-lg" style={{ color: 'var(--color-text-tertiary)' }}>›</span>
        </Link>
      </div>

      {levelUpShow && (
        <LevelUpScreen
          level={levelUpLevel}
          charId={charId}
          onDismiss={() => setLevelUpShow(false)}
        />
      )}
    </div>
  )
}
