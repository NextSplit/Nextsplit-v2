'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
  checkNewBadges, type RPGStats, type RPGBadge,
} from '@/lib/rpg'
import { computePersonalBests } from '@/lib/personalBests'
import { computeStreak, computeConsistency } from '@/lib/streak'
import { useSupabase } from '@/hooks/useSupabase'
import type { TrainingLog, PlanWeek } from '@/types/database'
import LevelUpScreen from '@/components/rpg/LevelUpScreen'
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
import AthleteProfileSection from '@/components/rpg/AthleteProfileSection'
import { db } from '@/lib/supabase/db'

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
  const [badgeToast, setBadgeToast] = useState<RPGBadge | null>(null)
  const [seenBadgeIds, setSeenBadgeIds] = useState<string[]>([])
  const [kitColour, setKitColour] = useState('#0D9488')
  const [showCustomiser, setShowCustomiser] = useState(false)

  useEffect(() => {
    setStravaClientId(process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID ?? null)
    // Load RPG char selection from localStorage
    const saved = localStorage.getItem('nextsplit_rpg_char')
    if (saved) setCharId(saved)
    const seen = localStorage.getItem('nextsplit_rpg_seen_badges')
    if (seen) setSeenBadgeIds(JSON.parse(seen))
    const savedKit = localStorage.getItem('nextsplit_kit_colour')
    if (savedKit) setKitColour(savedKit)

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
                <h1 className="text-lg font-bold text-gray-900">{displayName || 'Character'}</h1>
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
          <DarkModeToggle />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* Hero RPG Card — skeleton while XP data loads */}
        {allLogsLoading ? (
          <div className="rounded-3xl overflow-hidden animate-pulse" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f3460 100%)' }}>
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
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-700 mb-3">Kit colour</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { hex: '#0D9488', label: 'Teal' },
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
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-sm font-bold text-gray-900 mb-3">🏆 Badges</p>
          <BadgeGrid unlockedIds={unlockedIds} stats={rpgStats} />
        </div>

        {/* Weekly XP chart */}
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

        {/* ── Account & Integrations ─────────────────────────────────── */}
        <div className="flex items-center gap-3 px-1 pt-2">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account &amp; Integrations</span>
          <div className="flex-1 h-px bg-gray-200" />
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
                className="text-[11px] font-semibold text-teal-600 bg-teal-50 border border-teal-100 px-3 py-1.5 rounded-xl"
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
          <span className="text-gray-300 text-lg">›</span>
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

