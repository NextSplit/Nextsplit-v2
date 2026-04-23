'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { config } from '@/lib/config'
import { Analytics } from '@/lib/analytics'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useTrainingLog } from '@/hooks/useTrainingLog'
import { useAllTrainingLogs } from '@/hooks/useAllTrainingLogs'
import { useProfile } from '@/hooks/useProfile'
import { useSubscription } from '@/hooks/useSubscription'
import { UpgradeModal } from '@/components/UpgradeModal'
import { useWellness } from '@/hooks/useWellness'
import { useMealPlan } from '@/hooks/useMealPlan'
import { signout } from '@/app/auth/actions'
import DarkModeToggle from '@/components/DarkModeToggle'
import { useToast } from '@/components/Toast'
import {
  RPG_CHARS, RPG_BADGES, computeRPGStats, getLevelForXP, getXPProgress,
  checkNewBadges, getRunnerClass, type RPGStats, type RPGBadge, type RunnerClassId,
} from '@/lib/rpg'
import { computePersonalBests } from '@/lib/personalBests'
import { computeStreak, computeConsistency } from '@/lib/streak'
import { useSupabase } from '@/hooks/useSupabase'
import type { TrainingLog, PlanWeek } from '@/types/database'
import LevelUpScreen from '@/components/rpg/LevelUpScreen'
import RunnerClassReveal from '@/components/rpg/RunnerClassReveal'
import RunnerClassCard from '@/components/rpg/RunnerClassCard'
import WeeklyVolumeChart from '@/components/charts/WeeklyVolumeChart'
import RaceDaySimulation from '@/components/charts/RaceDaySimulation'
import WeeklyCoachingSummary from '@/components/charts/WeeklyCoachingSummary'
import PBCard from '@/components/charts/PBCard'
import ACWRChart from '@/components/charts/ACWRChart'
import PaceTrend from '@/components/charts/PaceTrend'
import PaceCalculator from '@/components/charts/PaceCalculator'
import TrainingZones from '@/components/charts/TrainingZones'
import WellnessTrend from '@/components/charts/WellnessTrend'
import WeightTrend from '@/components/charts/WeightTrend'
import CharSelectModal from '@/components/rpg/CharSelectModal'
import BadgeToast from '@/components/rpg/BadgeToast'
import NextRewardCard from '@/components/rpg/NextRewardCard'
import WeeklyXPChart from '@/components/rpg/WeeklyXPChart'
import StatBar from '@/components/rpg/StatBar'
import BadgeGrid from '@/components/rpg/BadgeGrid'
import HeroCard from '@/components/rpg/HeroCard'
import XPFeed from '@/components/rpg/XPFeed'
import TrainingSummary from '@/components/rpg/TrainingSummary'
import PWAProfileCard from '@/components/rpg/PWAProfileCard'
import StravaSection from '@/components/rpg/StravaSection'
import ReferralCard from '@/components/ReferralCard'
import AthleteProfileSection from '@/components/rpg/AthleteProfileSection'
import { db } from '@/lib/supabase/db'
import { getWarmingUpPhase, WARMING_UP_COPY } from '@/lib/rpg'

const RACE_DISTANCES = [
  { label: '5K', km: 5 },
  { label: '10K', km: 10 },
  { label: 'Half', km: 21.0975 },
  { label: 'Marathon', km: 42.195 },
]

export default function ProfileClient({
  email,
  displayName: initialDisplayName,
  isStravaConnected,
  stravaStatus,
  stravaAthlete,
}: {
  email: string
  displayName: string
  isStravaConnected: boolean
  stravaStatus?: string
  stravaAthlete?: string
}) {
  const router = useRouter()
  const supabase = useSupabase()
  const { plan, weeks } = useActivePlan()
  const { logs } = useTrainingLog(plan?.id ?? null)          // plan-scoped: for PBs, streak, training summary
  const { logs: allPlanLogs, loading: allLogsLoading } = useAllTrainingLogs()         // cross-plan: for RPG XP (persists across plan switches)
  const { profile } = useProfile()
  const { recent: wellnessLogs } = useWellness()
  const { isPro, isFounding, foundingLeft, subscription } = useSubscription()
  const [showUpgrade, setShowUpgrade] = useState(false)

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
  const [stravaToast, setStravaToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [levelUpShow, setLevelUpShow] = useState(false)
  const [levelUpLevel, setLevelUpLevel] = useState(0)
  const [prevLevel, setPrevLevel] = useState<number | null>(null)

  // RPG state — persisted in localStorage, charId optionally in Supabase
  const [charId, setCharId] = useState('m1')
  const [showCharSelect, setShowCharSelect] = useState(false)
  const [profileTab, setProfileTab] = useState<'character' | 'stats' | 'records'>('character')
  const [badgeToast, setBadgeToast] = useState<RPGBadge | null>(null)
  const [seenBadgeIds, setSeenBadgeIds] = useState<string[]>([])
  const [kitColour, setKitColour] = useState('var(--ns-forest)')
  const [showCustomiser, setShowCustomiser] = useState(false)

  // Runner class state
  const [runnerClass, setRunnerClass] = useState<RunnerClassId | null>(null)
  const [classRevealReady, setClassRevealReady] = useState(false)
  const [showClassReveal, setShowClassReveal] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStravaClientId(config.stravaClientId || null)
    // Load RPG char selection from localStorage
    const saved = localStorage.getItem('nextsplit_rpg_char')
    if (saved) setCharId(saved)
    const seen = localStorage.getItem('nextsplit_rpg_seen_badges')
    if (seen) setSeenBadgeIds(JSON.parse(seen))
    const savedKit = localStorage.getItem('nextsplit_kit_colour')
    if (savedKit) setKitColour(savedKit)

    // Compute runner class on mount (fire-and-forget)
    fetch('/api/runner-class', { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        if (d.runnerClass) setRunnerClass(d.runnerClass as RunnerClassId)
        if (d.revealReady) setClassRevealReady(true)
      })
      .catch(() => {})

    // Show toast based on Strava OAuth redirect status
    if (stravaStatus === 'connected') {
      if (stravaAthlete) {
        try { localStorage.setItem('nextsplit_strava_athlete', stravaAthlete) } catch {}
      }
      setStravaToast({ type: 'success', msg: `✓ Strava connected${stravaAthlete ? ` as ${stravaAthlete}` : ''}!` })
      setTimeout(() => setStravaToast(null), 5000)
    } else if (stravaStatus === 'denied') {
      setStravaToast({ type: 'error', msg: 'Strava connection was cancelled.' })
      setTimeout(() => setStravaToast(null), 4000)
    } else if (stravaStatus === 'error' || stravaStatus === 'token_error') {
      setStravaToast({ type: 'error', msg: 'Strava connection failed — please try again.' })
      setTimeout(() => setStravaToast(null), 4000)
    } else if (stravaStatus === 'no_secret') {
      setStravaToast({ type: 'error', msg: 'Strava not configured on this server yet.' })
      setTimeout(() => setStravaToast(null), 4000)
    }
  }, [])

  function handleCharSelect(id: string) {
    setCharId(id)
    localStorage.setItem('nextsplit_rpg_char', id)
  }

  function handleKitColour(colour: string) {
    setKitColour(colour)
    localStorage.setItem('nextsplit_kit_colour', colour)
  }

  const { success: toastSuccess, error: toastError } = useToast()

  async function saveDisplayName() {
    if (!nameInput.trim()) return
    setSavingName(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await db(supabase).from('profiles').upsert({ id: user.id, display_name: nameInput.trim() })
        setDisplayName(nameInput.trim())
        toastSuccess('Name updated')
        router.refresh()
      }
    } catch {
      toastError('Failed to save name — try again')
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

  // Keyed version of allPlanLogs for charts (which expect Record<string, TrainingLog>)
  // Key includes plan_id to prevent collision when a user has completed multiple plans
  // (same week_n/day_i/session_i can appear in different plans)
  const allPlanLogsKeyed = useMemo(() =>
    Object.fromEntries(allPlanLogs.map(l => [`${l.plan_id}_${l.week_n}_${l.day_i}_${l.session_i}`, l])),
  [allPlanLogs])

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    try {
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
      toastSuccess('Data exported')
    } catch {
      toastError('Export failed — try again')
    }
  }

  const heroDisplayName = displayName || (RPG_CHARS.find(c => c.id === charId)?.label ?? 'Runner')

  // Character state: celebrating if plan complete, running if sessions logged today, idle otherwise
  const todayStr = new Date().toISOString().slice(0, 10)
  const loggedToday = allLogs.some(l => l.done && l.logged_at?.slice(0, 10) === todayStr)
  const planComplete = plan?.status === 'completed'
  const charState: 'celebrating' | 'running' | 'idle' =
    planComplete ? 'celebrating' : loggedToday ? 'running' : 'idle'

  // Medal: gold for plan complete, silver for 30-day streak, bronze for 7-day streak
  const medal = planComplete ? '🥇' : rpgStats.streak >= 30 ? '🥈' : rpgStats.streak >= 7 ? '🥉' : null

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="border-b px-4 pt-12 pb-3 sticky top-0 z-40"
        style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            {/* Name + plan progress */}
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input value={nameInput} onChange={e => setNameInput(e.target.value)}
                    className="rounded-xl px-3 py-1.5 text-sm outline-none"
                    style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                    autoFocus onKeyDown={e => { if (e.key === 'Enter') saveDisplayName() }} />
                  <button onClick={saveDisplayName} disabled={savingName}
                    className="text-[11px] font-bold" style={{ color: 'var(--ns-ember)' }}>{savingName ? '…' : 'Save'}</button>
                  <button onClick={() => setEditingName(false)}
                    className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-xl italic" style={{ color: 'var(--color-text-primary)' }}>
                    {displayName || 'Character'}
                  </h1>
                  <button onClick={() => { setNameInput(displayName); setEditingName(true) }}
                    className="text-sm opacity-40 hover:opacity-70" style={{ color: 'var(--color-text-tertiary)' }}>✎</button>
                </div>
              )}
              <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{email}</p>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {plan && (
                <span className="font-data text-[10px] font-bold px-2 py-1 rounded-full"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)' }}>
                  W{plan.current_week}/{plan.total_weeks}
                </span>
              )}
              <a href="/settings" aria-label="Settings"
                className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </a>
              <DarkModeToggle />
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 mt-3 rounded-xl p-1" style={{ background: 'var(--color-surface-2)' }}>
          {([
            { id: 'character', label: '🏃 Character' },
            { id: 'stats',     label: '📊 Stats'     },
            { id: 'records',   label: '🏆 Records'   },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setProfileTab(tab.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                profileTab === tab.id
                  ? 'text-white'
                  : ''
              }`}
              style={profileTab === tab.id
                ? { background: 'var(--ns-ember)', color: 'white' }
                : { color: 'var(--color-text-tertiary)' }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* ── CHARACTER TAB ── */}
        {profileTab === 'character' && <>

        {/* Hero RPG Card — skeleton while XP data loads */}
        {allLogsLoading ? (
          <div className="rounded-3xl overflow-hidden animate-pulse" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="p-5">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-[88px] h-[108px] rounded-2xl bg-white/10 flex-shrink-0" />
                <div className="flex-1 pt-1 space-y-2">
                  <div className="h-5 w-32 bg-white/10 rounded-lg" />
                  <div className="h-3 w-24 bg-white/10 rounded-lg" />
                  <div className="h-2.5 w-full bg-white/10 rounded-full mt-4" />
                </div>
              </div>
              <div className="space-y-2 mb-4">
                {[1,2,3,4].map(i => <div key={i} className="h-2 bg-white/10 rounded-full" />)}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[1,2,3,4].map(i => <div key={i} className="h-14 bg-white/10 rounded-xl" />)}
              </div>
            </div>
          </div>
        ) : (
          <HeroCard
            charId={charId}
            stats={rpgStats}
            displayName={heroDisplayName}
            kitColour={kitColour}
            charState={charState}
            medal={medal}
            onEditChar={() => setShowCharSelect(true)}
            onCustomise={() => setShowCustomiser(s => !s)}
          />
        )}

        {/* Kit colour customiser — inline, expandable */}
        {showCustomiser && (
          <div className="rounded-2xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <p className="text-xs font-bold mb-3" style={{ color: "var(--color-text-secondary)" }}>Kit colour</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { hex: 'var(--ns-forest)', label: 'Teal' },
                { hex: '#F97316', label: 'Orange' },
                { hex: '#DC2626', label: 'Red' },
                { hex: '#2563EB', label: 'Blue' },
                { hex: '#7C3AED', label: 'Purple' },
                { hex: '#D97706', label: 'Amber' },
                { hex: '#059669', label: 'Green' },
                { hex: '#DB2777', label: 'Pink' },
              ].map(({ hex, label }) => (
                <button
                  key={hex}
                  onClick={() => handleKitColour(hex)}
                  title={label}
                  className={`w-9 h-9 rounded-full border-4 transition-all ${kitColour === hex ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Next Reward Card — immediately below hero for motivation */}
        <NextRewardCard stats={rpgStats} unlockedIds={unlockedIds} />

        {/* Badges — near top so achievements are immediately visible */}
        <div className="rounded-2xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <p className="text-sm font-bold mb-3" style={{ color: "var(--color-text-primary)" }}>🏆 Badges</p>
          <BadgeGrid unlockedIds={unlockedIds} stats={rpgStats} />
        </div>

        {/* Runner class — earned identity */}
        {/* Warming Up anticipation indicator (Character Spec: weeks 1–3) */}
        {(!runnerClass || runnerClass === 'warming_up') && (() => {
          const weekCount = new Set(allPlanLogsArr.filter(l => l.done).map(l => l.week_n)).size
          const phase = getWarmingUpPhase(rpgStats.totalRuns, weekCount, classRevealReady)
          const copy  = WARMING_UP_COPY[phase]
          if (!copy) return null
          return (
            <div className="rounded-2xl px-4 py-3 flex items-start gap-3" style={{ background: 'var(--ns-ember-light)', border: '1px solid rgba(232,93,38,0.15)' }}>
              <span className="text-xl mt-0.5">🌅</span>
              <div className="flex-1">
                <p className="text-sm font-bold leading-snug" style={{ color: 'var(--ns-forest)' }}>
                  {copy.headline}
                </p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--ns-forest)', opacity: 0.7 }}>
                  {copy.sub}
                </p>
                {phase === 'ready' && (
                  <button
                    onClick={() => setShowClassReveal(true)}
                    className="mt-2 text-xs font-bold px-3 py-1.5 rounded-lg text-white"
                    style={{ background: 'var(--ns-ember)' }}
                  >
                    Reveal my class →
                  </button>
                )}
              </div>
            </div>
          )
        })()}

        <RunnerClassCard
          classId={runnerClass}
          revealReady={classRevealReady}
          showDescription={!(!runnerClass || runnerClass === 'warming_up')}
          onRevealClick={() => setShowClassReveal(true)}
        />

        {/* Weekly XP chart */}
        <WeeklyXPChart logs={logs} weeks={weeks} />

        {/* ── Account & Integrations ─────────────────────────────────── */}
        <div className="flex items-center gap-3 px-1 pt-2">
          <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)" }}>Account & Integrations</span>
          <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
        </div>

        {/* Public profile link */}
        {displayName && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">Your public profile</p>
                <p className="text-[10px] text-gray-400 mt-0.5">nextsplit.app/u/{encodeURIComponent(displayName)}</p>
              </div>
              <a
                href={`/u/${encodeURIComponent(displayName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-[var(--ns-ember)] bg-[var(--ns-forest-light)] border border-teal-100 px-3 py-1.5 rounded-xl"
              >
                Preview →
              </a>
            </div>
            <button
              onClick={() => {
                const url = `${window.location.origin}/u/${encodeURIComponent(displayName)}`
                navigator.clipboard?.writeText(url).then(() => {
                  const el = document.getElementById('profile-copy-confirm')
                  if (el) { el.textContent = '✓ Copied!'; setTimeout(() => { if (el) el.textContent = 'Copy link' }, 2000) }
                })
              }}
              className="w-full py-2 rounded-xl bg-gray-50 text-gray-600 text-xs font-semibold border border-gray-100"
            >
              <span id="profile-copy-confirm">Copy link</span>
            </button>
          </div>
        )}

        </> /* end character tab */}

        {/* ── STATS TAB ── */}
        {profileTab === 'stats' && (
          <div className="space-y-4">
            {/* Stats tab header */}
            <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <span className="text-2xl">📊</span>
              <div>
                <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Training Analytics</p>
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>ACWR · pace trends · training zones</p>
              </div>
            </div>
            {allPlanLogs.length < 4 ? (
              <div className="rounded-2xl p-8 text-center space-y-2" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <div className="text-3xl">📊</div>
                <p className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>Stats unlock after 4 sessions</p>
                <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>Log more sessions to see ACWR, pace trends and training zones.</p>
              </div>
            ) : (
              <>
                <WeeklyCoachingSummary />
                <WeeklyVolumeChart logs={allPlanLogsKeyed} weeks={weeks} />
                <ACWRChart logs={allPlanLogsKeyed} weeks={weeks} />
                <PaceTrend logs={allPlanLogsKeyed} />
                <WellnessTrend />
                <WeightTrend />
                <TrainingZones logs={allPlanLogsKeyed} />
                <PaceCalculator />
              </>
            )}
          </div>
        )}

        {/* ── RECORDS TAB ── */}
        {profileTab === 'records' && (
          <div className="space-y-4">
            {/* Records tab header */}
            <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
              style={{ background: 'linear-gradient(135deg, #2c1f0a 0%, #1e1508 100%)', border: '1px solid #3d2e10' }}>
              <span className="text-2xl">🏆</span>
              <div>
                <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--ns-track)' }}>Personal Bests & Records</p>
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Race history · session logs · all-time bests</p>
              </div>
            </div>
            <RaceDaySimulation
              logs={allPlanLogsKeyed}
              targetDistanceKm={undefined}
              raceDate={plan?.race_date ?? undefined}
            />
            <PBCard logs={allPlanLogsKeyed} />
            <TrainingSummary logs={allPlanLogsKeyed} />
            {/* Race history */}
            <a href="/races" className="flex items-center justify-between rounded-2xl px-4 py-3.5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">🏁</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Race history</p>
                  <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>All your logged races and times</p>
                </div>
              </div>
              <span className="text-lg" style={{ color: "var(--color-text-tertiary)" }}>›</span>
            </a>
            <a href="/history" className="flex items-center justify-between rounded-2xl px-4 py-3.5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">📅</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Session history</p>
                  <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>Every session you've logged</p>
                </div>
              </div>
              <span className="text-lg" style={{ color: "var(--color-text-tertiary)" }}>›</span>
            </a>
            <a href="/dashboard" className="flex items-center justify-between rounded-2xl px-4 py-3.5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">📈</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Full analytics dashboard</p>
                  <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>All charts, predictions, coaching summary</p>
                </div>
              </div>
              <span className="text-lg" style={{ color: "var(--color-text-tertiary)" }}>›</span>
            </a>
          </div>
        )}

        {/* Upgrade card — shown to free users */}
        {!isPro && (
          <button
            onClick={() => setShowUpgrade(true)}
            className="w-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-2xl p-4 text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white text-sm font-black">NextSplit Elite</span>
                  {foundingLeft > 0 && (
                    <span className="bg-amber-400 text-amber-900 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                      ⭐ {foundingLeft} founding spots left
                    </span>
                  )}
                </div>
                <p className="text-teal-100 text-xs">
                  {foundingLeft > 0 ? 'Lock in £7.99/mo forever · ' : ''}7-day free trial
                </p>
              </div>
              <div className="bg-white/20 rounded-xl px-3 py-1.5">
                <span className="text-white text-xs font-bold">Upgrade →</span>
              </div>
            </div>
          </button>
        )}

        {/* Pro badge — shown to pro users */}
        {isPro && (
          <div className="bg-gradient-to-r from-teal-500 to-teal-400 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-black">NextSplit Elite</span>
                {isFounding && <span className="text-amber-300 text-xs font-bold">⭐ Founding Member</span>}
              </div>
              <p className="text-teal-100 text-xs mt-0.5">
                {subscription.status === 'trialing' ? 'Free trial active' : 'Active subscription'}
              </p>
            </div>
            <button
              onClick={async () => {
                const res = await fetch('/api/stripe/portal', { method: 'POST' })
                const d = await res.json()
                if (d.url) window.location.href = d.url
              }}
              className="bg-white/20 rounded-xl px-3 py-1.5"
            >
              <span className="text-white text-xs font-bold">Manage</span>
            </button>
          </div>
        )}

        {/* Strava */}
        <StravaSection clientId={stravaClientId} isConnected={isStravaConnected} />

        {/* Referral — gated by PostHog flag 'referral_programme' (build now, release at 40% Day 30 retention) */}
        {config.referralEnabled && (
          <ReferralCard trigger="profile" />
        )}

        {/* PWA Install */}
        <PWAProfileCard />

        {/* Athlete profile */}
        <AthleteProfileSection />

        {/* Settings link */}
        <a href="/settings"
          className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            <span className="text-sm font-semibold text-gray-700">Settings</span>
          </div>
          <span className="text-lg" style={{ color: "var(--color-text-tertiary)" }}>›</span>
        </a>

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

      {/* Runner class reveal */}
      {showClassReveal && runnerClass && runnerClass !== 'warming_up' && (
        <RunnerClassReveal
          classId={runnerClass}
          onDismiss={() => {
            setShowClassReveal(false)
            Analytics.classRevealed(runnerClass)
          }}
        />
      )}

      {/* Badge unlock toast */}
      {badgeToast && (
        <BadgeToast badge={badgeToast} onDismiss={() => setBadgeToast(null)} />
      )}

      {/* Strava connection toast */}
      {stravaToast && (
        <div className="fixed bottom-24 left-4 right-4 max-w-lg mx-auto z-50 pointer-events-none">
          <div className={`rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-xl text-center ${
            stravaToast.type === 'success' ? 'bg-orange-500' : 'bg-red-500'
          }`}>
            {stravaToast.msg}
          </div>
        </div>
      )}
      {/* Upgrade modal */}
      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          foundingLeft={foundingLeft}
        />
      )}
    </div>
  )
}

