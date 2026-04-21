'use client'

import { useState } from 'react'
import { Analytics } from '@/lib/analytics'

interface Props {
  planId:     string
  weekN:      number
  missedCount: number
  onAdapted:  (adaptation: Adaptation) => void
}

interface AdaptedSession {
  c: string; n: string; det: string; km: number
}

interface AdaptedDay {
  day: string; day_index: number; sessions: AdaptedSession[]
}

interface Adaptation {
  recommendation: string
  adapted_days:   AdaptedDay[]
  carry_forward:  string[]
  key_message:    string
}

const SESSION_EMOJI: Record<string, string> = {
  'run-easy':     '🟢',
  'run-tempo':    '🟡',
  'run-interval': '🔴',
  'run-long':     '🔵',
  'gym':          '🏋️',
  'rest':         '😴',
  'cross':        '🚴',
}

export default function AdaptPlanCard({ planId, weekN, missedCount, onAdapted }: Props) {
  const [loading, setLoading]         = useState(false)
  const [adaptation, setAdaptation]   = useState<Adaptation | null>(null)
  const [error, setError]             = useState('')
  const [dismissed, setDismissed]     = useState(false)

  if (dismissed) return null

  const handleAdapt = async () => {
    setLoading(true)
    setError('')
    Analytics.adaptationRequested(missedCount)
    try {
      const res  = await fetch('/api/ai/adapt-plan', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan_id: planId, week_n: weekN }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setAdaptation(data.adaptation)
      onAdapted(data.adaptation)
      Analytics.adaptationCompleted()
    } catch {
      setError('Failed to adapt plan — try again')
    } finally {
      setLoading(false)
    }
  }

  if (adaptation) {
    return (
      <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl border border-teal-100 overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-teal-100/50">
          <div className="flex items-center gap-2">
            <span className="text-base">🧠</span>
            <p className="text-sm font-bold text-teal-800">Plan adapted</p>
          </div>
          <p className="text-xs text-teal-700 mt-1 leading-relaxed">{adaptation.recommendation}</p>
        </div>

        {/* Adapted sessions */}
        {adaptation.adapted_days.length > 0 && (
          <div className="px-4 py-3 space-y-2">
            <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">Updated schedule</p>
            {adaptation.adapted_days.map(day => (
              <div key={day.day}>
                <p className="text-xs font-semibold text-teal-700 mb-1">{day.day}</p>
                {day.sessions.map((sess, i) => (
                  <div key={i} className="flex items-start gap-2 py-1.5 border-t border-teal-100/50">
                    <span className="text-sm shrink-0">{SESSION_EMOJI[sess.c] ?? '🏃'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-teal-800">{sess.n}
                        {sess.km > 0 && <span className="text-teal-500 font-normal ml-1">{sess.km}km</span>}
                      </p>
                      <p className="text-[10px] text-teal-600 leading-relaxed mt-0.5">{sess.det}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Carry forward */}
        {adaptation.carry_forward?.length > 0 && (
          <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Carry to next week</p>
            {adaptation.carry_forward.map((s, i) => (
              <p key={i} className="text-xs text-amber-700">→ {s}</p>
            ))}
          </div>
        )}

        {/* Key message */}
        {adaptation.key_message && (
          <div className="px-4 py-3 border-t border-teal-100/50">
            <p className="text-xs text-teal-700 font-semibold italic">&ldquo;{adaptation.key_message}&rdquo;</p>
          </div>
        )}

        <div className="px-4 pb-3">
          <button onClick={() => setDismissed(true)}
            className="text-[10px] text-teal-400 hover:text-teal-600">
            Dismiss
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0">⚠️</span>
        <div className="flex-1">
          <p className="text-sm font-bold text-amber-800">
            {missedCount} session{missedCount > 1 ? 's' : ''} missed this week
          </p>
          <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
            Your AI coach can restructure the rest of your week to recover lost training without overloading you.
          </p>
        </div>
        <button onClick={() => setDismissed(true)} className="text-amber-300 text-lg shrink-0">×</button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleAdapt}
          disabled={loading}
          className="flex-1 bg-amber-500 text-white text-sm font-bold py-2.5 rounded-xl disabled:opacity-50 active:scale-95"
        >
          {loading ? '✨ Adapting plan…' : '✨ Adapt my plan'}
        </button>
        <button onClick={() => setDismissed(true)}
          className="px-4 py-2.5 border border-amber-200 text-amber-600 text-sm font-semibold rounded-xl active:scale-95">
          Skip
        </button>
      </div>
    </div>
  )
}
