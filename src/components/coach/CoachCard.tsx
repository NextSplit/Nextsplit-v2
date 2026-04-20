'use client'

import { useState, useEffect } from 'react'
import { useMyCoach } from '@/hooks/useCoach'
import { CoachMessageThread } from './CoachMessageThread'

interface Annotation {
  id:         string
  note:       string
  reaction:   'great' | 'good' | 'concern' | 'flag' | null
  created_at: string
  acknowledged_at: string | null
}

const REACTION_CONFIG = {
  great:   { emoji: '🌟', colour: 'text-amber-600 bg-amber-50 border-amber-200' },
  good:    { emoji: '👍', colour: 'text-teal-600 bg-teal-50 border-teal-200' },
  concern: { emoji: '⚠️', colour: 'text-orange-600 bg-orange-50 border-orange-200' },
  flag:    { emoji: '🚩', colour: 'text-red-600 bg-red-50 border-red-200' },
}

export function CoachCard() {
  const { coach, relationship, hasCoach, loading } = useMyCoach()
  const [annotations, setAnnotations]              = useState<Annotation[]>([])
  const [unreadMessages, setUnreadMessages]         = useState(0)
  const [showMessages, setShowMessages]             = useState(false)
  const [expanded, setExpanded]                     = useState(false)

  useEffect(() => {
    if (!hasCoach) return
    fetch('/api/coach/annotate')
      .then(r => r.json())
      .then(d => setAnnotations((d.annotations ?? []).slice(0, 3)))
      .catch(() => {})
  }, [hasCoach])

  useEffect(() => {
    if (!hasCoach || !relationship) return
    // Count unread messages from coach
    fetch(`/api/coach/message?coach_id=${relationship.coach_id}&athlete_id=${relationship.athlete_id}`)
      .then(r => r.json())
      .then(d => {
        const unread = (d.messages ?? []).filter(
          (m: { sender_id: string; read_at: string | null }) =>
            m.sender_id === relationship.coach_id && !m.read_at
        ).length
        setUnreadMessages(unread)
      })
      .catch(() => {})
  }, [hasCoach, relationship])

  if (loading || !hasCoach || !coach || !relationship) return null

  const latestAnnotation = annotations[0]
  const hasUnread = unreadMessages > 0 || (latestAnnotation && !latestAnnotation.acknowledged_at)

  return (
    <>
      <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
        hasUnread ? 'border-teal-400' : 'border-gray-100'
      }`}>
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-3 flex items-center gap-3 text-left"
        >
          <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-lg shrink-0">
            🏃
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-gray-900">{coach.display_name}</p>
              {coach.verified && <span className="text-[10px] text-teal-600">✅</span>}
            </div>
            <p className="text-xs text-gray-400">Your coach</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasUnread && (
              <span className="w-2 h-2 rounded-full bg-teal-500" />
            )}
            {unreadMessages > 0 && (
              <span className="text-[10px] font-bold text-white bg-teal-500 rounded-full px-1.5 py-0.5">
                {unreadMessages}
              </span>
            )}
            <span className="text-gray-300 text-sm">{expanded ? '▲' : '▼'}</span>
          </div>
        </button>

        {/* Latest annotation */}
        {latestAnnotation && (
          <div className={`mx-4 mb-3 px-3 py-2.5 rounded-xl border text-xs ${
            latestAnnotation.reaction
              ? REACTION_CONFIG[latestAnnotation.reaction].colour
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-start gap-2">
              {latestAnnotation.reaction && (
                <span>{REACTION_CONFIG[latestAnnotation.reaction].emoji}</span>
              )}
              <p className="flex-1 leading-relaxed">{latestAnnotation.note}</p>
            </div>
            <p className="text-gray-400 mt-1 text-[10px]">
              {new Date(latestAnnotation.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </p>
          </div>
        )}

        {/* Expanded actions */}
        {expanded && (
          <div className="px-4 pb-4 space-y-2 border-t border-gray-50 pt-3">
            <button
              onClick={() => setShowMessages(true)}
              className="w-full flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">💬</span>
                <span className="text-sm font-semibold text-slate-700">Message {coach.display_name}</span>
              </div>
              {unreadMessages > 0 && (
                <span className="text-xs font-bold text-white bg-teal-500 rounded-full px-2 py-0.5">
                  {unreadMessages} new
                </span>
              )}
            </button>

            {annotations.length > 1 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recent notes</p>
                {annotations.slice(1).map(a => (
                  <div key={a.id} className="text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2">
                    {a.reaction && <span className="mr-1">{REACTION_CONFIG[a.reaction]?.emoji}</span>}
                    {a.note}
                  </div>
                ))}
              </div>
            )}

            <a
              href="/settings#coach-access"
              className="block text-center text-xs text-slate-400 hover:text-slate-600 py-1"
            >
              Manage coach access →
            </a>
          </div>
        )}
      </div>

      {/* Message thread modal */}
      {showMessages && relationship && (
        <CoachMessageThread
          coachId={relationship.coach_id}
          athleteId={relationship.athlete_id}
          coachName={coach.display_name}
          onClose={() => { setShowMessages(false); setUnreadMessages(0) }}
        />
      )}
    </>
  )
}
