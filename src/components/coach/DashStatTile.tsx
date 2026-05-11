'use client'

// P3.1 dashboard v2 — small at-a-glance tile used in the stats grid.
// Tone drives the colour treatment so red/amber alerts are obvious
// without colour being the only signal (label + count are always shown).
export function DashStatTile({
  label, value, tone, tip,
}: {
  label: string
  value: number
  tone:  'neutral' | 'red' | 'amber' | 'green'
  tip?:  string
}) {
  const palette = {
    neutral: { bg: 'white',                 border: 'var(--color-border)',           fg: '#1f2937' },
    red:     { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.35)',          fg: '#dc2626' },
    amber:   { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.35)',         fg: '#d97706' },
    green:   { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.35)',         fg: '#059669' },
  }[tone]
  return (
    <div
      className="rounded-xl px-2 py-2 text-center"
      style={{ background: palette.bg, border: `1px solid ${palette.border}` }}
      title={tip}
    >
      <p className="text-base font-black leading-none" style={{ color: palette.fg }}>{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-wider mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
        {label}
      </p>
    </div>
  )
}
