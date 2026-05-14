'use client'

/**
 * CookieConsentBanner — K32 v2 (categorical, ICO-strict).
 *
 * Replaces the binary Accept / Decline surface with a granular
 * Accept-all / Reject-all / Customise flow. Customise expands an
 * in-banner panel with two toggles (Analytics, Performance), both
 * OFF by default — pre-ticked is not valid consent under ICO 2019.
 *
 * Reject-all sits at equal visual weight to Accept-all. No dark
 * patterns: same shape, same padding, same font weight; only the
 * fill colour distinguishes the recommended action.
 *
 * Essential cookies (auth, CSRF, the consent record itself) are
 * disclosed in the body copy as always-on; there is no toggle for
 * them because they fall under the PECR "strictly necessary"
 * exemption.
 */

import { useState } from 'react'
import Link from 'next/link'
import { useCookieConsent } from '@/hooks/useCookieConsent'

export default function CookieConsentBanner() {
  const { state, loaded, acceptAll, rejectAll, savePreferences } = useCookieConsent()
  const [customise,   setCustomise]   = useState(false)
  const [analytics,   setAnalytics]   = useState(false)
  const [performance, setPerformance] = useState(false)

  if (!loaded || state.status !== 'pending') return null

  return (
    <>
      <div className="fixed inset-0 z-40 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 40%)' }} />

      <div
        className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-banner-title"
        aria-describedby="cookie-banner-desc"
      >
        <div className="bg-white rounded-t-3xl shadow-2xl px-5 pt-5 pb-8 md:rounded-2xl md:m-4 md:mb-4">
          <div className="w-10 h-1 rounded-full mx-auto mb-4 md:hidden" style={{ background: '#e5e7eb' }} />

          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--ns-cyan-light)' }}>
              <span className="text-base">🍪</span>
            </div>
            <div>
              <h2
                id="cookie-banner-title"
                className="text-sm font-bold text-gray-900 leading-snug"
              >
                One quick thing before we start
              </h2>
              <p
                id="cookie-banner-desc"
                className="text-xs text-[var(--color-text-tertiary)] mt-0.5 leading-relaxed"
              >
                We use a few small files to keep you signed in and to
                understand how runners use NextSplit. You decide what's on.
              </p>
            </div>
          </div>

          {customise ? (
            <div className="space-y-2 mb-4">
              <CategoryRow
                label="Essential"
                description="Sign-in, security, and the cookie choice itself. Required."
                required
                checked
              />
              <CategoryRow
                label="Analytics"
                description="Anonymous usage events — which screens, which features, where we lose people."
                checked={analytics}
                onToggle={() => setAnalytics(v => !v)}
              />
              <CategoryRow
                label="Performance"
                description="Crash and performance tracing so we can fix problems we'd otherwise never see."
                checked={performance}
                onToggle={() => setPerformance(v => !v)}
              />
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl px-3 py-2.5 mb-4 space-y-1">
              {[
                { emoji: '✓', text: 'Essential sign-in & security (always on)' },
                { emoji: '?', text: 'Analytics & performance (you choose below)' },
                { emoji: '✗', text: 'No advertising. No selling to third parties.' },
              ].map(item => (
                <p key={item.text} className="text-[11px] text-[var(--color-text-tertiary)] flex items-start gap-2">
                  <span
                    className="font-bold flex-shrink-0"
                    style={
                      item.emoji === '✓' ? { color: 'var(--ns-ember)' } :
                      item.emoji === '?' ? { color: 'var(--ns-cyan)' } : {}
                    }
                  >
                    {item.emoji}
                  </span>
                  {item.text}
                </p>
              ))}
            </div>
          )}

          {/* Three equal-prominence actions. Customise toggles in-place;
              Accept-all and Reject-all are filled buttons of identical
              shape so the "reject is as easy as accept" PECR test holds. */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={rejectAll}
              className="py-3 rounded-2xl text-sm font-bold text-gray-700 active:scale-[0.98] transition-all"
              style={{ background: '#e5e7eb' }}
            >
              Reject all
            </button>
            {customise ? (
              <button
                onClick={() => savePreferences({ analytics, performance })}
                className="py-3 rounded-2xl text-sm font-bold text-gray-900 border-2 border-gray-300 active:scale-[0.98] transition-all"
                style={{ background: '#fff' }}
              >
                Save choices
              </button>
            ) : (
              <button
                onClick={() => setCustomise(true)}
                className="py-3 rounded-2xl text-sm font-bold text-gray-900 border-2 border-gray-300 active:scale-[0.98] transition-all"
                style={{ background: '#fff' }}
              >
                Customise
              </button>
            )}
            <button
              onClick={acceptAll}
              className="py-3 rounded-2xl text-white text-sm font-bold active:scale-[0.98] transition-all"
              style={{ background: 'var(--ns-ember)' }}
            >
              Accept all
            </button>
          </div>

          <p className="text-center text-[10px] text-[var(--color-text-tertiary)] mt-3">
            Change this any time in{' '}
            <Link href="/settings" className="underline">Settings</Link>.{' '}
            <Link href="/privacy" className="underline">Privacy policy</Link>
          </p>
        </div>
      </div>
    </>
  )
}

function CategoryRow({
  label,
  description,
  checked,
  required,
  onToggle,
}: {
  label:        string
  description:  string
  checked:      boolean
  required?:    boolean
  onToggle?:    () => void
}) {
  const interactive = !required && !!onToggle
  return (
    <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={!interactive}
        onClick={onToggle}
        className="flex-shrink-0 mt-0.5 w-9 h-5 rounded-full transition-colors relative"
        style={{
          background: checked ? 'var(--ns-ember)' : '#d1d5db',
          opacity:    interactive ? 1 : 0.7,
          cursor:     interactive ? 'pointer' : 'not-allowed',
        }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
          style={{ left: checked ? '18px' : '2px' }}
        />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-gray-900 flex items-center gap-1.5">
          {label}
          {required && (
            <span className="text-[9px] font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">
              Required
            </span>
          )}
        </p>
        <p className="text-[10px] text-[var(--color-text-tertiary)] leading-snug mt-0.5">
          {description}
        </p>
      </div>
    </div>
  )
}
