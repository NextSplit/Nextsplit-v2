/**
 * Offline session queue — Tech Pillar spec requirement.
 * "Today tab and session logging must work offline.
 *  Queue writes when offline, sync on reconnect."
 *
 * Uses IndexedDB via a simple wrapper. Falls back gracefully if unavailable.
 * The queue is flushed automatically when the browser comes back online.
 */

const DB_NAME    = 'nextsplit-offline'
const DB_VERSION = 1
const STORE_NAME = 'session-queue'

export interface QueuedSession {
  id:         string
  queuedAt:   string
  endpoint:   string
  body:       string // JSON stringified
}

function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null)
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => resolve(null) // fail silently
  })
}

/** Add a session log to the offline queue */
export async function queueSession(params: {
  week_n: number; day_i: number; session_i: number; done: boolean
  effort?: number; km?: number; notes?: string
  duration_secs?: number; hr?: number; pace?: string
  plan_id: string
}): Promise<void> {
  const db = await openDB()
  if (!db) return

  const item: QueuedSession = {
    id:       `${params.plan_id}_${params.week_n}_${params.day_i}_${params.session_i}_${Date.now()}`,
    queuedAt: new Date().toISOString(),
    endpoint: '/api/logs',
    body:     JSON.stringify(params),
  }

  return new Promise((resolve) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.add(item)
    tx.oncomplete = () => resolve()
    tx.onerror    = () => resolve() // fail silently
  })
}

/** Get all queued sessions */
async function getAllQueued(): Promise<QueuedSession[]> {
  const db = await openDB()
  if (!db) return []
  return new Promise((resolve) => {
    const tx    = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req   = store.getAll()
    req.onsuccess = () => resolve(req.result ?? [])
    req.onerror   = () => resolve([])
  })
}

/** Remove a synced item from the queue */
async function removeQueued(id: string): Promise<void> {
  const db = await openDB()
  if (!db) return
  return new Promise((resolve) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror    = () => resolve()
  })
}

/** Flush the offline queue — send all pending sessions to the API */
export async function flushOfflineQueue(): Promise<number> {
  const queued = await getAllQueued()
  if (queued.length === 0) return 0

  let synced = 0
  for (const item of queued) {
    try {
      const res = await fetch(item.endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    item.body,
      })
      if (res.ok) {
        await removeQueued(item.id)
        synced++
      }
    } catch {
      // Still offline — leave in queue, will retry next time
      break
    }
  }
  return synced
}

/** Count items in the offline queue */
export async function getOfflineQueueCount(): Promise<number> {
  const queued = await getAllQueued()
  return queued.length
}

/** Set up the online event listener to auto-flush when back online */
export function initOfflineSync(onSynced?: (count: number) => void): () => void {
  if (typeof window === 'undefined') return () => {}

  async function handleOnline() {
    const count = await flushOfflineQueue()
    if (count > 0) onSynced?.(count)
  }

  window.addEventListener('online', handleOnline)

  // Also try to flush on init in case we're already online with a pending queue
  if (navigator.onLine) {
    flushOfflineQueue().then(count => { if (count > 0) onSynced?.(count) }).catch(() => {})
  }

  return () => window.removeEventListener('online', handleOnline)
}
