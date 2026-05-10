'use client'

import { useState } from 'react'

interface Props {
  onClose:      () => void
  athleteCount: number
  /** P3.5 — when present, broadcast targets only this subset (filtered
   * view) rather than all active athletes. Empty / undefined = all. */
  athleteIds?:  string[]
  /** Display label for the filter context, e.g. "amber" or "silent". */
  filterLabel?: string
}

const TEMPLATES = [
  'Great training week everyone — keep it up 💪',
  'Remember: easy runs should feel genuinely easy. If you can\'t hold a conversation, slow down.',
  'Race season is coming — make sure you\'re logging your wellness each morning.',
  'Big week ahead. Prioritise sleep and stay hydrated.',
  'Check in with me if you\'re feeling any niggles — catch them early.',
]

export function BroadcastModal({ onClose, athleteCount, athleteIds, filterLabel }: Props) {
  const [body, setBody]       = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)

  const send = async () => {
    if (!body.trim()) return
    setSending(true)
    try {
      await fetch('/api/coach/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body,
          ...(athleteIds?.length ? { athlete_ids: athleteIds } : {}),
        }),
      })
      setSent(true)
      setTimeout(() => { setSent(false); onClose() }, 2000)
    } finally { setSending(false) }
  }

  const targetLabel = filterLabel
    ? `${athleteCount} ${filterLabel} athlete${athleteCount !== 1 ? 's' : ''}`
    : `${athleteCount} active athlete${athleteCount !== 1 ? 's' : ''}`

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-6 space-y-4 max-w-lg mx-auto"
        style={{ paddingBottom: 'max(1.5rem, calc(1.5rem + env(safe-area-inset-bottom, 0px)))' }}>
        <div className="w-10 h-1 bg-[var(--color-surface-3)] rounded-full mx-auto" />
        <div>
          <h2 className="text-base font-black text-gray-900">
            {filterLabel ? `Message ${filterLabel} athletes` : 'Message all athletes'}
          </h2>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">Sends to {targetLabel}</p>
        </div>

        {sent ? (
          <div className="py-6 text-center">
            <p className="text-2xl mb-2">✓</p>
            <p className="text-sm font-bold text-emerald-700">Sent to {targetLabel}</p>
          </div>
        ) : (
          <>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write your squad message…"
              rows={3}
              className="w-full text-sm border border-[var(--color-border-2)] rounded-xl px-3 py-2.5 outline-none resize-none"
              style={{ outlineColor: 'var(--ns-violet)' }}
            />
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider">Quick templates</p>
              {TEMPLATES.map(t => (
                <button key={t} onClick={() => setBody(t)}
                  className="w-full text-left text-xs px-3 py-2 rounded-xl bg-gray-50 border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-2)]">
                  {t}
                </button>
              ))}
            </div>
            <button onClick={send} disabled={sending || !body.trim()}
              className="w-full py-3 rounded-2xl text-white text-sm font-bold disabled:opacity-40"
              style={{ background: 'var(--ns-violet)' }}>
              {sending ? 'Sending…' : `Send to ${targetLabel}`}
            </button>
          </>
        )}
        <button onClick={onClose} className="w-full text-[var(--color-text-tertiary)] text-sm py-2">Close</button>
      </div>
    </>
  )
}
