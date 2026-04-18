'use client'

import { useState } from 'react'

type Mode = 'insight' | 'weekly' | 'patterns'

const MODES: { id: Mode; label: string; emoji: string; desc: string }[] = [
  { id: 'insight',  label: 'Coaching insight', emoji: '🎯', desc: 'Personalised focus for this week' },
  { id: 'weekly',   label: 'Weekly summary',   emoji: '📋', desc: 'What went well & what to fix' },
  { id: 'patterns', label: 'Pattern analysis',  emoji: '🔍', desc: 'Trends spotted in your training' },
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
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🤖</span>
          <span className="text-white font-bold text-sm">AI Coach</span>
          <span className="text-violet-200 text-[10px] bg-white/10 px-2 py-0.5 rounded-full ml-auto">
            Powered by Claude
          </span>
        </div>
        <p className="text-violet-100 text-xs">Personalised insights from your training data</p>
      </div>

      <div className="p-5">
        {/* Mode selector */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                mode === m.id
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <span>{m.emoji}</span>
              {m.label}
            </button>
          ))}
        </div>

        {/* Note display */}
        {!note && !loading && !error && (
          <div className="text-center py-4">
            <div className="text-3xl mb-2">{selectedMode.emoji}</div>
            <p className="text-sm font-semibold text-gray-700 mb-0.5">{selectedMode.label}</p>
            <p className="text-xs text-gray-400 mb-5">{selectedMode.desc}</p>
            <button
              onClick={() => fetchNote(mode)}
              className="px-6 py-3 bg-violet-600 text-white rounded-xl text-sm font-semibold"
            >
              Get coaching note
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center py-6">
            <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-gray-400">Analysing your training…</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 rounded-xl p-4 text-center">
            <p className="text-sm text-red-600 font-medium mb-1">
              {error === 'AI coaching not configured'
                ? '⚙️ API key not set'
                : `❌ ${error}`}
            </p>
            {error === 'AI coaching not configured' && (
              <p className="text-xs text-red-400">Add ANTHROPIC_API_KEY to Vercel env vars</p>
            )}
            <button
              onClick={() => fetchNote(mode)}
              className="mt-3 text-xs text-red-500 font-semibold"
            >
              Try again
            </button>
          </div>
        )}

        {note && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">{MODES.find(m => m.id === lastMode)?.emoji}</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {MODES.find(m => m.id === lastMode)?.label}
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{note}</p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => fetchNote(mode)}
                className="flex-1 py-2.5 rounded-xl border border-violet-200 text-violet-600 text-xs font-semibold"
              >
                Refresh
              </button>
              <button
                onClick={() => { setNote(null); setError(null) }}
                className="flex-1 py-2.5 rounded-xl bg-violet-50 text-violet-600 text-xs font-semibold"
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
