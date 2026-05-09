'use client'

import { useEffect, useState, useCallback } from 'react'
import type {
  BoostCatalogRow, CosmeticCatalogRow,
  BoostInventoryRow, CosmeticInventoryRow,
  CosmeticSlot,
} from '@/lib/character-inventory'

export interface InventoryData {
  boosts_catalog:     BoostCatalogRow[]
  cosmetics_catalog:  CosmeticCatalogRow[]
  boost_inventory:    BoostInventoryRow[]
  cosmetic_inventory: CosmeticInventoryRow[]
}

interface UseInventoryReturn {
  data:        InventoryData | null
  loading:     boolean
  error:       string | null
  refresh:     () => void
  toggleCosmetic: (cosmeticId: string | null, slot?: CosmeticSlot) => Promise<void>
}

export function useInventory(): UseInventoryReturn {
  const [data, setData]       = useState<InventoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [tick, setTick]       = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/character/inventory', { cache: 'no-store' })
      .then(r => r.json())
      .then((res: InventoryData & { error?: string }) => {
        if (cancelled) return
        if (res.error) setError(res.error)
        else { setData(res); setError(null) }
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'fetch failed') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tick])

  const toggleCosmetic = useCallback(async (cosmeticId: string | null, slot?: CosmeticSlot) => {
    const res = await fetch('/api/character/inventory/cosmetic-toggle', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ cosmetic_id: cosmeticId, slot }),
    })
    const body = await res.json() as { error?: string; ok?: boolean }
    if (!res.ok) throw new Error(body.error ?? `toggle failed (${res.status})`)
    refresh()
  }, [refresh])

  return { data, loading, error, refresh, toggleCosmetic }
}
