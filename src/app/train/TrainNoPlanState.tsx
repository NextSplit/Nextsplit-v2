'use client'

export function TrainNoPlanState() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-10 pb-6">
      <div className="rounded-2xl p-6 text-center"
        style={{ background: 'rgba(6,182,212,0.08)', border: '1.5px solid rgba(6,182,212,0.25)' }}>
        <div className="text-4xl mb-3">🏃</div>
        <h2 className="text-lg font-black mb-2" style={{ color: 'var(--color-text-primary)' }}>No active plan</h2>
        <p className="text-sm mb-5" style={{ color: 'var(--color-text-tertiary)' }}>Pick a training path to get started.</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { href: '/onboarding/predetermined', label: 'Expert plans', icon: '📋', col: '#ff4d6d' },
            { href: '/onboarding/ai',            label: 'AI bespoke',   icon: '🧠', col: '#06b6d4' },
            { href: '/plan/browse',              label: 'Browse all',   icon: '🔍', col: '#8b5cf6' },
            { href: '/onboarding/manual',        label: 'Build my own', icon: '✏️', col: '#84cc16' },
          ].map(p => (
            <a key={p.href} href={p.href}
              className="rounded-xl py-3 text-center font-bold text-sm text-white"
              style={{ background: p.col }}>
              {p.icon} {p.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
