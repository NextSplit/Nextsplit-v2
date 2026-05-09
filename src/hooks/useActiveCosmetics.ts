'use client'

import { useEffect, useState, useCallback } from 'react'
import type { CosmeticCatalogRow, CosmeticSlot } from '@/lib/character-inventory'

// Reads the caller's currently-active cosmetic per slot. Used by HeroCard
// (kit_colour override), RaceResultReplay (aura on self lane), and any
// future surface that wants to show the player's active drip.
//
// Returns Map<slot, CosmeticCatalogRow>. A slot key absent from the map
// means no active cosmetic in that slot (default rendering).
//
// RLS allows authenticated own-row reads on character_cosmetic_inventory
// + public reads on character_cosmetics_catalog, so this works without a
// service-role round-trip.

export type ActiveCosmeticsMap = Map<CosmeticSlot, CosmeticCatalogRow>

interface UseActiveCosmeticsReturn {
  active:  ActiveCosmeticsMap
  loading: boolean
  refresh: () => void
}

export function useActiveCosmetics(): UseActiveCosmeticsReturn {
  const [active, setActive]   = useState<ActiveCosmeticsMap>(new Map())
  const [loading, setLoading] = useState(true)
  const [tick, setTick]       = useState(0)
  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const load = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = supabase as any
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          if (!cancelled) setActive(new Map())
          return
        }

        const { data: rows } = await s
          .from('character_cosmetic_inventory')
          .select('cosmetic_id, character_cosmetics_catalog!inner(id, name, description, emoji, slot, asset, rarity, gbp_price, enabled)')
          .eq('user_id', user.id)
          .eq('is_active', true)

        if (cancelled) return
        const m: ActiveCosmeticsMap = new Map()
        for (const row of (rows ?? []) as Array<{ character_cosmetics_catalog: CosmeticCatalogRow }>) {
          const c = row.character_cosmetics_catalog
          if (c?.slot) m.set(c.slot as CosmeticSlot, c)
        }
        setActive(m)
      } catch {
        if (!cancelled) setActive(new Map())
      }
    }

    load().finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tick])

  return { active, loading, refresh }
}

// Helper: extract the active kit_colour as a CSS hex/string, or null.
export function activeKitColour(active: ActiveCosmeticsMap): string | null {
  const kit = active.get('kit_colour')
  if (!kit) return null
  const colour = (kit.asset as { colour?: string })?.colour
  return typeof colour === 'string' ? colour : null
}

// Helper: extract aura asset (or null).
export function activeAura(active: ActiveCosmeticsMap): { colour?: string; effect?: string; kind?: string } | null {
  const aura = active.get('aura')
  if (!aura) return null
  return aura.asset as { colour?: string; effect?: string; kind?: string }
}
