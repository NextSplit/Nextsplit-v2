'use client'

import { useState, useCallback } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i)
  return arr.buffer
}

export type PushStatus = 'idle' | 'requesting' | 'subscribed' | 'denied' | 'error'

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>('idle')

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[push] Not supported in this browser')
      setStatus('error')
      return false
    }

    setStatus('requesting')

    try {
      // 1. Request permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('denied')
        return false
      }

      // 2. Register service worker
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      await navigator.serviceWorker.ready

      // 3. Get push subscription
      const existing = await reg.pushManager.getSubscription()
      const subscription = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      // 4. Send to server
      const json = subscription.toJSON()
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      })

      if (!res.ok) throw new Error('Failed to save subscription')
      setStatus('subscribed')
      return true
    } catch (err) {
      console.error('[push] Subscribe failed:', err)
      setStatus('error')
      return false
    }
  }, [])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      if (reg) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) await sub.unsubscribe()
      }
      await fetch('/api/notifications/subscribe', { method: 'DELETE' })
      setStatus('idle')
      return true
    } catch (err) {
      console.error('[push] Unsubscribe failed:', err)
      return false
    }
  }, [])

  return { status, subscribe, unsubscribe }
}
