'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { onStreakReward, type StreakReward } from '@/lib/character-events'
import { RARITY_COLOURS, type BoostCatalogRow, type CosmeticCatalogRow } from '@/lib/character-inventory'

// Streak milestone reward toast. Bigger and more celebratory than loot
// toast — milestones are months apart for most users. 6s visible, taps
// through to /you/inventory.
//
// Lazy-fetches catalog metadata on first event so the toast can show name
// + rarity colour without a per-event round-trip.

interface QueuedReward extends StreakReward { id: number }
type CatalogMap = Map<string, BoostCatalogRow | CosmeticCatalogRow>

const VISIBLE_MS  = 6000
const FADE_OUT_MS = 400

export function StreakRewardToast() {
  const [queue,   setQueue]   = useState<QueuedReward[]>([])
  const [current, setCurrent] = useState<QueuedReward | null>(null)
  const [visible, setVisible] = useState(false)
  const [catalog, setCatalog] = useState<CatalogMap | null>(null)

  useEffect(() => {
    let counter = 0
    return onStreakReward((r) => {
      counter += 1
      setQueue(q => [...q, { ...r, id: counter }])
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
    const fadeAt  = setTimeout(() => setVisible(false), VISIBLE_MS)
    const clearAt = setTimeout(() => setCurrent(null), VISIBLE_MS + FADE_OUT_MS)
    return () => { clearTimeout(fadeAt); clearTimeout(clearAt) }
  }, [current, queue])

  if (!current) return null

  const item   = catalog?.get(current.item_id) ?? null
  const rarity = (item as { rarity?: keyof typeof RARITY_COLOURS } | null)?.rarity
  const rarityColour = rarity ? RARITY_COLOURS[rarity] : 'var(--ns-amber)'

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
        className="rounded-2xl px-5 py-4 flex items-center gap-3"
        style={{
          background: `linear-gradient(135deg, ${rarityColour}, var(--ns-amber))`,
          color: 'white',
          boxShadow: `0 12px 40px ${rarityColour}66, 0 0 0 2px ${rarityColour}, 0 0 24px ${rarityColour}55`,
          minWidth: 280,
          maxWidth: 380,
        }}
      >
        <span className="text-3xl" aria-hidden>🔥</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-95">
            {current.milestone}-day streak unlocked
          </p>
          <p className="text-base font-black mt-0.5">
            {item?.emoji ?? '🎁'} {item?.name ?? current.item_id}
          </p>
          <p className="text-[10px] mt-1 opacity-85">
            Tap to view in inventory →
          </p>
        </div>
      </div>
    </Link>
  )
}
