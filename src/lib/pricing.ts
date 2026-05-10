// OQ#3 (founder vote 2026-05-10) — single source of truth for displayed
// monthly pricing across all upgrade surfaces. Mirrors the server-side
// founding-vs-standard split in src/lib/stripe.ts:PRICES so the UI label
// can never drift from the price the user actually gets charged.
//
// OQ#3 = A: hard step from £7.99 → £9.99 at founding spot 501. No soft
// progression, no premium step. The hard transition is the founder reward
// — and matches the existing standard_monthly Stripe price ID.

const FOUNDING_MONTHLY  = '£7.99'
const STANDARD_MONTHLY  = '£9.99'

const FOUNDING_LIMIT = 500

export interface PricingDisplay {
  monthly:        string         // "£7.99" or "£9.99"
  monthlyWithUnit: string        // "£7.99/mo"
  isFounding:     boolean
  foundingLeft:   number
  foundingFull:   boolean        // true once spot 501 hits
}

export function getPricing(foundingLeft: number | null | undefined): PricingDisplay {
  const left          = Math.max(0, foundingLeft ?? FOUNDING_LIMIT)
  const isFounding    = left > 0
  const monthly       = isFounding ? FOUNDING_MONTHLY : STANDARD_MONTHLY
  return {
    monthly,
    monthlyWithUnit: `${monthly}/mo`,
    isFounding,
    foundingLeft:    left,
    foundingFull:    !isFounding,
  }
}

// Convenience for compact UI surfaces that just need the formatted price.
export function getMonthlyPriceLabel(foundingLeft: number | null | undefined): string {
  return getPricing(foundingLeft).monthlyWithUnit
}
