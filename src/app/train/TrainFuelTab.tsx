'use client'

import FuelPlanCard from '@/components/FuelPlanCard'
import type { PlanWeek } from '@/types/database'

export function TrainFuelTab({ today }: { today: PlanWeek['days'][number] | undefined }) {
  const hasFuelData = !!today && Array.isArray(today.nut) && today.nut.length > 0
  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-32">
      {hasFuelData ? (
        <FuelPlanCard planDay={today} />
      ) : (
        <div className="rounded-2xl p-8 text-center"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="text-4xl mb-3">🥗</div>
          <p className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
            Fuel plan coming soon
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-tertiary)' }}>
            Personalised hydration, pre-run snacks and post-run recovery guidance will appear here once your plan template includes nutrition timings — or after you generate a bespoke AI plan with fuel guidance.
          </p>
        </div>
      )}
    </div>
  )
}
