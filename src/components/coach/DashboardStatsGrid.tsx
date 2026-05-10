'use client'

import { DashStatTile } from './DashStatTile'
import type { AthleteStatus } from './types'

// P3.1 dashboard v2 — week-at-a-glance stats grid. Aggregates across the
// coach's full athlete list so the coach can see their collective output
// without drilling into each athlete card.
export function DashboardStatsGrid({ athletes }: { athletes: AthleteStatus[] }) {
  return (
    <div className="max-w-lg mx-auto px-4 mt-3">
      <div className="grid grid-cols-4 gap-2">
        <DashStatTile label="Total" value={athletes.length} tone="neutral" />
        <DashStatTile
          label="Red"
          value={athletes.filter(a => a.status === 'red').length}
          tone="red"
        />
        <DashStatTile
          label="Silent"
          value={athletes.filter(a => a.days_since_message === null || (a.days_since_message ?? 0) >= 14).length}
          tone="amber"
          tip="No coach message in ≥14 days"
        />
        <DashStatTile
          label="Sessions/wk"
          value={athletes.reduce((s, a) => s + a.sessions_done_week, 0)}
          tone="green"
          tip="Done across all athletes this week"
        />
      </div>
    </div>
  )
}
