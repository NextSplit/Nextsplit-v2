'use client'

import Link from 'next/link'

interface Props {
  feature:  string
  children: React.ReactNode
}

/**
 * Wraps any content with a blurred "locked" overlay for non-Elite users.
 * Shows a preview of what they're missing with an unlock CTA.
 */
export default function ElitePreview({ feature, children }: Props) {
  return (
    <div className="relative rounded-3xl overflow-hidden">
      {/* Content — blurred */}
      <div className="pointer-events-none select-none" style={{ filter: 'blur(4px)', opacity: 0.4 }}>
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6"
        style={{ background: 'rgba(8,11,20,0.7)', backdropFilter: 'blur(2px)' }}>
        <div className="text-3xl mb-2">⭐</div>
        <p className="text-sm font-black text-white text-center mb-1" style={{ letterSpacing: '-0.01em' }}>
          {feature} — Elite only
        </p>
        <p className="text-[11px] text-center mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Unlock with Elite for £7.99/mo. 500 founding spots left.
        </p>
        <Link href="/settings#elite"
          className="px-6 py-3 rounded-2xl font-black text-sm"
          style={{ background: '#ffb800', color: '#0a0e1a', boxShadow: '0 4px 20px rgba(255,184,0,0.5)' }}>
          Unlock Elite →
        </Link>
      </div>
    </div>
  )
}
