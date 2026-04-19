/**
 * Units utility — km/miles conversion and pace formatting.
 * Preference is stored in localStorage under 'nextsplit_units'.
 * All display-layer code should use these helpers rather than raw numbers.
 */

export type UnitSystem = 'km' | 'miles'

// ─── Preference ───────────────────────────────────────────────────────────────

export function getUnits(): UnitSystem {
  if (typeof window === 'undefined') return 'km'
  try {
    const stored = localStorage.getItem('nextsplit_units')
    return stored === 'miles' ? 'miles' : 'km'
  } catch {
    return 'km'
  }
}

export function setUnits(u: UnitSystem) {
  try {
    localStorage.setItem('nextsplit_units', u)
    window.dispatchEvent(new Event('nextsplit-units-change'))
  } catch {}
}

// ─── Distance conversion ──────────────────────────────────────────────────────

/** Convert km to the display unit */
export function kmToDisplay(km: number, units: UnitSystem): number {
  return units === 'miles' ? km * 0.621371 : km
}

/** Format a distance with unit label */
export function fmtDistance(km: number, units: UnitSystem): string {
  if (km <= 0) return ''
  const val = kmToDisplay(km, units)
  const label = units === 'miles' ? 'mi' : 'km'
  return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}${label}`
}

// ─── Pace conversion ──────────────────────────────────────────────────────────

/**
 * Convert a pace string "m:ss" (per km) to display units.
 * Returns "m:ss/km" or "m:ss/mi".
 */
export function fmtPace(pacePerKm: string, units: UnitSystem): string {
  if (!pacePerKm) return ''
  const parts = pacePerKm.split(':')
  if (parts.length !== 2) return pacePerKm

  const mins = parseInt(parts[0])
  const secs = parseInt(parts[1])
  if (isNaN(mins) || isNaN(secs)) return pacePerKm

  if (units === 'km') return `${mins}:${String(secs).padStart(2, '0')}/km`

  // Convert from /km to /mi: multiply pace by 1.60934
  const totalSecs = (mins * 60 + secs) * 1.60934
  const m = Math.floor(totalSecs / 60)
  const s = Math.round(totalSecs % 60)
  return `${m}:${String(s).padStart(2, '0')}/mi`
}

/**
 * Convert a raw pace in seconds/km to a formatted string.
 */
export function secsPerKmToDisplay(secsPerKm: number, units: UnitSystem): string {
  const secsDisplay = units === 'miles' ? secsPerKm * 1.60934 : secsPerKm
  const m = Math.floor(secsDisplay / 60)
  const s = Math.round(secsDisplay % 60)
  const label = units === 'miles' ? '/mi' : '/km'
  return `${m}:${String(s).padStart(2, '0')}${label}`
}

/**
 * Parse a pace input string "m:ss" (per km or per mi depending on units)
 * and return seconds per km.
 */
export function parsePaceInput(input: string, units: UnitSystem): number | null {
  const parts = input.trim().split(':')
  if (parts.length !== 2) return null
  const mins = parseInt(parts[0])
  const secs = parseInt(parts[1])
  if (isNaN(mins) || isNaN(secs)) return null
  const secsPerUnit = mins * 60 + secs
  return units === 'miles' ? secsPerUnit / 1.60934 : secsPerUnit
}

// ─── React hook ───────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'

export function useUnits(): UnitSystem {
  const [units, setUnitsState] = useState<UnitSystem>(() => getUnits())

  useEffect(() => {
    function onchange() { setUnitsState(getUnits()) }
    window.addEventListener('nextsplit-units-change', onchange)
    return () => window.removeEventListener('nextsplit-units-change', onchange)
  }, [])

  return units
}
