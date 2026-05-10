'use client'

import Link from 'next/link'

export function CoachToolsGrid() {
  return (
    <section>
      <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider px-1 mb-2">Tools</p>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/coach/plan-builder"
          className="bg-white rounded-2xl border border-[var(--color-border)] p-3.5 space-y-1 active:bg-gray-50">
          <span className="text-xl">📋</span>
          <p className="text-sm font-bold text-gray-800">Plan Builder</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">Build plans for athletes</p>
        </Link>
        <Link href="/coach/marketplace"
          className="bg-white rounded-2xl border border-[var(--color-border)] p-3.5 space-y-1 active:bg-gray-50">
          <span className="text-xl">📚</span>
          <p className="text-sm font-bold text-gray-800">My Plans</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">Edit + publish + assign</p>
        </Link>
        <Link href="/coach/earnings"
          className="bg-white rounded-2xl border border-[var(--color-border)] p-3.5 space-y-1 active:bg-gray-50">
          <span className="text-xl">💰</span>
          <p className="text-sm font-bold text-gray-800">Earnings</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">Revenue & commission</p>
        </Link>
        <Link href="/coach/settings"
          className="bg-white rounded-2xl border border-[var(--color-border)] p-3.5 space-y-1 active:bg-gray-50">
          <span className="text-xl">⚙️</span>
          <p className="text-sm font-bold text-gray-800">Settings</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">Availability & capacity</p>
        </Link>
        <Link href="/marketplace"
          className="bg-white rounded-2xl border border-[var(--color-border)] p-3.5 space-y-1 active:bg-gray-50">
          <span className="text-xl">🏪</span>
          <p className="text-sm font-bold text-gray-800">Marketplace</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">Browse and publish plans</p>
        </Link>
        <button
          onClick={async () => {
            try {
              await fetch('/api/coach/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier: 'professional' }) })
            } catch { /* ignore */ }
          }}
          className="bg-white rounded-2xl border border-[var(--color-border)] p-3.5 space-y-1 text-left active:bg-gray-50">
          <span className="text-xl">⚙️</span>
          <p className="text-sm font-bold text-gray-800">Coach Settings</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">Profile, credentials</p>
        </button>
      </div>
    </section>
  )
}
