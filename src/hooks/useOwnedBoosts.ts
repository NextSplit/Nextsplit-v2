'use client'

import { useEffect, useState, useCallback } from 'react'
import type {
  BoostCatalogRow,
  BoostInventoryRow,
} from '@/lib/character-inventory'

// Lightweight hook for the boost picker on the race entry surface.
// Reads catalog + caller's boost inventory in a single round-trip via
// the existing /api/character/inventory endpoint (PR #35) — but if that
// hasn't merged yet, falls back to direct supabase-js calls so this PR
// can land independently. The fallback is removed in a subsequent PR
// once the API endpoint lands; for now we keep both paths.

export interface OwnedBoost {
  catalog:  BoostCatalogRow
  quantity: number
}

interface UseOwnedBoostsReturn {
  boosts:  OwnedBoost[]
  loading: boolean
  error:   string | null
  refresh: () => void
}

export function useOwnedBoosts(): UseOwnedBoostsReturn {
  const [boosts, setBoosts]   = useState<OwnedBoost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [tick, setTick]       = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const load = async () => {
      try {
        // Try the /api/character/inventory endpoint first.
        const res = await fetch('/api/character/inventory', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json() as {
            boosts_catalog?:  BoostCatalogRow[]
            boost_inventory?: BoostInventoryRow[]
            error?:           string
          }
          if (data.error) throw new Error(data.error)
          const catalogById = new Map(
            (data.boosts_catalog ?? []).map(b => [b.id, b]),
          )
          const owned: OwnedBoost[] = (data.boost_inventory ?? [])
            .filter(b => b.quantity > 0)
            .map(inv => ({
              catalog: catalogById.get(inv.boost_id)!,
              quantity: inv.quantity,
            }))
            .filter(b => !!b.catalog)
          if (!cancelled) { setBoosts(owned); setError(null) }
          return
        }
        // 404 → API endpoint not deployed yet; fall through to direct read.
        if (res.status !== 404) throw new Error(`fetch failed (${res.status})`)
      } catch (e) {
        // Network or 5xx → use direct fallback.
        if (cancelled) return
        const msg = e instanceof Error ? e.message : 'fetch failed'
        // Don't surface transient errors before fallback runs; keep error
        // null so the picker just shows "no boosts".
        console.warn('[useOwnedBoosts] inventory API unreachable, falling back', msg)
      }

      // Fallback path — direct supabase reads (RLS allows authenticated
      // own-row reads on both tables).
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = supabase as any
        const [{ data: catalog }, { data: { user } }] = await Promise.all([
          s.from('character_boosts_catalog').select('*').eq('enabled', true),
          supabase.auth.getUser(),
        ])
        if (!user) {
          if (!cancelled) { setBoosts([]); setError(null) }
          return
        }
        const { data: inv } = await s.from('character_boost_inventory')
          .select('*')
          .eq('user_id', user.id)

        const catalogById = new Map(
          ((catalog ?? []) as BoostCatalogRow[]).map(b => [b.id, b]),
        )
        const owned: OwnedBoost[] = ((inv ?? []) as BoostInventoryRow[])
          .filter(b => b.quantity > 0)
          .map(b => ({ catalog: catalogById.get(b.boost_id)!, quantity: b.quantity }))
          .filter(b => !!b.catalog)
        if (!cancelled) { setBoosts(owned); setError(null) }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'fallback failed')
      }
    }

    load().finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tick])

  return { boosts, loading, error, refresh }
}
