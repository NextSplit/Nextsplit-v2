'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { onCharacterLoot, type CharacterLootDrop } from '@/lib/character-events'
import {
  RARITY_COLOURS, RARITY_LABELS,
  type BoostCatalogRow, type CosmeticCatalogRow,
} from '@/lib/character-inventory'

// Loot toast — surfaces random drops returned from /api/community/progress.
// Mounted once in app/layout.tsx alongside CharacterStatToast.
//
// Bigger than the stat toast (loot is a rarer event — ~2% of session logs)
// and lingers slightly longer (5s) so the user actually reads it. Tap the
// toast to deep-link to /you/inventory; otherwise auto-dismisses.
//
// On first event, lazy-fetches catalog rows so we can show name + emoji
// without an extra round-trip per drop. Catalog data is small (~20 rows
// total) and cached for the session lifetime.

interface QueuedDrop extends CharacterLootDrop {
  id: number
}

type CatalogMap = Map<string, BoostCatalogRow | CosmeticCatalogRow>

const VISIBLE_MS  = 5000
const FADE_OUT_MS = 400

export function CharacterLootToast() {
  const [queue,   setQueue]   = useState<QueuedDrop[]>([])
  const [current, setCurrent] = useState<QueuedDrop | null>(null)
  const [visible, setVisible] = useState(false)
  const [catalog, setCatalog] = useState<CatalogMap | null>(null)

  // Lazy-load catalog on first event.
  useEffect(() => {
    let counter = 0
    return onCharacterLoot((d) => {
      counter += 1
      setQueue(q => [...q, { ...d, id: counter }])
      // Trigger catalog fetch if we haven't already.
      if (!catalog) {
        fetch('/api/character/inventory', { cache: 'no-store' })
          .then(r => r.ok ? r.json() : null)
          .then((res) => {
            if (!res) return
            const m: CatalogMap = new Map()
            ;(res.boosts_catalog as BoostCatalogRow[] ?? []).forEach(b => m.set(b.id, b))
            ;(res.cosmetics_catalog as CosmeticCatalogRow[] ?? []).forEach(c => m.set(c.id, c))
            setCatalog(m)
          })
          .catch(() => {})
      }
    })
  }, [catalog])

  useEffect(() => {
    if (current || queue.length === 0) return
    const [next, ...rest] = queue
    setQueue(rest)
    setCurrent(next)
    setVisible(true)
    const fadeAt = setTimeout(() => setVisible(false), VISIBLE_MS)
    const clearAt = setTimeout(() => setCurrent(null), VISIBLE_MS + FADE_OUT_MS)
    return () => { clearTimeout(fadeAt); clearTimeout(clearAt) }
  }, [current, queue])

  if (!current) return null

  const item = catalog?.get(current.item_id) ?? null
  const rarityColour = RARITY_COLOURS[current.rarity]

  return (
    <Link
      href="/you/inventory"
      className="fixed left-1/2 -translate-x-1/2 z-50"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 92px)',
        opacity: visible ? 1 : 0,
        transform: `translateX(-50%) translateY(${visible ? 0 : 20}px)`,
        transition: `opacity ${FADE_OUT_MS}ms ease, transform ${FADE_OUT_MS}ms ease`,
      }}
      role="status"
      aria-live="polite"
    >
      <div
        className="rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{
          background: `linear-gradient(135deg, ${rarityColour}, var(--color-surface))`,
          color: 'white',
          boxShadow: `0 8px 32px ${rarityColour}55, 0 0 0 2px ${rarityColour}`,
          minWidth: 260,
          maxWidth: 380,
        }}
      >
        <span className="text-3xl" aria-hidden>{item?.emoji ?? '🎁'}</span>
        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] font-black uppercase tracking-widest"
            style={{ color: 'white', opacity: 0.95 }}
          >
            {current.kind === 'boost' ? '🎁 Boost dropped' : '✨ Cosmetic unlocked'} · {RARITY_LABELS[current.rarity]}
          </p>
          <p className="text-base font-black mt-0.5" style={{ color: 'white' }}>
            {item?.name ?? current.item_id}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: 'white', opacity: 0.85 }}>
            Tap to view in inventory →
          </p>
        </div>
      </div>
    </Link>
  )
}
