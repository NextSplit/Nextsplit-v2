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
//
// Council R1 cleanups (LEGAL + VISUAL-BRAND + ACCESSIBILITY):
//   · Removed "price never rises" copy — contradicted terms/page.tsx:43
//     "Prices may change with 30 days notice" (CRA 2015 s.72 risk).
//   · Replaced white-mode classes (bg-white, bg-amber-50, text-gray-*,
//     bg-[#f8f8f6]) with --color-surface dark tokens. The app is dark-only;
//     a white modal at the money-changing-hands moment is identity bleed.
//   · Added role="dialog" + aria-modal + aria-label + ESC dismiss + close
//     focus return so screen-reader + keyboard users can navigate the modal.

export function UpgradeModal({ onClose, foundingLeft }: Props) {
  const [interval, setInterval]   = useState<'monthly' | 'annual'>('monthly')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const pricing                   = getPricing(foundingLeft)
  const isFounding                = pricing.isFounding

  useEffect(() => {
    Analytics.upgradePromptShown('pro', 'upgrade_modal')
  }, [])

  // ESC dismiss for keyboard users.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Annual pricing tracks the monthly hard step (~10× monthly = annual,
  // ~17% saving vs monthly billing across both tiers).
  const monthlyPrice  = pricing.monthly                    // '£7.99' or '£9.99'
  const annualPrice   = isFounding ? '£79.99' : '£99.99'
  const annualMonthly = isFounding ? '£6.67'  : '£8.33'
  const saving        = '17%'

  // Founding lock-line — phrasing must NOT promise immutability across
  // all pricing changes (terms/page.tsx:43 reserves the right to change
  // prices with 30 days notice). Honest framing: founding rate is
  // anchored to the current subscription; if the user cancels and
  // resubscribes later they pay the prevailing price.
  const FOUNDING_LOCK_LINE = isFounding
    ? `Founding rate · ${monthlyPrice}/mo for the life of this subscription`
    : `${monthlyPrice}/mo · cancel anytime`

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
    <div role="dialog" aria-modal="true" aria-label="Upgrade to NextSplit Elite">
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet — dark tokens, matches the rest of the app. dvh > vh on iOS Safari
          so notched/landscape layouts don't clip. */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl max-h-[92dvh] overflow-y-auto"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div className="px-4 pt-4 pb-10 max-w-lg mx-auto" style={{ paddingBottom: 'max(2.5rem, calc(2.5rem + env(safe-area-inset-bottom, 0px)))' }}>

          {/* Handle */}
          <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--color-surface-3)' }} />

          {/* Founding badge — amber tint over surface, not light-mode amber-50 */}
          {isFounding && (
            <div
              className="rounded-2xl px-4 py-2.5 flex items-center gap-2 mb-4"
              style={{
                background: 'rgba(255,184,0,0.10)',
                border:     '1px solid rgba(255,184,0,0.35)',
              }}
            >
              <span className="text-lg">⭐</span>
              <div>
                <p className="text-xs font-black" style={{ color: '#ffb800' }}>
                  Founding Member — {foundingLeft} spots left
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  Founding rate {monthlyPrice}/mo. Standard rate is £9.99/mo after the founding cohort fills.
                </p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-5">
            <h2 className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>NextSplit Elite</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>7-day free trial · Cancel anytime</p>
          </div>

          {/* Interval toggle */}
          <div className="flex rounded-2xl p-1 mb-5" style={{ background: 'var(--color-surface-2)' }}>
            <button
              onClick={() => setInterval('monthly')}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: interval === 'monthly' ? 'var(--color-surface)' : 'transparent',
                color:      interval === 'monthly' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                boxShadow:  interval === 'monthly' ? '0 1px 2px rgba(0,0,0,0.4)' : 'none',
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval('annual')}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all relative"
              style={{
                background: interval === 'annual' ? 'var(--color-surface)' : 'transparent',
                color:      interval === 'annual' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                boxShadow:  interval === 'annual' ? '0 1px 2px rgba(0,0,0,0.4)' : 'none',
              }}
            >
              Annual
              <span
                className="absolute -top-2 -right-1 text-[9px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--ns-ember)', color: 'white' }}
              >
                Save {saving}
              </span>
            </button>
          </div>

          {/* Price display */}
          <div className="text-center mb-5">
            <div className="flex items-end justify-center gap-1">
              <span className="text-4xl font-black" style={{ color: 'var(--color-text-primary)' }}>
                {interval === 'monthly' ? monthlyPrice : annualPrice}
              </span>
              <span className="text-sm mb-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
                /{interval === 'monthly' ? 'mo' : 'yr'}
              </span>
            </div>
            {interval === 'annual' && (
              <p className="text-xs font-semibold mt-1" style={{ color: 'var(--ns-ember)' }}>
                Just {annualMonthly}/mo · Billed annually
              </p>
            )}
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              7-day free trial · No card charged today
            </p>
          </div>

          {/* Features — surface-2 tint, no light-mode bg-[#f8f8f6] */}
          <div
            className="rounded-2xl p-4 mb-5 space-y-2.5"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
          >
            {features.map(f => (
              <div
                key={f.text}
                className="flex items-center gap-3 text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <span className="text-base shrink-0">{f.emoji}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          {error && (
            <p className="text-xs text-center mb-3" style={{ color: '#ff3d6e' }}>{error}</p>
          )}
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full py-4 rounded-2xl text-base font-black disabled:opacity-50 transition-all active:scale-95"
            style={{ background: 'var(--ns-ember)', color: 'white' }}
          >
            {loading ? 'Redirecting to checkout…' : 'Start free trial →'}
          </button>
          <p className="text-center text-xs mt-3" style={{ color: 'var(--color-text-tertiary)' }}>
            Secure payment via Stripe · Cancel anytime in Settings
          </p>

          <button
            onClick={onClose}
            aria-label="Close upgrade modal"
            className="w-full text-sm py-3 mt-1"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
