// NextSplit v2 — Service Worker v2 (Phase 5C)
// Handles push notifications, PWA caching, and offline support

const CACHE_NAME = 'nextsplit-v2-shell-v1'
const OFFLINE_URL = '/offline'

// App shell — pages to precache on install
const PRECACHE_URLS = [
  '/',
  '/today',
  '/plan',
  '/dashboard',
  '/nutrition',
  '/profile',
  '/offline',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

// ─── Install: precache shell ───────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        // Don't fail install if some pages 404 (e.g. not yet built)
        console.warn('[SW] Precache partial failure:', err)
      })
    }).then(() => self.skipWaiting())
  )
})

// ─── Activate: prune old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => clients.claim())
  )
})

// ─── Fetch: network-first with offline fallback ────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip cross-origin requests (Supabase, etc.)
  if (url.origin !== self.location.origin) return

  // Skip API routes — always network
  if (url.pathname.startsWith('/api/')) return

  // Skip Next.js internals
  if (url.pathname.startsWith('/_next/')) return

  // Navigation requests: network-first, fall back to offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached
            return caches.match(OFFLINE_URL)
          })
        )
    )
    return
  }

  // Static assets: cache-first
  if (
    url.pathname.startsWith('/icon') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.json')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
      })
    )
  }
})

// ─── Push notifications ────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'NextSplit', body: event.data.text() }
  }

  const {
    title = 'NextSplit',
    body = "Time to run! Today's session is waiting.",
    icon,
    url = '/today',
  } = payload

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: icon || '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'nextsplit-reminder',
      renotify: true,
      data: { url },
      actions: [
        { action: 'open', title: 'View session' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return

  const url = event.notification.data?.url || '/today'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
