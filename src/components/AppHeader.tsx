'use client'

import type { ReactNode } from 'react'

// PR E4 — Unified app header. Replaces per-tab bespoke headers on /race
// /you /squad /settings /train so the chrome reads as one app instead of
// five. /home keeps its own (chip + Splity + XPHeaderBar trio) because
// it has structurally different content above the fold.
//
// API:
//   <AppHeader title="Race" subtitle="Today's race + season" rightSlot={<Link>…</Link>} />
//
// Sticky + max-width-lg + safe-area-aware. Right slot is optional; common
// use is a Settings cog or an "Edit" link. Subtitle is optional.

interface Props {
  title:     string
  subtitle?: string
  rightSlot?: ReactNode
  /** Optional content rendered below the title row, inside the same sticky
   *  container — use for tab strips (eg /squad, /train). */
  bottomSlot?: ReactNode
  /** When true, omits the sticky positioning + border (use for routes that
   *  scroll the header away — e.g. a profile sub-page). Defaults to sticky. */
  flat?:     boolean
}

export function AppHeader({ title, subtitle, rightSlot, bottomSlot, flat = false }: Props) {
  return (
    <div className={flat ? '' : 'sticky top-0 z-40 border-b'}
      style={{
        background: 'var(--color-surface)',
        borderColor: flat ? undefined : 'var(--color-border)',
      }}>
      <div className="max-w-lg mx-auto px-4 pt-12 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}>
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-black truncate" style={{ color: 'var(--color-text-primary)' }}>
              {title}
            </h1>
            {subtitle && (
              <p className="text-[10px] truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                {subtitle}
              </p>
            )}
          </div>
          {rightSlot && (
            <div className="flex-shrink-0 ml-3">
              {rightSlot}
            </div>
          )}
        </div>
        {bottomSlot && (
          <div className="mt-3">{bottomSlot}</div>
        )}
      </div>
    </div>
  )
}
