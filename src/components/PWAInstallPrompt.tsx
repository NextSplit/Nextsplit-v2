'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'nextsplit-pwa-install-dismissed'
const DISMISSED_UNTIL_KEY = 'nextsplit-pwa-install-dismissed-until'

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // Check if navigator.standalone is set (iOS Safari)
    if ((window.navigator as unknown as { standalone?: boolean }).standalone === true) return

    // Check snooze
    const dismissedUntil = localStorage.getItem(DISMISSED_UNTIL_KEY)
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) return

    // Detect iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as Record<string, unknown>).MSStream
    setIsIOS(ios)

    if (ios) {
      // Show iOS instructions after short delay
      const timer = setTimeout(() => setShow(true), 3000)
      return () => clearTimeout(timer)
    }

    // Listen for Chrome/Android install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setTimeout(() => setShow(true), 2000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    setInstalling(true)
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShow(false)
        setDeferredPrompt(null)
      }
    } finally {
      setInstalling(false)
    }
  }

  const handleDismiss = (snooze = false) => {
    setShow(false)
    if (snooze) {
      // Snooze for 3 days
      localStorage.setItem(DISMISSED_UNTIL_KEY, String(Date.now() + 3 * 24 * 60 * 60 * 1000))
    } else {
      localStorage.setItem(DISMISSED_KEY, '1')
    }
  }

  if (!show) return null

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 9998,
          animation: 'fadeIn 0.2s ease',
        }}
        onClick={() => handleDismiss(true)}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--color-surface, #fff)',
          borderRadius: '20px 20px 0 0',
          padding: '0 0 env(safe-area-inset-bottom, 20px)',
          zIndex: 9999,
          animation: 'slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.15)',
        }}
      >
        {/* Pull handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-border-2, #e5e7eb)' }} />
        </div>

        <div style={{ padding: '16px 24px 24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <img src="/icon-192.png" alt="NextSplit" style={{ width: 52, height: 52, borderRadius: 12 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--color-text-primary, #111827)' }}>
                Install NextSplit
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary, #6b7280)', marginTop: 2 }}>
                Add to home screen for the best experience
              </div>
            </div>
            <button
              onClick={() => handleDismiss(true)}
              style={{
                marginLeft: 'auto',
                background: 'var(--color-surface-3, #f3f4f6)',
                border: 'none',
                borderRadius: '50%',
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              aria-label="Dismiss"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Benefits */}
          <div style={{
            background: 'var(--color-surface-2, #f9fafb)',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            {[
              { icon: '⚡', text: 'Instant launch from your home screen' },
              { icon: '📴', text: 'Works offline — view sessions anywhere' },
              { icon: '🔔', text: 'Training reminders via push notifications' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--color-text-primary, #111827)' }}>
                <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>

          {isIOS ? (
            /* iOS manual instructions */
            <div>
              <div style={{ fontSize: 14, color: 'var(--color-text-secondary, #6b7280)', marginBottom: 12, lineHeight: 1.5 }}>
                To install on iPhone/iPad:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {[
                  { step: '1', text: 'Tap the Share button in Safari', icon: '↑' },
                  { step: '2', text: 'Scroll down and tap "Add to Home Screen"', icon: '+' },
                  { step: '3', text: 'Tap "Add" to confirm', icon: '✓' },
                ].map(({ step, text, icon }) => (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'var(--color-text-primary, #111827)' }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: '#0D9488',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      {icon}
                    </div>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleDismiss(false)}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 12,
                  border: '1.5px solid var(--color-border-2, #e5e7eb)',
                  background: 'transparent',
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--color-text-secondary, #6b7280)',
                  cursor: 'pointer',
                }}
              >
                Got it
              </button>
            </div>
          ) : (
            /* Android / Chrome install button */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleInstall}
                disabled={installing}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 12,
                  border: 'none',
                  background: '#0D9488',
                  color: 'white',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: installing ? 'wait' : 'pointer',
                  opacity: installing ? 0.8 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {installing ? 'Installing…' : 'Install App'}
              </button>
              <button
                onClick={() => handleDismiss(true)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'transparent',
                  fontSize: 14,
                  color: 'var(--color-text-secondary, #6b7280)',
                  cursor: 'pointer',
                }}
              >
                Maybe later
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </>
  )
}
