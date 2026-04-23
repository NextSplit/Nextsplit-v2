'use client'

import { useState } from 'react'

export default function SeedPageClient() {
  const [status, setStatus] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)

  async function runSeed() {
    setRunning(true)
    setStatus(['Starting seed...'])

    try {
      const res = await fetch('/api/admin/seed-plans', { method: 'POST' })
      const data = await res.json()

      if (data.results) {
        setStatus(data.results.map((r: { name: string; status: string; error?: string }) =>
          r.status === 'ok' ? `✅ ${r.name}` : `❌ ${r.name}: ${r.error}`
        ))
      } else {
        setStatus([`Error: ${data.error || 'Unknown'}`])
      }
      setDone(true)
    } catch (e) {
      setStatus([`Failed: ${e}`])
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Seed Plan Templates</h1>
        <p className="text-sm text-gray-500 mb-6">
          Inserts all 36 training plans into Supabase. Safe to run multiple times (upsert).
        </p>

        {!done && (
          <button
            onClick={runSeed}
            disabled={running}
            className="w-full py-4 bg-[var(--ns-ember)] text-white rounded-xl font-semibold text-sm disabled:opacity-50"
          >
            {running ? 'Seeding…' : 'Seed Plans Now'}
          </button>
        )}

        {status.length > 0 && (
          <div className="mt-6 space-y-2">
            {status.map((s, i) => (
              <div key={i} className="text-sm font-mono bg-white rounded-lg px-3 py-2 border border-gray-100">
                {s}
              </div>
            ))}
          </div>
        )}

        {done && (
          <div className="mt-6">
            <a href="/onboarding/predetermined" className="block w-full py-4 bg-gray-900 text-white rounded-xl font-semibold text-sm text-center">
              Go to Plan Browser →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
