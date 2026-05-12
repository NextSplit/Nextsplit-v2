'use client'

import { useState } from 'react'
import { calculateMacroTargets, type NutritionSettings } from '@/lib/nutrition'
import type { PlanSession } from '@/types/database'

// PR C2 — Nutrition AI Coach.
// Asks /api/ai/fuel with the user's settings + today's session + a
// freeform question. Renders the answer as a single paragraph.
//
// Pre-canned question chips below the input cover the highest-frequency
// asks (pre-run, post-run, long-run prep, recovery, hydration) so the
// user can one-tap rather than type.

interface Props {
  settings: NutritionSettings
  todaySessions: PlanSession[]
}

const QUICK_QUESTIONS = [
  'What should I eat tonight before tomorrow\'s long run?',
  'What\'s the best recovery meal after today\'s session?',
  'Am I eating enough protein for my goal?',
  'Should I carb-load this week?',
  'What\'s a good pre-run breakfast?',
]

export function AIFuelCoach({ settings, todaySessions }: Props) {
  const [question, setQuestion] = useState('')
  const [answer,   setAnswer]   = useState<string | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  const targets = calculateMacroTargets(settings)
  const primary = todaySessions[0]

  async function ask(q: string) {
    if (!q.trim() || loading) return
    setLoading(true); setError(null); setAnswer(null)
    try {
      const res = await fetch('/api/ai/fuel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          settings,
          targets,
          todaySession: primary ? {
            code: primary.c ?? null,
            name: primary.n ?? null,
            km:   primary.km ?? null,
          } : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.rateLimited
          ? 'You\'ve hit the daily AI limit. Try again tomorrow.'
          : data.error ?? 'AI unavailable')
        return
      }
      setAnswer(data.answer)
    } catch {
      setError('Network error — try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(168,85,247,0.04))',
        border: '2px solid rgba(168,85,247,0.45)',
      }}>
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <span className="text-2xl">🧠</span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#a855f7' }}>
            AI fuel coach
          </p>
          <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>
            Ask anything about your fuel
          </p>
        </div>
      </div>

      <div className="px-4 py-3 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') ask(question) }}
            placeholder="e.g. What should I eat tonight?"
            className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{
              background: 'var(--color-surface-2)',
              border: '2px solid var(--color-border-2)',
              color: 'var(--color-text-primary)',
            }} />
          <button onClick={() => ask(question)} disabled={!question.trim() || loading}
            className="px-4 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-40 active:scale-95"
            style={{ background: '#a855f7', boxShadow: '0 4px 16px rgba(168,85,247,0.4)' }}>
            {loading ? '…' : 'Ask'}
          </button>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {QUICK_QUESTIONS.map(q => (
            <button key={q} onClick={() => { setQuestion(q); ask(q) }}
              disabled={loading}
              className="text-[10px] font-bold px-2.5 py-1 rounded-full disabled:opacity-40 active:scale-95"
              style={{
                background: 'rgba(168,85,247,0.10)',
                color: '#a855f7',
                border: '1.5px solid rgba(168,85,247,0.35)',
              }}>
              {q.length > 40 ? q.slice(0, 38) + '…' : q}
            </button>
          ))}
        </div>

        {answer && (
          <div className="rounded-xl p-3 mt-2"
            style={{ background: 'var(--color-surface)', border: '1.5px solid rgba(168,85,247,0.30)' }}>
            <p className="text-xs leading-relaxed whitespace-pre-wrap"
              style={{ color: 'var(--color-text-primary)' }}>{answer}</p>
          </div>
        )}

        {error && (
          <p className="text-[11px] mt-1" style={{ color: '#ef4444' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
