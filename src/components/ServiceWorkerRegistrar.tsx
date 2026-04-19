'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker on every page load so offline caching
 * works even if the user hasn't enabled push notifications.
 * Placed in the root layout so it runs app-wide.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.debug('[SW] Registered, scope:', reg.scope)
        // Check for updates in the background
        reg.update().catch(() => {/* network may be offline */})
      })
      .catch((err) => {
        console.warn('[SW] Registration failed:', err)
      })
  }, [])

  return null
}
