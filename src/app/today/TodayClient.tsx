'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useTrainingLog } from '@/hooks/useTrainingLog'
import { useAllTrainingLogs } from '@/hooks/useAllTrainingLogs'
import { derivePaceZones } from '@/lib/paceZones'
import type { PaceZones } from '@/lib/paceZones'
import { getSessionType, fmtKm, formatDate, offsetDate, decodeHtml, parseDet } from '@/lib/sessionUtils'
import type { PlanDay, PlanSession, PlanWeek, TrainingLog } from '@/types/database'
import { getSessionXP } from '@/lib/rpg'
import { computePersonalBests, checkNewPB } from '@/lib/personalBests'
import { computeStreak, computeConsistency, computeWeeklyReport } from '@/lib/streak'
import { hapticLight, hapticSuccess } from '@/lib/haptics'
import WeatherWidget from '@/components/WeatherWidget'
import WellnessCheckIn from '@/components/WellnessCheckIn'
import FocusMode from '@/components/FocusMode'
import ShareSessionCard from '@/components/ShareSessionCard'
import WeeklyShareCard from '@/components/WeeklyShareCard'
import PlanCompletionCeremony from '@/components/PlanCompletionCeremony'
import StravaSyncButton from '@/components/StravaSyncButton'
import DarkModeToggle from '@/components/DarkModeToggle'
import { useToast } from '@/components/Toast'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import LogModal from '@/components/LogModal'
import SessionCard from '@/components/SessionCard'
import AdHocSessionModal from '@/components/AdHocSessionModal'


export default function TodayClient() {
  const { plan, weeks, currentWeek, loading: planLoading, advanceWeek } = useActivePlan()
  const { logs, logSession, undoSession, loading: logsLoading } = useTrainingLog(plan?.id ?? null)
  const { logs: allPlanLogs } = useAllTrainingLogs()

  const [dateOffset, setDateOffset] = useState(0)
  const [readinessScore, setReadinessScore] = useState<number | null>(null)
  const [modalSession, setModalSession] = useState<{ session: PlanSession; dayI: number; sessI: number; prefillDurationSecs?: number } | null>(null)
  const [focusSession, setFocusSession] = useState<{ session: PlanSession; dayI: number; sessI: number } | null>(null)
  const [undoInfo, setUndoInfo] = useState<{ logId: string; timer: ReturnType<typeof setTimeout> } | null>(null)
  const [undoLabel, setUndoLabel] = useState('')
  const [undoXP, setUndoXP] = useState(0)
  const [newPB, setNewPB] = useState<{ distance: string; timeStr: string } | null>(null)
  const [undoSecsLeft, setUndoSecsLeft] = useState(8)
  const [shareSession, setShareSession] = useState<{ session: PlanSession; log: TrainingLog } | null>(null)
  const [showWeeklyShare, setShowWeeklyShare] = useState(false)
  const [ceremonyDismissed, setCeremonyDismissed] = useState(false)
  const [showAdHocModal, setShowAdHocModal] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast()
  const viewDate = offsetDate(dateOffset)

  // Show notice toasts from query params (e.g. after plan activation)
  useEffect(() => {
    const notice = searchParams.get('notice')
    if (notice === 'race_soon') {
      toastWarning("Race is sooner than the full plan length — we've started from today. Make the most of the time you have!", 6000)
      // Clean the URL without reloading
      router.replace('/today', { scroll: false })
    }
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

  // Clear undo on date change
  useEffect(() => {
    if (undoInfo) {
      clearTimeout(undoInfo.timer)
      setUndoInfo(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateOffset])

  // Undo countdown ticker
  useEffect(() => {
    if (!undoInfo) return
    setUndoSecsLeft(8)
    const interval = setInterval(() => {
      setUndoSecsLeft(s => {
        if (s <= 1) { clearInterval(interval); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [undoInfo])

  const handleLogSession = useCallback(async (params: {
    week_n: number; day_i: number; session_i: number; done: boolean
    effort?: number; km?: number; notes?: string; duration_secs?: number; hr?: number; pace?: string
  }) => {
    if (!plan) return
    let log: Awaited<ReturnType<typeof logSession>>
    try {
      log = await logSession({ plan_id: plan.id, ...params })
    } catch {
      toastError('Failed to save — check your connection and try again')
      return
    }
    hapticLight()

    // Check for new personal best — auto-calculate pace if not explicitly provided
    if (params.km && params.done) {
      // Derive pace from duration if not provided
      let effectivePace = params.pace
      if (!effectivePace && params.duration_secs && params.km > 0) {
        const secsPerKm = params.duration_secs / params.km
        const m = Math.floor(secsPerKm / 60)
        const s = Math.round(secsPerKm % 60)
        effectivePace = `${m}:${String(s).padStart(2, '0')}`
      }
      if (effectivePace) {
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
    }

    if (undoInfo) clearTimeout(undoInfo.timer)
    const session = planDay?.sessions[params.session_i]
    setUndoLabel(session?.n ?? 'session')
    setUndoXP(session ? getSessionXP(session.c) : 10)
    const timer = setTimeout(() => setUndoInfo(null), 8000)
    setUndoInfo({ logId: log.id, timer })
    if (session) setShareSession({ session, log })
  }, [plan, logSession, undoInfo, planDay, logs])

  const handleQuickDone = useCallback(async (dayI: number, sessI: number, session: PlanSession) => {
    const key = `${weekN}_${dayI}_${sessI}`
    const existing = logs[key]
    // If already done, open edit modal instead
    if (existing?.done) {
      setModalSession({ session, dayI, sessI })
      return
    }
    await handleLogSession({ week_n: weekN, day_i: dayI, session_i: sessI, done: true, km: session.km || undefined })
  }, [weekN, logs, handleLogSession])

  const handleUndo = useCallback(async () => {
    if (!undoInfo) return
    clearTimeout(undoInfo.timer)
    try {
      await undoSession(undoInfo.logId)
    } catch {
      toastError('Could not undo — session may already be saved')
    }
    setUndoInfo(null)
  }, [undoInfo, undoSession, toastError])

  const loading = planLoading || logsLoading

  // Count done sessions today
  const todaySessions = planDay?.sessions ?? []
  const doneTodayCount = todaySessions.filter((_, i) => logs[`${weekN}_${planDayIndex}_${i}`]?.done).length

  // Streak + consistency
  const allLogsArray = Object.values(logs)
  const paceZones = useMemo(() => derivePaceZones(Object.values(allPlanLogs)), [allPlanLogs])
  const streak = computeStreak(allLogsArray)
  const consistency = plan ? computeConsistency(allLogsArray, weeks, weekN) : { thisWeekPct: 0, last4WeekPct: 0 }

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
      className="min-h-screen bg-[#f8f8f6] pb-24"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-bold text-gray-900">NextSplit</span>
            <div className="flex items-center gap-2">
              {/* Streak pill */}
              {streak.current > 0 && (
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                  streak.current >= 7 ? 'bg-amber-100 text-amber-700' :
                  streak.current >= 3 ? 'bg-orange-50 text-orange-600' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  🔥 {streak.current}
                </span>
              )}
              {plan && (
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-[11px] text-gray-500 font-semibold">
                    W{weekN}/{plan.total_weeks}
                  </span>
                  <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (weekN / plan.total_weeks) >= 0.8 ? 'bg-emerald-400' : 'bg-teal-500'
                      }`}
                      style={{ width: `${(weekN / plan.total_weeks) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              {plan && todaySessions.length > 0 && isToday && (
                <span className={`text-xs font-semibold ${doneTodayCount === todaySessions.length ? 'text-emerald-500' : 'text-gray-400'}`}>
                  {doneTodayCount}/{todaySessions.length} done
                </span>
              )}
              <DarkModeToggle />
            </div>
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDateOffset(o => o - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-lg font-light"
            >‹</button>
            <div className="flex-1 text-center">
              <div className="text-sm font-semibold text-gray-900">
                {isToday ? 'Today' : dateOffset === -1 ? 'Yesterday' : dateOffset === 1 ? 'Tomorrow' : formatDate(viewDate)}
              </div>
              <div className="text-[11px] text-gray-400">{formatDate(viewDate)}</div>
            </div>
            <button
              onClick={() => setDateOffset(o => o + 1)}
              disabled={dateOffset >= 0}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-lg font-light disabled:opacity-30"
            >›</button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-3">

        {/* No plan state */}
        {!loading && !plan && (() => {
          const hadPlan = typeof window !== 'undefined' && !!localStorage.getItem('nextsplit_plan_completed')
          return (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <div className="text-5xl mb-4">{hadPlan ? '🎉' : '🏃'}</div>
              <h2 className="text-base font-bold text-gray-900 mb-2">
                {hadPlan ? 'Plan complete — what\'s next?' : 'No active plan'}
              </h2>
              <p className="text-sm text-gray-500 mb-5">
                {hadPlan
                  ? 'Amazing work finishing your plan. Ready to pick your next challenge?'
                  : 'Choose a training plan to get started.'}
              </p>
              <a href="/onboarding" className="inline-block bg-[#0D9488] text-white px-6 py-3 rounded-xl text-sm font-semibold">
                {hadPlan ? 'Start next plan →' : 'Choose a plan →'}
              </a>
              {hadPlan && (
                <div className="mt-3">
                  <a href="/profile" className="text-xs text-gray-400 underline">View your history</a>
                </div>
              )}
            </div>
          )
        })()}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {/* Sessions */}
        {!loading && plan && (
          <>
            {/* Week note chip — compact, shown at top on today only */}
            {isToday && currentWeek?.note && (
              <div className="bg-amber-50 rounded-2xl border border-amber-100 px-4 py-3 flex items-start gap-2.5">
                <span className="text-base mt-0.5">📋</span>
                <div>
                  <p className="text-[11px] font-bold text-amber-800 mb-0.5 uppercase tracking-wide">
                    Week {weekN} · {currentWeek.title}
                  </p>
                  <p className="text-xs text-amber-700 leading-relaxed">{currentWeek.note}</p>
                </div>
              </div>
            )}

            {/* Rest day or no sessions */}
            {todaySessions.length === 0 && (() => {
              // Check if there are gym sessions on this day in the plan
              const gymSessions = planDay?.sessions?.filter((s: PlanSession) => s?.c?.startsWith('gym')) ?? []
              if (gymSessions.length > 0) {
                return (
                  <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">🏋️</span>
                      <p className="text-sm font-bold text-gray-900">Gym day</p>
                      <span className="text-[10px] text-gray-400 ml-auto">No run today</span>
                    </div>
                    <div className="space-y-2">
                      {gymSessions.map((s: PlanSession, i: number) => (
                        <button key={i}
                          onClick={() => router.push(`/gym/live/${weekN}/${planDayIndex}/${i}`)}
                          className="w-full flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-left">
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
                <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
                  <div className="text-4xl mb-3">😴</div>
                  <p className="text-sm font-semibold text-gray-700">Rest day</p>
                  <p className="text-xs text-gray-400 mt-1">Recovery is training too.</p>
                </div>
              )
            })()}

            {/* Session timing row */}
            {planDay && planDay.times && planDay.times.length > 0 && (
              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Scheduled</span>
                {planDay.times.map((t, i) => (
                  <span key={i} className="text-[11px] bg-white border border-gray-100 rounded-full px-2.5 py-0.5 text-gray-600 font-medium">
                    {t.t} {t.l}
                  </span>
                ))}
              </div>
            )}

            {/* ── HERO: Session cards ─────────────────────────────────── */}
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
                      <StravaSyncButton
                        session={session}
                        weekN={weekN}
                        dayIndex={planDayIndex}
                        sessionIndex={sessI}
                        planId={plan.id}
                        onImported={async (effort, km, pace, duration_secs, hr) => {
                          await handleLogSession({
                            week_n: weekN,
                            day_i: planDayIndex,
                            session_i: sessI,
                            done: true,
                            effort,
                            km,
                            duration_secs,
                            hr: hr ?? undefined,
                            pace: pace ?? undefined,
                            notes: `Imported from Strava`,
                          })
                        }}
                      />
                    </div>
                  )}
                </div>
              )
            })}

            {/* Low readiness suggestion — shown only when readiness ≤5 */}
            {isToday && readinessScore !== null && readinessScore <= 5 && todaySessions.length > 0 && (() => {
              const isVeryLow = readinessScore <= 3
              const hasRunSessions = todaySessions.some(s => s?.c?.startsWith('run'))
              return (
                <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4">
                  <div className="flex items-start gap-2.5 mb-3">
                    <span className="text-base mt-0.5">🔄</span>
                    <div>
                      <p className="text-[11px] font-bold text-amber-800 mb-0.5">Low readiness today</p>
                      <p className="text-xs text-amber-700 leading-relaxed">
                        {isVeryLow
                          ? 'Readiness is very low. Recovery is training — a bad day forced is two bad days.'
                          : 'Consider modifying today\'s session. Your body is telling you something.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {hasRunSessions && !isVeryLow && (
                      <button
                        onClick={() => {
                          todaySessions.forEach((session, sessI) => {
                            if (session.c?.startsWith('run') && !logs[`${weekN}_${planDayIndex}_${sessI}`]?.done) {
                              handleLogSession({ week_n: weekN, day_i: planDayIndex, session_i: sessI, done: true, effort: 4, km: Math.round(session.km * 0.8) || undefined, notes: 'Adapted — low readiness day' })
                            }
                          })
                        }}
                        className="w-full py-2 rounded-xl bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold"
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
                      className="w-full py-2 rounded-xl bg-white border border-amber-200 text-amber-700 text-xs font-semibold"
                    >
                      😴 Rest instead (log as complete)
                    </button>
                    <button
                      onClick={() => setReadinessScore(6)}
                      className="w-full py-1.5 text-[10px] text-amber-500 font-medium"
                    >
                      Keep original plan →
                    </button>
                  </div>
                </div>
              )
            })()}

            {/* All done celebration */}
            {isToday && todaySessions.length > 0 && doneTodayCount === todaySessions.length && (
              <div className="bg-emerald-50 rounded-2xl border border-emerald-100 px-4 py-4 text-center">
                <div className="text-2xl mb-1">🎉</div>
                <p className="text-sm font-bold text-emerald-700">All done for today!</p>
                <p className="text-xs text-emerald-600 mt-0.5">Great work. Rest and recover well.</p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <button
                      onClick={() => {
                        const sessionNames = todaySessions.map(s => s.n).join(', ')
                        navigator.share({
                          title: 'NextSplit — Training done ✓',
                          text: `Just completed today's training: ${sessionNames}. ${weekN > 1 ? `Week ${weekN} in progress.` : 'Day 1 done!'} 🏃`,
                        }).catch(() => {})
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-white border border-emerald-200 px-3 py-1.5 rounded-full"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Share
                    </button>
                  )}
                  <button
                    onClick={() => setShowWeeklyShare(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 bg-white border border-teal-200 px-3 py-1.5 rounded-full"
                  >
                    📊 Week card
                  </button>
                </div>
              </div>
            )}

            {/* Missed session suggestion — past days with incomplete sessions */}
            {!isToday && dateOffset < 0 && todaySessions.length > 0 && doneTodayCount < todaySessions.length && (
              <div className="bg-amber-50 rounded-2xl border border-amber-100 px-4 py-3 flex items-start gap-2.5">
                <span className="text-base mt-0.5">💡</span>
                <div>
                  <p className="text-[11px] font-bold text-amber-800 mb-0.5">Missed {todaySessions.length - doneTodayCount} session{todaySessions.length - doneTodayCount > 1 ? 's' : ''}</p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    You can still log these — tap the ✓ to mark them done. Or skip and keep moving.
                  </p>
                </div>
              </div>
            )}

            {/* Sleep note */}
            {planDay?.sleep && (
              <div className="bg-teal-50 rounded-2xl border border-teal-100 px-4 py-3 flex items-start gap-2.5">
                <span className="text-base mt-0.5">🌙</span>
                <p className="text-xs text-teal-700 leading-relaxed">{planDay.sleep}</p>
              </div>
            )}

            {/* Add ad-hoc session */}
            {isToday && (
              <button
                onClick={() => setShowAdHocModal(true)}
                className="w-full flex items-center gap-3 border border-dashed border-gray-200 rounded-2xl px-4 py-3 text-left hover:border-teal-300 hover:bg-teal-50/40 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-lg font-light flex-shrink-0">+</div>
                <div>
                  <p className="text-xs font-semibold text-gray-600">Add a session</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Log extra work that wasn't in your plan</p>
                </div>
              </button>
            )}

            {/* Contextual fuel card — secondary, below the fold */}
            {isToday && planDay && planDay.nut && planDay.nut.length > 0 && (() => {
              const now = new Date()
              const currentHour = now.getHours() + now.getMinutes() / 60

              function parseHour(t: string): number | null {
                const m = t.match(/^(\d{1,2}):(\d{2})/)
                if (m) return parseInt(m[1]) + parseInt(m[2]) / 60
                if (/wake|morning/i.test(t)) return 6
                if (/lunch/i.test(t)) return 12
                if (/dinner|evening/i.test(t)) return 18
                if (/during/i.test(t)) return currentHour
                return null
              }

              const nutByPriority = planDay.nut
                .map(n => ({ ...n, hour: parseHour(n.t) }))
                .filter(n => {
                  if (n.cat === 'macro') return false
                  if (n.hour === null) return true
                  return n.hour >= currentHour - 0.5 && n.hour <= currentHour + 4
                })
                .sort((a, b) => (a.hour ?? 99) - (b.hour ?? 99))
                .slice(0, 4)

              const macroEntry = planDay.nut.find(n => n.cat === 'macro')
              if (nutByPriority.length === 0 && !macroEntry) return null

              const catStyle: Record<string, { bg: string; icon: string; text: string; dot: string }> = {
                hydration: { bg: 'bg-blue-50',   icon: '💧', text: 'text-blue-800',   dot: 'bg-blue-300'   },
                food:      { bg: 'bg-green-50',  icon: '🍽️', text: 'text-green-800',  dot: 'bg-green-300'  },
                fuel:      { bg: 'bg-amber-50',  icon: '⚡',  text: 'text-amber-800',  dot: 'bg-amber-300'  },
                info:      { bg: 'bg-gray-50',   icon: 'ℹ️', text: 'text-gray-600',   dot: 'bg-gray-300'   },
                macro:     { bg: 'bg-purple-50', icon: '📊', text: 'text-purple-800', dot: 'bg-purple-300' },
              }

              return (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🍽️</span>
                      <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">Today&apos;s fuel plan</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Next {nutByPriority.length > 0 ? nutByPriority.length : ''} entries</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {nutByPriority.map((n, i) => {
                      const s = catStyle[n.cat] ?? catStyle.food
                      return (
                        <div key={i} className={`px-4 py-2.5 flex items-start gap-2.5 ${s.bg}`}>
                          <span className="text-base flex-shrink-0 mt-0.5">{s.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold ${s.text}`}>{decodeHtml(n.t)}</span>
                              <span className={`text-[11px] font-semibold ${s.text}`}>{decodeHtml(n.l)}</span>
                            </div>
                            <p className={`text-[11px] leading-relaxed ${s.text} opacity-80 mt-0.5`}>{decodeHtml(n.d)}</p>
                          </div>
                        </div>
                      )
                    })}
                    {macroEntry && (
                      <div className="px-4 py-2.5 flex items-center gap-2.5 bg-purple-50">
                        <span className="text-base flex-shrink-0">📊</span>
                        <div>
                          <div className="text-[10px] font-bold text-purple-700 mb-0.5">Daily targets</div>
                          <p className="text-[11px] text-purple-800 font-medium">{decodeHtml(macroEntry.d)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Wellness check-in — below the fold */}
            {isToday && <WellnessCheckIn onReadiness={setReadinessScore} />}

            {/* Weather — below the fold, running sessions only */}
            {isToday && todaySessions.some(s => s?.c?.startsWith('run')) && (
              <WeatherWidget />
            )}

            {/* Monday weekly report — below the fold */}
            {isToday && weeklyReport && (() => {
              const r = weeklyReport
              const vsArrow = r.vsLastWeek === 'up' ? '↑' : r.vsLastWeek === 'down' ? '↓' : '→'
              const vsColour = r.vsLastWeek === 'up' ? 'text-emerald-600' : r.vsLastWeek === 'down' ? 'text-red-500' : 'text-gray-500'
              return (
                <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl border border-teal-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-teal-100/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-teal-800 uppercase tracking-wide">Week {r.weekN} · {r.weekTitle}</p>
                        <p className="text-xs text-teal-600 mt-0.5">Your weekly report</p>
                      </div>
                      <span className="text-2xl">{r.completionPct >= 90 ? '🌟' : r.completionPct >= 60 ? '✅' : '💪'}</span>
                    </div>
                  </div>
                  <div className="px-4 py-3 grid grid-cols-3 gap-3 border-b border-teal-100/30">
                    <div className="text-center">
                      <div className="text-lg font-black text-teal-900">{r.completionPct}%</div>
                      <div className="text-[10px] text-teal-500">sessions done</div>
                      <div className="text-[9px] text-teal-400">{r.sessionsDone}/{r.sessionsPlanned}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-black text-teal-900">{r.kmLogged}</div>
                      <div className="text-[10px] text-teal-500">km logged</div>
                      <div className="text-[9px] text-teal-400">of {r.kmPlanned} planned</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-black ${vsColour}`}>{vsArrow} {r.lastWeekKm > 0 ? Math.abs(Math.round((r.kmLogged - r.lastWeekKm) * 10) / 10) : '—'}</div>
                      <div className="text-[10px] text-teal-500">vs prev week</div>
                      {r.avgEffort && <div className="text-[9px] text-teal-400">RPE {r.avgEffort} avg</div>}
                    </div>
                  </div>
                  {(r.bestSession || r.lookAheadNote) && (
                    <div className="px-4 py-3 space-y-1.5">
                      {r.bestSession && (
                        <p className="text-xs text-teal-700">
                          <span className="font-semibold">Best session:</span> {r.bestSession}
                        </p>
                      )}
                      {r.lookAheadNote && (
                        <p className="text-xs text-teal-600 leading-relaxed line-clamp-2">
                          <span className="font-semibold">This week:</span> {r.lookAheadNote}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Sunday coach banner — below the fold */}
            {isToday && viewDate.getDay() === 0 && plan && plan.current_week < plan.total_weeks && (
              <div className="bg-teal-50 rounded-2xl border border-teal-100 px-4 py-3 flex items-start gap-2.5">
                <span className="text-base mt-0.5">🗓️</span>
                <div>
                  <p className="text-[11px] font-bold text-teal-800 mb-0.5">Week {weekN} complete!</p>
                  <p className="text-xs text-teal-700 leading-relaxed">
                    Good work this week. Week {weekN + 1} starts tomorrow — check the Plan tab to see what&apos;s ahead.
                  </p>
                </div>
              </div>
            )}
            {/* Tomorrow's sessions preview — shown when today is all done */}
            {isToday && todaySessions.length > 0 && doneTodayCount === todaySessions.length && (() => {
              const tomorrowDayIndex = (planDayIndex + 1) % 7
              // On Sunday (planDayIndex=6), tomorrow wraps to next week's Monday
              const isLastDayOfWeek = planDayIndex === 6
              const nextWeekN = weekN + 1
              const nextWeekData = currentWeek && isLastDayOfWeek
                ? (plan.weeks_data as PlanWeek[] | null)?.find(w => w.n === nextWeekN) ?? null
                : null
              const tomorrowSessions = isLastDayOfWeek
                ? (nextWeekData?.days?.[0]?.sessions ?? [])
                : (currentWeek?.days[tomorrowDayIndex]?.sessions ?? [])
              if (tomorrowSessions.length === 0) return null
              return (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-50 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Tomorrow</span>
                    {isLastDayOfWeek && nextWeekData && (
                      <span className="text-[10px] text-gray-400">· Week {nextWeekN}</span>
                    )}
                  </div>
                  <div className="px-4 py-3 space-y-1.5">
                    {(tomorrowSessions as PlanSession[]).map((s, i) => {
                      const cfg = getSessionType(s.c)
                      return (
                        <div key={i} className="flex items-center gap-2.5">
                          <span className={`w-7 h-7 rounded-lg ${cfg.colour} flex items-center justify-center text-sm flex-shrink-0`}>
                            {cfg.emoji}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-semibold text-gray-800">{s.n}</span>
                            {s.km > 0 && <span className="text-[10px] text-gray-400 ml-1.5">{fmtKm(s.km)}</span>}
                          </div>
                          <span className={`text-[10px] font-semibold ${cfg.textColour}`}>{cfg.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
            {/* Week complete → advance prompt */}
            {isToday && plan && plan.current_week < plan.total_weeks && (() => {
              // Check if the entire current week is done
              const weekDone = currentWeek ? currentWeek.days.every((day, dayI) =>
                day.sessions.length === 0 || day.sessions.every((_, sessI) =>
                  logs[`${weekN}_${dayI}_${sessI}`]?.done
                )
              ) : false
              if (!weekDone) return null
              return (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-emerald-700">Week {weekN} complete! 🎉</p>
                      <p className="text-xs text-emerald-600 mt-0.5">Ready to move to Week {weekN + 1}?</p>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await advanceWeek()
                          toastSuccess(`Week ${weekN + 1} started!`)
                        } catch {
                          toastError('Failed to advance week — try again')
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold flex-shrink-0"
                    >
                      Next week →
                    </button>
                  </div>
                </div>
              )
            })()}
          </>
        )}
      </div>

      {/* Undo toast with countdown */}
      {undoInfo && (
        <div className="fixed bottom-24 left-4 right-4 max-w-lg mx-auto z-50 animate-slide-up" role="status" aria-live="polite" aria-atomic="true">
          <div className="bg-gray-900 text-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-xl">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm">✓ <span className="font-medium">{undoLabel}</span></span>
                <span className="text-xs font-bold text-[#34D399] bg-[#34D399]/10 px-2 py-0.5 rounded-full">
                  +{undoXP} XP
                </span>
              </div>
              <div className="h-0.5 bg-white/20 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-1000"
                  style={{ width: `${(undoSecsLeft / 8) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 ml-5 shrink-0">
              <button
                onClick={() => shareSession && setShareSession(shareSession)}
                className="text-sm font-bold text-blue-400"
              >
                Share
              </button>
              <button
                onClick={handleUndo}
                className="text-sm font-bold text-[#34D399]"
              >
                Undo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PB Toast */}
      {newPB && (
        <div className="fixed bottom-24 left-4 right-4 max-w-lg mx-auto z-50 pointer-events-none">
          <div className="relative animate-slide-up">
            {/* Confetti particles */}
            <span className="absolute top-0 left-1/2 w-2 h-2 rounded-sm bg-yellow-400 opacity-0" style={{ animation: 'confetti-fall-1 0.8s 0.1s ease-out forwards' }} />
            <span className="absolute top-0 left-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-0" style={{ animation: 'confetti-fall-2 0.8s 0.15s ease-out forwards' }} />
            <span className="absolute top-0 left-1/2 w-2 h-1 rounded-sm bg-teal-400 opacity-0" style={{ animation: 'confetti-fall-3 0.9s 0.05s ease-out forwards' }} />
            <span className="absolute top-0 left-1/2 w-1.5 h-1.5 rounded-full bg-amber-300 opacity-0" style={{ animation: 'confetti-fall-4 0.85s 0.2s ease-out forwards' }} />
            <span className="absolute top-0 left-1/2 w-1 h-2 rounded-sm bg-red-400 opacity-0" style={{ animation: 'confetti-fall-5 0.75s 0.1s ease-out forwards' }} />
            <span className="absolute top-0 left-1/2 w-2 h-1 rounded-full bg-orange-400 opacity-0" style={{ animation: 'confetti-fall-6 0.9s 0.0s ease-out forwards' }} />

            <div className="bg-gradient-to-r from-yellow-400 to-amber-400 text-white rounded-2xl px-4 py-3 shadow-2xl">
              <div className="flex items-center gap-3">
                <span className="text-3xl animate-bounce">🏆</span>
                <div>
                  <div className="text-sm font-black tracking-wide">New Personal Best!</div>
                  <div className="text-xs font-semibold opacity-90">{newPB.distance} · {newPB.timeStr}</div>
                </div>
                <div className="ml-auto text-xs font-bold bg-white/20 rounded-full px-2 py-0.5">PB ✓</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Focus mode */}
      {focusSession && plan && (
        <FocusMode
          session={focusSession.session}
          isLogged={!!logs[`${weekN}_${focusSession.dayI}_${focusSession.sessI}`]?.done}
          onClose={() => setFocusSession(null)}
          onLog={(elapsedSecs) => {
            setFocusSession(null)
            setModalSession({ ...focusSession, prefillDurationSecs: elapsedSecs })
          }}
        />
      )}

      {/* Log modal */}
      {modalSession && plan && (
        <LogModal
          session={modalSession.session}
          dayIndex={modalSession.dayI}
          sessionIndex={modalSession.sessI}
          weekN={weekN}
          planId={plan.id}
          existingLog={logs[`${weekN}_${modalSession.dayI}_${modalSession.sessI}`] ?? null}
          prefillDurationSecs={modalSession.prefillDurationSecs}
          onClose={() => setModalSession(null)}
          onSave={handleLogSession}
        />
      )}

      {/* Weekly share card modal */}
      {showWeeklyShare && plan && (
        <WeeklyShareCard
          weekN={weekN}
          totalWeeks={plan.total_weeks}
          sessionsDone={doneTodayCount}
          sessionsPlanned={todaySessions.length}
          kmLogged={Object.values(logs).filter(l => l.done && l.week_n === weekN).reduce((a, l) => a + (l.km ?? 0), 0)}
          streak={computeStreak(Object.values(logs)).current}
          xpEarned={Object.values(logs).filter(l => l.done && l.week_n === weekN).reduce((a, l) => {
            const w = weeks.find(wk => wk.n === l.week_n)
            const s = w?.days[l.day_i]?.sessions[l.session_i]
            return a + getSessionXP(s?.c ?? 'run-easy')
          }, 0)}
          planName={plan.name}
          onClose={() => setShowWeeklyShare(false)}
        />
      )}

      {/* Share session card modal */}
      {shareSession && (
        <ShareSessionCard
          session={shareSession.session}
          log={shareSession.log}
          weekN={weekN}
          onClose={() => setShareSession(null)}
        />
      )}

      {/* Ad-hoc session modal */}
      {showAdHocModal && plan && (
        <AdHocSessionModal
          planId={plan.id}
          weekN={weekN}
          dayIndex={planDayIndex}
          onClose={() => setShowAdHocModal(false)}
          onSaved={() => { setShowAdHocModal(false); toastSuccess('Session added ✓') }}
        />
      )}

      {/* Plan completion ceremony */}
      {plan?.status === 'completed' && !ceremonyDismissed && (
        <PlanCompletionCeremony
          plan={plan}
          logs={logs}
          onClose={() => setCeremonyDismissed(true)}
        />
      )}
    </div>
  )
}

// ─── Ad-hoc Session Modal ─────────────────────────────────────────────────────