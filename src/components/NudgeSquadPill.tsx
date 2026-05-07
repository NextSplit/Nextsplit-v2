'use client'

// P1.1 amendment (ux-designer R1, 2026-05-07): the leader-nudge prompt was
// originally proposed on the celebration screen. /council moved it off — the
// celebration is for the runner's own moment of completion, not for outbound
// social action. This pill appears on the Home tab for 30 minutes after a
// successful log, gives the runner a low-pressure outbound surface, and
// disappears so the Home tab returns to its calm default.
//
// Tap → /squad. The squad page handles the "no squad yet" fallback (join CTA),
// so this component doesn't need to query squad membership itself.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  mostRecentLogAt: string | null
}

const VISIBLE_WINDOW_MS = 30 * 60 * 1000

export default function NudgeSquadPill({ mostRecentLogAt }: Props) {
  const router = useRouter()
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  if (!mostRecentLogAt) return null
  const elapsed = now - new Date(mostRecentLogAt).getTime()
  if (elapsed < 0 || elapsed > VISIBLE_WINDOW_MS) return null

  return (
    <button
      type="button"
      onClick={() => router.push('/squad')}
      aria-label="Nudge your squad — they're waiting"
      className="fixed right-4 z-30 px-5 py-3 rounded-full font-black text-sm"
      style={{
        bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        background: 'linear-gradient(135deg,#ff3d6e,#c41a4a)',
        color: 'white',
        boxShadow: '0 8px 24px rgba(255,61,110,0.45)',
      }}>
      🚀 Nudge squad
    </button>
  )
}
