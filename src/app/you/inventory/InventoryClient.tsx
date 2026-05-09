'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useInventory } from '@/hooks/useInventory'
import {
  RARITY_COLOURS, RARITY_LABELS,
  EFFECT_STAT_META,
  COSMETIC_SLOT_ORDER, COSMETIC_SLOT_LABEL,
  type BoostCatalogRow, type CosmeticCatalogRow,
  type CosmeticSlot,
} from '@/lib/character-inventory'

// /you/inventory — full inventory grid.
//
// Layout:
//   1. Boosts section — owned + locked, grouped by rarity. Each owned
//      tile shows quantity. Locked tiles greyed-out.
//   2. Cosmetics section — grouped by slot. Active item highlighted.
//      Tap an owned cosmetic to activate it (deactivates other in slot).
//      Currently-active item has a "Clear" affordance.
//
// Drops accumulate here from the random-drop loop. Future PRs add streak/
// quest/purchase paths.

export default function InventoryClient() {
  const { data, loading, toggleCosmetic } = useInventory()
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)

  if (loading || !data) {
    return (
      <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>
        <Header />
        <div className="max-w-lg mx-auto px-4 space-y-3">
          <div className="rounded-2xl animate-pulse" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', height: 200 }} />
          <div className="rounded-2xl animate-pulse" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', height: 280 }} />
        </div>
      </div>
    )
  }

  const ownedBoostQty = new Map(data.boost_inventory.map(b => [b.boost_id, b.quantity]))
  const ownedCosmetic = new Map(data.cosmetic_inventory.map(c => [c.cosmetic_id, c]))
  const cosmeticsBySlot = new Map<CosmeticSlot, CosmeticCatalogRow[]>()
  for (const slot of COSMETIC_SLOT_ORDER) cosmeticsBySlot.set(slot, [])
  data.cosmetics_catalog.forEach(c => {
    cosmeticsBySlot.get(c.slot as CosmeticSlot)?.push(c)
  })

  const handleToggle = async (cosmetic: CosmeticCatalogRow, isActive: boolean) => {
    if (pending) return
    setPending(cosmetic.id)
    setError(null)
    try {
      // Tapping an active item clears the slot; tapping inactive activates.
      if (isActive) await toggleCosmetic(null, cosmetic.slot as CosmeticSlot)
      else          await toggleCosmetic(cosmetic.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle')
    } finally {
      setPending(null)
    }
  }

  const totalBoosts = data.boost_inventory.reduce((s, b) => s + b.quantity, 0)
  const totalCosmetics = data.cosmetic_inventory.length

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>
      <Header />

      <div className="max-w-lg mx-auto px-4 space-y-5">

        {/* Inventory summary */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryTile label="Boosts" value={totalBoosts} emoji="🎁" />
          <SummaryTile label="Cosmetics" value={`${totalCosmetics}/${data.cosmetics_catalog.length}`} emoji="✨" />
        </div>

        {/* Boosts */}
        <section>
          <h2 className="text-xs font-black uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--color-text-tertiary)' }}>
            Boosts (single-race)
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {data.boosts_catalog.map(boost => {
              const qty = ownedBoostQty.get(boost.id) ?? 0
              const owned = qty > 0
              return <BoostTile key={boost.id} boost={boost} quantity={qty} owned={owned} />
            })}
          </div>
        </section>

        {/* Cosmetics — grouped by slot */}
        <section>
          <h2 className="text-xs font-black uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--color-text-tertiary)' }}>
            Cosmetics
          </h2>
          {COSMETIC_SLOT_ORDER.map(slot => {
            const items = cosmeticsBySlot.get(slot) ?? []
            if (items.length === 0) return null
            return (
              <div key={slot} className="mb-3">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 px-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {COSMETIC_SLOT_LABEL[slot]}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {items.map(cosmetic => {
                    const inv = ownedCosmetic.get(cosmetic.id)
                    const owned = !!inv
                    const isActive = inv?.is_active ?? false
                    return (
                      <CosmeticTile
                        key={cosmetic.id}
                        cosmetic={cosmetic}
                        owned={owned}
                        isActive={isActive}
                        onToggle={() => handleToggle(cosmetic, isActive)}
                        loading={pending === cosmetic.id}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </section>

        {error && (
          <p className="text-xs text-center text-red-500 px-2 py-2 rounded-lg"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
            {error}
          </p>
        )}

        {totalBoosts === 0 && totalCosmetics === 0 && (
          <p className="text-xs text-center mt-4" style={{ color: 'var(--color-text-tertiary)' }}>
            Drops are random — log sessions and they&apos;ll appear here.
          </p>
        )}
      </div>
    </div>
  )
}

function Header() {
  return (
    <div
      className="max-w-lg mx-auto px-4 pt-12 pb-3 flex items-center justify-between"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}
    >
      <div>
        <Link href="/you" className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>← Back to You</Link>
        <h1 className="text-2xl font-black mt-1" style={{ color: 'var(--color-text-primary)' }}>
          Inventory
        </h1>
      </div>
    </div>
  )
}

function SummaryTile({ label, value, emoji }: { label: string; value: string | number; emoji: string }) {
  return (
    <div
      className="rounded-2xl px-4 py-3 flex items-center gap-3"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <span className="text-2xl" aria-hidden>{emoji}</span>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-text-tertiary)' }}>
          {label}
        </p>
        <p className="text-lg font-black" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
      </div>
    </div>
  )
}

function BoostTile({ boost, quantity, owned }: { boost: BoostCatalogRow; quantity: number; owned: boolean }) {
  const stat = EFFECT_STAT_META[boost.effect_stat]
  const rarityColour = RARITY_COLOURS[boost.rarity]
  return (
    <div
      className="rounded-xl px-3 py-3 relative"
      style={{
        background: 'var(--color-surface)',
        border: `1.5px solid ${owned ? rarityColour : 'var(--color-border)'}`,
        opacity: owned ? 1 : 0.45,
      }}
    >
      <div className="flex items-start justify-between mb-1">
        <span className="text-2xl" aria-hidden>{boost.emoji}</span>
        {owned && quantity > 1 && (
          <span
            className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
            style={{ background: rarityColour, color: 'white' }}
          >
            ×{quantity}
          </span>
        )}
      </div>
      <p className="text-xs font-black truncate" style={{ color: 'var(--color-text-primary)' }}>
        {boost.name}
      </p>
      <p className="text-[10px] font-bold" style={{ color: rarityColour }}>
        {RARITY_LABELS[boost.rarity]}
      </p>
      <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
        {stat.emoji} +{Math.round(boost.effect_pct * 100)}% {stat.label.toLowerCase()}
      </p>
    </div>
  )
}

function CosmeticTile({
  cosmetic, owned, isActive, onToggle, loading,
}: {
  cosmetic: CosmeticCatalogRow
  owned:    boolean
  isActive: boolean
  onToggle: () => void
  loading:  boolean
}) {
  const rarityColour = RARITY_COLOURS[cosmetic.rarity]
  const swatch = (cosmetic.asset as { colour?: string })?.colour
  return (
    <button
      onClick={onToggle}
      disabled={!owned || loading}
      className="rounded-xl px-3 py-3 text-left transition-all active:scale-95 disabled:active:scale-100"
      style={{
        background: isActive ? rarityColour : 'var(--color-surface)',
        border: `1.5px solid ${owned ? rarityColour : 'var(--color-border)'}`,
        boxShadow: isActive ? `0 0 12px ${rarityColour}55` : 'none',
        opacity: owned ? 1 : 0.45,
        cursor: owned ? 'pointer' : 'default',
      }}
    >
      <div className="flex items-start justify-between mb-1">
        <span className="text-2xl" aria-hidden>{cosmetic.emoji}</span>
        {swatch && (typeof swatch === 'string') && swatch.startsWith('#') && (
          <span
            className="w-4 h-4 rounded-full inline-block"
            style={{ background: swatch, border: '1.5px solid rgba(255,255,255,0.5)' }}
            aria-hidden
          />
        )}
      </div>
      <p
        className="text-xs font-black truncate"
        style={{ color: isActive ? 'white' : 'var(--color-text-primary)' }}
      >
        {cosmetic.name}
      </p>
      <p
        className="text-[10px] font-bold"
        style={{ color: isActive ? 'white' : rarityColour, opacity: isActive ? 0.9 : 1 }}
      >
        {RARITY_LABELS[cosmetic.rarity]}{isActive ? ' · ACTIVE' : ''}
      </p>
      {!owned && (
        <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
          🔒 Locked
        </p>
      )}
    </button>
  )
}
