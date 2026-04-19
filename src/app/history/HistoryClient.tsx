'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePlanHistory, ArchivedPlanSummary } from '@/hooks/usePlanHistory'
import { useSupabase } from '@/hooks/useSupabase'
import { getSessionType, fmtKm, decodeHtml } from '@/lib/sessionUtils'
import type { PlanWeek, PlanDay, TrainingLog } from '@/types/database'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Day row (read-only) ──────────────────────────────────────────────────────

function ReadOnlyDayRow({ day, dayIndex, weekN, logs }: {
  day: PlanDay; dayIndex: number; weekN: number
  logs: Record<string, TrainingLog>
}) {
  const realSessions = day.sessions.filter(s => s.c !== 'rest')
  if (realSessions.length === 0) return null

  return (
    <div className="px-4 py-2.5 border-b border-gray-50 last:border-0 flex items-center gap-3">
      <div className="w-9 flex-shrink-0 text-center">
        <div className="text-xs font-bold text-gray-300">{day.d}</div>
      </div>
      <div className="flex-1 flex flex-wrap gap-1">
        {realSessions.map((s, i) => {
          const isDone = !!logs[`${weekN}_${dayIndex}_${i}`]?.done
          const cfg = getSessionType(s.c)
          const name = decodeHtml(s.n)
          return (
            <div key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
              isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
            }`}>
              <span className={`w-1 h-1 rounded-full ${isDone ? 'bg-emerald-400' : 'bg-gray-300'}`} />
              {name.length > 20 ? name.slice(0, 20) + '…' : name}
              {s.km > 0 && <span className="opacity-60 ml-0.5">{fmtKm(s.km)}</span>}
            </div>
          )
        })}
      </div>
      <div className="flex-shrink-0">
        {realSessions.every((_, i) => logs[`${weekN}_${dayIndex}_${i}`]?.done) ? (
          <div className="w-4 h-4 rounded-full bg-emerald-400 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─── Week row (read-only) ─────────────────────────────────────────────────────

function ReadOnlyWeekRow({ week, logs }: { week: PlanWeek; logs: Record<string, TrainingLog> }) {
  const [open, setOpen] = useState(false)
  const realSessions = week.days.flatMap((d, di) =>
    d.sessions.filter(s => s.c !== 'rest').map((_, si) => `${week.n}_${di}_${si}`)
  )
  const done = realSessions.filter(k => logs[k]?.done).length
  const total = realSessions.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 p-3 text-left">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
          done === total && total > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
        }`}>
          {done === total && total > 0 ? '✓' : week.n}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-gray-600 truncate">{decodeHtml(week.title)}</div>
          <div className="text-[10px] text-gray-400">{done}/{total} sessions · {pct}%</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <svg className={`w-3 h-3 text-gray-300 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="border-t border-gray-50">
          {week.days.map((day, di) => (
            <ReadOnlyDayRow key={di} day={day} dayIndex={di} weekN={week.n} logs={logs} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Plan detail view ─────────────────────────────────────────────────────────

function PlanDetail({ summary, onBack }: { summary: ArchivedPlanSummary; onBack: () => void }) {
  const supabase = useSupabase()
  const [logs, setLogs] = useState<Record<string, TrainingLog>>({})
  const [logsLoading, setLogsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchLogs() {
      const { data } = await (supabase as any)
        .from('training_logs')
        .select('*')
        .eq('plan_id', summary.plan.id)
      if (!cancelled && data) {
        const keyed: Record<string, TrainingLog> = {}
        for (const l of data as TrainingLog[]) {
          keyed[`${l.week_n}_${l.day_i}_${l.session_i}`] = l
        }
        setLogs(keyed)
      }
      if (!cancelled) setLogsLoading(false)
    }
    fetchLogs()
    return () => { cancelled = true }
  }, [supabase, summary.plan.id])

  const { plan, weeks, totalKm, loggedSessions, totalSessions, weeksCompleted } = summary
  const completionPct = totalSessions > 0 ? Math.round((loggedSessions / totalSessions) * 100) : 0

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-24">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={onBack} aria-label="Back to history"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900 truncate">{decodeHtml(plan.name)}</h1>
            <p className="text-[10px] text-gray-400">Archived {fmtDate(plan.archived_at)}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Stats summary */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xl font-bold text-gray-900">{totalKm}</div>
              <div className="text-[10px] text-gray-400">km logged</div>
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{loggedSessions}</div>
              <div className="text-[10px] text-gray-400">sessions done</div>
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{weeksCompleted}</div>
              <div className="text-[10px] text-gray-400">weeks completed</div>
            </div>
          </div>
          <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${completionPct}%` }} />
          </div>
          <div className="text-[10px] text-gray-400 text-center mt-1">{completionPct}% of plan completed</div>
        </div>

        {/* Read-only plan */}
        {logsLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-12 bg-white rounded-xl border border-gray-100 animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {weeks.map(week => (
              <ReadOnlyWeekRow key={week.n} week={week} logs={logs} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Plan card (history list) ─────────────────────────────────────────────────

function PlanCard({ summary, onView }: { summary: ArchivedPlanSummary; onView: () => void }) {
  const { plan, totalKm, loggedSessions, totalSessions, weeksCompleted } = summary
  const pct = totalSessions > 0 ? Math.round((loggedSessions / totalSessions) * 100) : 0

  return (
    <button onClick={onView} className="w-full bg-white rounded-2xl border border-gray-100 p-4 text-left hover:border-gray-200 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-gray-900 truncate">{decodeHtml(plan.name)}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            Archived {fmtDate(plan.archived_at)}
          </div>
        </div>
        <div className={`flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${
          pct >= 80 ? 'bg-emerald-100 text-emerald-700' :
          pct >= 50 ? 'bg-amber-100 text-amber-700' :
          'bg-gray-100 text-gray-500'
        }`}>
          {pct}% done
        </div>
      </div>

      <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div>
          <div className="text-sm font-bold text-gray-700">{totalKm}</div>
          <div className="text-[9px] text-gray-400">km</div>
        </div>
        <div>
          <div className="text-sm font-bold text-gray-700">{loggedSessions}</div>
          <div className="text-[9px] text-gray-400">sessions</div>
        </div>
        <div>
          <div className="text-sm font-bold text-gray-700">{weeksCompleted}/{plan.total_weeks}</div>
          <div className="text-[9px] text-gray-400">weeks</div>
        </div>
      </div>

      <div className="flex items-center justify-end mt-2">
        <span className="text-[10px] text-[#0D9488] font-semibold">View full plan →</span>
      </div>
    </button>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HistoryClient() {
  const router = useRouter()
  const { plans, loading } = usePlanHistory()
  const [viewing, setViewing] = useState<ArchivedPlanSummary | null>(null)

  if (viewing) {
    return <PlanDetail summary={viewing} onBack={() => setViewing(null)} />
  }

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-24">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} aria-label="Go back"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">Plan History</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {loading ? (
          [1,2].map(i => <div key={i} className="h-36 bg-white rounded-2xl border border-gray-100 animate-pulse" />)
        ) : plans.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📚</div>
            <p className="text-sm font-semibold text-gray-900">No plan history yet</p>
            <p className="text-xs text-gray-400 mt-1">Completed or archived plans will appear here</p>
          </div>
        ) : (
          plans.map(s => (
            <PlanCard key={s.plan.id} summary={s} onView={() => setViewing(s)} />
          ))
        )}
      </div>
    </div>
  )
}
