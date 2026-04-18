'use client'

import { useState, useEffect, useCallback } from 'react'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useTrainingLog } from '@/hooks/useTrainingLog'
import { getSessionType, fmtKm, formatDate, offsetDate } from '@/lib/sessionUtils'
import type { PlanDay, PlanSession, TrainingLog } from '@/types/database'

/** Decode HTML entities like &middot; &ndash; &amp; */
function decodeHtml(str: string): string {
  return str
    .replace(/&middot;/g, '·')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

// ─── Session Log Modal ────────────────────────────────────────────────────────

interface LogModalProps {
  session: PlanSession
  dayIndex: number
  sessionIndex: number
  weekN: number
  planId: string
  existingLog: TrainingLog | null
  onClose: () => void
  onSave: (params: {
    week_n: number; day_i: number; session_i: number; done: boolean
    effort?: number; km?: number; notes?: string
  }) => Promise<void>
}

function LogModal({ session, dayIndex, sessionIndex, weekN, existingLog, onClose, onSave }: LogModalProps) {
  const cfg = getSessionType(session.c)
  const [effort, setEffort] = useState(existingLog?.effort ?? 7)
  const [km, setKm] = useState(existingLog?.km ?? session.km ?? 0)
  const [notes, setNotes] = useState(existingLog?.notes ?? '')
  const [saving, setSaving] = useState(false)

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
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-auto bg-white rounded-t-3xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
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
            <label className="text-sm font-semibold text-gray-700">Effort</label>
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

        {/* Actions */}
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
}

function SessionCard({ session, log, onTap, onQuickDone }: SessionCardProps) {
  const cfg = getSessionType(session.c)
  const done = !!log?.done

  return (
    <div
      className={`rounded-2xl border transition-all ${done ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-100 bg-white'} overflow-hidden`}
    >
      <div className="flex items-start gap-3 p-4" onClick={onTap}>
        {/* Type indicator */}
        <div className={`w-10 h-10 rounded-xl ${cfg.colour} flex items-center justify-center flex-shrink-0 text-lg`}>
          {cfg.emoji}
        </div>

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
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] text-emerald-600 font-semibold">
                ✓ Done{log?.effort ? ` · Effort ${log.effort}/10` : ''}
              </span>
              {log?.km && <span className="text-[10px] text-gray-400">{log.km}km</span>}
              {log?.notes && <span className="text-[10px] text-gray-400 italic truncate max-w-[120px]">{log.notes}</span>}
            </div>
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
  const { plan, currentWeek, loading: planLoading } = useActivePlan()
  const { logs, logSession, undoSession, loading: logsLoading } = useTrainingLog(plan?.id ?? null)

  const [dateOffset, setDateOffset] = useState(0)
  const [modalSession, setModalSession] = useState<{ session: PlanSession; dayI: number; sessI: number } | null>(null)
  const [undoInfo, setUndoInfo] = useState<{ logId: string; timer: ReturnType<typeof setTimeout> } | null>(null)
  const [undoLabel, setUndoLabel] = useState('')
  const [undoSecsLeft, setUndoSecsLeft] = useState(8)

  const viewDate = offsetDate(dateOffset)
  const isToday = dateOffset === 0

  const dayOfWeek = viewDate.getDay()
  const planDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  const planDay: PlanDay | null = currentWeek?.days[planDayIndex] ?? null
  const weekN = plan?.current_week ?? 1

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
    effort?: number; km?: number; notes?: string
  }) => {
    if (!plan) return
    const log = await logSession({ plan_id: plan.id, ...params })

    if (undoInfo) clearTimeout(undoInfo.timer)
    const session = planDay?.sessions[params.session_i]
    setUndoLabel(session?.n ?? 'session')
    const timer = setTimeout(() => setUndoInfo(null), 8000)
    setUndoInfo({ logId: log.id, timer })
  }, [plan, logSession, undoInfo, planDay])

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

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-bold text-gray-900">NextSplit</span>
            {plan && todaySessions.length > 0 && isToday && (
              <span className={`text-xs font-semibold ${doneTodayCount === todaySessions.length ? 'text-emerald-500' : 'text-gray-400'}`}>
                {doneTodayCount}/{todaySessions.length} done
              </span>
            )}
            {plan && (!todaySessions.length || !isToday) && (
              <span className="text-xs text-gray-400">Week {weekN} of {plan.total_weeks}</span>
            )}
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

            {/* Session cards */}
            {todaySessions.map((session, sessI) => {
              const key = `${weekN}_${planDayIndex}_${sessI}`
              const log = logs[key] ?? null
              return (
                <SessionCard
                  key={sessI}
                  session={session}
                  sessionIndex={sessI}
                  dayIndex={planDayIndex}
                  weekN={weekN}
                  planId={plan.id}
                  log={log}
                  onTap={() => setModalSession({ session, dayI: planDayIndex, sessI })}
                  onQuickDone={() => handleQuickDone(planDayIndex, sessI, session)}
                />
              )
            })}

            {/* Sleep note */}
            {planDay?.sleep && (
              <div className="bg-indigo-50 rounded-2xl border border-indigo-100 px-4 py-3 flex items-start gap-2.5">
                <span className="text-base mt-0.5">🌙</span>
                <p className="text-xs text-indigo-700 leading-relaxed">{planDay.sleep}</p>
              </div>
            )}

            {/* All done celebration */}
            {isToday && todaySessions.length > 0 && doneTodayCount === todaySessions.length && (
              <div className="bg-emerald-50 rounded-2xl border border-emerald-100 px-4 py-4 text-center">
                <div className="text-2xl mb-1">🎉</div>
                <p className="text-sm font-bold text-emerald-700">All done for today!</p>
                <p className="text-xs text-emerald-600 mt-0.5">Great work. Rest and recover well.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Undo toast with countdown */}
      {undoInfo && (
        <div className="fixed bottom-24 left-4 right-4 max-w-lg mx-auto z-50">
          <div className="bg-gray-900 text-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-xl">
            <div>
              <span className="text-sm">Logged: <span className="font-medium">{undoLabel}</span></span>
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

      {/* Log modal */}
      {modalSession && plan && (
        <LogModal
          session={modalSession.session}
          dayIndex={modalSession.dayI}
          sessionIndex={modalSession.sessI}
          weekN={weekN}
          planId={plan.id}
          existingLog={logs[`${weekN}_${modalSession.dayI}_${modalSession.sessI}`] ?? null}
          onClose={() => setModalSession(null)}
          onSave={handleLogSession}
        />
      )}
    </div>
  )
}
