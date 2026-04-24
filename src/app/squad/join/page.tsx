'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SquadJoinPage() {
  const router = useRouter()
  const [code, setCode] = useState('')

  function handleSubmit() {
    const cleaned = code.trim().toUpperCase()
    if (cleaned.length >= 4) router.push(`/squad/join/${cleaned}`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 pb-24"
      style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-4xl mb-4 text-center">👥</div>
        <h1 className="text-2xl font-black text-center mb-2" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
          Join a squad
        </h1>
        <p className="text-sm text-center mb-8" style={{ color: 'var(--color-text-tertiary)' }}>
          Enter the invite code from your Split Leader.
        </p>

        <input
          value={code}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSubmit()}
          placeholder="ENTER CODE"
          maxLength={10}
          className="w-full text-center text-2xl font-black py-4 rounded-2xl outline-none mb-4 tracking-widest"
          style={{
            background: 'var(--color-surface)',
            border: '2px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
          autoFocus
        />

        <button
          onClick={handleSubmit}
          disabled={code.trim().length < 4}
          className="w-full py-4 rounded-2xl font-black text-white text-sm disabled:opacity-40 transition-all active:scale-[0.98]"
          style={{ background: '#84cc16', color: '#0d1a05' }}>
          Join squad →
        </button>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
        </div>

        <Link href="/squad/create"
          className="block w-full py-3.5 rounded-2xl font-black text-sm text-center transition-all active:scale-[0.98]"
          style={{ background: 'rgba(132,204,22,0.10)', border: '1.5px solid rgba(132,204,22,0.3)', color: '#84cc16' }}>
          Start your own squad →
        </Link>

        <Link href="/explore"
          className="block text-center mt-4 text-sm"
          style={{ color: 'var(--color-text-tertiary)' }}>
          ← Back to Explore
        </Link>
      </div>
    </div>
  )
}
