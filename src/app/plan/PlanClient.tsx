'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import React from 'react'
import { useRouter } from 'next/navigation'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useTrainingLog } from '@/hooks/useTrainingLog'
import { useMealPlan } from '@/hooks/useMealPlan'
import { getSessionType, fmtKm, decodeHtml } from '@/lib/sessionUtils'

function parseDet(det: string): { technical: string; rationale: string | null } {
  const decoded = decodeHtml(det)
  const idx = decoded.indexOf(' — ')
  if (idx === -1) return { technical: decoded, rationale: null }
  return { technical: decoded.slice(0, idx), rationale: decoded.slice(idx + 3) }
}
import AdaptiveSuggestions from '@/components/AdaptiveSuggestions'
import DarkModeToggle from '@/components/DarkModeToggle'
import { useToast } from '@/components/Toast'
import { hapticLight } from '@/lib/haptics'
import { useGymLog } from '@/hooks/useGymLog'
import type { PlanWeek, PlanDay, PlanSession, TrainingLog } from '@/types/database'

// ─── Inline LogModal (mirrors TodayClient — keeps Plan tab self-contained) ───

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
    effort?: number; km?: number; notes?: string; duration_secs?: number; pace?: string
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
  const [paceInput, setPaceInput] = useState(existingLog?.pace ?? '')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(!!existingLog)
  const [bottomInset, setBottomInset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const fn = () => setBottomInset(Math.max(0, window.innerHeight - vv!.height - vv!.offsetTop))
    vv.addEventListener('resize', fn)
    vv.addEventListener('scroll', fn)
    return () => { vv.removeEventListener('resize', fn); vv.removeEventListener('scroll', fn) }
  }, [])

  const autoPace = km > 0 && durationMins > 0 && !paceInput.trim()
    ? (() => {
        const s = (durationMins * 60) / km
        return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
      })()
    : null

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({
        week_n: weekN, day_i: dayIndex, session_i: sessionIndex, done: true,
        effort, km: km > 0 ? km : undefined,
        notes: notes.trim() || undefined,
        duration_secs: durationMins > 0 ? durationMins * 60 : undefined,
        pace: paceInput.trim() || autoPace || undefined,
      })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col"
        style={{ marginBottom: bottomInset }}
        onClick={e => e.stopPropagation()}
      >
        <div className="overflow-y-auto flex-1 p-6">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${cfg.colour} ${cfg.textColour} text-xs font-semibold mb-3`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">{session.n}</h2>
          {session.det && (() => {
            const { technical, rationale } = parseDet(session.det)
            return (
              <>
                <p className="text-sm text-gray-600 font-medium mb-2 leading-relaxed">{technical}</p>
                {rationale && (
                  <div className="flex items-start gap-2 bg-teal-50 border border-teal-100 rounded-xl px-3 py-2.5 mb-4">
                    <span className="text-sm mt-0.5 flex-shrink-0">🧠</span>
                    <p className="text-xs text-teal-700 leading-relaxed">{rationale}</p>
                  </div>
                )}
              </>
            )
          })()}

          {/* Effort */}
          <div className="mb-5">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-gray-700">Effort (RPE)</label>
              <span className="text-2xl font-bold text-[#0D9488]">{effort}<span className="text-sm text-gray-400">/10</span></span>
            </div>
            <input type="range" min={1} max={10} value={effort} onChange={e => setEffort(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#0D9488]" />
          </div>

          {/* Distance */}
          {session.km > 0 && (
            <div className="mb-5">
              <label className="text-sm font-semibold text-gray-700 block mb-2">Distance (km)</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setKm(p => Math.max(0, Math.round((p - 0.5) * 10) / 10))}
                  className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center">−</button>
                <div className="flex-1 text-center">
                  <span className="text-3xl font-bold text-gray-900">{km.toFixed(1)}</span>
                  <span className="text-sm text-gray-400 ml-1">km</span>
                </div>
                <button onClick={() => setKm(p => Math.round((p + 0.5) * 10) / 10)}
                  className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center">+</button>
              </div>
            </div>
          )}

          {/* More details */}
          <button onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-2 text-xs font-semibold text-[#0D9488] mb-4">
            <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            {expanded ? 'Less details' : 'Add more details'}
          </button>

          {expanded && (
            <>
              <div className="mb-5">
                <label className="text-sm font-semibold text-gray-700 block mb-2">Duration (optional)</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setDurationMins(p => Math.max(0, p - 5))}
                    className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center">−</button>
                  <div className="flex-1 text-center">
                    <span className="text-3xl font-bold text-gray-900">{durationMins}</span>
                    <span className="text-sm text-gray-400 ml-1">min</span>
                  </div>
                  <button onClick={() => setDurationMins(p => p + 5)}
                    className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center">+</button>
                </div>
              </div>
              {session.km > 0 && (
                <div className="mb-5">
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Pace <span className="text-[10px] text-gray-400 font-normal">m:ss</span></label>
                  <div className="relative">
                    <input type="text" inputMode="decimal" value={paceInput}
                      onChange={e => setPaceInput(e.target.value)}
                      placeholder={autoPace ?? '5:30'}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0D9488] pr-14" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">/km</span>
                  </div>
                  {autoPace && !paceInput && <p className="text-[10px] text-teal-600 mt-1">Auto: {autoPace}/km</p>}
                </div>
              )}
              <div className="mb-6">
                <label className="text-sm font-semibold text-gray-700 block mb-2">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="How did it feel?" rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
              </div>
            </>
          )}
        </div>
        <div className="px-6 pb-6 pt-3 border-t border-gray-50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[#0D9488] text-white text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : existingLog ? 'Update' : 'Log it ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  p1: { label: 'Phase 1', bg: 'bg-teal-100',   text: 'text-teal-800'   },
  p2: { label: 'Phase 2', bg: 'bg-violet-100', text: 'text-violet-800' },
  tr: { label: 'Travel',  bg: 'bg-amber-100',  text: 'text-amber-800'  },
}

const WEEK_TYPE: Record<string, { label: string; colour: string; dot: string }> = {
  k: { label: 'Build',  colour: 'text-blue-600',   dot: 'bg-blue-400'   },
  d: { label: 'Deload', colour: 'text-orange-500', dot: 'bg-orange-400' },
  p: { label: 'Peak',   colour: 'text-red-600',    dot: 'bg-red-400'    },
  r: { label: 'Race',   colour: 'text-yellow-600', dot: 'bg-yellow-400' },
}

const NUT_CAT: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  hydration: { bg: 'bg-blue-50',   text: 'text-blue-800',   border: 'border-blue-200',   icon: '💧' },
  food:      { bg: 'bg-green-50',  text: 'text-green-800',  border: 'border-green-200',  icon: '🍽️' },
  fuel:      { bg: 'bg-amber-50',  text: 'text-amber-800',  border: 'border-amber-200',  icon: '⚡' },
  info:      { bg: 'bg-gray-50',   text: 'text-gray-600',   border: 'border-gray-200',   icon: 'ℹ️' },
  macro:     { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', icon: '📊' },
}

// ─── Day Drawer ─────────────────────────────────────────────────────────────────

function DayDrawer({ day, dayIndex, weekN, weekTitle, logs, gymLogs, isToday, isPast, onClose, onLogSession }: {
  day: PlanDay; dayIndex: number; weekN: number; weekTitle: string
  logs: Record<string, TrainingLog>; gymLogs: Record<string, unknown>; isToday: boolean; isPast: boolean
  onClose: () => void
  onLogSession: (weekN: number, dayI: number, sessI: number) => void
}) {
  const [bottomInset, setBottomInset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const fn = () => setBottomInset(Math.max(0, window.innerHeight - vv!.height - vv!.offsetTop))
    vv.addEventListener('resize', fn)
    vv.addEventListener('scroll', fn)
    return () => { vv.removeEventListener('resize', fn); vv.removeEventListener('scroll', fn) }
  }, [])

  const nutItems = (day.nut || []).filter(n => n.cat !== 'macro')
  const macroEntry = (day.nut || []).find(n => n.cat === 'macro')
  const isRest = day.sessions.length === 0 || day.sessions.every(s => s.c === 'rest')

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/20 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl flex flex-col"
        style={{ maxHeight: '88vh', marginBottom: bottomInset }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle + header */}
        <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-base font-bold ${isToday ? 'text-[#0D9488]' : 'text-gray-900'}`}>{day.d}</span>
                {isToday && <span className="text-[10px] font-bold text-[#0D9488] bg-teal-50 px-2 py-0.5 rounded-full">Today</span>}
                {isPast && <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Past</span>}
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">{weekTitle}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* Schedule + sleep */}
          {((day.times || []).length > 0 || day.sleep) && (
            <div className="flex gap-2">
              {(day.times || []).length > 0 && (
                <div className="flex-1 bg-gray-50 rounded-xl p-3">
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2">🕐 Schedule</div>
                  {(day.times || []).map((t, i) => (
                    <div key={i} className="flex gap-2 mb-1 last:mb-0">
                      <span className="text-[11px] font-bold text-gray-600 w-10 flex-shrink-0">{t.t}</span>
                      <span className="text-[11px] text-gray-500">{t.l}</span>
                    </div>
                  ))}
                </div>
              )}
              {day.sleep && (
                <div className="flex-1 bg-amber-50 rounded-xl p-3">
                  <div className="text-[9px] font-bold text-amber-500 uppercase tracking-wider mb-1">😴 Sleep</div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">{day.sleep}</p>
                </div>
              )}
            </div>
          )}

          {/* Sessions */}
          <div>
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              {isRest ? 'Rest Day' : 'Sessions'}
            </div>
            {isRest ? (
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-2xl mb-1">🛌</div>
                <p className="text-sm text-gray-400">Recovery day</p>
              </div>
            ) : (
              <div className="space-y-2">
                {day.sessions.map((session, sessI) => {
                  const cfg = getSessionType(session.c)
                  const isDone = !!logs[`${weekN}_${dayIndex}_${sessI}`]?.done || !!gymLogs[`${weekN}_${dayIndex}_${sessI}`]
                  const name = decodeHtml(session.n)
                  const detail = session.det ? decodeHtml(session.det) : null
                  return (
                    <div key={sessI} className={`rounded-xl border p-3 ${isDone ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100'}`}>
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-0.5 w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold ${isDone ? 'bg-emerald-500 text-white' : `${cfg.colour} ${cfg.textColour}`}`}>
                          {isDone ? '✓' : cfg.label.slice(0,3).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-sm font-semibold ${isDone ? 'text-emerald-700 line-through' : 'text-gray-900'}`}>{name}</span>
                            {session.km > 0 && <span className="text-[10px] text-gray-400">{fmtKm(session.km)}</span>}
                          </div>
                          {detail && (() => {
                            const { technical, rationale } = parseDet(session.det!)
                            return (
                              <>
                                <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed font-medium">{technical}</p>
                                {rationale && (
                                  <div className="flex items-start gap-1.5 mt-1.5 bg-teal-50 rounded-lg px-2 py-1.5">
                                    <span className="text-[10px] flex-shrink-0 mt-px">🧠</span>
                                    <p className="text-[10px] text-teal-700 leading-relaxed">{rationale}</p>
                                  </div>
                                )}
                              </>
                            )
                          })()}
                        </div>
                        {!isPast && (
                          <button
                            onClick={() => onLogSession(weekN, dayIndex, sessI)}
                            className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-lg ${
                              isDone ? 'bg-emerald-100 text-emerald-700' :
                              session.c?.startsWith('gym') ? 'bg-amber-500 text-white' :
                              'bg-[#0D9488] text-white'
                            }`}
                          >
                            {isDone ? '✓ Done' : session.c?.startsWith('gym') ? 'Start →' : 'Log'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Nutrition timeline */}
          {nutItems.length > 0 && (
            <div>
              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2">Nutrition Timeline</div>
              <div className="space-y-2">
                {nutItems.map((n, i) => {
                  const cat = NUT_CAT[n.cat] ?? NUT_CAT.food
                  return (
                    <div key={i} className={`rounded-xl border ${cat.bg} ${cat.border} p-3`}>
                      <div className="flex items-start gap-2">
                        <span className="text-base flex-shrink-0">{cat.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[10px] font-bold ${cat.text}`}>{n.t}</span>
                            <span className={`text-[11px] font-semibold ${cat.text}`}>{decodeHtml(n.l)}</span>
                          </div>
                          <p className={`text-[11px] leading-relaxed ${cat.text} opacity-80`}>{decodeHtml(n.d)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Macro targets */}
          {macroEntry && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
              <div className="text-[9px] font-bold text-purple-400 uppercase tracking-wider mb-1">📊 Daily Macro Targets</div>
              <p className="text-xs text-purple-800 font-medium leading-relaxed">{decodeHtml(macroEntry.d)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Day Row ────────────────────────────────────────────────────────────────────

function DayRow({ day, dayIndex, weekN, logs, gymLogs, isToday, isPast, onOpen }: {
  day: PlanDay; dayIndex: number; weekN: number
  logs: Record<string, TrainingLog>; gymLogs: Record<string, unknown>; isToday: boolean; isPast: boolean
  onOpen: () => void
}) {
  const realSessions = day.sessions.filter(s => s.c !== 'rest')
  const done = realSessions.filter((_, i) => {
    const key = `${weekN}_${dayIndex}_${i}`
    return logs[key]?.done || !!gymLogs[key]
  }).length
  const allDone = realSessions.length > 0 && done === realSessions.length
  const isRest = realSessions.length === 0

  return (
    <button
      onClick={onOpen}
      className={`w-full px-4 py-2.5 border-b border-gray-50 last:border-0 text-left flex items-center gap-3 active:bg-gray-50 transition-colors ${isToday ? 'bg-teal-50/50' : ''}`}
    >
      <div className="w-9 flex-shrink-0 text-center">
        <div className={`text-xs font-bold ${isToday ? 'text-[#0D9488]' : isPast ? 'text-gray-300' : 'text-gray-400'}`}>{day.d}</div>
        {isToday && <div className="w-1.5 h-1.5 bg-[#0D9488] rounded-full mx-auto mt-0.5" />}
      </div>

      <div className="flex-1 min-w-0">
        {isRest ? (
          <span className="text-[11px] text-gray-300 italic">Rest</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {realSessions.map((s, i) => {
              const cfg = getSessionType(s.c)
              const isDone = !!logs[`${weekN}_${dayIndex}_${i}`]?.done || !!gymLogs[`${weekN}_${dayIndex}_${i}`]
              const name = decodeHtml(s.n)
              return (
                <div key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${isDone ? 'bg-emerald-100 text-emerald-700' : `${cfg.colour} ${cfg.textColour}`} ${isPast && !isDone ? 'opacity-40' : ''}`}>
                  <span className={`w-1 h-1 rounded-full ${isDone ? 'bg-emerald-500' : cfg.dot}`} />
                  {name.length > 18 ? name.slice(0, 18) + '…' : name}
                  {s.km > 0 && <span className="opacity-60 ml-0.5">{fmtKm(s.km)}</span>}
                </div>
              )
            })}
          </div>
        )}
        {/* Sleep hint — only on upcoming days */}
        {day.sleep && !isPast && !isToday && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[9px]">😴</span>
            <span className="text-[9px] text-gray-300 truncate">{day.sleep}</span>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 flex items-center gap-1.5">
        {allDone ? (
          <div className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : !isRest && (
          <span className="text-[9px] text-gray-300">{done}/{realSessions.length}</span>
        )}
        <svg className="w-3 h-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}

// ─── Week Row ───────────────────────────────────────────────────────────────────

function WeekRow({ week, status, logs, gymLogs, todayDayIndex, weekRef, onOpenDay }: {
  week: PlanWeek; status: 'completed' | 'current' | 'upcoming'
  logs: Record<string, TrainingLog>; gymLogs: Record<string, unknown>; todayDayIndex: number
  weekRef?: React.RefObject<HTMLDivElement | null>
  onOpenDay: (day: PlanDay, dayIndex: number) => void
}) {
  const isCurrent = status === 'current'
  const isCompleted = status === 'completed'
  const [open, setOpen] = useState(isCurrent)

  const phase = PHASE_LABELS[week.ph] ?? { label: week.ph, bg: 'bg-gray-100', text: 'text-gray-600' }
  const wtype = WEEK_TYPE[week.b] ?? null
  const realSessions = week.days.flatMap((d, dayI) => d.sessions.filter(s => s.c !== 'rest').map((_, sessI) => `${week.n}_${dayI}_${sessI}`))
  const totalSessions = realSessions.length
  const doneSessions = realSessions.filter(k => logs[k]?.done || !!gymLogs[k]).length
  const progress = totalSessions > 0 ? doneSessions / totalSessions : 0

  return (
    <div
      ref={weekRef}
      className={`rounded-2xl border overflow-hidden bg-white transition-all ${
        isCurrent ? 'border-[#0D9488] shadow-sm' : isCompleted ? 'border-gray-100 opacity-60' : 'border-gray-100'
      }`}
    >
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 p-4 text-left">
        {/* Badge */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${
          isCurrent ? 'bg-[#0D9488] text-white' : isCompleted ? 'bg-gray-100 text-gray-300' : 'bg-gray-100 text-gray-500'
        }`}>
          {isCompleted ? (
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : week.n}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${phase.bg} ${phase.text}`}>{phase.label}</span>
            {wtype && (
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${wtype.dot}`} />
                <span className={`text-[10px] font-semibold ${wtype.colour}`}>{wtype.label}</span>
              </div>
            )}
            {isCurrent && <span className="text-[10px] font-bold text-[#0D9488]">← Now</span>}
          </div>
          <div className={`text-sm font-semibold truncate ${isCompleted ? 'text-gray-400' : 'text-gray-900'}`}>{decodeHtml(week.title)}</div>
          <div className={`text-[10px] mt-0.5 ${isCompleted ? 'text-gray-300' : 'text-gray-400'}`}>
            {week.kl[0]}–{week.kl[1]}km · {doneSessions}/{totalSessions} done
          </div>
        </div>

        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          {isCurrent && totalSessions > 0 && (
            <div className="text-right">
              <span className="text-base font-bold text-[#0D9488] leading-none">{doneSessions}</span>
              <span className="text-[9px] text-gray-400">/{totalSessions}</span>
            </div>
          )}
          {isCompleted && progress > 0 && (
            <span className="text-[9px] text-gray-300">{Math.round(progress * 100)}%</span>
          )}
          <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''} ${isCompleted ? 'text-gray-200' : 'text-gray-400'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Progress bar */}
      {isCurrent && totalSessions > 0 && (
        <div className="px-4 pb-1">
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#0D9488] rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      )}

      {/* Week note */}
      {open && week.note && (
        <div className="px-4 pb-2">
          <p className={`text-xs rounded-xl px-3 py-2 leading-relaxed ${isCompleted ? 'bg-gray-50 text-gray-400' : 'bg-amber-50 text-amber-700'}`}>
            {decodeHtml(week.note)}
          </p>
        </div>
      )}

      {/* Gym session summary — current week only */}
      {open && isCurrent && (() => {
        const gymSessionsThisWeek = week.days.flatMap((d, dayI) =>
          d.sessions
            .map((s, sessI) => ({ s, dayI, sessI }))
            .filter(({ s }) => s?.c?.startsWith('gym'))
        )
        if (gymSessionsThisWeek.length === 0) return null
        const gymDone = gymSessionsThisWeek.filter(({ dayI, sessI }) =>
          !!gymLogs[`${week.n}_${dayI}_${sessI}`]
        ).length
        return (
          <div className="mx-4 mb-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🏋️</span>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">Strength this week</span>
              <span className="ml-auto text-[11px] font-bold text-amber-700">{gymDone}/{gymSessionsThisWeek.length} done</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {gymSessionsThisWeek.map(({ s, dayI, sessI }) => {
                const isDone = !!gymLogs[`${week.n}_${dayI}_${sessI}`]
                const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                return (
                  <div key={`${dayI}_${sessI}`}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                      isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-amber-200 text-amber-700'
                    }`}>
                    {isDone && <span>✓</span>}
                    <span>{dayNames[dayI]} — {s.n}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Day rows */}
      {open && (
        <div className="border-t border-gray-50">
          {week.days.map((day, dayI) => (
            <DayRow
              key={dayI}
              day={day as PlanDay}
              dayIndex={dayI}
              weekN={week.n}
              logs={logs}
              gymLogs={gymLogs}
              isToday={isCurrent && dayI === todayDayIndex}
              isPast={isCompleted}
              onOpen={() => onOpenDay(day, dayI)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────────

export default function PlanClient() {
  const router = useRouter()
  const { plan, weeks, currentWeek, loading, advanceWeek } = useActivePlan()
  const { logs, logSession } = useTrainingLog(plan?.id ?? null)
  const { gymLogs } = useGymLog(plan?.id ?? null)
  const { success: toastSuccess, error: toastError } = useToast()
  const [advancing, setAdvancing] = useState(false)
  const [viewMode, setViewMode] = useState<'active' | 'full'>('active')
  const [completedExpanded, setCompletedExpanded] = useState(false)
  const [phaseFilter, setPhaseFilter] = useState<string>('all')
  const [drawerDay, setDrawerDay] = useState<{ day: PlanDay; dayIndex: number; weekN: number; weekTitle: string } | null>(null)
  const [logModal, setLogModal] = useState<{ session: PlanSession; dayIndex: number; sessI: number; weekN: number } | null>(null)
  const currentWeekRef = useRef<HTMLDivElement>(null)

  const { start, end } = useMemo(() => {
    if (!plan) { const t = new Date().toISOString().slice(0,10); return { start: t, end: t } }
    const s = new Date(plan.start_date + 'T00:00:00')
    s.setDate(s.getDate() + (plan.current_week - 1) * 7)
    const e = new Date(s); e.setDate(e.getDate() + 6)
    return { start: s.toISOString().slice(0,10), end: e.toISOString().slice(0,10) }
  }, [plan])

  useMealPlan(start, end) // keep meal plan hook warm

  useEffect(() => {
    if (!loading && plan && currentWeekRef.current) {
      setTimeout(() => currentWeekRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300)
    }
  }, [loading, plan])

  const todayDayIndex = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1 })()

  const { completedWeeks, currentWeekObj, upcomingWeeks, availablePhases } = useMemo(() => {
    if (!plan) return { completedWeeks: [] as PlanWeek[], currentWeekObj: null, upcomingWeeks: [] as PlanWeek[], availablePhases: [] as string[] }
    const cw = plan.current_week
    return {
      completedWeeks: [...weeks.filter(w => w.n < cw)].reverse(),
      currentWeekObj: weeks.find(w => w.n === cw) ?? null,
      upcomingWeeks: weeks.filter(w => w.n > cw),
      availablePhases: [...new Set(weeks.map(w => w.ph))],
    }
  }, [weeks, plan])

  const filterWeek = useCallback((w: PlanWeek) => phaseFilter === 'all' || w.ph === phaseFilter, [phaseFilter])

  const weekComplete = currentWeekObj ? currentWeekObj.days.every((day, dayI) => {
    const real = day.sessions.filter(s => s.c !== 'rest')
    return real.length === 0 || real.every((_, sessI) => {
      const key = `${currentWeekObj.n}_${dayI}_${sessI}`
      return logs[key]?.done || !!gymLogs[key]
    })
  }) : false
  const canAdvance = weekComplete && plan && plan.current_week < plan.total_weeks

  async function handleAdvance() {
    if (!canAdvance) return
    setAdvancing(true)
    try {
      await advanceWeek()
      toastSuccess(`Week ${plan!.current_week + 1} started!`)
    } catch {
      toastError('Failed to advance week — try again')
    } finally {
      setAdvancing(false)
    }
  }

  function openDay(week: PlanWeek, day: PlanDay, dayIndex: number) {
    setDrawerDay({ day: day as PlanDay, dayIndex, weekN: week.n, weekTitle: decodeHtml(week.title) })
  }

  async function handleSaveLog(params: {
    week_n: number; day_i: number; session_i: number; done: boolean
    effort?: number; km?: number; notes?: string; duration_secs?: number; pace?: string
  }) {
    if (!plan) return
    try {
      await logSession({ plan_id: plan.id, ...params })
      hapticLight()
      toastSuccess('Session logged ✓')
    } catch {
      toastError('Failed to save — check your connection')
    }
    setLogModal(null)
  }

  function handleLogSession(weekN: number, dayI: number, sessI: number) {
    if (!plan) return
    const week = weeks.find(w => w.n === weekN)
    const session = week?.days[dayI]?.sessions[sessI]
    if (!session) return
    // Gym sessions go to live tracker, not the log modal
    if (session.c?.startsWith('gym')) {
      router.push(`/gym/live/${weekN}/${dayI}/${sessI}`)
      return
    }
    setLogModal({ session, dayIndex: dayI, sessI, weekN })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] pb-24 pt-16">
        <div className="max-w-lg mx-auto px-4 space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] pb-24 pt-16 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-base font-bold text-gray-900 mb-2">No active plan</h2>
          <a href="/onboarding" className="inline-block bg-[#0D9488] text-white px-6 py-3 rounded-xl text-sm font-semibold mt-4">Choose a plan →</a>
        </div>
      </div>
    )
  }

  const weeksRemaining = upcomingWeeks.length + 1

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-24">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 sticky top-0 z-40">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900 truncate">{decodeHtml(plan.name)}</h1>
            <DarkModeToggle />
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Week {plan.current_week} of {plan.total_weeks}
            {plan.race_date && ` · Race: ${new Date(plan.race_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
          </p>
          <div className="mt-2.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#0D9488] rounded-full transition-all" style={{ width: `${(plan.current_week / plan.total_weeks) * 100}%` }} />
          </div>
          <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
            <span>Week 1</span>
            <span>{Math.round((plan.current_week / plan.total_weeks) * 100)}% complete</span>
            <span>Week {plan.total_weeks}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border-b border-gray-100 px-4 py-2.5">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-xl p-0.5 flex-shrink-0">
            {(['active', 'full'] as const).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${viewMode === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                {mode === 'active' ? `Active (${weeksRemaining})` : 'Full plan'}
              </button>
            ))}
          </div>
          {/* Phase filter */}
          {availablePhases.length > 1 && (
            <div className="flex gap-1 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
              {['all', ...availablePhases].map(ph => (
                <button key={ph} onClick={() => setPhaseFilter(ph)}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${phaseFilter === ph ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {ph === 'all' ? 'All' : (PHASE_LABELS[ph]?.label ?? ph)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">

        {/* Advance prompt */}
        {canAdvance && (
          <div className="bg-emerald-50 rounded-2xl border border-emerald-100 px-4 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-emerald-700">Week {plan.current_week} complete! 🎉</p>
              <p className="text-xs text-emerald-600 mt-0.5">Ready for Week {plan.current_week + 1}?</p>
            </div>
            <button onClick={handleAdvance} disabled={advancing}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold disabled:opacity-50 flex-shrink-0">
              {advancing ? '…' : 'Next week →'}
            </button>
          </div>
        )}

        {/* Adaptive coaching suggestions */}
        <AdaptiveSuggestions
          weeks={weeks}
          logs={logs}
          gymLogs={gymLogs}
          currentWeek={plan.current_week}
          planId={plan.id}
        />

        {/* ── ACTIVE VIEW ── */}
        {viewMode === 'active' && (
          <>
            {/* Completed accordion */}
            {completedWeeks.filter(filterWeek).length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
                <button onClick={() => setCompletedExpanded(e => !e)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                  <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-400">{completedWeeks.filter(filterWeek).length} weeks completed</div>
                    <div className="text-[10px] text-gray-300">Tap to review past weeks</div>
                  </div>
                  <svg className={`w-4 h-4 text-gray-300 transition-transform ${completedExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {completedExpanded && (
                  <div className="border-t border-gray-50 px-3 pb-3 pt-2 space-y-2">
                    {completedWeeks.filter(filterWeek).map(week => (
                      <WeekRow key={week.n} week={week} status="completed" logs={logs} gymLogs={gymLogs} todayDayIndex={-1}
                        onOpenDay={(day, di) => openDay(week, day, di)} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Current */}
            {currentWeekObj && filterWeek(currentWeekObj) && (
              <WeekRow week={currentWeekObj} status="current" logs={logs} gymLogs={gymLogs} todayDayIndex={todayDayIndex}
                weekRef={currentWeekRef} onOpenDay={(day, di) => openDay(currentWeekObj, day, di)} />
            )}

            {/* Upcoming */}
            {upcomingWeeks.filter(filterWeek).map(week => (
              <WeekRow key={week.n} week={week} status="upcoming" logs={logs} gymLogs={gymLogs} todayDayIndex={-1}
                onOpenDay={(day, di) => openDay(week, day, di)} />
            ))}
          </>
        )}

        {/* ── FULL VIEW ── */}
        {viewMode === 'full' && weeks.filter(filterWeek).map(week => {
          const status = week.n < plan.current_week ? 'completed' : week.n === plan.current_week ? 'current' : 'upcoming'
          return (
            <WeekRow key={week.n} week={week} status={status} logs={logs} gymLogs={gymLogs}
              todayDayIndex={status === 'current' ? todayDayIndex : -1}
              weekRef={status === 'current' ? currentWeekRef : undefined}
              onOpenDay={(day, di) => openDay(week, day, di)} />
          )
        })}
      </div>

      {/* Day drawer */}
      {drawerDay && (
        <DayDrawer
          day={drawerDay.day}
          dayIndex={drawerDay.dayIndex}
          weekN={drawerDay.weekN}
          weekTitle={drawerDay.weekTitle}
          logs={logs}
          gymLogs={gymLogs}
          isToday={drawerDay.weekN === plan.current_week && drawerDay.dayIndex === todayDayIndex}
          isPast={drawerDay.weekN < plan.current_week}
          onClose={() => setDrawerDay(null)}
          onLogSession={handleLogSession}
        />
      )}

      {/* Log modal — opens when tapping Log in drawer or day row */}
      {logModal && plan && (
        <LogModal
          session={logModal.session}
          dayIndex={logModal.dayIndex}
          sessionIndex={logModal.sessI}
          weekN={logModal.weekN}
          planId={plan.id}
          existingLog={logs[`${logModal.weekN}_${logModal.dayIndex}_${logModal.sessI}`] ?? null}
          onClose={() => setLogModal(null)}
          onSave={handleSaveLog}
        />
      )}
    </div>
  )
}
