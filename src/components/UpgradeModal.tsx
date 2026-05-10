'use client'

import { useState, useEffect } from 'react'
import { Analytics } from '@/lib/analytics'
import { getPricing } from '@/lib/pricing'

interface Props {
  onClose:      () => void
  foundingLeft?: number  // spots remaining, null = standard pricing
}

// OQ#3 = A — hard step £7.99 → £9.99 at spot 501. The single source of
// truth for the price label is `getPricing(foundingLeft)` so we never
// drift from what the Stripe checkout actually charges (server picks
// PRICES.founding_monthly vs standard_monthly via isFoundingAvailable()).

export function UpgradeModal({ onClose, foundingLeft }: Props) {
  const [interval, setInterval]   = useState<'monthly' | 'annual'>('monthly')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const pricing                   = getPricing(foundingLeft)
  const isFounding                = pricing.isFounding

  useEffect(() => {
    Analytics.upgradePromptShown('pro', 'upgrade_modal')
  }, [])

  // Annual pricing tracks the monthly hard step at the same conversion factor
  // (~10× monthly = annual; ~17%/41% saving vs monthly billing).
  const monthlyPrice  = pricing.monthly                    // '£7.99' or '£9.99'
  const annualPrice   = isFounding ? '£79.99' : '£99.99'   // ~10× monthly
  const annualMonthly = isFounding ? '£6.67'  : '£8.33'    // annual / 12
  const saving        = isFounding ? '17%'    : '17%'      // same % saving across tiers

  const FOUNDING_LOCK_LINE = isFounding
    ? `Locked in at ${monthlyPrice}/mo forever — price never rises`
    : `${monthlyPrice}/mo standard pricing — locked in for life of subscription`

  const features = [
    { emoji: '🔒', text: FOUNDING_LOCK_LINE },
    { emoji: '⚡', text: 'Unlimited AI coaching calls' },
    { emoji: '📊', text: 'Full analytics — ACWR, pace zones, trends' },
    { emoji: '🏋️', text: 'Gym + strength sessions in every plan' },
    { emoji: '🎯', text: 'Multiple goals and race targets' },
    { emoji: '🏆', text: 'Full RPG character + all badges' },
    { emoji: '👥', text: 'Coach marketplace access' },
    ...(isFounding ? [{ emoji: '⭐', text: 'Founding Member badge on your profile' }] : []),
  ]

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
          <div className="w-10 h-1 bg-[var(--color-surface-3)] rounded-full mx-auto mb-4" />

          {/* Founding badge */}
          {isFounding && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 flex items-center gap-2 mb-4">
              <span className="text-lg">⭐</span>
              <div>
                <p className="text-xs font-black text-amber-800">
                  Founding Member — {foundingLeft} spots left
                </p>
                <p className="text-xs text-amber-600">Lock in {monthlyPrice}/mo forever. Price rises to £9.99/mo after {foundingLeft} more.</p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-5">
            <h2 className="text-2xl font-black text-gray-900">NextSplit Elite</h2>
            <p className="text-sm text-[var(--color-text-tertiary)] mt-1">7-day free trial · Cancel anytime</p>
          </div>

          {/* Interval toggle */}
          <div className="flex bg-[var(--color-surface-2)] rounded-2xl p-1 mb-5">
            <button
              onClick={() => setInterval('monthly')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                interval === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-[var(--color-text-tertiary)]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval('annual')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all relative ${
                interval === 'annual' ? 'bg-white shadow text-gray-900' : 'text-[var(--color-text-tertiary)]'
              }`}
            >
              Annual
              <span className="absolute -top-2 -right-1 bg-[var(--ns-ember)] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                Save {saving}
              </span>
            </button>
          </div>

          {/* Price display */}
          <div className="text-center mb-5">
            <div className="flex items-end justify-center gap-1">
              <span className="text-4xl font-black text-gray-900">
                {interval === 'monthly' ? monthlyPrice : annualPrice}
              </span>
              <span className="text-[var(--color-text-tertiary)] text-sm mb-1.5">
                /{interval === 'monthly' ? 'mo' : 'yr'}
              </span>
            </div>
            {interval === 'annual' && (
              <p className="text-xs text-[var(--ns-ember)] font-semibold mt-1">
                Just {annualMonthly}/mo · Billed annually
              </p>
            )}
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
              7-day free trial · No card charged today
            </p>
          </div>

          {/* Features */}
          <div className="bg-[#f8f8f6] rounded-2xl p-4 mb-5 space-y-2.5">
            {features.map(f => (
              <div key={f.text} className="flex items-center gap-3 text-sm text-gray-700">
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
            className="w-full bg-[var(--ns-ember)] text-white py-4 rounded-2xl text-base font-black disabled:opacity-50 transition-all active:scale-95 hover:bg-[var(--ns-ember)]"
          >
            {loading ? 'Redirecting to checkout…' : 'Start free trial →'}
          </button>
          <p className="text-center text-xs text-[var(--color-text-tertiary)] mt-3">
            Secure payment via Stripe · Cancel anytime in Settings
          </p>

          <button onClick={onClose} className="w-full text-[var(--color-text-tertiary)] text-sm py-3 mt-1">
            Maybe later
          </button>
        </div>
      </div>
    </>
  )
}
