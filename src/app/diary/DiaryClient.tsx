'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Log {
  id: string; km: number | null; effort: number | null
  pace: string | null; duration_secs: number | null
  notes: string | null; created_at: string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function DiaryClient({ logs }: { logs: Log[] }) {
  const [search, setSearch] = useState('')
  const filtered = logs.filter(l => !search || (l.notes ?? '').toLowerCase().includes(search.toLowerCase()))

  const grouped: Record<string, Log[]> = {}
  filtered.forEach(log => {
    const key = new Date(log.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(log)
  })

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>
      <div className="sticky top-0 z-40 border-b"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border-2)', borderWidth: 2 }}>
        <div className="max-w-lg mx-auto px-4 pt-12 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/you" className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--color-surface-2)', border: '2px solid var(--color-border-2)', color: 'var(--color-text-tertiary)' }}>
              ←
            </Link>
            <h1 className="text-xl font-black" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
              Training Diary 📓
            </h1>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes…"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--color-surface-2)', border: '2px solid var(--color-border-2)', color: 'var(--color-text-primary)' }} />
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 pt-4">
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📓</div>
            <p className="font-black" style={{ color: 'var(--color-text-primary)' }}>No diary entries yet</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>Add notes when logging sessions.</p>
          </div>
        )}
        {Object.entries(grouped).map(([month, monthLogs]) => (
          <div key={month} className="mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
              {month}
            </p>
            <div className="space-y-2">
              {monthLogs.map(log => (
                <div key={log.id} className="rounded-2xl p-4"
                  style={{ background: 'var(--color-surface)', border: '2px solid var(--color-border-2)' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-xs font-black flex-1" style={{ color: 'var(--color-text-tertiary)' }}>
                      {fmtDate(log.created_at)}
                    </p>
                    {log.km && <span className="text-xs font-black" style={{ color: '#4d8aff' }}>{log.km}km</span>}
                    {log.effort && <span className="text-xs font-black" style={{ color: '#ffb800' }}>RPE {log.effort}</span>}
                    {log.pace && <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{log.pace}</span>}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{log.notes}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
