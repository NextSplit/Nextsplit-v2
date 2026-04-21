'use client'

/**
 * CookieConsentBanner — Phase A2
 * ICO-compliant consent mechanism. Blocks PostHog until accepted.
 * Mobile: bottom sheet. Desktop: bottom bar.
 *
 * Must appear before any analytics cookie is set.
 * "Accept" → PostHog initialises and tracks.
 * "Decline" → PostHog opts out, no analytics collected.
 */

import Link from 'next/link'
import { useCookieConsent } from '@/hooks/useCookieConsent'

export default function CookieConsentBanner() {
  const { consent, loaded, accept, decline } = useCookieConsent()

  // Don't flash on first render — wait for localStorage check
  if (!loaded || consent !== 'pending') return null

  return (
    <>
      {/* Backdrop — subtle, not blocking */}
      <div className="fixed inset-0 z-40 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 40%)' }} />

      {/* Banner — bottom sheet on mobile, bottom bar on desktop */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-banner-title"
      >
        <div className="bg-white rounded-t-3xl shadow-2xl px-5 pt-5 pb-8 md:rounded-2xl md:m-4 md:mb-4">
          {/* Drag handle — mobile affordance */}
          <div className="w-10 h-1 rounded-full mx-auto mb-4 md:hidden" style={{ background: '#e5e7eb' }} />

          {/* Icon + heading */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--ns-forest-light)' }}>
              <span className="text-base">🍪</span>
            </div>
            <div>
              <h2
                id="cookie-banner-title"
                className="text-sm font-bold text-gray-900 leading-snug"
              >
                One quick thing before we start
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                We use analytics to understand how runners use NextSplit and
                improve training plans. No advertising. No third-party sharing.
              </p>
            </div>
          </div>

          {/* What we collect — brief, honest */}
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 mb-4 space-y-1">
            {[
              { emoji: '✓', text: 'Which screens you visit (to improve them)' },
              { emoji: '✓', text: 'When features are used (to prioritise fixes)' },
              { emoji: '✗', text: 'No advertising data. No selling to third parties.' },
            ].map(item => (
              <p key={item.text} className="text-[11px] text-gray-500 flex items-start gap-2">
                <span className={`font-bold flex-shrink-0 ${item.emoji === '✗' ? 'text-gray-400' : ''}`}
                  style={item.emoji === '✓' ? { color: 'var(--ns-forest)' } : {}}>
                  {item.emoji}
                </span>
                {item.text}
              </p>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={decline}
              className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-500 active:bg-gray-50 transition-all"
            >
              Decline
            </button>
            <button
              onClick={accept}
              className="flex-1 py-3 rounded-2xl text-white text-sm font-bold active:scale-[0.98] transition-all"
              style={{ background: 'var(--ns-forest)' }}
            >
              Accept analytics
            </button>
          </div>

          {/* Privacy link */}
          <p className="text-center text-[10px] text-gray-400 mt-3">
            You can change this in{' '}
            <Link href="/settings" className="underline">Settings</Link>{' '}
            at any time.{' '}
            <Link href="/privacy" className="underline">Privacy policy</Link>
          </p>
        </div>
      </div>
    </>
  )
}
