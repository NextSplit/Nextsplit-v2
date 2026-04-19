'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useTrainingLog } from '@/hooks/useTrainingLog'
import { getSessionType, fmtKm, formatDate, offsetDate, decodeHtml } from '@/lib/sessionUtils'
import type { PlanDay, PlanSession, PlanWeek, TrainingLog } from '@/types/database'

import { getSessionXP } from '@/lib/rpg'
import { computePersonalBests, checkNewPB } from '@/lib/personalBests'
import { computeStreak, computeConsistency, computeWeeklyReport } from '@/lib/streak'
import WeatherWidget from '@/components/WeatherWidget'
import WellnessCheckIn from '@/components/WellnessCheckIn'
import FocusMode from '@/components/FocusMode'
import StravaSyncButton from '@/components/StravaSyncButton'
import { useRouter } from 'next/navigation'

/** Decode HTML entities like &middot; &ndash; &amp; */
// ─── Session Log Modal ────────────────────────────────────────────────────────

interface LogModalProps {
  session: PlanSession
  dayIndex: number
  sessionIndex: number
  weekN: number
  planId: string
  existingLog: TrainingLog | null
  prefillDurationSecs?: number
  onClose: () => void
  onSave: (params: {
    week_n: number; day_i: number; session_i: number; done: boolean
    effort?: number; km?: number; notes?: string; duration_secs?: number; hr?: number; pace?: string
  }) => Promise<void>
}

function LogModal({ session, dayIndex, sessionIndex, weekN, existingLog, prefillDurationSecs, onClose, onSave }: LogModalProps) {
  const cfg = getSessionType(session.c)
  const [effort, setEffort] = useState(existingLog?.effort ?? 7)
  const [km, setKm] = useState(existingLog?.km ?? session.km ?? 0)
  const [notes, setNotes] = useState(existingLog?.notes ?? '')
  const [durationMins, setDurationMins] = useState(
    existingLog?.duration_secs
      ? Math.round(existingLog.duration_secs / 60)
      : prefillDurationSecs
        ? Math.round(prefillDurationSecs / 60)
        : 0
  )
  const [paceInput, setPaceInput] = useState(existingLog?.pace ?? '')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(!!existingLog)
  const [bottomInset, setBottomInset] = useState(0)

  // Keyboard avoidance — lift modal when virtual keyboard appears
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    function onResize() {
      const keyboardH = window.innerHeight - vv!.height - vv!.offsetTop
      setBottomInset(Math.max(0, keyboardH))
    }
    vv.addEventListener('resize', onResize)
    vv.addEventListener('scroll', onResize)
    return () => {
      vv.removeEventListener('resize', onResize)
      vv.removeEventListener('scroll', onResize)
    }
  }, [])

  // Auto-calculate pace from km + duration when both set and pace is empty
  const autoPace = km > 0 && durationMins > 0 && !paceInput.trim()
    ? (() => {
        const paceSecs = (durationMins * 60) / km
        const m = Math.floor(paceSecs / 60)
        const s = Math.round(paceSecs % 60)
        return `${m}:${String(s).padStart(2, '0')}`
      })()
    : null

  // Auto-fill duration when pace is entered and duration is empty
  function handlePaceBlur() {
    if (!paceInput.trim() || durationMins > 0 || km <= 0) return
    const parts = paceInput.split(':')
    if (parts.length !== 2) return
    const totalSecs = (parseInt(parts[0]) * 60 + parseInt(parts[1])) * km
    if (!isNaN(totalSecs) && totalSecs > 0) setDurationMins(Math.round(totalSecs / 60))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({
        week_n: weekN,
        day_i: dayIndex,
        session_i: sessionIndex,
        done: true,
        effort,
        km: km > 0 ? km : undefined,
        notes: notes.trim() || undefined,
        duration_secs: durationMins > 0 ? durationMins * 60 : undefined,
        pace: paceInput.trim() || autoPace || undefined,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col"
        style={{ marginBottom: bottomInset }}
        onClick={e => e.stopPropagation()}
      >
        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-6">
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        {/* Session type badge */}
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${cfg.colour} ${cfg.textColour} text-xs font-semibold mb-3`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-1">{session.n}</h2>
        {session.det && (
          <p className="text-sm text-gray-500 mb-5 leading-relaxed">{decodeHtml(session.det)}</p>
        )}

        {/* Effort slider */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-gray-700">Effort (RPE)</label>
            <span className="text-2xl font-bold text-[#0D9488]">{effort}<span className="text-sm text-gray-400">/10</span></span>
          </div>
          <input
            type="range" min={1} max={10} value={effort}
            onChange={e => setEffort(Number(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#0D9488]"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>Easy</span><span>Moderate</span><span>Max</span>
          </div>
        </div>

        {/* km input (only for running sessions) */}
        {session.km > 0 && (
          <div className="mb-5">
            <label className="text-sm font-semibold text-gray-700 block mb-2">Distance (km)</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setKm(prev => Math.max(0, Math.round((prev - 0.5) * 10) / 10))}
                className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center"
              >−</button>
              <div className="flex-1 text-center">
                <span className="text-3xl font-bold text-gray-900">{km.toFixed(1)}</span>
                <span className="text-sm text-gray-400 ml-1">km</span>
              </div>
              <button
                onClick={() => setKm(prev => Math.round((prev + 0.5) * 10) / 10)}
                className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center"
              >+</button>
            </div>
            {session.km > 0 && (
              <p className="text-[11px] text-gray-400 text-center mt-1">Planned: {session.km}km</p>
            )}
          </div>
        )}

        {/* Progressive disclosure — duration, pace, notes */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-2 text-xs font-semibold text-[#0D9488] mb-4"
        >
          <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          {expanded ? 'Less details' : 'Add more details'}
          {(durationMins > 0 || paceInput || notes) && !expanded && (
            <span className="text-[10px] text-gray-400 font-normal">· {[durationMins > 0 && `${durationMins}min`, paceInput && `${paceInput}/km`, notes && 'note'].filter(Boolean).join(' · ')}</span>
          )}
        </button>

        {expanded && (
          <>
        {/* Duration input */}
        <div className="mb-5">
          <label className="text-sm font-semibold text-gray-700 block mb-2">Duration (optional)</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDurationMins(prev => Math.max(0, prev - 5))}
              className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center"
            >−</button>
            <div className="flex-1 text-center">
              <span className="text-3xl font-bold text-gray-900">{durationMins}</span>
              <span className="text-sm text-gray-400 ml-1">min</span>
            </div>
            <button
              onClick={() => setDurationMins(prev => prev + 5)}
              className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center"
            >+</button>
          </div>
        </div>

        {/* Pace — running sessions only */}
        {session.km > 0 && (
          <div className="mb-5">
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Pace <span className="text-[10px] text-gray-400 font-normal">format: m:ss</span>
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={paceInput}
                onChange={e => setPaceInput(e.target.value)}
                onBlur={handlePaceBlur}
                placeholder={autoPace ? `Auto: ${autoPace}` : '5:30'}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0D9488] pr-14"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">/km</span>
            </div>
            {autoPace && !paceInput && (
              <p className="text-[10px] text-teal-600 mt-1">Auto-calculated from distance + duration: {autoPace}/km</p>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-gray-700 block mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="How did it feel? Any issues?"
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent"
          />
        </div>
          </>
        )}

        </div>{/* end scrollable area */}

        {/* Sticky actions */}
        <div className="px-6 pb-6 pt-3 border-t border-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-[#0D9488] text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving…' : existingLog ? 'Update' : 'Log it ✓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Splits Display ───────────────────────────────────────────────────────────

function SplitsDisplay({ splits }: { splits: Array<{ distance: number; elapsed_time: number; moving_time: number; pace?: string }> }) {
  const [open, setOpen] = useState(false)
  if (splits.length === 0) return null

  function secsToMMSS(secs: number): string {
    const m = Math.floor(secs / 60)
    const s = Math.round(secs % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  // Calculate pace per km for each split
  const withPace = splits.map((s, i) => {
    const distKm = s.distance / 1000
    const paceSecs = distKm > 0 ? s.moving_time / distKm : 0
    return { ...s, distKm, paceSecs, lapNum: i + 1 }
  })
  const paces = withPace.map(s => s.paceSecs).filter(p => p > 0)
  const minPace = Math.min(...paces)
  const maxPace = Math.max(...paces)

  return (
    <div className="mt-2">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="flex items-center gap-1 text-[10px] text-orange-500 font-semibold"
      >
        <svg viewBox="0 0 24 24" fill="#f97316" className="w-3 h-3">
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
        </svg>
        {open ? 'Hide' : 'Show'} splits ({splits.length} laps)
      </button>
      {open && (
        <div className="mt-2 space-y-1" onClick={e => e.stopPropagation()}>
          {withPace.map(s => {
            const pctFromFastest = maxPace > minPace ? (s.paceSecs - minPace) / (maxPace - minPace) : 0
            const barColour = pctFromFastest < 0.33 ? 'bg-emerald-400' : pctFromFastest < 0.66 ? 'bg-amber-400' : 'bg-red-400'
            return (
              <div key={s.lapNum} className="flex items-center gap-2">
                <span className="text-[9px] text-gray-400 w-6 shrink-0">km {s.lapNum}</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${barColour} rounded-full`} style={{ width: `${Math.max(20, (1 - pctFromFastest) * 100)}%` }} />
                </div>
                <span className="text-[9px] font-mono text-gray-600 w-12 text-right shrink-0">
                  {s.paceSecs > 0 ? secsToMMSS(s.paceSecs) + '/km' : '—'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Session Card ─────────────────────────────────────────────────────────────

interface SessionCardProps {
  session: PlanSession
  sessionIndex: number
  dayIndex: number
  weekN: number
  planId: string
  log: TrainingLog | null
  onTap: () => void
  onQuickDone: () => void
  onFocus: () => void
}

function SessionCard({ session, log, onTap, onQuickDone, onFocus }: SessionCardProps) {
  const cfg = getSessionType(session.c)
  const done = !!log?.done

  return (
    <div
      className={`rounded-2xl border transition-all ${done ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-100 bg-white'} overflow-hidden`}
    >
      <div className="flex items-start gap-3 p-4" onClick={onTap}>
        {/* Type indicator — tap for focus mode */}
        <button
          onClick={e => { e.stopPropagation(); onFocus() }}
          className={`flex flex-col items-center gap-0.5 flex-shrink-0`}
        >
          <div className={`w-10 h-10 rounded-xl ${cfg.colour} flex items-center justify-center text-lg active:scale-95 transition-transform`}>
            {cfg.emoji}
          </div>
          <span className="text-[8px] text-gray-400 font-medium">Focus</span>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.textColour}`}>
              {cfg.label}
            </span>
            {session.km > 0 && (
              <span className="text-[10px] text-gray-400">{fmtKm(session.km)}</span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900 leading-tight">{session.n}</p>
          {session.det && (
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
              {decodeHtml(session.det)}
            </p>
          )}
          {done && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[10px] text-emerald-600 font-semibold">
                ✓ Done{log?.effort ? ` · RPE ${log.effort}` : ''}
              </span>
              {log?.km && <span className="text-[10px] text-gray-400">{log.km}km</span>}
              {log?.duration_secs && <span className="text-[10px] text-gray-400">{Math.round(log.duration_secs / 60)}min</span>}
              {log?.pace && <span className="text-[10px] text-gray-400">{log.pace}/km</span>}
              {log?.hr && <span className="text-[10px] text-gray-400">♥ {log.hr}</span>}
              {log?.notes && <span className="text-[10px] text-gray-400 italic truncate max-w-[100px]">{log.notes}</span>}
              {log?.strava_id && <span className="text-[10px] text-orange-500 font-semibold">⚡ Strava</span>}
            </div>
          )}
          {/* Strava splits — shown when imported */}
          {done && log?.splits && Array.isArray(log.splits) && log.splits.length > 0 && (
            <SplitsDisplay splits={log.splits as Array<{ distance: number; elapsed_time: number; moving_time: number; pace?: string }> } />
          )}
        </div>

        {/* Quick-done / edit button */}
        <button
          onClick={e => { e.stopPropagation(); onQuickDone() }}
          className={`w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            done
              ? 'border-emerald-400 bg-emerald-400'
              : 'border-gray-200 bg-white'
          }`}
        >
          {done ? (
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <div className="w-3 h-3 rounded-full border-2 border-gray-300" />
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Main Today Component ─────────────────────────────────────────────────────

export default function TodayClient() {
  const { plan, weeks, currentWeek, loading: planLoading, advanceWeek } = useActivePlan()
  const { logs, logSession, undoSession, loading: logsLoading } = useTrainingLog(plan?.id ?? null)

  const [dateOffset, setDateOffset] = useState(0)
  const [readinessScore, setReadinessScore] = useState<number | null>(null)
  const [modalSession, setModalSession] = useState<{ session: PlanSession; dayI: number; sessI: number; prefillDurationSecs?: number } | null>(null)
  const [focusSession, setFocusSession] = useState<{ session: PlanSession; dayI: number; sessI: number } | null>(null)
  const [undoInfo, setUndoInfo] = useState<{ logId: string; timer: ReturnType<typeof setTimeout> } | null>(null)
  const [undoLabel, setUndoLabel] = useState('')
  const [undoXP, setUndoXP] = useState(0)
  const [newPB, setNewPB] = useState<{ distance: string; timeStr: string } | null>(null)
  const [undoSecsLeft, setUndoSecsLeft] = useState(8)

  const router = useRouter()
  const viewDate = offsetDate(dateOffset)
  const isToday = dateOffset === 0

  const dayOfWeek = viewDate.getDay()
  const planDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  // Determine which plan week the viewDate falls in
  const viewWeekN = useMemo(() => {
    if (!plan || dateOffset === 0) return plan?.current_week ?? 1
    // Work out how many weeks ago viewDate is relative to the start of current week
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayDow = today.getDay()
    // Monday of current week
    const currentWeekMonday = new Date(today)
    currentWeekMonday.setDate(today.getDate() - (todayDow === 0 ? 6 : todayDow - 1))
    const vd = new Date(viewDate)
    vd.setHours(0, 0, 0, 0)
    const diffMs = vd.getTime() - currentWeekMonday.getTime()
    const diffWeeks = Math.floor(diffMs / (7 * 86400000))
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
    const log = await logSession({ plan_id: plan.id, ...params })

    // Check for new personal best
    if (params.km && params.pace && params.done) {
      const existingLogs = Object.values(logs)
      const existingPBs = computePersonalBests(existingLogs)
      const pb = checkNewPB(
        { km: params.km, pace: params.pace, week_n: params.week_n, logged_at: new Date().toISOString(), done: true },
        existingPBs
      )
      if (pb) {
        setNewPB({ distance: pb.distance, timeStr: pb.timeStr })
        setTimeout(() => setNewPB(null), 6000)
      }
    }

    if (undoInfo) clearTimeout(undoInfo.timer)
    const session = planDay?.sessions[params.session_i]
    setUndoLabel(session?.n ?? 'session')
    setUndoXP(session ? getSessionXP(session.c) : 10)
    const timer = setTimeout(() => setUndoInfo(null), 8000)
    setUndoInfo({ logId: log.id, timer })
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
    await undoSession(undoInfo.logId)
    setUndoInfo(null)
  }, [undoInfo, undoSession])

  const loading = planLoading || logsLoading

  // Count done sessions today
  const todaySessions = planDay?.sessions ?? []
  const doneTodayCount = todaySessions.filter((_, i) => logs[`${weekN}_${planDayIndex}_${i}`]?.done).length

  // Streak + consistency
  const allLogsArray = Object.values(logs)
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
                <span className="text-[11px] text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                  W{weekN}/{plan.total_weeks}
                </span>
              )}
              {plan && todaySessions.length > 0 && isToday && (
                <span className={`text-xs font-semibold ${doneTodayCount === todaySessions.length ? 'text-emerald-500' : 'text-gray-400'}`}>
                  {doneTodayCount}/{todaySessions.length} done
                </span>
              )}
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
        {!loading && !plan && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <div className="text-5xl mb-4">🏃</div>
            <h2 className="text-base font-bold text-gray-900 mb-2">No active plan</h2>
            <p className="text-sm text-gray-500 mb-5">Choose a training plan to get started.</p>
            <a href="/onboarding" className="inline-block bg-[#0D9488] text-white px-6 py-3 rounded-xl text-sm font-semibold">
              Choose a plan →
            </a>
          </div>
        )}

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
            {/* Weather — today only, running sessions only */}
            {isToday && todaySessions.some(s => s.c.startsWith('run')) && (
              <WeatherWidget />
            )}

            {/* Wellness check-in — today only */}
            {isToday && <WellnessCheckIn onReadiness={setReadinessScore} />}

            {/* Monday weekly report */}
            {isToday && weeklyReport && (() => {
              const r = weeklyReport
              const vsArrow = r.vsLastWeek === 'up' ? '↑' : r.vsLastWeek === 'down' ? '↓' : '→'
              const vsColour = r.vsLastWeek === 'up' ? 'text-emerald-600' : r.vsLastWeek === 'down' ? 'text-red-500' : 'text-gray-500'
              return (
                <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl border border-violet-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-violet-100/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-violet-800 uppercase tracking-wide">Week {r.weekN} · {r.weekTitle}</p>
                        <p className="text-xs text-violet-600 mt-0.5">Your weekly report</p>
                      </div>
                      <span className="text-2xl">{r.completionPct >= 90 ? '🌟' : r.completionPct >= 60 ? '✅' : '💪'}</span>
                    </div>
                  </div>
                  <div className="px-4 py-3 grid grid-cols-3 gap-3 border-b border-violet-100/30">
                    <div className="text-center">
                      <div className="text-lg font-black text-violet-900">{r.completionPct}%</div>
                      <div className="text-[10px] text-violet-500">sessions done</div>
                      <div className="text-[9px] text-violet-400">{r.sessionsDone}/{r.sessionsPlanned}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-black text-violet-900">{r.kmLogged}</div>
                      <div className="text-[10px] text-violet-500">km logged</div>
                      <div className="text-[9px] text-violet-400">of {r.kmPlanned} planned</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-black ${vsColour}`}>{vsArrow} {r.lastWeekKm > 0 ? Math.abs(Math.round((r.kmLogged - r.lastWeekKm) * 10) / 10) : '—'}</div>
                      <div className="text-[10px] text-violet-500">vs prev week</div>
                      {r.avgEffort && <div className="text-[9px] text-violet-400">RPE {r.avgEffort} avg</div>}
                    </div>
                  </div>
                  {(r.bestSession || r.lookAheadNote) && (
                    <div className="px-4 py-3 space-y-1.5">
                      {r.bestSession && (
                        <p className="text-xs text-violet-700">
                          <span className="font-semibold">Best session:</span> {r.bestSession}
                        </p>
                      )}
                      {r.lookAheadNote && (
                        <p className="text-xs text-violet-600 leading-relaxed line-clamp-2">
                          <span className="font-semibold">This week:</span> {r.lookAheadNote}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Low readiness suggestion */}
            {isToday && readinessScore !== null && readinessScore <= 5 && todaySessions.length > 0 && (() => {
              const isVeryLow = readinessScore <= 3
              const hasRunSessions = todaySessions.some(s => s.c.startsWith('run'))
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
                          // Quick-log all run sessions as easy
                          todaySessions.forEach((session, sessI) => {
                            if (session.c.startsWith('run') && !logs[`${weekN}_${planDayIndex}_${sessI}`]?.done) {
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
                      onClick={() => {
                        /* dismiss — do nothing, card stays until readiness is re-logged */
                        setReadinessScore(6) // bump above threshold to dismiss
                      }}
                      className="w-full py-1.5 text-[10px] text-amber-500 font-medium"
                    >
                      Keep original plan →
                    </button>
                  </div>
                </div>
              )
            })()}

            {/* Sunday coach banner — next week preview */}
            {isToday && viewDate.getDay() === 0 && plan && plan.current_week < plan.total_weeks && (
              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl border border-violet-100 px-4 py-3 flex items-start gap-2.5">
                <span className="text-base mt-0.5">🗓️</span>
                <div>
                  <p className="text-[11px] font-bold text-violet-800 mb-0.5">Week {weekN} complete!</p>
                  <p className="text-xs text-violet-700 leading-relaxed">
                    Good work this week. Week {weekN + 1} starts tomorrow — check the Plan tab to see what&apos;s ahead.
                  </p>
                </div>
              </div>
            )}

            {/* Week note — shown at top on today only */}
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
            {todaySessions.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
                <div className="text-4xl mb-3">😴</div>
                <p className="text-sm font-semibold text-gray-700">Rest day</p>
                <p className="text-xs text-gray-400 mt-1">Recovery is training too.</p>
              </div>
            )}

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

            {/* Contextual fuel card — real data from plan day */}
            {isToday && planDay && planDay.nut && planDay.nut.length > 0 && (() => {
              const now = new Date()
              const currentHour = now.getHours() + now.getMinutes() / 60

              // Parse a time string like "05:30", "During run", "On wake" into a float hour
              function parseHour(t: string): number | null {
                const m = t.match(/^(\d{1,2}):(\d{2})/)
                if (m) return parseInt(m[1]) + parseInt(m[2]) / 60
                if (/wake|morning/i.test(t)) return 6
                if (/lunch/i.test(t)) return 12
                if (/dinner|evening/i.test(t)) return 18
                if (/during/i.test(t)) return currentHour // show during-run entries when running
                return null
              }

              // Priority: upcoming entries in next 3h, plus always show macro target
              const nutByPriority = planDay.nut
                .map(n => ({ ...n, hour: parseHour(n.t) }))
                .filter(n => {
                  if (n.cat === 'macro') return false // shown separately
                  if (n.hour === null) return true // non-timed always show
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



            {/* Session cards */}
            {todaySessions.map((session, sessI) => {
              const key = `${weekN}_${planDayIndex}_${sessI}`
              const log = logs[key] ?? null
              const isGym = session.c.startsWith('gym')
              const isRun = session.c.startsWith('run')
              return (
                <div key={sessI}>
                  <SessionCard
                    session={session}
                    sessionIndex={sessI}
                    dayIndex={planDayIndex}
                    weekN={weekN}
                    planId={plan.id}
                    log={log}
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

            {/* Inline nutrition strip — today only, if plan has nutrition data */}
            {isToday && planDay?.nut && planDay.nut.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-50 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-700">🍽️ Today&apos;s nutrition</span>
                  <a href="/nutrition" className="text-[10px] text-[#0D9488] font-semibold">View all →</a>
                </div>
                <div className="divide-y divide-gray-50">
                  {planDay.nut.slice(0, 3).map((entry, i) => (
                    <div key={i} className="px-4 py-2 flex items-start gap-2.5">
                      <span className="text-xs mt-0.5 flex-shrink-0">
                        {entry.cat === 'hydration' ? '💧' : entry.cat === 'fuel' ? '⚡' : entry.cat === 'macro' ? '📊' : '🍽️'}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-gray-800 leading-tight">{entry.l}</div>
                        {entry.t && <div className="text-[10px] text-gray-400 mt-0.5">{entry.t}</div>}
                      </div>
                    </div>
                  ))}
                  {planDay.nut.length > 3 && (
                    <div className="px-4 py-2">
                      <a href="/nutrition" className="text-[10px] text-[#0D9488]">+{planDay.nut.length - 3} more on Fuel tab</a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sleep note */}
            {planDay?.sleep && (
              <div className="bg-indigo-50 rounded-2xl border border-indigo-100 px-4 py-3 flex items-start gap-2.5">
                <span className="text-base mt-0.5">🌙</span>
                <p className="text-xs text-indigo-700 leading-relaxed">{planDay.sleep}</p>
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

            {/* All done celebration */}
            {isToday && todaySessions.length > 0 && doneTodayCount === todaySessions.length && (
              <div className="bg-emerald-50 rounded-2xl border border-emerald-100 px-4 py-4 text-center">
                <div className="text-2xl mb-1">🎉</div>
                <p className="text-sm font-bold text-emerald-700">All done for today!</p>
                <p className="text-xs text-emerald-600 mt-0.5">Great work. Rest and recover well.</p>
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button
                    onClick={() => {
                      const sessionNames = todaySessions.map(s => s.n).join(', ')
                      navigator.share({
                        title: 'NextSplit — Training done ✓',
                        text: `Just completed today's training: ${sessionNames}. ${weekN > 1 ? `Week ${weekN} in progress.` : 'Day 1 done!'} 🏃`,
                      }).catch(() => {})
                    }}
                    className="mt-3 flex items-center gap-1.5 mx-auto text-xs font-semibold text-emerald-600 bg-white border border-emerald-200 px-3 py-1.5 rounded-full"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share
                  </button>
                )}
              </div>
            )}
            {/* Week complete → advance prompt (Sunday or all sessions done across whole week) */}
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
                      onClick={() => advanceWeek().catch(() => {})}
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
        <div className="fixed bottom-24 left-4 right-4 max-w-lg mx-auto z-50">
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
            <button
              onClick={handleUndo}
              className="text-sm font-bold text-[#34D399] ml-5 shrink-0"
            >
              Undo
            </button>
          </div>
        </div>
      )}

      {/* PB Toast */}
      {newPB && (
        <div className="fixed bottom-24 left-4 right-4 max-w-lg mx-auto z-50 pointer-events-none">
          <div className="bg-gradient-to-r from-yellow-400 to-amber-400 text-white rounded-2xl px-4 py-3 shadow-xl animate-bounce-once">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <div className="text-sm font-black">New Personal Best!</div>
                <div className="text-xs font-semibold opacity-90">{newPB.distance} · {newPB.timeStr}</div>
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
    </div>
  )
}
