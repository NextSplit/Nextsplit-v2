'use client'

import { useUnits } from '@/lib/units'
import { logsArray } from '@/lib/statsUtils'
import type { TrainingLog, PlanWeek } from '@/types/database'

function SessionSummary({ logs, weeks }: { logs: Record<string, TrainingLog>; weeks: PlanWeek[] }) {
  const units = useUnits()
  const all = logsArray(logs)
  const done = all.filter(l => l.done)

  // Split planned vs ad-hoc (session_i === 99)
  const plannedDone = done.filter(l => l.session_i !== 99)
  const adHocDone = done.filter(l => l.session_i === 99)

  const totalKm = plannedDone.reduce((a, l) => a + (l.km ?? 0), 0)
  const totalSessions = plannedDone.length
  const totalHours = done.reduce((a, l) => a + (l.duration_secs ?? 0), 0) / 3600

  // Total planned sessions (excluding rest)
  const plannedTotal = weeks.reduce((a, w) =>
    a + w.days.reduce((b, d) => b + d.sessions.filter(s => s.c != null && s.c !== 'rest').length, 0), 0)

  const avgEffort = plannedDone.filter(l => l.effort).length > 0
    ? plannedDone.filter(l => l.effort).reduce((a, l) => a + l.effort!, 0) / plannedDone.filter(l => l.effort).length
    : 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="text-sm font-bold text-gray-900 mb-4">Plan Summary</div>
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center">
          <div className="text-xl font-black text-[var(--ns-forest)]">{Math.round(units === 'miles' ? totalKm * 0.621371 : totalKm)}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">{units === 'miles' ? 'mi' : 'km'}</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-black text-gray-900">{totalSessions}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">sessions</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-black text-gray-900">
            {totalHours > 0 ? totalHours.toFixed(1) : '—'}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">hours</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-black text-gray-900">
            {avgEffort > 0 ? avgEffort.toFixed(1) : '—'}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">avg RPE</div>
        </div>
      </div>
      {plannedTotal > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
            <span>{totalSessions} of {plannedTotal} sessions</span>
            <span>{Math.round((totalSessions / plannedTotal) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--ns-forest)] rounded-full"
              style={{ width: `${Math.min((totalSessions / plannedTotal) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
      {adHocDone.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2">
          <span className="text-base">➕</span>
          <div className="flex-1">
            <p className="text-[11px] font-semibold text-gray-600">
              {adHocDone.length} extra session{adHocDone.length !== 1 ? 's' : ''} logged outside your plan
            </p>
            {adHocDone.some(l => l.notes) && (
              <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                {adHocDone.filter(l => l.notes).slice(-1)[0]?.notes}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Stats Component — see bottom of file ───────────────────────────────


export default SessionSummary
