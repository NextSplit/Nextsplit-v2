'use client'

import { useState, useEffect } from 'react'
import { Analytics } from '@/lib/analytics'

interface Props {
  onClose:      () => void
  foundingLeft?: number  // spots remaining, null = standard pricing
}

const FOUNDING_FEATURES = [
  { emoji: '🔒', text: 'Locked in at £7.99/mo forever — price never rises' },
  { emoji: '⚡', text: 'Unlimited AI coaching calls' },
  { emoji: '📊', text: 'Full analytics — ACWR, pace zones, trends' },
  { emoji: '🏋️', text: 'Gym + strength sessions in every plan' },
  { emoji: '🎯', text: 'Multiple goals and race targets' },
  { emoji: '🏆', text: 'Full RPG character + all badges' },
  { emoji: '👥', text: 'Coach marketplace access' },
  { emoji: '⭐', text: 'Founding Member badge on your profile' },
]

export function UpgradeModal({ onClose, foundingLeft }: Props) {
  const [interval, setInterval]   = useState<'monthly' | 'annual'>('monthly')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const isFounding                = (foundingLeft ?? 1) > 0

  useEffect(() => {
    Analytics.upgradePromptShown('pro', 'upgrade_modal')
  }, [])

  const monthlyPrice = isFounding ? '£7.99' : '£13.99'
  const annualPrice  = isFounding ? '£79.99' : '£99.99'
  const annualMonthly = isFounding ? '£6.67' : '£8.33'
  const saving        = isFounding ? '17%' : '41%'

  const handleUpgrade = async () => {
    setLoading(true)
    setError('')
    Analytics.upgradeClicked('pro')
    try {
      const res = await fetch('/api/stripe/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ interval }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      if (data.url)   window.location.href = data.url
    } catch {
      setError('Something went wrong — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[92dvh] overflow-y-auto">
        <div className="px-4 pt-4 pb-10 max-w-lg mx-auto">

          {/* Handle */}
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />

          {/* Founding badge */}
          {isFounding && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 flex items-center gap-2 mb-4">
              <span className="text-lg">⭐</span>
              <div>
                <p className="text-xs font-black text-amber-800">
                  Founding Member — {foundingLeft} spots left
                </p>
                <p className="text-xs text-amber-600">Lock in £7.99/mo forever. Price rises after {foundingLeft} more.</p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-5">
            <h2 className="text-2xl font-black text-slate-900">NextSplit Elite</h2>
            <p className="text-sm text-slate-500 mt-1">7-day free trial · Cancel anytime</p>
          </div>

          {/* Interval toggle */}
          <div className="flex bg-slate-100 rounded-2xl p-1 mb-5">
            <button
              onClick={() => setInterval('monthly')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                interval === 'monthly' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval('annual')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all relative ${
                interval === 'annual' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
              }`}
            >
              Annual
              <span className="absolute -top-2 -right-1 bg-teal-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                Save {saving}
              </span>
            </button>
          </div>

          {/* Price display */}
          <div className="text-center mb-5">
            <div className="flex items-end justify-center gap-1">
              <span className="text-4xl font-black text-slate-900">
                {interval === 'monthly' ? monthlyPrice : annualPrice}
              </span>
              <span className="text-slate-400 text-sm mb-1.5">
                /{interval === 'monthly' ? 'mo' : 'yr'}
              </span>
            </div>
            {interval === 'annual' && (
              <p className="text-xs text-teal-600 font-semibold mt-1">
                Just {annualMonthly}/mo · Billed annually
              </p>
            )}
            <p className="text-xs text-slate-400 mt-1">
              7-day free trial · No card charged today
            </p>
          </div>

          {/* Features */}
          <div className="bg-slate-50 rounded-2xl p-4 mb-5 space-y-2.5">
            {FOUNDING_FEATURES.map(f => (
              <div key={f.text} className="flex items-center gap-3 text-sm text-slate-700">
                <span className="text-base shrink-0">{f.emoji}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          {error && (
            <p className="text-xs text-red-500 text-center mb-3">{error}</p>
          )}
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full bg-teal-500 text-white py-4 rounded-2xl text-base font-black disabled:opacity-50 transition-all active:scale-95 hover:bg-teal-600"
          >
            {loading ? 'Redirecting to checkout…' : 'Start free trial →'}
          </button>
          <p className="text-center text-xs text-slate-400 mt-3">
            Secure payment via Stripe · Cancel anytime in Settings
          </p>

          <button onClick={onClose} className="w-full text-slate-400 text-sm py-3 mt-1">
            Maybe later
          </button>
        </div>
      </div>
    </>
  )
}
