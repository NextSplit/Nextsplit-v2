// Character system V4 — boost + cosmetic inventory client types + catalog
// metadata.
//
// The catalog itself is sourced from public.character_boosts_catalog +
// public.character_cosmetics_catalog (RLS-readable for authenticated). UI
// fetches these tables for the picker; this file declares the shapes +
// rarity ordering only.

export type BoostRarity    = 'common' | 'rare' | 'epic' | 'legendary'
export type CosmeticSlot   = 'kit_colour' | 'shoes' | 'accessory' | 'banner' | 'aura'
export type EffectStat     = 'speed' | 'endurance' | 'resilience' | 'class_fit'
export type DropKind       = 'boost' | 'cosmetic'

export interface BoostCatalogRow {
  id:           string
  name:         string
  description:  string
  emoji:        string
  effect_stat:  EffectStat
  effect_pct:   number
  rarity:       BoostRarity
  gbp_price:    number | null
  enabled:      boolean
}

export interface CosmeticCatalogRow {
  id:          string
  name:        string
  description: string
  emoji:       string
  slot:        CosmeticSlot
  asset:       Record<string, unknown>
  rarity:      BoostRarity
  gbp_price:   number | null
  enabled:     boolean
}

export interface BoostInventoryRow {
  user_id:     string
  boost_id:    string
  quantity:    number
  acquired_at: string
}

export interface CosmeticInventoryRow {
  user_id:     string
  cosmetic_id: string
  is_active:   boolean
  acquired_at: string
}

export interface RandomDrop {
  kind:    DropKind
  item_id: string
  rarity:  BoostRarity
}

// Rarity → display colour. Mirrors brand vars; magenta/cyan/amber/forest.
export const RARITY_COLOURS: Record<BoostRarity, string> = {
  common:    'var(--color-text-secondary)',
  rare:      'var(--ns-cyan)',
  epic:      'var(--ns-magenta)',
  legendary: 'var(--ns-amber)',
}

export const RARITY_LABELS: Record<BoostRarity, string> = {
  common:    'Common',
  rare:      'Rare',
  epic:      'Epic',
  legendary: 'Legendary',
}

// Drop probability table — mirrors the CASE inside roll_random_drop RPC.
// UI uses this for picker "drop chance" hints; the RPC is canonical at
// roll-time. If RPC weights change, mirror here.
export const DROP_PROBABILITIES: Record<BoostRarity, number> = {
  common:    0.015,
  rare:      0.004,
  epic:      0.001,
  legendary: 0.00025,
}

// Stat label (UI only). Speed/endurance/resilience map to the per-stat
// XP bars from PR #28 BuildClassCard. class_fit is a multiplicative
// modifier on the build-class-vs-format match — applied inside
// simulate_race when we wire boost_loadout consumption (PR #8).
export const EFFECT_STAT_META: Record<EffectStat, { emoji: string; label: string }> = {
  speed:      { emoji: '⚡', label: 'Speed'      },
  endurance:  { emoji: '🫁', label: 'Endurance'  },
  resilience: { emoji: '🛡', label: 'Resilience' },
  class_fit:  { emoji: '🌟', label: 'Class fit'  },
}

// Slot order for cosmetic UI grouping.
export const COSMETIC_SLOT_ORDER: CosmeticSlot[] = [
  'kit_colour', 'shoes', 'accessory', 'banner', 'aura',
]

export const COSMETIC_SLOT_LABEL: Record<CosmeticSlot, string> = {
  kit_colour: 'Kit',
  shoes:      'Shoes',
  accessory:  'Accessory',
  banner:     'Banner',
  aura:       'Aura',
}
