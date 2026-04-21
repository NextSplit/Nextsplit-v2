'use client'

import { useState } from 'react'

type Mode = 'insight' | 'weekly' | 'patterns'

const MODES: { id: Mode; label: string; emoji: string; desc: string }[] = [
  { id: 'insight',  label: 'This week',      emoji: '🎯', desc: 'Personalised focus for this week' },
  { id: 'weekly',   label: 'Last week',      emoji: '📋', desc: 'What went well & what to improve' },
  { id: 'patterns', label: 'Patterns',       emoji: '🔍', desc: 'Trends spotted in your training' },
]

export default function CoachingCard() {
  const [mode, setMode] = useState<Mode>('insight')
  const [note, setNote] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastMode, setLastMode] = useState<Mode | null>(null)

  async function fetchNote(m: Mode) {
    setLoading(true)
    setError(null)
    setNote(null)
    setLastMode(m)
    try {
      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: m }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setNote(data.note)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const selectedMode = MODES.find(m => m.id === mode)!

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🧠</span>
          <span className="text-white font-bold text-sm">AI Coach</span>
          <span className="text-teal-100 text-[10px] bg-white/15 px-2 py-0.5 rounded-full ml-auto">
            Powered by Claude
          </span>
        </div>
        <p className="text-teal-100 text-xs">Personalised insights from your training data</p>
      </div>

      <div className="p-5">
        {/* Mode selector */}
        <div className="flex gap-2 mb-4">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setNote(null); setError(null) }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                mode === m.id
                  ? 'bg-[var(--ns-forest)] text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              <span>{m.emoji}</span>
              {m.label}
            </button>
          ))}
        </div>

        {/* Empty / prompt state */}
        {!note && !loading && !error && (
          <div className="text-center py-4">
            <div className="text-3xl mb-2">{selectedMode.emoji}</div>
            <p className="text-sm font-semibold text-gray-700 mb-0.5">{selectedMode.label}</p>
            <p className="text-xs text-gray-400 mb-5">{selectedMode.desc}</p>
            <button
              onClick={() => fetchNote(mode)}
              className="px-6 py-2.5 bg-[var(--ns-forest)] text-white rounded-xl text-sm font-semibold active:scale-95 transition-transform"
            >
              Get coaching note
            </button>
            <p className="text-[10px] text-gray-300 mt-3">Uses 1 of your daily AI credits</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-6">
            <div className="flex items-center justify-center gap-1.5 mb-3">
              {[0, 150, 300].map(d => (
                <div key={d} className="w-2 h-2 rounded-full bg-[var(--ns-forest-mid)] animate-bounce"
                  style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
            <p className="text-xs text-gray-400">Analysing your training…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 rounded-xl p-4 text-center">
            <p className="text-sm text-red-600 font-medium mb-1">
              {error.includes('rate limit') || error.includes('limit reached')
                ? '⏳ Daily AI limit reached'
                : error.includes('not configured') || error.includes('API key')
                ? '⚙️ Not configured'
                : `❌ ${error}`}
            </p>
            <p className="text-xs text-red-400 mb-3">
              {error.includes('rate limit') || error.includes('limit reached')
                ? 'You\'ve used your daily coaching credits. Resets tomorrow.'
                : error.includes('not configured') || error.includes('API key')
                ? 'Add ANTHROPIC_API_KEY to your environment variables.'
                : 'Check your connection and try again.'}
            </p>
            {!error.includes('rate limit') && !error.includes('limit reached') && (
              <button onClick={() => fetchNote(mode)}
                className="text-xs text-red-500 font-semibold underline">
                Try again
              </button>
            )}
          </div>
        )}

        {/* Result */}
        {note && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">{MODES.find(m => m.id === lastMode)?.emoji}</span>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                {MODES.find(m => m.id === lastMode)?.label}
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{note}</p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => fetchNote(mode)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--ns-forest-light)] text-[var(--ns-forest)] text-xs font-semibold active:scale-95 transition-transform"
              >
                ↻ Refresh
              </button>
              <button
                onClick={() => { setNote(null); setError(null) }}
                className="flex-1 py-2.5 rounded-xl bg-[var(--ns-forest-light)] text-[var(--ns-forest)] text-xs font-semibold active:scale-95 transition-transform"
              >
                Try another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
