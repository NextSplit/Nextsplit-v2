import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import type {
  BoostCatalogRow, CosmeticCatalogRow,
  BoostInventoryRow, CosmeticInventoryRow,
} from '@/lib/character-inventory'

// GET /api/character/inventory
// Returns the caller's full inventory state plus catalog metadata for
// display. Single round-trip so the inventory page renders without a
// loading shimmer per row.

export const dynamic = 'force-dynamic'

interface InventoryResponse {
  boosts_catalog:    BoostCatalogRow[]
  cosmetics_catalog: CosmeticCatalogRow[]
  boost_inventory:   BoostInventoryRow[]
  cosmetic_inventory: CosmeticInventoryRow[]
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = db(supabase) as any

    const [
      { data: boostsCatalog },
      { data: cosmeticsCatalog },
      { data: boostInv },
      { data: cosmeticInv },
    ] = await Promise.all([
      s.from('character_boosts_catalog').select('*').eq('enabled', true).order('rarity'),
      s.from('character_cosmetics_catalog').select('*').eq('enabled', true).order('slot').order('rarity'),
      s.from('character_boost_inventory').select('*').eq('user_id', user.id),
      s.from('character_cosmetic_inventory').select('*').eq('user_id', user.id),
    ])

    return NextResponse.json<InventoryResponse>({
      boosts_catalog:     (boostsCatalog ?? []) as BoostCatalogRow[],
      cosmetics_catalog:  (cosmeticsCatalog ?? []) as CosmeticCatalogRow[],
      boost_inventory:    (boostInv ?? []) as BoostInventoryRow[],
      cosmetic_inventory: (cosmeticInv ?? []) as CosmeticInventoryRow[],
    })

  } catch (err) {
    Sentry.captureException(err, { extra: { context: '[api/character/inventory GET]' } })
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
  }
}
