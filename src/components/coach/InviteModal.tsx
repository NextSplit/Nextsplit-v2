'use client'

import { useState } from 'react'

export function InviteModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading]     = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [copied, setCopied]       = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/coach/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const data = await res.json()
      if (data.inviteUrl) setInviteUrl(data.inviteUrl)
    } finally { setLoading(false) }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-6 space-y-4 max-w-lg mx-auto"
        style={{ paddingBottom: 'max(1.5rem, calc(1.5rem + env(safe-area-inset-bottom, 0px)))' }}>
        <div className="w-10 h-1 bg-[var(--color-surface-3)] rounded-full mx-auto" />
        <h2 className="text-base font-black text-gray-900">Invite an athlete</h2>
        <p className="text-sm text-[var(--color-text-tertiary)]">Each link is single-use and expires in 7 days. Generate a new one for each athlete.</p>
        {!inviteUrl ? (
          <button onClick={generate} disabled={loading}
            className="w-full text-white py-4 rounded-2xl text-sm font-bold disabled:opacity-50 active:scale-95"
            style={{ background: 'var(--ns-violet)' }}>
            {loading ? 'Generating…' : 'Generate invite link →'}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-xl p-3 text-xs text-[var(--color-text-secondary)] font-mono break-all border border-[var(--color-border-2)]">{inviteUrl}</div>
            <button onClick={copy} className="w-full py-4 rounded-2xl text-sm font-bold text-white transition-all"
              style={{ background: copied ? '#10b981' : 'var(--ns-violet)' }}>
              {copied ? '✓ Copied to clipboard!' : 'Copy invite link'}
            </button>
            <button onClick={generate} className="w-full py-2 text-xs text-[var(--color-text-tertiary)]">Generate another link</button>
          </div>
        )}
        <button onClick={onClose} className="w-full text-[var(--color-text-tertiary)] text-sm py-2">Close</button>
      </div>
    </>
  )
}
