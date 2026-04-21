'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Capture the event at module scope so it's never missed regardless of
// when the component mounts relative to when the browser fires it.
let _prompt: BeforeInstallPromptEvent | null = null

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    _prompt = e as BeforeInstallPromptEvent
  })
}

const SNOOZED_KEY = 'nextsplit-pwa-snoozed-until'
const DISMISSED_KEY = 'nextsplit-pwa-dismissed'

export default function PWAInstallPrompt() {
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    // Already installed in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if ((window.navigator as unknown as { standalone?: boolean }).standalone === true) return

    // Permanently dismissed
    if (localStorage.getItem(DISMISSED_KEY)) return

    // Snoozed
    const snoozedUntil = localStorage.getItem(SNOOZED_KEY)
    if (snoozedUntil && Date.now() < parseInt(snoozedUntil)) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIOS(ios)

    if (ios) {
      // iOS: show after 4s
      const t = setTimeout(() => setShow(true), 4000)
      return () => clearTimeout(t)
    }

    // Android/Chrome: show when prompt is available
    const checkPrompt = () => {
      if (_prompt) {
        setTimeout(() => setShow(true), 2000)
      } else {
        // Poll briefly in case it fires after mount
        const t = setTimeout(checkPrompt, 500)
        return t
      }
    }
    const timer = checkPrompt()
    return () => { if (timer) clearTimeout(timer) }
  }, [])

  async function handleInstall() {
    if (!_prompt) return
    setInstalling(true)
    try {
      await _prompt.prompt()
      const { outcome } = await _prompt.userChoice
      if (outcome === 'accepted') {
        _prompt = null
        setShow(false)
      }
    } finally {
      setInstalling(false)
    }
  }

  function snooze() {
    localStorage.setItem(SNOOZED_KEY, String(Date.now() + 3 * 24 * 60 * 60 * 1000))
    setShow(false)
  }

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <>
      <div
        onClick={snooze}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 9998, animation: 'pwaFadeIn 0.2s ease',
        }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--color-surface, #fff)',
        borderRadius: '20px 20px 0 0',
        padding: '0 0 env(safe-area-inset-bottom, 24px)',
        zIndex: 9999,
        animation: 'pwaSlideUp 0.3s cubic-bezier(0.32,0.72,0,1)',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.15)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-border-2, #e5e7eb)' }} />
        </div>

        <div style={{ padding: '12px 24px 24px' }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Image src="/icon-192.png" alt="NextSplit" width={48} height={48} style={{ borderRadius: 11 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary, #111827)' }}>
                Install NextSplit
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary, #6b7280)', marginTop: 2 }}>
                Add to home screen for the best experience
              </div>
            </div>
            <button onClick={snooze} aria-label="Close" style={{
              background: 'var(--color-surface-3, #f3f4f6)', border: 'none',
              borderRadius: '50%', width: 28, height: 28, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Benefits */}
          <div style={{
            background: 'var(--color-surface-2, #f9fafb)', borderRadius: 12,
            padding: '10px 14px', marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 7,
          }}>
            {[
              { icon: '⚡', text: 'Instant launch from your home screen' },
              { icon: '📴', text: 'Works offline — view sessions anywhere' },
              { icon: '🔔', text: 'Training reminders via push notifications' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--color-text-primary, #111827)' }}>
                <span style={{ fontSize: 17, width: 22, textAlign: 'center' }}>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>

          {isIOS ? (
            <div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary, #6b7280)', marginBottom: 10, lineHeight: 1.5 }}>
                To install on iPhone/iPad:
              </div>
              {[
                { icon: '↑', text: 'Tap the Share button in Safari' },
                { icon: '+', text: 'Tap "Add to Home Screen"' },
                { icon: '✓', text: 'Tap "Add" to confirm' },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 14, color: 'var(--color-text-primary, #111827)' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: 'var(--ns-forest)',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, flexShrink: 0,
                  }}>{icon}</div>
                  <span>{text}</span>
                </div>
              ))}
              <button onClick={dismiss} style={{
                marginTop: 12, width: '100%', padding: '13px',
                borderRadius: 12, border: '1.5px solid var(--color-border-2, #e5e7eb)',
                background: 'transparent', fontSize: 15, fontWeight: 600,
                color: 'var(--color-text-secondary, #6b7280)', cursor: 'pointer',
              }}>Got it</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={handleInstall} disabled={installing} style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                background: 'var(--ns-forest)', color: 'white', fontSize: 15, fontWeight: 700,
                cursor: installing ? 'wait' : 'pointer', opacity: installing ? 0.75 : 1,
              }}>
                {installing ? 'Installing…' : 'Install App'}
              </button>
              <button onClick={snooze} style={{
                width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                background: 'transparent', fontSize: 14,
                color: 'var(--color-text-secondary, #6b7280)', cursor: 'pointer',
              }}>Maybe later</button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pwaFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pwaSlideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </>
  )
}
