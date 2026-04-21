'use client'

import { CoachCard } from '@/components/coach/CoachCard'
import TodayProgressStrip from './TodayProgressStrip'
import type { TrainingLog } from '@/types/database'
import ProGate from '@/components/ProGate'
import WellnessCheckIn from '@/components/WellnessCheckIn'
import CoachingCard from '@/components/CoachingCard'
import WeatherWidget from '@/components/WeatherWidget'

interface WeeklyReport {
  weekN: number; weekTitle: string; completionPct: number
  sessionsDone: number; sessionsPlanned: number
  kmLogged: number; kmPlanned: number; lastWeekKm: number
  vsLastWeek: 'up' | 'down' | 'same' | 'first'; avgEffort: number | null
  bestSession: string | null; lookAheadNote: string | null
}

interface Props {
  isToday:         boolean
  hasRunSessions:  boolean
  weeklyReport:    WeeklyReport | null
  planDay:         number
  isWeekDone:      boolean
  weekN:           number
  hasPlanNextWeek: boolean
  onReadiness:     (score: number) => void
  onAdvanceWeek:   () => Promise<void>
  // Progress strip
  logs:   Record<string, TrainingLog>
  streak: number
  acwr:   number | null
}

export default function TodayBelowFold({
  isToday, hasRunSessions, weeklyReport, planDay,
  isWeekDone, weekN, hasPlanNextWeek, onReadiness, onAdvanceWeek,
  logs, streak, acwr,
}: Props) {
  if (!isToday) return null

  const vsArrow  = weeklyReport?.vsLastWeek === 'up' ? '↑' : weeklyReport?.vsLastWeek === 'down' ? '↓' : '→'
  const vsColour = weeklyReport?.vsLastWeek === 'up' ? 'text-emerald-600' : weeklyReport?.vsLastWeek === 'down' ? 'text-red-500' : 'text-gray-500'

  return (
    <>
      {/* Progress strip — weekly stats at a glance */}
      <TodayProgressStrip logs={logs} streak={streak} acwr={acwr} weekN={weekN} />

      {/* Coach card */}
      <CoachCard />

      {/* Wellness check-in */}
      <WellnessCheckIn onReadiness={onReadiness} />

      {/* Weather */}
      {hasRunSessions && (
        <ProGate feature="ai_adaptive_suggestions" fallback={null}>
          <WeatherWidget />
        </ProGate>
      )}

      {/* Monday weekly report */}
      {weeklyReport && (
        <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl border border-teal-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-teal-100/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-teal-800 uppercase tracking-wide">Week {weeklyReport.weekN} · {weeklyReport.weekTitle}</p>
                <p className="text-xs text-[var(--ns-forest)] mt-0.5">Your weekly report</p>
              </div>
              <span className="text-2xl">{weeklyReport.completionPct >= 90 ? '🌟' : weeklyReport.completionPct >= 60 ? '✅' : '💪'}</span>
            </div>
          </div>
          <div className="px-4 py-3 grid grid-cols-3 gap-3 border-b border-teal-100/30">
            <div className="text-center">
              <div className="text-lg font-black text-teal-900">{weeklyReport.completionPct}%</div>
              <div className="text-[10px] text-[var(--ns-forest-mid)]">sessions done</div>
              <div className="text-[9px] text-[var(--ns-forest-mid)]">{weeklyReport.sessionsDone}/{weeklyReport.sessionsPlanned}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-black text-teal-900">{weeklyReport.kmLogged}</div>
              <div className="text-[10px] text-[var(--ns-forest-mid)]">km logged</div>
              <div className="text-[9px] text-[var(--ns-forest-mid)]">of {weeklyReport.kmPlanned} planned</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-black ${vsColour}`}>
                {vsArrow} {weeklyReport.lastWeekKm > 0 ? Math.abs(Math.round((weeklyReport.kmLogged - weeklyReport.lastWeekKm) * 10) / 10) : '—'}
              </div>
              <div className="text-[10px] text-[var(--ns-forest-mid)]">vs prev week</div>
              {weeklyReport.avgEffort && <div className="text-[9px] text-[var(--ns-forest-mid)]">RPE {weeklyReport.avgEffort} avg</div>}
            </div>
          </div>
          {(weeklyReport.bestSession || weeklyReport.lookAheadNote) && (
            <div className="px-4 py-3 space-y-1.5">
              {weeklyReport.bestSession && (
                <p className="text-xs text-[var(--ns-forest)]"><span className="font-semibold">Best session:</span> {weeklyReport.bestSession}</p>
              )}
              {weeklyReport.lookAheadNote && (
                <p className="text-xs text-[var(--ns-forest)] leading-relaxed line-clamp-2">
                  <span className="font-semibold">This week:</span> {weeklyReport.lookAheadNote}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sunday coach banner */}
      {planDay === 0 && hasPlanNextWeek && (
        <div className="bg-[var(--ns-forest-light)] rounded-2xl border border-teal-100 px-4 py-3 flex items-start gap-2.5">
          <span className="text-base mt-0.5">🗓️</span>
          <div>
            <p className="text-[11px] font-bold text-teal-800 mb-0.5">Week {weekN} complete!</p>
            <p className="text-xs text-[var(--ns-forest)] leading-relaxed">
              Good work this week. Week {weekN + 1} starts tomorrow — check the Plan tab to see what&apos;s ahead.
            </p>
          </div>
        </div>
      )}

      {/* Week complete → advance prompt */}
      {isWeekDone && hasPlanNextWeek && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-emerald-700">Week {weekN} complete! 🎉</p>
              <p className="text-xs text-emerald-600 mt-0.5">Ready to move to Week {weekN + 1}?</p>
            </div>
            <button onClick={onAdvanceWeek}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold flex-shrink-0">
              Next week →
            </button>
          </div>
        </div>
      )}
    </>
  )
}
