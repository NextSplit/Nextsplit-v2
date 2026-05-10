'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useMyCoach } from '@/hooks/useCoach'

// Train tab banner surfacing the athlete's coach + last-message preview.
// Renders nothing when the athlete has no coach (silent fallthrough).
// Tap-through to /coach/messages opens the dedicated comms surface.
//
// Last-message preview uses the existing GET /api/coach/message endpoint
// that powers CoachMessageThread. Single fetch on mount; not realtime
// (Train tab gets remounted often enough that a polling interval would
// be wasted bandwidth).

interface LatestMessage {
  body:        string | null
  sender_id:   string
  created_at:  string
}

export function MyCoachBanner() {
  const { coach, relationship, hasCoach, loading } = useMyCoach()
  const [latest, setLatest] = useState<LatestMessage | null>(null)
  const [unreadFromCoach, setUnreadFromCoach] = useState(0)

  useEffect(() => {
    if (!coach || !relationship) return
    let cancelled = false

    fetch(`/api/coach/message?coach_id=${relationship.coach_id}&athlete_id=${relationship.athlete_id}`)
      .then(r => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled || !data) return
        const messages = (data.messages ?? []) as Array<{
          body:       string | null
          sender_id:  string
          created_at: string
          read_at?:   string | null
        }>
        if (messages.length === 0) return
        // Most-recent message — assumed sorted ASC; take last.
        const last = messages[messages.length - 1]
        setLatest({
          body:       last.body ?? null,
          sender_id:  last.sender_id,
          created_at: last.created_at,
        })
        setUnreadFromCoach(
          messages.filter(m => m.sender_id === relationship.coach_id && !m.read_at).length,
        )
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [coach, relationship])

  if (loading || !hasCoach || !coach) return null

  const isCoachLast = latest && relationship && latest.sender_id === relationship.coach_id
  const preview = latest?.body
    ? latest.body.length > 80 ? latest.body.slice(0, 77) + '…' : latest.body
    : 'Tap to send a message'

  return (
    <Link
      href="/coach/messages"
      className="block mx-4 rounded-2xl px-3 py-3 transition-all active:scale-[0.98]"
      style={{
        background: isCoachLast && unreadFromCoach > 0
          ? 'linear-gradient(135deg, var(--ns-violet-light, rgba(168,85,247,0.15)), var(--color-surface))'
          : 'var(--color-surface)',
        border: `1px solid ${unreadFromCoach > 0 ? 'rgba(168,85,247,0.5)' : 'var(--color-border)'}`,
      }}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        {coach.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coach.photo_url}
            alt=""
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-black"
            style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}
          >
            {(coach.display_name ?? 'C').slice(0, 1).toUpperCase()}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#a855f7' }}>
              Your coach
            </p>
            {unreadFromCoach > 0 && (
              <span
                className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background: '#a855f7', color: 'white' }}
              >
                {unreadFromCoach} new
              </span>
            )}
          </div>
          <p className="text-sm font-black mt-0.5 truncate" style={{ color: 'var(--color-text-primary)' }}>
            {coach.display_name ?? 'Coach'}
          </p>
          <p
            className="text-xs mt-0.5 truncate"
            style={{ color: isCoachLast ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)' }}
          >
            {isCoachLast ? `“${preview}”` : preview}
          </p>
        </div>

        <span className="text-xl flex-shrink-0" aria-hidden style={{ color: 'var(--color-text-tertiary)' }}>→</span>
      </div>
    </Link>
  )
}
