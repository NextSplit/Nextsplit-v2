'use client'

import { useState, useEffect, useCallback } from 'react'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useTrainingLog } from '@/hooks/useTrainingLog'
import { getSessionType, fmtKm, formatDate, offsetDate } from '@/lib/sessionUtils'
import type { PlanDay, PlanSession, TrainingLog } from '@/types/database'

import { getSessionXP } from '@/lib/xp'
import WeatherWidget from '@/components/WeatherWidget'
import WellnessCheckIn from '@/components/WellnessCheckIn'
import FocusMode from '@/components/FocusMode'
import StravaSyncButton from '@/components/StravaSyncButton'
import { useRouter } from 'next/navigation'

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
    effort?: number; km?: number; notes?: string; duration_secs?: number
  }) => Promise<void>
}

function LogModal({ session, dayIndex, sessionIndex, weekN, existingLog, onClose, onSave }: LogModalProps) {
  const cfg = getSessionType(session.c)
  const [effort, setEffort] = useState(existingLog?.effort ?? 7)
  const [km, setKm] = useState(existingLog?.km ?? session.km ?? 0)
  const [notes, setNotes] = useState(existingLog?.notes ?? '')
  const [durationMins, setDurationMins] = useState(
    existingLog?.duration_secs ? Math.round(existingLog.duration_secs / 60) : 0
  )
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
        duration_secs: durationMins > 0 ? durationMins * 60 : undefined,
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
          className={`w-10 h-10 rounded-xl ${cfg.colour} flex items-center justify-center flex-shrink-0 text-lg active:scale-95 transition-transform`}
        >
          {cfg.emoji}
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
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] text-emerald-600 font-semibold">
                ✓ Done{log?.effort ? ` · Effort ${log.effort}/10` : ''}
              </span>
              {log?.km && <span className="text-[10px] text-gray-400">{log.km}km</span>}
              {log?.duration_secs && <span className="text-[10px] text-gray-400">{Math.round(log.duration_secs / 60)}min</span>}
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
  const [focusSession, setFocusSession] = useState<{ session: PlanSession; dayI: number; sessI: number } | null>(null)
  const [undoInfo, setUndoInfo] = useState<{ logId: string; timer: ReturnType<typeof setTimeout> } | null>(null)
  const [undoLabel, setUndoLabel] = useState('')
  const [undoXP, setUndoXP] = useState(0)
  const [undoSecsLeft, setUndoSecsLeft] = useState(8)

  const router = useRouter()
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
    effort?: number; km?: number; notes?: string; duration_secs?: number
  }) => {
    if (!plan) return
    const log = await logSession({ plan_id: plan.id, ...params })

    if (undoInfo) clearTimeout(undoInfo.timer)
    const session = planDay?.sessions[params.session_i]
    setUndoLabel(session?.n ?? 'session')
    setUndoXP(session ? getSessionXP(session.c) : 10)
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
            <div className="flex items-center gap-2">
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
            {isToday && <WellnessCheckIn />}

            {/* Sunday coach banner — next week preview */}
            {isToday && viewDate.getDay() === 0 && plan && (() => {
              const nextWeek = plan.weeks_data && Array.isArray((plan as any).weeks_data)
                ? null : null // weeks come from useActivePlan hook
              const nextWeekData = currentWeek ? { n: weekN + 1 } : null
              if (!nextWeekData) return null
              return (
                <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl border border-violet-100 px-4 py-3 flex items-start gap-2.5">
                  <span className="text-base mt-0.5">🗓️</span>
                  <div>
                    <p className="text-[11px] font-bold text-violet-800 mb-0.5">Week {weekN} complete!</p>
                    <p className="text-xs text-violet-700 leading-relaxed">
                      Good work this week. Week {weekN + 1} starts tomorrow — check the Plan tab to see what&apos;s ahead.
                    </p>
                  </div>
                </div>
              )
            })()}

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

            {/* Pre-session nutrition hint */}
            {isToday && todaySessions.some(s => s.c.startsWith('run') || s.c.startsWith('gym')) && (
              (() => {
                const hasLong = todaySessions.some(s => s.c === 'run-long')
                const hasRace = todaySessions.some(s => s.c === 'run-race')
                const hasIntOrTempo = todaySessions.some(s => s.c === 'run-int' || s.c === 'run-tempo')
                if (hasRace) return (
                  <div className="bg-yellow-50 rounded-2xl border border-yellow-100 px-4 py-3 flex items-start gap-2.5">
                    <span className="text-base mt-0.5">🏁</span>
                    <div>
                      <p className="text-[11px] font-bold text-yellow-800 mb-0.5">Race day fuel</p>
                      <p className="text-xs text-yellow-700 leading-relaxed">Nothing new today. Stick to what you&apos;ve trained with. Caffeine 45–60 min before start.</p>
                    </div>
                  </div>
                )
                if (hasLong) return (
                  <div className="bg-blue-50 rounded-2xl border border-blue-100 px-4 py-3 flex items-start gap-2.5">
                    <span className="text-base mt-0.5">🍌</span>
                    <div>
                      <p className="text-[11px] font-bold text-blue-800 mb-0.5">Long run fuel</p>
                      <p className="text-xs text-blue-700 leading-relaxed">Carbs 2–3 h before. Gel every 35–45 min during. Protein within 30 min after.</p>
                    </div>
                  </div>
                )
                if (hasIntOrTempo) return (
                  <div className="bg-orange-50 rounded-2xl border border-orange-100 px-4 py-3 flex items-start gap-2.5">
                    <span className="text-base mt-0.5">⚡</span>
                    <div>
                      <p className="text-[11px] font-bold text-orange-800 mb-0.5">Quality session fuel</p>
                      <p className="text-xs text-orange-700 leading-relaxed">Light meal 2 h before. Avoid heavy food — you need to run hard.</p>
                    </div>
                  </div>
                )
                return null
              })()
            )}

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
                        onImported={async (effort, km, pace, duration_secs) => {
                          await handleLogSession({
                            week_n: weekN,
                            day_i: planDayIndex,
                            session_i: sessI,
                            done: true,
                            effort,
                            km,
                            duration_secs,
                            notes: `Imported from Strava`,
                          })
                        }}
                      />
                    </div>
                  )}
                </div>
              )
            })}

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
              </div>
            )}
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

      {/* Focus mode */}
      {focusSession && plan && (
        <FocusMode
          session={focusSession.session}
          isLogged={!!logs[`${weekN}_${focusSession.dayI}_${focusSession.sessI}`]?.done}
          onClose={() => setFocusSession(null)}
          onLog={() => {
            setFocusSession(null)
            setModalSession(focusSession)
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
          onClose={() => setModalSession(null)}
          onSave={handleLogSession}
        />
      )}
    </div>
  )
}
