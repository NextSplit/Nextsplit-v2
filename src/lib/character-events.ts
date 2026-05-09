// Custom-event bridge for the character system. Used to surface session-XP
// deltas + random loot drops in global toasts (CharacterStatToast +
// CharacterLootToast) without coupling the toast components to every call
// site that logs a session.
//
// Why CustomEvent and not a context provider? Two call sites (TrainClient,
// useSessionLogging) both POST /api/community/progress and would each need
// to thread "setStatToast" down — a context provider would solve it but
// the ergonomic cost matches the (1-line) emit/listen we get from native
// events. Server actions / future call sites can also dispatch without
// changing import surface.

import type { BoostRarity, DropKind } from './character-inventory'

export interface CharacterXPDeltas {
  xp_awarded:         number
  speed_delta:        number
  endurance_delta:    number
  resilience_delta:   number
  build_class:        string | null
  multiplier_applied: number
  new_level:          number
  new_xp:             number
}

export interface CharacterLootDrop {
  kind:    DropKind
  item_id: string
  rarity:  BoostRarity
}

const XP_EVENT_NAME   = 'nextsplit:character-xp'
const LOOT_EVENT_NAME = 'nextsplit:character-loot'

export function dispatchCharacterXP(deltas: CharacterXPDeltas): void {
  if (typeof window === 'undefined') return
  // Skip the toast if the user has no character yet (build_class null) or
  // every delta is zero (e.g. a 'rest' session for Track Star). The base
  // XP toast still fires elsewhere; this one is character-system specific.
  const anyDelta =
    deltas.speed_delta > 0 ||
    deltas.endurance_delta > 0 ||
    deltas.resilience_delta > 0
  if (!deltas.build_class || !anyDelta) return
  window.dispatchEvent(new CustomEvent<CharacterXPDeltas>(XP_EVENT_NAME, { detail: deltas }))
}

export function onCharacterXP(handler: (deltas: CharacterXPDeltas) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const wrapped = (e: Event) => handler((e as CustomEvent<CharacterXPDeltas>).detail)
  window.addEventListener(XP_EVENT_NAME, wrapped)
  return () => window.removeEventListener(XP_EVENT_NAME, wrapped)
}

export function dispatchCharacterLoot(drop: CharacterLootDrop): void {
  if (typeof window === 'undefined') return
  if (!drop?.item_id) return
  window.dispatchEvent(new CustomEvent<CharacterLootDrop>(LOOT_EVENT_NAME, { detail: drop }))
}

export function onCharacterLoot(handler: (drop: CharacterLootDrop) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const wrapped = (e: Event) => handler((e as CustomEvent<CharacterLootDrop>).detail)
  window.addEventListener(LOOT_EVENT_NAME, wrapped)
  return () => window.removeEventListener(LOOT_EVENT_NAME, wrapped)
}

