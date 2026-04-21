'use client'

import { useState, useEffect } from 'react'

export type ConsentState = 'accepted' | 'declined' | 'pending'

const CONSENT_KEY = 'nextsplit_cookie_consent'

export function useCookieConsent() {
  const [consent, setConsent] = useState<ConsentState>('pending')
  const [loaded, setLoaded]   = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored === 'accepted') setConsent('accepted')
      else if (stored === 'declined') setConsent('declined')
      else setConsent('pending')
    } catch {
      setConsent('pending')
    }
    setLoaded(true)
  }, [])

  function accept() {
    try { localStorage.setItem(CONSENT_KEY, 'accepted') } catch { /* ignore */ }
    setConsent('accepted')
  }

  function decline() {
    try { localStorage.setItem(CONSENT_KEY, 'declined') } catch { /* ignore */ }
    setConsent('declined')
  }

  return { consent, loaded, accept, decline }
}
