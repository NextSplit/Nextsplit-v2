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
import { getSessionType, fmtKm, decodeHtml } from '@/lib/sessionUtils'
import { getSessionXP } from '@/lib/rpg'
import DarkModeToggle from '@/components/DarkModeToggle'
import WeekRow from '@/components/plan/WeekRow'
import { TodayModals } from '../today/TodayModals'
import type { PlanSession, TrainingLog, PlanWeek } from '@/types/database'
import FuelPlanCard from '@/components/FuelPlanCard'
import PlanPath from '@/components/plan/PlanPath'

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
  const [modalSession, setModalSession]   = useState<{ session: PlanSession; dayI: number; sessI: number; prefillDurationSecs?: number } | null>(null)
  const [focusSession, setFocusSession]   = useState<{ session: PlanSession; dayI: number; sessI: number } | null>(null)
  const [shareSession, setShareSession]   = useState<{ session: PlanSession; log: TrainingLog } | null>(null)
  const [showAdHocModal, setShowAdHocModal] = useState(false)
  const [ceremonyDismissed, setCeremonyDismissed] = useState(false)
  const [undoInfo, setUndoInfo] = useState<{ logId: string; timer: ReturnType<typeof setTimeout> } | null>(null)
  const [undoLabel, setUndoLabel] = useState('')
  const [undoXP, setUndoXP] = useState(0)
  const [undoSecsLeft, setUndoSecsLeft] = useState(0)
  const [newPB, setNewPB] = useState<{ distance: string; timeStr: string } | null>(null)
  const [planTab, setPlanTab] = useState<'plan' | 'fuel'>('plan')
  const [planView, setPlanView] = useState<'path' | 'list'>('path')

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
        if (log.done && session) setShareSession({ session, log })
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
        style={{ background: 'linear-gradient(180deg, rgba(37,99,235,0.08) 0%, var(--color-surface) 100%)', borderColor: 'var(--color-border)' }}>
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

          {/* ══ FULL PLAN section ══ */}
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
        </div>
      )}

      {/* Fuel tab */}
      {plan && planTab === 'fuel' && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          {currentWeek?.days[todayDayIndex] ? (
            <FuelPlanCard planDay={currentWeek.days[todayDayIndex]} />
          ) : (
            <div className="rounded-2xl p-8 text-center"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="text-4xl mb-3">🥗</div>
              <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>No fuel plan for today</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>Fuel guidance appears on active training days.</p>
            </div>
          )}
        </div>
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
          handleLogSession={handleLogSession}
          toastSuccess={toastSuccess}
          runnerColour={(profile as { runner_colour?: string })?.runner_colour ?? '#06b6d4'}
        />
      )}
    </div>
  )
}
