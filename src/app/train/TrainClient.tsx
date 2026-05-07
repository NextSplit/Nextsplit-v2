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
import { getSessionType, fmtKm, decodeHtml } from '@/lib/sessionUtils'
import { getSessionXP } from '@/lib/rpg'
import { Analytics } from '@/lib/analytics'
import DarkModeToggle from '@/components/DarkModeToggle'
import WeekRow from '@/components/plan/WeekRow'
import { TodayModals } from '../today/TodayModals'
import type { PlanSession, TrainingLog, PlanWeek } from '@/types/database'
import FuelPlanCard from '@/components/FuelPlanCard'
import SessionCelebration from '@/components/SessionCelebration'
import Week3Reanchor from '@/components/Week3Reanchor'
import { shareSessionWithSquadAction } from '@/app/today/actions'
import PlanCompletionCeremony from '@/components/PlanCompletionCeremony'
import PreRunBrief from '@/components/PreRunBrief'
import MilestoneCard, { MILESTONES } from '@/components/MilestoneCard'
import PlanPathSVG from '@/components/plan/PlanPathSVG'

// ── Session colour system ──────────────────────────────────────────────────────
const SESSION_COLOURS: Record<string, { gradient: string; tint: string; border: string; dot: string; label: string }> = {
  easy:     { gradient: 'linear-gradient(135deg,#16a34a,#15803d)', tint: 'rgba(34,197,94,0.10)',   border: 'rgba(34,197,94,0.3)',   dot: '#22c55e', label: 'Easy Run'  },
  tempo:    { gradient: 'linear-gradient(135deg,#ca8a04,#a16207)', tint: 'rgba(234,179,8,0.10)',   border: 'rgba(234,179,8,0.3)',   dot: '#eab308', label: 'Tempo'     },
  interval: { gradient: 'linear-gradient(135deg,#ea580c,#c2410c)', tint: 'rgba(249,115,22,0.10)',  border: 'rgba(249,115,22,0.3)',  dot: '#f97316', label: 'Intervals' },
  long:     { gradient: 'linear-gradient(135deg,#2563eb,#1d4ed8)', tint: 'rgba(59,130,246,0.10)',  border: 'rgba(59,130,246,0.3)',  dot: '#3b82f6', label: 'Long Run'  },
  recovery: { gradient: 'linear-gradient(135deg,#059669,#047857)', tint: 'rgba(74,222,128,0.10)',  border: 'rgba(74,222,128,0.3)',  dot: '#4ade80', label: 'Recovery'  },
  gym:      { gradient: 'linear-gradient(135deg,#7c3aed,#6d28d9)', tint: 'rgba(139,92,246,0.10)',  border: 'rgba(139,92,246,0.3)',  dot: '#8b5cf6', label: 'Strength'  },
  rest:     { gradient: 'linear-gradient(135deg,#6b7280,#4b5563)', tint: 'rgba(156,163,175,0.08)', border: 'rgba(156,163,175,0.2)', dot: '#9ca3af', label: 'Rest'      },
  race:     { gradient: 'linear-gradient(135deg,#db2777,#be185d)', tint: 'rgba(236,72,153,0.10)',  border: 'rgba(236,72,153,0.3)',  dot: '#ec4899', label: 'Race'      },
}

function getCol(code: string | null | undefined) {
  if (!code) return SESSION_COLOURS.easy
  const c = code.toLowerCase()
  if (c.includes('tempo'))                       return SESSION_COLOURS.tempo
  if (c.includes('interval') || c.includes('speed')) return SESSION_COLOURS.interval
  if (c.includes('long'))                        return SESSION_COLOURS.long
  if (c.includes('recovery'))                    return SESSION_COLOURS.recovery
  if (c.includes('gym') || c.includes('strength')) return SESSION_COLOURS.gym
  if (c.includes('race'))                        return SESSION_COLOURS.race
  return SESSION_COLOURS.easy
}

// ── Today session hero card ────────────────────────────────────────────────────
function TodaySessionCard({
  session, log, onTap, onQuickLog,
}: {
  session: PlanSession
  log: TrainingLog | null
  onTap: () => void
  onQuickLog: () => void
}) {
  const col  = getCol(session.c)
  const done = !!log?.done
  const xp   = getSessionXP(session.c)
  const cfg  = getSessionType(session.c)
  const isGym = session.c?.startsWith('gym')

  if (done) {
    return (
      <div className="rounded-2xl p-4 flex items-center gap-3 opacity-60"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        onClick={onTap}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ background: 'var(--color-surface-2)' }}>{cfg.emoji}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{col.label}</p>
          <p className="text-sm font-black" style={{ color: 'var(--color-text-secondary)' }}>{session.n}</p>
          {log && <p className="text-xs mt-0.5" style={{ color: '#16a34a' }}>✓ Done{log.km ? ` · ${log.km}km` : ''}{log.effort ? ` · RPE ${log.effort}` : ''}</p>}
        </div>
        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#dcfce7', border: '2px solid #22c55e' }}>
          <svg className="w-4 h-4" style={{ color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className="ns-session-card rounded-2xl overflow-hidden active:scale-[0.99] transition-all cursor-pointer"
      data-type={session.c?.split('_')[0] ?? 'easy'}
      style={{ background: col.gradient, boxShadow: `0 4px 20px ${col.dot}30` }}
      onClick={onTap}>
      <div className="flex">
        <div className="w-1.5 flex-shrink-0 ns-card-bar" style={{ background: 'rgba(255,255,255,0.3)' }} />
        <div className="flex-1 p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            {cfg.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {col.label}{session.km > 0 ? ` · ${fmtKm(session.km)}` : ''}
            </p>
            <p className="text-base font-black text-white leading-tight" style={{ letterSpacing: '-0.01em' }}>{session.n}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>+{xp} XP</p>
          </div>
          {isGym ? (
            <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); onTap() }}
              className="rounded-xl px-4 py-2.5 text-sm font-black text-white flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.25)' }}>
              Start →
            </button>
          ) : (
            <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); onQuickLog() }}
              className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)' }}>
              <div className="w-3 h-3 rounded-full bg-white" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Stats strip ────────────────────────────────────────────────────────────────
function StatsStrip({ weeklyKm, acwr, streak }: { weeklyKm: number; acwr: number | null; streak: number }) {
  const acwrColor = !acwr ? '#9ca3af'
    : acwr < 0.8  ? '#3b82f6'
    : acwr <= 1.3 ? '#22c55e'
    : acwr <= 1.5 ? '#f97316'
    : '#ef4444'

  return (
    <div className="flex gap-2">
      <div className="flex-1 rounded-xl py-3 text-center"
        style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)' }}>
        <p className="text-lg font-black" style={{ color: '#2563eb' }}>{weeklyKm.toFixed(1)}</p>
        <p className="text-[9px] mt-0.5 font-medium" style={{ color: 'var(--color-text-tertiary)' }}>km this week</p>
      </div>
      <div className="flex-1 rounded-xl py-3 text-center"
        style={{ background: `${acwrColor}10`, border: `1px solid ${acwrColor}30` }}>
        <p className="text-lg font-black" style={{ color: acwrColor }}>{acwr?.toFixed(2) ?? '—'}</p>
        <p className="text-[9px] mt-0.5 font-medium" style={{ color: 'var(--color-text-tertiary)' }}>ACWR load</p>
      </div>
      <div className="flex-1 rounded-xl py-3 text-center"
        style={{ background: streak > 0 ? 'rgba(255,77,109,0.08)' : 'rgba(156,163,175,0.06)', border: streak > 0 ? '1px solid rgba(255,77,109,0.2)' : '1px solid rgba(156,163,175,0.1)' }}>
        <p className="text-lg font-black" style={{ color: streak > 0 ? '#ff4d6d' : '#9ca3af' }}>{streak > 0 ? `🔥 ${streak}` : '—'}</p>
        <p className="text-[9px] mt-0.5 font-medium" style={{ color: 'var(--color-text-tertiary)' }}>day streak</p>
      </div>
    </div>
  )
}

// ── Main TrainClient ───────────────────────────────────────────────────────────
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
  // on plan.id so it doesn't re-fire on every session resume. Skipped if
  // the user has no logs yet (nothing to re-anchor against).
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

  // Total XP
  const totalXP = allLogs.filter((l: TrainingLog) => l.done).length * 15

  // Streak
  const streak = computeStreak(allLogs.map((l: TrainingLog) => ({ logged_at: l.created_at, done: l.done }))).current

  // ACWR from weeks data
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

  // Split weeks
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
          // resolves. RPC errors are Sentry-captured server-side; client
          // surfaces them as feedError → empty-state copy.
          shareSessionWithSquadAction(log.id).then(({ feedCardIds, error }) => {
            setCelebration(prev => prev && prev.log.id === log.id
              ? { ...prev, feedCardIds, feedError: error }
              : prev
            )
            // Re-fire logCompleted with the resolved squad_count so the
            // funnel sees both the immediate event (above) and the squad
            // reach. PostHog dedupes by event-time, so this gives a clean
            // squad_count distribution without losing the immediate signal.
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
                }, 3000) // show after celebration fades
              }
            }
          }

          // Fire community progress + squad feed (non-blocking)
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
          }).catch(() => {}) // non-blocking, silent fail
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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-40 border-b"
        style={{ background: 'var(--color-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-lg mx-auto px-4 pt-12 pb-3">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
                {plan ? decodeHtml(plan.name) : 'Train'}
              </h1>
              {plan && (
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  Week {plan.current_week} of {plan.total_weeks}
                  {plan.race_date && (() => {
                    const days = Math.ceil((new Date(plan.race_date).getTime() - Date.now()) / 86400000)
                    return days > 0 ? ` · ${days}d 🏁` : null
                  })()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {plan && (
                <button onClick={() => setShowAdHocModal(true)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
                  + Add
                </button>
              )}
              <DarkModeToggle />
            </div>
          </div>
          {plan && (
            <div className="h-1 rounded-full overflow-hidden mt-2" style={{ background: 'var(--color-surface-2)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(plan.current_week / plan.total_weeks) * 100}%`, background: 'linear-gradient(90deg,#2563eb,#1d4ed8)' }} />
            </div>
          )}
        </div>

        {/* Plan / Fuel tab switcher */}
        {plan && (
          <div className="max-w-lg mx-auto px-4 flex border-t" style={{ borderColor: 'var(--color-border)' }}>
            {(['plan', 'fuel'] as const).map(t => (
              <button key={t} onClick={() => setPlanTab(t)}
                className="flex-1 py-2.5 text-xs font-bold border-b-2 transition-all"
                style={{ borderBottomColor: planTab === t ? 'var(--ns-cobalt)' : 'transparent', color: planTab === t ? 'var(--ns-cobalt)' : 'var(--color-text-tertiary)' }}>
                {t === 'plan' ? '📋 Training Plan' : '🥗 Fuel'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── No plan state ── */}
      {!loading && !plan && (
        <div className="max-w-lg mx-auto px-4 pt-10 pb-6">
          <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(6,182,212,0.08)', border: '1.5px solid rgba(6,182,212,0.25)' }}>
            <div className="text-4xl mb-3">🏃</div>
            <h2 className="text-lg font-black mb-2" style={{ color: 'var(--color-text-primary)' }}>No active plan</h2>
            <p className="text-sm mb-5" style={{ color: 'var(--color-text-tertiary)' }}>Pick a training path to get started.</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/onboarding/predetermined', label: 'Expert plans', icon: '📋', col: '#ff4d6d' },
                { href: '/onboarding/ai',            label: 'AI bespoke',   icon: '🧠', col: '#06b6d4' },
                { href: '/plan/browse',              label: 'Browse all',   icon: '🔍', col: '#8b5cf6' },
                { href: '/onboarding/manual',        label: 'Build my own', icon: '✏️', col: '#84cc16' },
              ].map(p => (
                <a key={p.href} href={p.href}
                  className="rounded-xl py-3 text-center font-bold text-sm text-white"
                  style={{ background: p.col }}>
                  {p.icon} {p.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
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

            {/* Today sessions — full colour hero cards */}
            {todaySessions.length > 0 ? (
              <div className="space-y-2">
                {todaySessions.map((session, i) => {
                  const TodayCard = TodaySessionCard as React.ComponentType<{ session: PlanSession; log: TrainingLog | null; onTap: () => void; onQuickLog: () => void }>
                  return <TodayCard
                    key={i}
                    session={session}
                    log={logs[`${weekN}_${todayDayIndex}_${i}`] as (typeof logs)[string] | null ?? null}
                    onTap={(() => setModalSession({ session, dayI: todayDayIndex, sessI: i })) as () => void}
                    onQuickLog={() => { handleLogSession({ week_n: weekN, day_i: todayDayIndex, session_i: i, done: true, effort: 5 }) }}
                  />
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

          {/* ══ Stats strip ══ */}
          <StatsStrip weeklyKm={weeklyKm} acwr={acwr} streak={streak} />

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
              {/* Completed weeks collapsed summary */}
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

              {/* Current week */}
              {currentWeek && (
                <WeekRow
                  week={currentWeek}
                  status="current"
                  logs={logs}
                  gymLogs={{} as Record<string, unknown>}
                  todayDayIndex={todayDayIndex}
                  weekRef={getWeekRef(weekN)}
                  planId={plan.id}
                  onLog={(session: PlanSession, dayI: number, sessI: number, _wN: number) => setModalSession({ session, dayI, sessI })}
                />
              )}

              {/* Upcoming weeks */}
              {upcomingWeeks.map((week: PlanWeek) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const W = WeekRow as any
                return <W
                  key={week.n}
                  week={week}
                  status="upcoming"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  logs={logs as any}
                  gymLogs={{} as Record<string, unknown>}
                  todayDayIndex={todayDayIndex}
                  weekRef={getWeekRef(week.n) as React.RefObject<HTMLDivElement | null>}
                  planId={plan.id}
                  onLog={(session: PlanSession, dayI: number, sessI: number, _wN: number): void => { setModalSession({ session, dayI, sessI }) }}
                />
              })}
            </div>
          </div>
          )}
        </div>
      )}

      {/* Fuel tab */}
      {plan && planTab === 'fuel' && (() => {
        const today = currentWeek?.days[todayDayIndex]
        const hasFuelData = !!today && Array.isArray(today.nut) && today.nut.length > 0
        return (
          <div className="max-w-lg mx-auto px-4 pt-4 pb-32">
            {hasFuelData ? (
              <FuelPlanCard planDay={today} />
            ) : (
              <div className="rounded-2xl p-8 text-center"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="text-4xl mb-3">🥗</div>
                <p className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Fuel plan coming soon
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-tertiary)' }}>
                  Personalised hydration, pre-run snacks and post-run recovery guidance will appear here once your plan template includes nutrition timings — or after you generate a bespoke AI plan with fuel guidance.
                </p>
              </div>
            )}
          </div>
        )
      })()}

      {/* Week detail bottom sheet */}
      {tappedWeek && (
        <div className="fixed inset-0 z-50" onClick={() => setTappedWeek(null)}>
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl overflow-hidden max-h-[80vh] overflow-y-auto"
            style={{ background: 'var(--color-surface)', boxShadow: '0 -8px 40px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}>
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--color-border-2)' }} />
            </div>
            {/* Header */}
            <div className="px-5 pt-2 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white"
                  style={{ background: (() => { const c: Record<string,string> = {k:'#4d8aff',d:'#f97316',p:'#ef4444',r:'#ff2d9e'}; return c[tappedWeek.b ?? 'k'] ?? '#4d8aff' })() }}>
                  {tappedWeek.n}
                </div>
                <div className="flex-1">
                  <p className="text-base font-black" style={{ color: 'var(--color-text-primary)' }}>
                    {tappedWeek.title || `Week ${tappedWeek.n}`}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    {tappedWeek.b === 'k' ? 'Build' : tappedWeek.b === 'd' ? 'Deload' : tappedWeek.b === 'p' ? 'Peak' : 'Race'} week
                    {tappedWeek.note ? ` · ${tappedWeek.note}` : ''}
                  </p>
                </div>
                <button onClick={() => setTappedWeek(null)} aria-label="Close"
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)' }}>×</button>
              </div>
            </div>
            {/* Days */}
            <div className="px-5 py-4 space-y-3 pb-24">
              {tappedWeek.days.map((day, di) => {
                const sessions = day.sessions?.filter(s => s.c && s.c !== 'rest') ?? []
                if (!sessions.length && day.d) return (
                  <div key={di} className="flex items-center gap-3">
                    <p className="text-xs font-black w-8 uppercase" style={{ color: 'var(--color-text-tertiary)' }}>{day.d}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Rest day</p>
                  </div>
                )
                return sessions.map((sess, si) => {
                  const done = logs[`${tappedWeek.n}_${di}_${si}`]?.done
                  const colMap: Record<string,string> = {easy:'#00e676',tempo:'#ffb800',interval:'#f97316',long:'#4d8aff',recovery:'#00e676',gym:'#a855f7',race:'#ff2d9e'}
                  const c = (sess.c ?? '').toLowerCase()
                  const col = c.includes('tempo') ? colMap.tempo : c.includes('interval') ? colMap.interval : c.includes('long') ? colMap.long : c.includes('gym') ? colMap.gym : c.includes('race') ? colMap.race : colMap.easy
                  return (
                    <div key={`${di}-${si}`} className="flex items-center gap-3">
                      <p className="text-xs font-black w-8 uppercase" style={{ color: 'var(--color-text-tertiary)' }}>{si === 0 ? day.d : ''}</p>
                      <button
                        onClick={() => { setTappedWeek(null); setModalSession({ session: sess, dayI: di, sessI: si, weekN: tappedWeek?.n }) }}
                        className="flex-1 rounded-xl px-3 py-2.5 text-left"
                        style={{ background: done ? 'rgba(0,230,118,0.08)' : `${col}10`, border: `1px solid ${done ? '#00e676' : col}30` }}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col }} />
                          <p className="text-xs font-bold flex-1" style={{ color: 'var(--color-text-primary)' }}>{sess.n}</p>
                          {sess.km > 0 && <p className="text-xs" style={{ color: col }}>{sess.km}km</p>}
                          {done && <span className="text-xs" style={{ color: '#00e676' }}>✓</span>}
                        </div>
                      </button>
                    </div>
                  )
                })
              })}
            </div>
          </div>
        </div>
      )}

      {/* Milestone card */}
      {milestone && (
        <MilestoneCard
          milestone={MILESTONES[milestone]}
          onDismiss={() => setMilestone(null)}
        />
      )}

      {/* Pre-run brief */}
      {briefSession && (
        <PreRunBrief
          session={briefSession.session}
          onReady={() => { setBriefSession(null); setModalSession(briefSession) }}
          onClose={() => setBriefSession(null)}
        />
      )}

      {/* Plan completion ceremony */}
      {showCompletion && plan && (
        <PlanCompletionCeremony
          plan={plan}
          logs={logs}
          onClose={() => setShowCompletion(false)}
        />
      )}

      {/* Session celebration */}
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

      {/* Modals */}
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
