'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const FOUNDING_LIMIT = 500

export default function FoundingCountdown() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    // Fetch subscriber count from a public endpoint
    fetch('/api/stripe/founding-count')
      .then(r => r.json())
      .then(d => setCount(d.count ?? null))
      .catch(() => {})
  }, [])

  const remaining = count !== null ? Math.max(0, FOUNDING_LIMIT - count) : null

  return (
    <Link href="/settings#elite"
      className="flex items-center gap-3 rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-all"
      style={{
        background: 'linear-gradient(135deg, rgba(255,184,0,0.12), rgba(255,140,0,0.06))',
        border: '2.5px solid rgba(255,184,0,0.5)',
        boxShadow: '0 4px 24px rgba(255,184,0,0.15)',
      }}>
      <span className="text-2xl">⭐</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black" style={{ color: '#ffb800' }}>
          Elite — £7.99/mo founding price
        </p>
        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {remaining !== null
            ? `Only ${remaining} founding spots remaining`
            : 'AI coaching · ACWR · adaptive plans'}
        </p>
      </div>
      {remaining !== null && remaining < 100 && (
        <div className="flex-shrink-0 rounded-xl px-2.5 py-1"
          style={{ background: '#ff3d6e', boxShadow: '0 0 12px rgba(255,61,110,0.5)' }}>
          <p className="text-[10px] font-black text-white">{remaining} left</p>
        </div>
      )}
    </Link>
  )
}
