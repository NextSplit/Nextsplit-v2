'use client'

import { computeStreak, computeConsistency } from '@/lib/streak'
import { computePersonalBests } from '@/lib/personalBests'
import type { TrainingLog } from '@/types/database'

const RACE_DISTANCES = [
  { label: '5K', km: 5 },
  { label: '10K', km: 10 },
  { label: 'Half', km: 21.0975 },
  { label: 'Marathon', km: 42.195 },
]

function TrainingSummary({ logs }: { logs: Record<string, TrainingLog> }) {
  const all = Object.values(logs)
  const done = all.filter(l => l.done)
  const km = done.reduce((a, l) => a + (l.km ?? 0), 0)
  const runs = done.filter(l => l.done).length

  return (
    <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4">
      <p className="text-sm font-bold text-gray-900 mb-3">Training summary</p>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-2xl font-black text-gray-900">{Math.round(km)}</div>
          <div className="text-[10px] text-[var(--color-text-tertiary)]">km logged</div>
        </div>
        <div>
          <div className="text-2xl font-black text-gray-900">{runs}</div>
          <div className="text-[10px] text-[var(--color-text-tertiary)]">sessions done</div>
        </div>
        <div>
          <div className="text-2xl font-black text-gray-900">
            {done.length > 0 ? Math.round(done.reduce((a, l) => a + (l.effort ?? 7), 0) / done.length * 10) / 10 : '—'}
          </div>
          <div className="text-[10px] text-[var(--color-text-tertiary)]">avg RPE</div>
        </div>
      </div>
    </div>
  )
}

// ─── PWA Install Card ──────────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Store the event globally so it survives component mounts
let _installPrompt: BeforeInstallPromptEvent | null = null

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    _installPrompt = e as BeforeInstallPromptEvent
  })
}


export default TrainingSummary
