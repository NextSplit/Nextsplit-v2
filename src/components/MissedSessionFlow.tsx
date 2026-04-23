'use client'

import { useState } from 'react'
import { useSubscription } from '@/hooks/useSubscription'
import type { PlanSession } from '@/types/database'

interface Props {
  session: PlanSession
  weekN: number
  planId: string
  onMarkMissed: () => void
  onClose: () => void
}

type Step = 'prompt' | 'reason' | 'feeling' | 'rebuilding' | 'paywall' | 'done'
type Reason = 'life' | 'illness' | 'injury' | 'forgot' | 'other'
type Feeling = 'great' | 'ok' | 'tired' | 'unwell'

interface AdaptationResult {
  summary: string
  changes: string[]
}

export default function MissedSessionFlow({ session, weekN, planId, onMarkMissed, onClose }: Props) {
  const [step, setStep]         = useState<Step>('prompt')
  const [reason, setReason]     = useState<Reason | null>(null)
  const [feeling, setFeeling]   = useState<Feeling | null>(null)
  const [adaptation, setAdaptation] = useState<AdaptationResult | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const { isPro }               = useSubscription()

  async function handleAdapt() {
    setLoading(true)
    setError('')
    setStep('rebuilding')
    try {
      const res  = await fetch('/api/ai/adapt-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: planId,
          week_n: weekN,
          context: { reason, feeling, missed_session: session.n },
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setAdaptation({
        summary: data.adaptation?.summary ?? data.adaptation ?? 'Plan adapted around the missed session.',
        changes: data.adaptation?.changes ?? [],
      })
      setStep(isPro ? 'done' : 'paywall')
    } catch {
      setError('Something went wrong — tap below to mark as missed and continue.')
      setStep('feeling')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-w-lg mx-auto">
        <div className="px-5 pt-5 pb-8">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

          {/* Step 1 — Subtle prompt (from spec: "Looks like Tuesday's session didn't happen") */}
          {step === 'prompt' && (
            <div className="text-center">
              <div className="text-3xl mb-3">🤔</div>
              <h2 className="text-base font-bold text-gray-900 mb-2">
                Looks like {session.n} didn't happen
              </h2>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                Want to sort the plan? I can rebuild it around what actually happened.
              </p>
              <button onClick={() => setStep('reason')}
                className="w-full py-4 rounded-2xl text-sm font-bold text-white mb-3"
                style={{ background: 'var(--ns-forest)' }}>
                Yes, rebuild the plan →
              </button>
              <button onClick={onMarkMissed}
                className="w-full py-3 text-sm text-gray-400">
                Just mark it as missed
              </button>
            </div>
          )}

          {/* Step 2 — Warm check-in: reason (from spec: "What got in the way?") */}
          {step === 'reason' && (
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-1">What got in the way?</h2>
              <p className="text-xs text-gray-400 mb-4">Life happens. No judgement — just helps me rebuild properly.</p>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {([
                  { id: 'life',    label: '📅 Life got busy' },
                  { id: 'illness', label: '🤒 Feeling rough' },
                  { id: 'injury',  label: '🦵 Something hurts' },
                  { id: 'forgot',  label: '😅 Just forgot' },
                ] as { id: Reason; label: string }[]).map(opt => (
                  <button key={opt.id}
                    onClick={() => { setReason(opt.id); setStep('feeling') }}
                    className="py-3 px-4 rounded-2xl text-sm font-semibold border-2 text-left transition-all active:scale-95"
                    style={reason === opt.id
                      ? { background: 'var(--ns-forest)', color: 'white', borderColor: 'var(--ns-forest)' }
                      : { background: 'white', color: '#374151', borderColor: '#e5e7eb' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <button onClick={onClose} className="w-full py-2 text-xs text-gray-400">Cancel</button>
            </div>
          )}

          {/* Step 3 — How are you feeling now? */}
          {step === 'feeling' && (
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-1">How are you feeling now?</h2>
              <p className="text-xs text-gray-400 mb-4">Helps me decide how hard to push the rebuild.</p>
              {error && <p className="text-xs text-red-500 mb-3 text-center">{error}</p>}
              <div className="space-y-2 mb-5">
                {([
                  { id: 'great', label: '💪 Ready to go — full load' },
                  { id: 'ok',    label: '🙂 Fine — normal load' },
                  { id: 'tired', label: '😴 A bit tired — lighter please' },
                  { id: 'unwell', label: '🤒 Still not great — be gentle' },
                ] as { id: Feeling; label: string }[]).map(opt => (
                  <button key={opt.id}
                    onClick={() => setFeeling(opt.id)}
                    className="w-full py-3 px-4 rounded-2xl text-sm font-semibold border-2 text-left transition-all"
                    style={feeling === opt.id
                      ? { background: 'var(--ns-forest)', color: 'white', borderColor: 'var(--ns-forest)' }
                      : { background: 'white', color: '#374151', borderColor: '#e5e7eb' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <button onClick={handleAdapt} disabled={!feeling || loading}
                className="w-full py-4 rounded-2xl text-sm font-bold text-white disabled:opacity-40"
                style={{ background: 'var(--ns-forest)' }}>
                Rebuild my plan →
              </button>
              <button onClick={onClose} className="w-full py-2 text-xs text-gray-400 mt-2">Cancel</button>
            </div>
          )}

          {/* Step 3.5 — Rebuilding (loading) */}
          {step === 'rebuilding' && (
            <div className="text-center py-6">
              <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-[var(--ns-forest)] animate-spin mx-auto mb-4" />
              <p className="text-sm font-semibold text-gray-700">Rebuilding your plan…</p>
              <p className="text-xs text-gray-400 mt-1">Looking at what moved and what's still on track</p>
            </div>
          )}

          {/* Step 4a — Paywall reveal (from spec: free users see preview then wall) */}
          {step === 'paywall' && adaptation && (
            <div>
              <div className="text-2xl mb-3 text-center">✓</div>
              <h2 className="text-base font-bold text-gray-900 mb-1 text-center">Plan rebuild ready</h2>
              <p className="text-xs text-gray-400 text-center mb-4">Here's what I'd change — unlock to apply it.</p>

              {/* Preview — blurred for free users */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-4 relative overflow-hidden">
                <p className="text-sm text-gray-700 leading-relaxed mb-2">{adaptation.summary}</p>
                {adaptation.changes.length > 0 && (
                  <ul className="space-y-1">
                    {adaptation.changes.slice(0, 2).map((c, i) => (
                      <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                        <span style={{ color: 'var(--ns-forest)' }}>→</span>{c}
                      </li>
                    ))}
                  </ul>
                )}
                {/* Blur overlay — the paywall moment */}
                <div className="absolute inset-0 backdrop-blur-sm bg-white/60 flex items-center justify-center rounded-2xl">
                  <span className="text-xs font-bold text-gray-600">Unlock with Pro →</span>
                </div>
              </div>

              <div className="bg-[var(--ns-forest-light)] rounded-2xl p-4 mb-4">
                <p className="text-xs leading-relaxed" style={{ color: 'var(--ns-forest)' }}>
                  <span className="font-bold">NextSplit Pro</span> adapts your plan every time life intervenes —
                  through missed weeks, illness, and busy periods. £4.99/month.
                </p>
              </div>

              <button onClick={() => window.location.href = '/profile?upgrade=1'}
                className="w-full py-4 rounded-2xl text-sm font-bold text-white mb-3"
                style={{ background: 'var(--ns-forest)' }}>
                Unlock Pro — £4.99/month →
              </button>
              <button onClick={onMarkMissed} className="w-full py-2 text-xs text-gray-400">
                Just mark as missed
              </button>
            </div>
          )}

          {/* Step 4b — Done (Pro users see full adaptation) */}
          {step === 'done' && adaptation && (
            <div>
              <div className="text-2xl mb-3 text-center">✓</div>
              <h2 className="text-base font-bold text-gray-900 mb-1 text-center">Plan updated</h2>

              <div className="bg-[var(--ns-forest-light)] rounded-2xl p-4 mb-4">
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ns-forest)' }}>
                  {adaptation.summary}
                </p>
                {adaptation.changes.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {adaptation.changes.map((c, i) => (
                      <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: 'var(--ns-forest)' }}>
                        <span>→</span>{c}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="text-xs text-gray-400 text-center mb-5">
                You're still on track. The plan has been adjusted.
              </p>

              <button onClick={onClose}
                className="w-full py-4 rounded-2xl text-sm font-bold text-white"
                style={{ background: 'var(--ns-forest)' }}>
                Got it ✓
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
