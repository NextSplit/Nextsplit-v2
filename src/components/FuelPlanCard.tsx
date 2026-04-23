'use client'

import { useState } from 'react'
import { decodeHtml } from '@/lib/sessionUtils'
import type { PlanDay, NutritionEvent } from '@/types/database'

const CAT_STYLE: Record<string, { bg: string; icon: string; text: string }> = {
  hydration: { bg: '#eff6ff', icon: '💧', text: '#1e40af' },
  food:      { bg: '#f0fdf4', icon: '🍽️', text: '#15803d' },
  fuel:      { bg: '#fffbeb', icon: '⚡',  text: '#92400e' },
  info:      { bg: '#f9fafb', icon: 'ℹ️', text: '#4b5563' },
  macro:     { bg: '#faf5ff', icon: '📊', text: '#6b21a8' },
}

interface Props { planDay: PlanDay }

export default function FuelPlanCard({ planDay }: Props) {
  const [open, setOpen] = useState(false)

  const now = new Date()
  const currentHour = now.getHours() + now.getMinutes() / 60

  function parseHour(t: string): number | null {
    const m = t.match(/^(\d{1,2}):(\d{2})/)
    if (m) return parseInt(m[1]) + parseInt(m[2]) / 60
    if (/wake|morning/i.test(t)) return 6
    if (/lunch/i.test(t)) return 12
    if (/dinner|evening/i.test(t)) return 18
    if (/during/i.test(t)) return currentHour
    return null
  }

  const upcoming = planDay.nut
    .map(n => ({ ...n, hour: parseHour(n.t) }))
    .filter(n => n.cat !== 'macro' && (n.hour === null || n.hour >= currentHour - 0.5))
    .sort((a, b) => (a.hour ?? 99) - (b.hour ?? 99))
    .slice(0, 5)

  const nextItem = upcoming[0]
  if (!nextItem && !planDay.nut.find(n => n.cat === 'macro')) return null

  const nextStyle = CAT_STYLE[nextItem?.cat ?? 'food'] ?? CAT_STYLE.food

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>

      {/* Collapsed header — shows next item */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span className="text-lg flex-shrink-0">{nextStyle.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest mb-0.5"
            style={{ color: 'var(--color-text-tertiary)' }}>
            Fuel plan
          </p>
          {nextItem ? (
            <p className="text-xs font-semibold truncate"
              style={{ color: 'var(--color-text-primary)' }}>
              Next: {decodeHtml(nextItem.t)} · {decodeHtml(nextItem.l)}
            </p>
          ) : (
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Tap to see today's nutrition
            </p>
          )}
        </div>
        <span className="text-sm flex-shrink-0 transition-transform duration-200"
          style={{
            color: 'var(--color-text-tertiary)',
            display: 'inline-block',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}>
          ↓
        </span>
      </button>

      {/* Expanded */}
      {open && (
        <div className="border-t divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {upcoming.map((n, i) => {
            const s = CAT_STYLE[n.cat] ?? CAT_STYLE.food
            return (
              <div key={i} className="flex items-start gap-3 px-4 py-3"
                style={{ background: s.bg }}>
                <span className="text-base flex-shrink-0 mt-0.5">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-black uppercase"
                      style={{ color: s.text }}>
                      {decodeHtml(n.t)}
                    </span>
                    <span className="text-[11px] font-semibold"
                      style={{ color: s.text }}>
                      {decodeHtml(n.l)}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed opacity-85"
                    style={{ color: s.text }}>
                    {decodeHtml(n.d)}
                  </p>
                </div>
              </div>
            )
          })}
          {planDay.nut.find(n => n.cat === 'macro') && (
            <div className="flex items-start gap-3 px-4 py-3"
              style={{ background: CAT_STYLE.macro.bg }}>
              <span className="text-base flex-shrink-0">📊</span>
              <div>
                <p className="text-[10px] font-black uppercase mb-0.5"
                  style={{ color: CAT_STYLE.macro.text }}>
                  Daily targets
                </p>
                <p className="text-xs leading-relaxed"
                  style={{ color: CAT_STYLE.macro.text }}>
                  {decodeHtml(planDay.nut.find(n => n.cat === 'macro')!.d)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
