'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useTrainingLog } from '@/hooks/useTrainingLog'
import { useAllTrainingLogs } from '@/hooks/useAllTrainingLogs'
import { useGymLog } from '@/hooks/useGymLog'
import { derivePaceZones } from '@/lib/paceZones'
import type { PaceZones } from '@/lib/paceZones'
import { getSessionType, fmtKm, formatDate, offsetDate, decodeHtml, parseDet } from '@/lib/sessionUtils'
import type { PlanDay, PlanSession, PlanWeek, TrainingLog } from '@/types/database'
import { getSessionXP } from '@/lib/rpg'
import { computePersonalBests, checkNewPB } from '@/lib/personalBests'
import { computeStreak, computeConsistency, computeWeeklyReport } from '@/lib/streak'
import { calcACWR } from '@/lib/statsUtils'
import { hapticLight, hapticSuccess } from '@/lib/haptics'
import { Analytics } from '@/lib/analytics'
import TodayBelowFold from './TodayBelowFold'
import Splity from '@/components/Splity'
import AdaptPlanCard from '@/components/AdaptPlanCard'
import FuelPlanCard from '@/components/FuelPlanCard'
import StravaSyncButton from '@/components/StravaSyncButton'
import { useToast } from '@/components/Toast'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { TodayHeader } from './TodayHeader'
import { TodayModals } from './TodayModals'
import SessionCard from '@/components/SessionCard'
import { useProfile } from '@/hooks/useProfile'
import MissedSessionFlow from '@/components/MissedSessionFlow'
import AICoachingNote from '@/components/AICoachingNote'
import LeadDashboard from '@/components/LeadDashboard'
import { useLeadMode } from '@/hooks/useLeadMode'
import NPSPrompt from '@/components/NPSPrompt'
import FirstSessionCelebration from '@/components/FirstSessionCelebration'
import PushPrompt from '@/components/PushPrompt'
import NudgeSquadPill from '@/components/NudgeSquadPill'
import { shareSessionWithSquadAction } from './actions'
import { useUndoCountdown } from './hooks/useUndoCountdown'


export default function TodayClient() {
  const { plan, weeks, currentWeek, loading: planLoading, advanceWeek } = useActivePlan()
  const { logs, logSession, undoSession, loading: logsLoading } = useTrainingLog(plan?.id ?? null)
  const { logs: allPlanLogs } = useAllTrainingLogs()
  const { gymLogs } = useGymLog(plan?.id ?? null)
  const { profile } = useProfile()
  const { isLeadMode, isSplitLeader, isProfessional, athleteCount, canToggle, exitLeadMode } = useLeadMode()

  const [dateOffset, setDateOffset] = useState(0)
  const [readinessScore, setReadinessScore] = useState<number | null>(null)
  const [modalSession, setModalSession] = useState<{ session: PlanSession; dayI: number; sessI: number; prefillDurationSecs?: number } | null>(null)
  const [focusSession, setFocusSession] = useState<{ session: PlanSession; dayI: number; sessI: number } | null>(null)
  // Undo state machine — see src/app/today/hooks/useUndoCountdown.ts.
  // resetKey = dateOffset so any date-offset shift clears the pending undo.
  const [newPB, setNewPB] = useState<{ distance: string; timeStr: string } | null>(null)
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window === 'undefined') return false
    return !localStorage.getItem('nextsplit_welcome_dismissed')
  })
  const [shareSession, setShareSession] = useState<{ session: PlanSession; log: TrainingLog } | null>(null)
  const [showWeeklyShare, setShowWeeklyShare] = useState(false)
  const [ceremonyDismissed, setCeremonyDismissed] = useState(false)
  const [showAdHocModal, setShowAdHocModal] = useState(false)
  const [showMissedFlow, setShowMissedFlow] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast()
  const viewDate = offsetDate(dateOffset)

  // Show notice toasts from query params (e.g. after plan activation)
  useEffect(() => {
    const notice = searchParams.get('notice')
    if (notice === 'race_soon') {
      toastWarning("Race is sooner than the full plan length — we've started from today. Make the most of the time you have!", 6000)
      router.replace('/today', { scroll: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Offline sync — flush queued sessions when back online (Tech Pillar spec)
  useEffect(() => {
    let cleanup: (() => void) | undefined
    import('@/lib/offlineQueue').then(({ initOfflineSync }) => {
      cleanup = initOfflineSync((count) => {
        toastSuccess(`${count} session${count > 1 ? 's' : ''} synced from offline queue`)
      })
    }).catch(() => {})
    return () => cleanup?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const isToday = dateOffset === 0

  const dayOfWeek = viewDate.getDay()
  const planDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  // Determine which plan week the viewDate falls in.
  // Plan weeks run Mon–Sun. We compare week-start Mondays so Sunday
  // stays in the same week as the preceding Mon–Sat, not the next.
  const viewWeekN = useMemo(() => {
    if (!plan || dateOffset === 0) return plan?.current_week ?? 1
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayDow = today.getDay()
    // Monday of the week containing today
    const currentWeekMonday = new Date(today)
    currentWeekMonday.setDate(today.getDate() - (todayDow === 0 ? 6 : todayDow - 1))
    // Monday of the week containing viewDate
    const vd = new Date(viewDate)
    vd.setHours(0, 0, 0, 0)
    const vdDow = vd.getDay()
    const vdMonday = new Date(vd)
    vdMonday.setDate(vd.getDate() - (vdDow === 0 ? 6 : vdDow - 1))
    const diffWeeks = Math.round((vdMonday.getTime() - currentWeekMonday.getTime()) / (7 * 86400000))
    return Math.max(1, Math.min(plan.total_weeks, (plan.current_week ?? 1) + diffWeeks))
  }, [plan, dateOffset, viewDate])

  const viewWeek = weeks.find(w => w.n === viewWeekN) ?? currentWeek
  const planDay: PlanDay | null = viewWeek?.days[planDayIndex] ?? null
  const weekN = isToday ? (plan?.current_week ?? 1) : viewWeekN

  // Undo state — extracted into a hook so the countdown interval, the
  // reset-on-date-change effect, and the cleanup-on-undo all share a single
  // ref-backed source of truth instead of stale closures.
  const {
    undoInfo, undoLabel, undoXP, undoSecsLeft, beginUndo, cancelUndo,
  } = useUndoCountdown(dateOffset)

  const handleLogSession = useCallback(async (params: {
    week_n: number; day_i: number; session_i: number; done: boolean
    effort?: number; km?: number; notes?: string; duration_secs?: number; hr?: number; pace?: string
  }) => {
    if (!plan) return

    // Capture once at call-time so date-offset shifts mid-await can't change
    // which session metadata flows into squad-feed / community fetches /
    // analytics / undo state. Council /council 2026-05-07 surgical fix S1
    // (qa-risk + coach-domain-expert + security-privacy convergence).
    const capturedSession = planDay?.sessions[params.session_i]

    // Derive effective pace once for every downstream consumer (PB check,
    // milestone payload). Council surgical fix S2 — milestone previously used
    // raw params.pace, dropping a derivable PB-eligible pace silently.
    let effectivePace = params.pace
    if (!effectivePace && params.duration_secs && params.km && params.km > 0) {
      const secsPerKm = params.duration_secs / params.km
      const m = Math.floor(secsPerKm / 60)
      const s = Math.round(secsPerKm % 60)
      effectivePace = `${m}:${String(s).padStart(2, '0')}`
    }

    let log: Awaited<ReturnType<typeof logSession>>
    try {
      log = await logSession({ plan_id: plan.id, ...params })
    } catch {
      // Offline fallback — queue for sync on reconnect (Tech Pillar spec)
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const { queueSession } = await import('@/lib/offlineQueue')
        await queueSession({ plan_id: plan.id, ...params })
        toastSuccess('Saved offline — will sync when back online')
        hapticLight()
        return
      }
      toastError('Failed to save — check your connection and try again')
      return
    }
    hapticLight()

    // Track session logged — the core retention event
    if (params.done) {
      Analytics.sessionLogged(capturedSession?.c ?? 'run', params.km, params.effort)
    }

    // Check for new personal best
    if (params.km && params.done && effectivePace) {
      const existingLogs = Object.values(logs)
      const existingPBs = computePersonalBests(existingLogs)
      const pb = checkNewPB(
        { km: params.km, pace: effectivePace, week_n: params.week_n, logged_at: new Date().toISOString(), done: true },
        existingPBs
      )
      if (pb) {
        hapticSuccess()
        setNewPB({ distance: pb.distance, timeStr: pb.timeStr })
        setTimeout(() => setNewPB(null), 6000)
      }
    }

    // Fire-and-forget community progress update
    if (params.done) {
      fetch('/api/community/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          km:           params.km ?? 0,
          done:         true,
          session_type: capturedSession?.c ?? 'run',
          session_name: capturedSession?.n ?? 'Session',
          duration_secs: params.duration_secs,
          pace:         effectivePace,
          effort:       params.effort,
        }),
      }).catch(() => {}) // non-blocking

      // Milestone detection — PBs, streaks, first runs (non-blocking)
      fetch('/api/community/milestone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          km:           params.km ?? 0,
          pace:         effectivePace,
          session_name: capturedSession?.n ?? 'Session',
          session_type: capturedSession?.c ?? 'run',
        }),
      }).catch(() => {}) // non-blocking

      // Recompute runner class after every session (non-blocking)
      fetch('/api/runner-class', { method: 'POST' }).catch(() => {})

      // P1.1 squad-feed fan-out — fire-and-forget from /today. The /train
      // celebration UI awaits this for its feed-card preview; here we just
      // ensure the squad sees the log. RPC errors are Sentry-captured
      // server-side via the action wrapper.
      shareSessionWithSquadAction(log.id).catch(() => {})
    }

    beginUndo(
      capturedSession?.n ?? 'session',
      capturedSession ? getSessionXP(capturedSession.c) : 10,
      log.id,
    )
    if (capturedSession) setShareSession({ session: capturedSession, log })
  }, [plan, logSession, planDay, logs, toastSuccess, toastError, beginUndo])

  const handleQuickDone = useCallback((dayI: number, sessI: number, session: PlanSession) => {
    // Always open the log modal — gives user control over distance/effort/notes
    // Quick-done button is just a shortcut to open the modal, not auto-complete
    setModalSession({ session, dayI, sessI })
  }, [])

  const handleUndo = useCallback(async () => {
    if (!undoInfo) return
    const logId = undoInfo.logId
    cancelUndo()
    try {
      await undoSession(logId)
    } catch {
      toastError('Could not undo — session may already be saved')
    }
  }, [undoInfo, undoSession, toastError, cancelUndo])

  const loading = planLoading || logsLoading

  // Count done sessions today
  const todaySessions = planDay?.sessions ?? []
  const doneTodayCount = todaySessions.filter((_, i) => logs[`${weekN}_${planDayIndex}_${i}`]?.done).length

  // Missed sessions — sessions that were planned for past days this week but not done
  const missedSessionsCount = useMemo(() => {
    if (!currentWeek || !plan) return 0
    const today = new Date().getDay()
    const todayPlanIdx = today === 0 ? 6 : today - 1
    let missed = 0
    currentWeek.days.forEach((day, dayI) => {
      if (dayI >= todayPlanIdx) return // only past days
      day.sessions.forEach((_: unknown, sessI: number) => {
        const key = `${weekN}_${dayI}_${sessI}`
        if (!logs[key]?.done) missed++
      })
    })
    return missed
  }, [currentWeek, logs, weekN, plan])

  // Streak + consistency
  const allLogsArray = Object.values(logs)
  const paceZones = useMemo(() => derivePaceZones(Object.values(allPlanLogs)), [allPlanLogs])
  const streak = computeStreak(allLogsArray)
  const consistency = plan ? computeConsistency(allLogsArray, weeks, weekN) : { thisWeekPct: 0, last4WeekPct: 0 }

  // ACWR — current week's value for progress strip
  const acwrCurrent = useMemo(() => {
    if (!weeks.length || !allLogsArray.length) return null
    const acwrData = calcACWR(allLogsArray, weeks)
    const current  = acwrData.find(d => d.week === weekN)
    return current?.acwr ?? null
  }, [allLogsArray, weeks, weekN])

  // Monday weekly report — shown on Mondays when current week has just started
  const isMondayStart = new Date().getDay() === 1 && plan && weekN > 1
  const weeklyReport = isMondayStart
    ? computeWeeklyReport(allLogsArray, weeks, weekN)
    : null

  // Swipe to navigate dates
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    // Only trigger if horizontal swipe (dx > 40px and more horizontal than vertical)
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    if (dx < 0) {
      // Swipe left → go forward (only to today)
      setDateOffset(o => Math.min(o + 1, 0))
    } else {
      // Swipe right → go back in time
      setDateOffset(o => o - 1)
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  return (
    <div
      className="min-h-screen pb-24" style={{ background: "var(--color-bg)" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <TodayHeader
        plan={plan}
        weekN={weekN}
        streak={streak}
        dateOffset={dateOffset}
        setDateOffset={setDateOffset}
        viewDate={viewDate}
        isToday={isToday}
        todaySessions={todaySessions}
        doneTodayCount={doneTodayCount}
        displayName={profile?.display_name ?? null}
        readiness={readinessScore}
      />

      <div className="max-w-lg mx-auto px-4 py-5 space-y-3">

        {/* Lead mode toggle button — shown to coaches, athlete view */}
        {canToggle && !isLeadMode && (
          <button
            onClick={() => {
              try { localStorage.setItem('nextsplit_lead_mode', 'true') } catch { /* ignore */ }
              window.location.reload()
            }}
            className="w-full flex items-center gap-3 bg-white rounded-2xl border border-[var(--color-border)] px-4 py-3 text-left active:scale-[0.98] transition-all"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
              style={{ background: 'var(--ns-cyan-light)' }}>
              {isSplitLeader || isProfessional ? '👥' : '🏃'}
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-800">
                Switch to {isSplitLeader ? 'Split Leader' : 'Coach'} view
              </p>
              <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">
                See your squad — {athleteCount} athlete{athleteCount !== 1 ? 's' : ''}
              </p>
            </div>
            <span className="text-gray-300 text-lg">›</span>
          </button>
        )}

        {/* Lead Dashboard — replaces Today content when in Lead mode */}
        {isLeadMode && (
          <LeadDashboard
            onExitLeadMode={exitLeadMode}
            athleteCount={athleteCount}
            isSplitLeader={isSplitLeader}
          />
        )}

        {/* Normal Today content — hidden in Lead mode via display */}
        <div style={{ display: isLeadMode ? 'none' : undefined }}>

        {/* Manual/empty plan — no sessions yet */}
        {!loading && plan && currentWeek && currentWeek.days.every(d => d.sessions.length === 0) && (
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-6 text-center space-y-3">
            <div className="text-4xl">✏️</div>
            <h2 className="text-sm font-bold text-gray-900">No sessions scheduled yet</h2>
            <p className="text-xs text-[var(--color-text-tertiary)] leading-relaxed">
              {plan.plan_type === 'manual'
                ? "Head to the Plan tab to add sessions to your week."
                : "Your plan is building — check the Plan tab for your full schedule."}
            </p>
            <a href="/train"
              className="inline-block text-white text-xs font-bold px-5 py-2.5 rounded-xl" style={{ background: 'var(--ns-ember)' }}>
              Go to Plan →
            </a>
          </div>
        )}

        {/* Welcome banner — shown once after onboarding */}
        {showWelcome && !loading && plan && (
          <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: 'linear-gradient(135deg, var(--color-surface) 0%, rgba(43,92,63,0.2) 100%)', border: '1px solid var(--color-border)' }}>
            <span className="text-2xl shrink-0">👋</span>
            <div className="flex-1">
              <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>Welcome to NextSplit!</p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                Your plan is ready. Tap any session to log it — swipe left or right to move between days.
              </p>
            </div>
            <button
              onClick={() => {
                setShowWelcome(false)
                try { localStorage.setItem('nextsplit_welcome_dismissed', '1') } catch {}
              }}
              className="text-lg shrink-0 leading-none" style={{ color: 'var(--color-text-tertiary)' }}
            >
              ×
            </button>
          </div>
        )}

        {/* No plan state — Product Pillar: "the gap between signing up and plan start is a high-churn moment that needs a designed experience" */}
        {!loading && !plan && (() => {
          const hadPlan = typeof window !== 'undefined' && !!localStorage.getItem('nextsplit_plan_completed')
          return (
            <div className="space-y-3">
              <div className="rounded-2xl p-6 text-center overflow-hidden relative"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                {/* Subtle glow */}
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(232,93,38,0.06) 0%, transparent 70%)' }} />
                <div className="relative">
                  <div className="text-4xl mb-3">{hadPlan ? '🎉' : '🌅'}</div>
                  <h2 className="font-display text-xl italic mb-2"
                    style={{ color: 'var(--color-text-primary)' }}>
                    {hadPlan ? "What's your next challenge?" : 'Your journey starts here.'}
                  </h2>
                  <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {hadPlan
                      ? "You finished your plan. Pick your next target whenever you're ready. No rush."
                      : 'Choose a plan and your first session could be today. No catch-up required.'}
                  </p>
                  <a href="/plan/browse"
                    className="inline-block text-white px-6 py-3 rounded-xl text-sm font-black active:scale-95 transition-all"
                    style={{ background: 'linear-gradient(135deg, var(--ns-ember) 0%, #e0334f 100%)', boxShadow: '0 4px 16px rgba(232,93,38,0.3)' }}>
                    {hadPlan ? 'Start next plan →' : 'Choose a plan →'}
                  </a>
                  {hadPlan && (
                    <div className="mt-3">
                      <a href="/profile" className="text-xs underline" style={{ color: 'var(--color-text-tertiary)' }}>View your history</a>
                    </div>
                  )}
                </div>
              </div>

              {/* Warm reassurance — reduces anxiety about "falling behind" */}
              {!hadPlan && (
                <div className="bg-[var(--ns-cyan-light)] rounded-2xl px-4 py-3 flex items-start gap-2">
                  <span className="text-base mt-0.5">💡</span>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--ns-cyan)' }}>
                    <span className="font-bold">No rush to start.</span>{' '}
                    When you activate a plan, the clock starts from that day — not from when you signed up. No catch-up required.
                  </p>
                </div>
              )}
            </div>
          )
        })()}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-24 bg-white rounded-2xl border border-[var(--color-border)] animate-pulse" />
            ))}
          </div>
        )}

        {/* Sessions */}
        {!loading && plan && (
          <>
            {/* Week note — tiny pill, doesn't compete with session */}
            {isToday && currentWeek?.note && (
              <div className="flex items-center gap-2 px-1">
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--color-text-tertiary)' }}>
                  W{weekN}
                </span>
                <p className="text-[11px] leading-relaxed line-clamp-1" style={{ color: 'var(--color-text-tertiary)' }}>
                  {currentWeek.note}
                </p>
              </div>
            )}

            {/* Rest day or no sessions */}
            {todaySessions.length === 0 && (() => {
              // Check if there are gym sessions on this day in the plan
              const gymSessions = planDay?.sessions?.filter((s: PlanSession) => s?.c?.startsWith('gym')) ?? []
              if (gymSessions.length > 0) {
                return (
                  <div className="rounded-2xl p-5" style={{ background: 'rgba(139,92,246,0.10)', border: '1.5px solid rgba(139,92,246,0.25)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">🏋️</span>
                      <p className="text-sm font-bold text-gray-900">Gym day</p>
                      <span className="text-[10px] text-[var(--color-text-tertiary)] ml-auto">No run today</span>
                    </div>
                    <div className="space-y-2">
                      {gymSessions.map((s: PlanSession, i: number) => (
                        <button key={i}
                          onClick={() => router.push(`/gym/live/${weekN}/${planDayIndex}/${i}`)}
                          className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
                          <span className="text-xl">{getSessionType(s.c).emoji}</span>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-amber-900">{s.n}</p>
                            <p className="text-[10px] text-amber-700 mt-0.5">{parseDet(s.det ?? '').technical.slice(0, 60)}…</p>
                          </div>
                          <span className="text-amber-500 font-bold text-xs">Start →</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              }
              return (
                <div className="rounded-2xl p-6 text-center"
                  style={{ background: 'rgba(156,163,175,0.10)', border: '1.5px solid rgba(156,163,175,0.2)' }}>
                  <div className="text-4xl mb-3">😴</div>
                  <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>Rest day</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>Recovery is training too.</p>
                </div>
              )
            })()}

            {/* Session timing row */}
            {planDay && planDay.times && planDay.times.length > 0 && (
              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] text-[var(--color-text-tertiary)] font-medium uppercase tracking-wide">Scheduled</span>
                {planDay.times.map((t, i) => (
                  <span key={i} className="text-[11px] bg-white border border-[var(--color-border)] rounded-full px-2.5 py-0.5 text-[var(--color-text-secondary)] font-medium">
                    {t.t} {t.l}
                  </span>
                ))}
              </div>
            )}

            {/* ── HERO: Session cards ─────────────────────────────────── */}
            {todaySessions.length > 1 && isToday && (
              <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider px-1">
                {todaySessions.length} sessions today
              </p>
            )}
            {todaySessions.map((session, sessI) => {
              const key = `${weekN}_${planDayIndex}_${sessI}`
              const log = logs[key] ?? null
              const isGym = session.c?.startsWith('gym')
              const isRun = session.c?.startsWith('run')
              return (
                <div key={sessI}>
                  <SessionCard
                    session={session}
                    sessionIndex={sessI}
                    dayIndex={planDayIndex}
                    weekN={weekN}
                    planId={plan.id}
                    log={log}
                    personalisedPaces={paceZones}
                    onTap={() => {
                      if (isGym) {
                        router.push(`/gym/live/${weekN}/${planDayIndex}/${sessI}`)
                      } else {
                        setModalSession({ session, dayI: planDayIndex, sessI })
                      }
                    }}
                    onQuickDone={() => handleQuickDone(planDayIndex, sessI, session)}
                    onFocus={() => setFocusSession({ session, dayI: planDayIndex, sessI })}
                  />
                  {/* Strava sync button — running sessions only, not yet logged */}
                  {isRun && !log?.done && isToday && (
                    <div className="flex justify-end mt-1.5 pr-1">
                      <StravaSyncButton onImported={() => { /* refresh */ }} />
                    </div>
                  )}
                </div>
              )
            })}

            {/* ACWR risk — compact inline warning */}
            {isToday && acwrCurrent !== null && acwrCurrent > 1.3 && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                style={{ background: acwrCurrent > 1.5 ? '#fef2f2' : '#fffbeb', border: `1px solid ${acwrCurrent > 1.5 ? '#fecaca' : '#fde68a'}` }}>
                <span className="text-base flex-shrink-0">{acwrCurrent > 1.5 ? '⚠️' : '💡'}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold" style={{ color: acwrCurrent > 1.5 ? '#b91c1c' : '#92400e' }}>
                    Splity · {acwrCurrent > 1.5 ? 'High load week — take it easy today' : 'Amber load zone — listen to your body'}
                  </span>
                </div>
              </div>
            )}

            {/* Low readiness — coach voice per Product & UX Pillar spec */}
            {isToday && readinessScore !== null && readinessScore <= 5 && todaySessions.length > 0 && (() => {
              const isVeryLow = readinessScore <= 3
              const hasRunSessions = todaySessions.some(s => s?.c?.startsWith('run'))
              return (
                <div className="space-y-2">
                  <AICoachingNote
                    type="readiness"
                    what={isVeryLow
                      ? 'Readiness is very low today.'
                      : "Readiness is below where we'd want it for today's session."}
                    why={isVeryLow
                      ? "Recovery is training. A bad day forced is two bad days. Your body is telling you something important."
                      : "Your body is telling you something. Consider modifying today's session — you'll be stronger for it tomorrow."}
                    protects="You can override this and do the original session — that option is below."
                    canOverride={true}
                    onOverride={() => setReadinessScore(6)}
                  />
                  <div className="flex flex-col gap-2 pl-1">
                    {hasRunSessions && !isVeryLow && (
                      <button
                        onClick={() => {
                          todaySessions.forEach((session, sessI) => {
                            if (session.c?.startsWith('run') && !logs[`${weekN}_${planDayIndex}_${sessI}`]?.done) {
                              handleLogSession({ week_n: weekN, day_i: planDayIndex, session_i: sessI, done: true, effort: 4, km: Math.round(session.km * 0.8) || undefined, notes: 'Adapted — low readiness day' })
                            }
                          })
                        }}
                        className="w-full py-2.5 rounded-xl bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold"
                      >
                        🏃 Log as easy effort (−20% volume)
                      </button>
                    )}
                    <button
                      onClick={() => {
                        todaySessions.forEach((_, sessI) => {
                          if (!logs[`${weekN}_${planDayIndex}_${sessI}`]?.done) {
                            handleLogSession({ week_n: weekN, day_i: planDayIndex, session_i: sessI, done: true, effort: 1, notes: 'Rest day — low readiness' })
                          }
                        })
                      }}
                      className="w-full py-2.5 rounded-xl bg-white border border-amber-200 text-amber-700 text-xs font-semibold"
                    >
                      😴 Rest instead — log as complete
                    </button>
                  </div>
                </div>
              )
            })()}

            {/* All done — Splity celebration */}
            {isToday && todaySessions.length > 0 && doneTodayCount === todaySessions.length && (
              <div className="rounded-2xl px-4 py-5 text-center animate-slide-up"
                style={{ background: 'linear-gradient(135deg, #fff8f0 0%, #fff3e8 100%)', border: '1.5px solid var(--ns-ember)', opacity: 0.97 }}>
                <div className="flex justify-center mb-3">
                  <div className="relative">
                    <Splity mood="celebrating" size={64} />
                    {/* Confetti dots */}
                    <span className="absolute -top-1 -right-1 text-xs animate-bounce">🎉</span>
                    <span className="absolute -top-2 left-0 text-xs" style={{ animationDelay: '0.2s' }}>✨</span>
                  </div>
                </div>
                <p className="text-base font-black mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  That&apos;s today done.
                </p>
                <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                  {todaySessions.length === 1
                    ? "One session banked. The consistency is what matters."
                    : `${todaySessions.length} sessions banked. Now let your body do the work.`}
                </p>
                <div className="flex items-center justify-center gap-2">
                  {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <button
                      onClick={() => {
                        const sessionNames = todaySessions.map(s => s.n).join(', ')
                        navigator.share({
                          title: 'NextSplit — Training done ✓',
                          text: `Just completed today's training: ${sessionNames}. ${weekN > 1 ? `Week ${weekN} in progress.` : 'Day 1 done!'} 🏃`,
                        }).catch(() => {})
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full"
                      style={{ background: 'var(--ns-ember)', color: 'white' }}
                    >
                      Share
                    </button>
                  )}
                  <button
                    onClick={() => setShowWeeklyShare(true)}
                    className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full"
                    style={{ background: 'white', color: 'var(--ns-ember)', border: '1.5px solid var(--ns-ember)' }}
                  >
                    📊 Week card
                  </button>
                </div>
              </div>
            )}

            {/* Missed session — conversational flow (Product & UX Pillar spec) */}
            {!isToday && dateOffset < 0 && todaySessions.length > 0 && doneTodayCount < todaySessions.length && (
              <div className="bg-amber-50 rounded-2xl border border-amber-100 px-4 py-3">
                <div className="flex items-start gap-2.5">
                  <span className="text-base mt-0.5">💡</span>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold text-amber-800 mb-0.5">
                      Looks like {todaySessions.length - doneTodayCount === 1
                        ? `${todaySessions.find((_, i) => !logs[`${weekN}_${planDayIndex}_${i}`]?.done)?.n ?? 'a session'} didn't happen`
                        : `${todaySessions.length - doneTodayCount} sessions didn't happen`}
                    </p>
                    <p className="text-xs text-amber-700 leading-relaxed mb-2.5">
                      Tap here if you'd like to sort the plan.
                    </p>
                    <button
                      onClick={() => setShowMissedFlow(true)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg text-white active:scale-95 transition-all"
                      style={{ background: 'var(--ns-ember)' }}
                    >
                      Rebuild plan around this →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sleep note — compact */}
            {planDay?.sleep && (
              <div className="flex items-center gap-2 px-1">
                <span className="text-sm">🌙</span>
                <p className="text-[11px] leading-relaxed line-clamp-1" style={{ color: 'var(--color-text-tertiary)' }}>
                  {planDay.sleep}
                </p>
              </div>
            )}

            {/* Quick action row — compact, below sessions */}
            {isToday && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAdHocModal(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                >
                  <span style={{ color: 'var(--ns-ember)' }}>+</span> Add session
                </button>
                <a href="/train"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                >
                  📋 Full plan
                </a>
              </div>
            )}

            {/* Fuel plan — collapsible, tappable header */}
            {isToday && planDay && planDay.nut && planDay.nut.length > 0 && (
              <FuelPlanCard planDay={planDay} />
            )}

            {/* Adapt plan — shown when sessions missed mid-week */}
            {isToday && plan && missedSessionsCount >= 3 && (
              <AdaptPlanCard
                planId={plan.id}
                weekN={weekN}
                missedCount={missedSessionsCount}
                onAdapted={() => {}}
              />
            )}

            {/* Below fold — coach card, wellness, weather, weekly report, week advance */}
            <TodayBelowFold
              isToday={isToday}
              hasRunSessions={todaySessions.some(s => s?.c?.startsWith('run'))}
              weeklyReport={weeklyReport}
              planDay={viewDate.getDay() === 0 ? 6 : viewDate.getDay() - 1}
              isWeekDone={currentWeek ? currentWeek.days.every((day, dayI) => {
                const realSessions = day.sessions.filter(s => s.c != null && s.c !== 'rest')
                return realSessions.length === 0 || realSessions.every((_, sessI) => {
                  const key = `${weekN}_${dayI}_${sessI}`
                  return logs[key]?.done || !!gymLogs[key]
                })
              }) : false}
              weekN={weekN}
              hasPlanNextWeek={!!(plan && plan.current_week < plan.total_weeks)}
              onReadiness={setReadinessScore}
              onAdvanceWeek={async () => {
                try {
                  await advanceWeek()
                  toastSuccess(`Week ${weekN + 1} started!`)
                  Analytics.weekAdvanced(weekN + 1, plan?.total_weeks ?? 0)
                }
                catch { toastError('Failed to advance week — try again') }
              }}
              logs={logs}
              streak={streak.current}
              acwr={acwrCurrent}
            />
          </>
        )}
        </div>{/* end normal content wrapper */}
      </div>

      {/* Missed session conversational flow */}
      {showMissedFlow && plan && todaySessions.length > 0 && (
        <MissedSessionFlow
          session={todaySessions.find((_, i) => !logs[`${weekN}_${planDayIndex}_${i}`]?.done) ?? todaySessions[0]}
          weekN={weekN}
          planId={plan.id}
          onMarkMissed={() => {
            setShowMissedFlow(false)
          }}
          onClose={() => setShowMissedFlow(false)}
        />
      )}

      <TodayModals
        plan={plan}
        weeks={weeks}
        weekN={weekN}
        planDayIndex={planDayIndex}
        logs={logs}
        modalSession={modalSession}
        focusSession={focusSession}
        shareSession={shareSession}
        showWeeklyShare={showWeeklyShare}
        showAdHocModal={showAdHocModal}
        ceremonyDismissed={ceremonyDismissed}
        undoInfo={undoInfo}
        undoLabel={undoLabel}
        undoXP={undoXP}
        undoSecsLeft={undoSecsLeft}
        newPB={newPB}
        doneTodayCount={doneTodayCount}
        todaySessions={todaySessions}
        setModalSession={setModalSession}
        setFocusSession={setFocusSession}
        setShareSession={setShareSession}
        setShowWeeklyShare={setShowWeeklyShare}
        setShowAdHocModal={setShowAdHocModal}
        setCeremonyDismissed={setCeremonyDismissed}
        handleUndo={handleUndo}
        handleLogSession={handleLogSession}
        toastSuccess={toastSuccess}
        runnerColour={(profile as { runner_colour?: string })?.runner_colour ?? '#06b6d4'}
      />

      {/* NPS prompt — Day 7 and Day 30 triggers */}
      <FirstSessionCelebration
        totalDone={Object.values(allPlanLogs).filter((l: { done?: boolean }) => l.done).length}
        displayName={profile?.display_name ?? null}
        xp={undoXP || 10}
      />
      <NPSPrompt firstSessionAt={(profile as { first_session_logged_at?: string | null })?.first_session_logged_at ?? null} />
      <PushPrompt
        firstSessionAt={(profile as { first_session_logged_at?: string | null })?.first_session_logged_at ?? null}
        displayName={profile?.display_name ?? null}
      />
      {/* P1.1 amendment: leader-nudge moved off celebration → Home pill,
          visible for 30 minutes after the most recent done log. */}
      <NudgeSquadPill mostRecentLogAt={
        Object.values(allPlanLogs)
          .filter((l: { done?: boolean }) => l.done)
          .map((l: { logged_at?: string; created_at?: string }) => l.logged_at ?? l.created_at ?? null)
          .filter((t): t is string => !!t)
          .sort((a, b) => b.localeCompare(a))[0] ?? null
      } />
    </div>
  )
}

