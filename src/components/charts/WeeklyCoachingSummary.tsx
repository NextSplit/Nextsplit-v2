'use client'

import { useState } from 'react'

export default function WeeklyCoachingSummary() {
  const [summary, setSummary]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [generated, setGenerated] = useState(false)

  const generate = async () => {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/ai/weekly-summary', { method: 'POST' })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setSummary(data.summary)
      setGenerated(true)
    } catch {
      setError('Failed to generate summary — check your connection')
    } finally {
      setLoading(false)
    }
  }

  // Parse markdown bold sections into structured display
  const renderSummary = (text: string) => {
    const sections = text.split(/\*\*(.+?)\*\*/).filter(Boolean)
    const result: { heading?: string; body: string }[] = []
    for (let i = 0; i < sections.length; i++) {
      if (i % 2 === 0) {
        // body text
        if (sections[i].trim()) {
          if (result.length > 0) result[result.length - 1].body += sections[i]
          else result.push({ body: sections[i].trim() })
        }
      } else {
        // heading
        result.push({ heading: sections[i], body: '' })
      }
    }
    return result.filter(s => s.heading || s.body.trim())
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-50 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-900">🧠 Weekly coaching summary</p>
          <p className="text-[10px] text-gray-400 mt-0.5">AI analysis of your last 4 weeks</p>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
            loading
              ? 'bg-gray-100 text-gray-400'
              : generated
              ? 'bg-[var(--ns-ember-light)] text-[var(--ns-ember)] border border-[var(--ns-violet-light)]'
              : 'bg-[var(--ns-ember)] text-white'
          }`}
        >
          {loading ? '✨ Analysing…' : generated ? '↻ Refresh' : '✨ Generate'}
        </button>
      </div>

      {/* Content */}
      {!generated && !loading && (
        <div className="px-4 py-6 text-center space-y-3">
          <div className="text-3xl">📋</div>
          <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
            Get a coach-quality debrief of your last 4 weeks — what the data means, what to focus on, and any flags to watch.
          </p>
          <button onClick={generate}
            className="bg-[var(--ns-ember)] text-white text-sm font-bold px-6 py-2.5 rounded-xl active:scale-95">
            Generate my summary →
          </button>
        </div>
      )}

      {loading && (
        <div className="px-4 py-6 space-y-3">
          {[80, 60, 90, 70].map((w, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: `${w}%` }} />
              <div className="h-2.5 bg-gray-100 rounded animate-pulse" style={{ width: `${w - 15}%` }} />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="px-4 py-4 text-center">
          <p className="text-xs text-red-500">{error}</p>
          <button onClick={generate} className="text-xs text-[var(--ns-ember)] mt-2 font-semibold">Try again</button>
        </div>
      )}

      {generated && summary && (
        <div className="px-4 py-4 space-y-4">
          {renderSummary(summary).map((section, i) => (
            <div key={i} className="space-y-1">
              {section.heading && (
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  {section.heading}
                </p>
              )}
              {section.body.trim() && (
                <p className="text-sm text-gray-700 leading-relaxed">
                  {section.body.trim()}
                </p>
              )}
            </div>
          ))}
          <p className="text-[10px] text-gray-300 pt-1">
            Generated from your last 4 weeks of logged data
          </p>
        </div>
      )}
    </div>
  )
}
