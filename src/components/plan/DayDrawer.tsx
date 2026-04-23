'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import { getSessionType, fmtKm, decodeHtml, parseDet } from '@/lib/sessionUtils'
import { useGymLog } from '@/hooks/useGymLog'
import type { PlanWeek, PlanDay, PlanSession, TrainingLog } from '@/types/database'
import { db } from '@/lib/supabase/db'

const PHASE_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  p1: { label: 'Phase 1', bg: 'bg-[var(--ns-ember-light)]',   text: 'text-[var(--color-surface-2)]'   },
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
  const isRest = day.sessions.length === 0 || day.sessions.every(s => !s.c || s.c === 'rest')

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end backdrop-blur-[2px]" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div
        className="w-full max-w-lg mx-auto rounded-t-3xl shadow-2xl flex flex-col"
        style={{ background: 'var(--color-surface)', maxHeight: '88vh', marginBottom: bottomInset }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle + header */}
        <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-base font-bold ${isToday ? 'text-[var(--ns-ember)]' : 'text-gray-900'}`}>{day.d}</span>
                {isToday && <span className="text-[10px] font-bold text-[var(--ns-ember)] bg-[var(--ns-ember-light)] px-2 py-0.5 rounded-full">Today</span>}
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
                                  <div className="flex items-start gap-1.5 mt-1.5 bg-[var(--ns-ember-light)] rounded-lg px-2 py-1.5">
                                    <span className="text-[10px] flex-shrink-0 mt-px">🧠</span>
                                    <p className="text-[10px] text-[var(--ns-ember)] leading-relaxed">{rationale}</p>
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
                              'bg-[var(--ns-ember)] text-white'
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


export default DayDrawer
