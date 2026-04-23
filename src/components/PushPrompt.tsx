'use client'

/**
 * PushPrompt — shown once after the user logs their first session.
 * Coach voice. Never shown again once dismissed or granted.
 * Timing: after first successful log, before NPS prompt.
 */

import { useState, useEffect } from 'react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

const DISMISSED_KEY = 'nextsplit_push_prompt_dismissed'
const GRANTED_KEY   = 'nextsplit_push_granted'

interface Props {
  firstSessionAt: string | null
  displayName:    string | null
}

export default function PushPrompt({ firstSessionAt, displayName }: Props) {
  const [show, setShow]         = useState(false)
  const [done, setDone]         = useState(false)
  const { subscribe, status }   = usePushNotifications()

  const name = displayName?.split(' ')[0] ?? null

  useEffect(() => {
    if (!firstSessionAt) return
    // Don't show if already dismissed or granted
    try {
      if (localStorage.getItem(DISMISSED_KEY)) return
      if (localStorage.getItem(GRANTED_KEY)) return
    } catch { return }

    // Only show if browser supports push
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return

    // Already granted — save and skip
    if (Notification.permission === 'granted') {
      try { localStorage.setItem(GRANTED_KEY, '1') } catch {}
      return
    }
    // Already denied — don't ask again
    if (Notification.permission === 'denied') return

    // Show after 2s delay — let the session log ceremony settle
    const t = setTimeout(() => setShow(true), 2000)
    return () => clearTimeout(t)
  }, [firstSessionAt])

  const dismiss = () => {
    try { localStorage.setItem(DISMISSED_KEY, '1') } catch {}
    setShow(false)
  }

  const handleEnable = async () => {
    const ok = await subscribe()
    if (ok) {
      try { localStorage.setItem(GRANTED_KEY, '1') } catch {}
      setDone(true)
      setTimeout(() => setShow(false), 1800)
    } else {
      dismiss()
    }
  }

  if (!show) return null

  return (
    <div className="fixed bottom-24 left-4 right-4 z-40 max-w-lg mx-auto animate-slide-up">
      <div className="rounded-2xl p-4 shadow-2xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        {done ? (
          <div className="flex items-center gap-3 py-1">
            <span className="text-2xl">✓</span>
            <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
              You're in. We'll only message when it matters.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3 mb-3">
              <div className="text-2xl flex-shrink-0">🔔</div>
              <div>
                <p className="text-sm font-bold mb-0.5" style={{ color: 'var(--color-text-primary)' }}>
                  {name ? `Nice work, ${name}.` : 'Nice work.'} Stay consistent?
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  We'll remind you before your next session and when your streak's at risk.
                  Never more than once a day.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={dismiss}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)' }}>
                Not now
              </button>
              <button onClick={handleEnable} disabled={status === 'requesting'}
                className="flex-1 py-2.5 rounded-xl text-xs font-black text-white transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'var(--ns-ember)' }}>
                {status === 'requesting' ? 'Enabling…' : 'Enable →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
