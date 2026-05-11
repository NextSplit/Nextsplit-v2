'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useTrainingLog } from '@/hooks/useTrainingLog'
import { useAllTrainingLogs } from '@/hooks/useAllTrainingLogs'
import { useProfile } from '@/hooks/useProfile'
import { useWellness } from '@/hooks/useWellness'
import { useToast } from '@/components/Toast'
import { computeStreak } from '@/lib/streak'
import { calcACWR } from '@/lib/statsUtils'
import { getSessionXP } from '@/lib/rpg'
import { Analytics } from '@/lib/analytics'
import WeekRow from '@/components/plan/WeekRow'
import { TodayModals } from '../today/TodayModals'
import type { PlanSession, TrainingLog, PlanWeek } from '@/types/database'
import SessionCelebration from '@/components/SessionCelebration'
import Week3Reanchor from '@/components/Week3Reanchor'
import { DeloadAlternativeCard } from '@/components/DeloadAlternativeCard'
import { shareSessionWithSquadAction } from '@/app/today/actions'
import PlanCompletionCeremony from '@/components/PlanCompletionCeremony'
import PreRunBrief from '@/components/PreRunBrief'
import { MyCoachBanner } from '@/components/coach/MyCoachBanner'
import { EliteTriggerBanner } from '@/components/EliteTriggerBanner'
import MilestoneCard, { MILESTONES } from '@/components/MilestoneCard'
import PlanPathSVG from '@/components/plan/PlanPathSVG'
import { TodaySessionCard } from './TodaySessionCard'
import { TrainStatsStrip } from './TrainStatsStrip'
import { TrainHeader } from './TrainHeader'
import { TrainNoPlanState } from './TrainNoPlanState'
import { WeekDetailSheet } from './WeekDetailSheet'
import { TrainFuelTab } from './TrainFuelTab'
import { TrainBanners } from './TrainBanners'

export default function TrainClient() {
  const router = useRouter()
  const { plan, weeks, currentWeek, loading, advanceWeek } = useActivePlan()
  const { logs, logSession, undoSession } = useTrainingLog(plan?.id ?? null)
  const { logs: allLogs } = useAllTrainingLogs()
  const { profile } = useProfile()
  const { today: wellnessToday } = useWellness()
  const { success: toastSuccess, error: toastError } = useToast()

  // Modal state
  const [modalSession, setModalSession]   = useState<{ session: PlanSession; dayI: number; sessI: number; weekN?: number; prefillDurationSecs?: number } | null>(null)
  const [focusSession, setFocusSession]   = useState<{ session: PlanSession; dayI: number; sessI: number } | null>(null)
  const [shareSession, setShareSession]   = useState<{ session: PlanSession; log: TrainingLog } | null>(null)
  const [showAdHocModal, setShowAdHocModal] = useState(false)
  const [ceremonyDismissed, setCeremonyDismissed] = useState(false)
  const [undoInfo, setUndoInfo] = useState<{ logId: string; timer: ReturnType<typeof setTimeout> } | null>(null)
  const [undoLabel, setUndoLabel] = useState('')
  const [undoXP, setUndoXP] = useState(0)
  const [undoSecsLeft, setUndoSecsLeft] = useState(0)
  const [newPB, setNewPB] = useState<{ distance: string; timeStr: string } | null>(null)
  const [celebration, setCelebration] = useState<{
    session:      PlanSession
    log:          TrainingLog
    xpEarned:     number
    acwr?:        number | null
    feedCardIds?: string[]
    feedError?:   string | null
  } | null>(null)
  const [tappedWeek, setTappedWeek] = useState<PlanWeek | null>(null)
  const [showCompletion, setShowCompletion] = useState(false)
  const [briefSession, setBriefSession]   = useState<typeof modalSession>(null)
  const [milestone, setMilestone]         = useState<keyof typeof MILESTONES | null>(null)
  const [planTab, setPlanTab] = useState<'plan' | 'fuel'>('plan')
  const [planView, setPlanView] = useState<'path' | 'list'>('path')
  const [showReanchor, setShowReanchor] = useState(false)

  const weekRefs = useRef<Map<number, { current: HTMLDivElement | null }>>(new Map())

  // Derived
  const todayDayIndex = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1 })()
  const todaySessions: PlanSession[] = currentWeek?.days[todayDayIndex]?.sessions?.filter((s: PlanSession) => s.c && s.c !== 'rest') ?? []
  const weekN = plan?.current_week ?? 1
  const doneTodayCount = todaySessions.filter((_, i) => logs[`${weekN}_${todayDayIndex}_${i}`]?.done).length

  // Weekly km
  const weeklyKm = (() => {
    const mon = new Date(); mon.setDate(mon.getDate() - (mon.getDay() === 0 ? 6 : mon.getDay() - 1)); mon.setHours(0,0,0,0)
    return Object.values(logs).filter((l: TrainingLog) => !!l.done && new Date(l.created_at) >= mon)
      .reduce((s: number, l: TrainingLog) => s + (l.km ?? 0), 0)
  })()

  // P2.7 Third-Week Hold-the-Line: trigger the re-anchor once per plan when
  // the user reaches week 3. Persist the seen-state in localStorage keyed
  // on plan.id so it doesn't re-fire on every session resume.
  useEffect(() => {
    if (!plan?.id) return
    if ((plan.current_week ?? 0) !== 3) return
    if (allLogs.filter((l: TrainingLog) => l.done).length === 0) return
    const seenKey = `nextsplit_reanchor_seen_${plan.id}`
    try {
      if (localStorage.getItem(seenKey) === '1') return
      setShowReanchor(true)
      localStorage.setItem(seenKey, '1')
    } catch { /* localStorage unavailable */ }
  }, [plan?.id, plan?.current_week, allLogs])

  const totalXP = allLogs.filter((l: TrainingLog) => l.done).length * 15
  const streak = computeStreak(allLogs.map((l: TrainingLog) => ({ logged_at: l.created_at, done: l.done }))).current

  // P4.3 four_weeks trigger — distinct ISO weeks with at least one done log
  // inside the last 28 days. Threshold ≥ 4 weeks.
  const fourWeeksLogged = (() => {
    const cutoff = Date.now() - 28 * 24 * 3600 * 1000
    const weekKeys = new Set<string>()
    for (const l of allLogs as TrainingLog[]) {
      if (!l.done) continue
      const ts = new Date(l.created_at).getTime()
      if (ts < cutoff) continue
      const d = new Date(l.created_at)
      const yr = d.getUTCFullYear()
      const start = Date.UTC(yr, 0, 1)
      const wk = Math.floor((d.getTime() - start) / (7 * 24 * 3600 * 1000))
      weekKeys.add(`${yr}-${wk}`)
    }
    return weekKeys.size >= 4
  })()

  const acwr = (() => {
    if (!weeks.length || !allLogs.length) return null
    const logsArr = Object.values(logs).filter((l: TrainingLog) => !!l.done)
    if (!logsArr.length) return null
    const weekKm = logsArr.reduce((s, l) => s + (l.km ?? 0), 0)
    const prevWeekKm = allLogs.filter((l: TrainingLog) => {
      const d = new Date(l.created_at); const now = new Date()
      const daysAgo = (now.getTime() - d.getTime()) / 86400000
      return l.done && daysAgo >= 7 && daysAgo < 14
    }).reduce((s: number, l: TrainingLog) => s + (l.km ?? 0), 0)
    if (!prevWeekKm) return null
    return weekKm / prevWeekKm
  })()

  const completedWeeks = weeks.filter((w: PlanWeek) => w.n < weekN)
  const upcomingWeeks  = weeks.filter((w: PlanWeek) => w.n > weekN)

  async function handleLogSession(params: {
    week_n: number; day_i: number; session_i: number; done: boolean
    effort?: number; km?: number; notes?: string; duration_secs?: number; hr?: number; pace?: string
  }) {
    if (!plan) return
    try {
      const log = await logSession({ ...params, plan_id: plan.id })
      if (log) {
        const session = currentWeek?.days[params.day_i]?.sessions[params.session_i]
        const xp = getSessionXP(session?.c ?? 'easy')
        setUndoLabel(session?.n ?? 'Session')
        setUndoXP(xp)
        setUndoSecsLeft(8)
        const timer = setTimeout(() => setUndoInfo(null), 8000)
        setUndoInfo({ logId: log.id, timer })
        if (log.done && session) {
          // ACWR-band gated copy: compute the most-recent ACWR figure once,
          // pass into celebration for the Splity reaction line. SessionCele-
          // bration only cites the figure when 0.8 ≤ acwr ≤ 1.3.
          const acwrSeries = calcACWR(allLogs, weeks)
          const acwr = acwrSeries.length > 0
            ? acwrSeries[acwrSeries.length - 1].acwr
            : null

          // logCompleted analytics event — fired for every session log,
          // carries the loop-funnel context (squad_count is hydrated to 0
          // here; the RPC fan-out is the source of truth for squad reach
          // and surfaces via feedCardIds.length below).
          Analytics.logCompleted({
            km:                    params.km,
            effort:                params.effort,
            session_type:          session.c,
            squad_count:           0,
            share_logs_with_squad: true,
            week_number:           params.week_n,
          })

          setShareSession({ session, log })
          setCelebration({ session, log, xpEarned: xp, acwr })

          // P1.1 squad-feed fan-out — fire async; celebration shows immediately
          // and the feed-card preview / empty-state arrives when the RPC
          // resolves.
          shareSessionWithSquadAction(log.id).then(({ feedCardIds, error }) => {
            setCelebration(prev => prev && prev.log.id === log.id
              ? { ...prev, feedCardIds, feedError: error }
              : prev
            )
            if (feedCardIds.length > 0) {
              Analytics.logCompleted({
                km:                    params.km,
                effort:                params.effort,
                session_type:          session.c,
                squad_count:           feedCardIds.length,
                share_logs_with_squad: true,
                week_number:           params.week_n,
              })
            }
          }).catch(() => {
            setCelebration(prev => prev && prev.log.id === log.id
              ? { ...prev, feedCardIds: [], feedError: 'network' }
              : prev
            )
          })
          // Detect milestones
          const totalDone = allLogs.filter((l: TrainingLog) => l.done).length + 1
          const totalKm = allLogs.filter((l: TrainingLog) => l.done).reduce((s: number, l: TrainingLog) => s + (l.km ?? 0), 0) + (params.km ?? 0)
          if (totalDone === 1) setMilestone('first_session')
          else if (totalKm >= 100 && totalKm - (params.km ?? 0) < 100) setMilestone('km_100')
          else if (streak === 7) setMilestone('streak_7')
          else if (streak === 30) setMilestone('streak_30')

          // Check if final week is now complete
          const isFinalWeek = plan.current_week === plan.total_weeks
          if (isFinalWeek && plan.total_weeks > 0) {
            const finalWeek = weeks.find((w: PlanWeek) => w.n === plan.current_week)
            if (finalWeek) {
              const allSessions = finalWeek.days.flatMap((d) => d.sessions?.filter(s => s.c && s.c !== 'rest') ?? [])
              const allDone = allSessions.every((_, sIdx) => {
                const dIdx = finalWeek.days.findIndex(d => (d.sessions ?? []).some((_, si) => si === sIdx))
                return logs[`${plan.current_week}_${dIdx}_${sIdx}`]?.done
              })
              if (allDone && allSessions.length > 0) {
                setTimeout(() => {
                  setShowCompletion(true)
                  advanceWeek().catch(() => {})
                }, 3000)
              }
            }
          }

          // Fire community progress + squad feed (non-blocking). Capture
          // response so we can dispatch the +N stat toast for the character
          // system (PR #5).
          fetch('/api/community/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              km: params.km ?? 0,
              done: true,
              session_type: session.c ?? 'easy',
              session_name: session.n ?? 'Session',
              duration_secs: params.duration_secs,
              pace: params.pace,
              effort: params.effort,
            }),
          })
            .then(r => r.ok ? r.json() : null)
            .then(async (json) => {
              if (json?.character || json?.drop || json?.streak_reward || json?.quest_rewards?.length) {
                const events = await import('@/lib/character-events')
                if (json.character)     events.dispatchCharacterXP(json.character)
                if (json.drop)          events.dispatchCharacterLoot(json.drop)
                if (json.streak_reward) events.dispatchStreakReward(json.streak_reward)
                if (Array.isArray(json.quest_rewards)) {
                  for (const q of json.quest_rewards) {
                    events.dispatchCharacterLoot({
                      kind:    q.item_kind,
                      item_id: q.item_id,
                      rarity:  'common',
                    })
                  }
                }
              }
            })
            .catch(() => {}) // non-blocking, silent fail
        }
      }
    } catch { toastError('Failed to log session') }
  }

  function handleUndo() {
    if (!undoInfo) return
    clearTimeout(undoInfo.timer)
    undoSession(undoInfo.logId)
    setUndoInfo(null)
    toastSuccess('Undone')
  }

  const getWeekRef = useCallback((n: number) => {
    if (!weekRefs.current.has(n)) weekRefs.current.set(n, { current: null })
    return weekRefs.current.get(n)! as React.RefObject<HTMLDivElement | null>
  }, [])

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>

      <TrainHeader
        plan={plan}
        planTab={planTab}
        onTabChange={setPlanTab}
        onAddSession={() => setShowAdHocModal(true)}
      />

      {!loading && !plan && <TrainNoPlanState />}

      {plan && planTab === 'plan' && (
        <div className="max-w-lg mx-auto px-4 pt-4 space-y-3">

          {/* Path / List toggle */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--ns-cobalt)' }}>
              {planView === 'path' ? 'Training path' : 'Week list'}
            </p>
            <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
              {(['path', 'list'] as const).map(v => (
                <button key={v} onClick={() => setPlanView(v)}
                  className="px-3 py-1 rounded-md text-[10px] font-bold transition-all"
                  style={planView === v
                    ? { background: 'var(--color-surface-3)', color: 'var(--color-text-primary)' }
                    : { color: 'var(--color-text-tertiary)' }}>
                  {v === 'path' ? '🛤 Path' : '☰ List'}
                </button>
              ))}
            </div>
          </div>

          {/* A2 — 1-banner priority cascade. Caps the top-of-page alert
              stack at one (ACWR > Gap). BL-B3 chronic baseline + per-banner
              dismissal handled inside TrainBanners. */}
          {(() => {
            const series          = calcACWR(allLogs, weeks)
            const latest          = series.length > 0 ? series[series.length - 1] : null
            const latestAcwr      = latest?.acwr ?? null
            const chronicBaseline = latest?.chronic ?? 0
            const todayCode       = todaySessions[0]?.c
            const lastDoneLog     = allLogs
              .filter((l: TrainingLog) => l.done)
              .sort((a: TrainingLog, b: TrainingLog) =>
                new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())[0]
            const lastLoggedAt    = (lastDoneLog?.logged_at as string | undefined) ?? null
            return (
              <TrainBanners
                latestAcwr={latestAcwr}
                chronicBaselineKm={chronicBaseline}
                todaySessionType={todayCode}
                lastLoggedAt={lastLoggedAt}
              />
            )
          })()}

          {/* ══ TODAY section ══ */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#ff4d6d' }}>
                Today · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
              </p>
              {doneTodayCount > 0 && todaySessions.length > 0 && (
                <p className="text-xs font-bold" style={{ color: doneTodayCount === todaySessions.length ? '#22c55e' : 'var(--color-text-tertiary)' }}>
                  {doneTodayCount}/{todaySessions.length} done
                </p>
              )}
            </div>

            {/* P2.7 hard-deload (OQ#7=B "show both"): when ACWR > 1.3 AND
                today's first session is high-volume AND chronic baseline is
                meaningful, render a DeloadAlternativeCard right after the
                primary card. */}
            {todaySessions.length > 0 ? (
              <div className="space-y-2">
                {todaySessions.map((session, i) => {
                  const log = logs[`${weekN}_${todayDayIndex}_${i}`] as (typeof logs)[string] | null ?? null
                  const series          = calcACWR(allLogs, weeks)
                  const latest          = series.length > 0 ? series[series.length - 1] : null
                  const latestAcwr      = latest?.acwr ?? null
                  const chronicBaseline = latest?.chronic ?? 0
                  return (
                    <div key={i} className="space-y-2">
                      <TodaySessionCard
                        session={session}
                        log={log}
                        onTap={() => setModalSession({ session, dayI: todayDayIndex, sessI: i })}
                        onQuickLog={() => { handleLogSession({ week_n: weekN, day_i: todayDayIndex, session_i: i, done: true, effort: 5 }) }}
                      />
                      {/* Deload alternative shown only on the primary
                          session (i=0) — multi-session days don't benefit
                          from offering a deload swap on every slot. */}
                      {i === 0 && latestAcwr !== null && (
                        <DeloadAlternativeCard
                          prescribed={{ c: session.c, km: session.km, n: session.n }}
                          latestAcwr={latestAcwr}
                          chronicBaselineKm={chronicBaseline}
                          alreadyDone={!!log?.done}
                          onSelectDeload={(deload) => {
                            // Prefill the LogModal with the deload session so
                            // the athlete can confirm + tweak before saving.
                            setModalSession({
                              session: {
                                ...session,
                                c:  deload.sessionType,
                                km: deload.km,
                                n:  deload.label,
                              },
                              dayI:  todayDayIndex,
                              sessI: i,
                            })
                          }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-2xl p-5 text-center"
                style={{ background: 'rgba(156,163,175,0.08)', border: '1px solid rgba(156,163,175,0.15)' }}>
                <div className="text-3xl mb-2">😴</div>
                <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>Rest day</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>Recovery is training too.</p>
              </div>
            )}
          </div>

          <MyCoachBanner />

          {/* P4.3 — 4+ weeks Elite trigger. Inert today; lights up when
              paywall enforced. Trigger: ≥4 distinct ISO weeks with at
              least one done log within the last 28 days. */}
          <EliteTriggerBanner kind="four_weeks" show={fourWeeksLogged} />

          <TrainStatsStrip weeklyKm={weeklyKm} acwr={acwr} streak={streak} />

          {/* ══ FULL PLAN section — path or list ══ */}
          {planView === 'path' ? (
            <PlanPathSVG
              weeks={weeks}
              currentWeekN={weekN}
              logs={logs}
              onWeekTap={(week) => setTappedWeek(week)}
              planName={plan.name}
              raceDate={plan.race_date ?? null}
            />
          ) : (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--ns-cobalt)' }}>
                Full plan
              </p>

              <div className="space-y-2">
                {completedWeeks.length > 0 && (
                  <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
                    style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                      style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>✓</div>
                    <div className="flex-1">
                      <p className="text-sm font-black" style={{ color: 'var(--color-text-secondary)' }}>
                        {completedWeeks.length} week{completedWeeks.length !== 1 ? 's' : ''} completed
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Tap to review past weeks</p>
                    </div>
                    <span style={{ color: 'var(--color-text-tertiary)' }}>↓</span>
                  </div>
                )}

                {currentWeek && (
                  <WeekRow
                    week={currentWeek}
                    status="current"
                    logs={logs}
                    gymLogs={{} as Record<string, unknown>}
                    todayDayIndex={todayDayIndex}
                    weekRef={getWeekRef(weekN)}
                    planId={plan.id}
                    onLog={(session: PlanSession, dayI: number, sessI: number) => setModalSession({ session, dayI, sessI })}
                  />
                )}

                {upcomingWeeks.map((week: PlanWeek) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const W = WeekRow as any
                  return <W
                    key={week.n}
                    week={week}
                    status="upcoming"
                    logs={logs}
                    gymLogs={{} as Record<string, unknown>}
                    todayDayIndex={todayDayIndex}
                    weekRef={getWeekRef(week.n) as React.RefObject<HTMLDivElement | null>}
                    planId={plan.id}
                    onLog={(session: PlanSession, dayI: number, sessI: number): void => { setModalSession({ session, dayI, sessI }) }}
                  />
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {plan && planTab === 'fuel' && (
        <TrainFuelTab today={currentWeek?.days[todayDayIndex]} />
      )}

      {tappedWeek && (
        <WeekDetailSheet
          week={tappedWeek}
          logs={logs}
          onClose={() => setTappedWeek(null)}
          onSessionTap={({ session, dayI, sessI, weekN }) => {
            setTappedWeek(null)
            setModalSession({ session, dayI, sessI, weekN })
          }}
        />
      )}

      {milestone && (
        <MilestoneCard
          milestone={MILESTONES[milestone]}
          onDismiss={() => setMilestone(null)}
        />
      )}

      {briefSession && (
        <PreRunBrief
          session={briefSession.session}
          onReady={() => { setBriefSession(null); setModalSession(briefSession) }}
          onClose={() => setBriefSession(null)}
        />
      )}

      {showCompletion && plan && (
        <PlanCompletionCeremony
          plan={plan}
          logs={logs}
          onClose={() => setShowCompletion(false)}
        />
      )}

      {/* P2.7 Third-Week Hold-the-Line — fires once per plan when user
          reaches week 3 and has at least one done log. */}
      {showReanchor && plan && (
        <Week3Reanchor
          sessionsDone={allLogs.filter((l: TrainingLog) => l.done).length}
          sessionsTotal={(weeks ?? []).reduce((sum, w) => sum +
            (w.days ?? []).reduce((s2, d) => s2 +
              (d.sessions ?? []).filter(ss => ss.c && ss.c !== 'rest').length, 0), 0)}
          totalKm={allLogs.filter((l: TrainingLog) => l.done).reduce((s: number, l: TrainingLog) => s + (l.km ?? 0), 0)}
          acwr={(() => {
            const series = calcACWR(allLogs, weeks)
            return series.length > 0 ? series[series.length - 1].acwr : null
          })()}
          onDismiss={() => setShowReanchor(false)}
        />
      )}

      {celebration && (
        <SessionCelebration
          session={celebration.session}
          log={celebration.log}
          xpEarned={celebration.xpEarned}
          totalXP={totalXP}
          acwr={celebration.acwr}
          feedCardIds={celebration.feedCardIds}
          feedError={celebration.feedError}
          onDismiss={() => setCelebration(null)}
          onShare={() => {
            setCelebration(null)
            if (shareSession) setShareSession(shareSession)
          }}
        />
      )}

      {plan && (
        <TodayModals
          plan={plan}
          weeks={weeks}
          weekN={weekN}
          planDayIndex={todayDayIndex}
          logs={logs}
          modalSession={modalSession}
          focusSession={focusSession}
          shareSession={shareSession}
          showWeeklyShare={false}
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
          setShowWeeklyShare={() => {}}
          setShowAdHocModal={setShowAdHocModal}
          setCeremonyDismissed={setCeremonyDismissed}
          handleUndo={handleUndo}
          handleLogSession={(params) => handleLogSession({
              ...params,
              week_n: modalSession?.weekN ?? weekN,
            })}
          toastSuccess={toastSuccess}
          runnerColour={(profile as { runner_colour?: string })?.runner_colour ?? '#06b6d4'}
        />
      )}
    </div>
  )
}
