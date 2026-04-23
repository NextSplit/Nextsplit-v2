'use client'

import { useState } from 'react'

// Colour map: label → CSS colour values
const STAT_COLOURS: Record<string, { bar: string; text: string }> = {
  Endurance: { bar: '#3b82f6', text: '#1d4ed8' },
  Strength:  { bar: '#8b5cf6', text: '#6d28d9' },
  Recovery:  { bar: '#22c55e', text: '#15803d' },
  Nutrition: { bar: '#f59e0b', text: '#b45309' },
}

function StatBar({ label, value, colour, tip }: {
  label: string; value: number; colour: string; tip: string
}) {
  const [showTip, setShowTip] = useState(false)
  const c = STAT_COLOURS[label] ?? { bar: '#e85d26', text: '#c2410c' }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowTip(s => !s)}
          className="text-[10px] font-semibold w-16 flex-shrink-0 text-left"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {label}
        </button>
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-3)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.max(value, 2)}%`, background: c.bar }}
          />
        </div>
        <span className="text-[10px] font-black w-6 text-right" style={{ color: c.text }}>
          {value}
        </span>
      </div>
      {showTip && (
        <div className="absolute top-6 left-16 z-10 text-white text-[10px] rounded-xl px-3 py-2 max-w-[200px] shadow-xl"
          style={{ background: 'var(--color-text-primary)' }}>
          {tip}
        </div>
      )}
    </div>
  )
}

export default StatBar
