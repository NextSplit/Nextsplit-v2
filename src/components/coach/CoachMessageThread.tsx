'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id:         string
  sender_id:  string
  body:       string
  created_at: string
  read_at:    string | null
}

interface Props {
  coachId:   string
  athleteId: string
  coachName: string
  onClose:   () => void
  isCoach?:  boolean  // true when coach is viewing
}

export function CoachMessageThread({ coachId, athleteId, coachName, onClose, isCoach = false }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody]         = useState('')
  const [sending, setSending]   = useState(false)
  const [myId, setMyId]         = useState<string | null>(null)
  const bottomRef               = useRef<HTMLDivElement>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setMyId(user.id)
    })
  }, [])

  useEffect(() => {
    fetch(`/api/coach/message?coach_id=${coachId}&athlete_id=${athleteId}`)
      .then(r => r.json())
      .then(d => setMessages(d.messages ?? []))
      .catch(() => {})
  }, [coachId, athleteId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!body.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/coach/message', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ coach_id: coachId, athlete_id: athleteId, body }),
      })
      const d = await res.json()
      if (d.message) {
        setMessages(prev => [...prev, d.message])
        setBody('')
      }
    } finally {
      setSending(false)
    }
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl flex flex-col max-h-[85dvh]">

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-sm">🏃</div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900">{coachName}</p>
            <p className="text-xs text-slate-400">{isCoach ? 'Athlete' : 'Your coach'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 text-xl leading-none">×</button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
          {messages.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              No messages yet. Say hello! 👋
            </div>
          )}
          {messages.map((msg, i) => {
            const isMine  = msg.sender_id === myId
            const showDate = i === 0 || formatDate(messages[i-1].created_at) !== formatDate(msg.created_at)
            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="text-center text-[10px] text-slate-300 my-2">{formatDate(msg.created_at)}</div>
                )}
                <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                    isMine
                      ? 'bg-teal-500 text-white rounded-br-sm'
                      : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                  }`}>
                    <p className="leading-relaxed">{msg.body}</p>
                    <p className={`text-[10px] mt-1 ${isMine ? 'text-teal-100 text-right' : 'text-slate-400'}`}>
                      {formatTime(msg.created_at)}
                      {isMine && msg.read_at && ' · Read'}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-slate-100 flex gap-2 items-end">
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Message…"
            rows={1}
            className="flex-1 px-3 py-2.5 rounded-2xl border border-slate-200 text-sm outline-none focus:border-teal-400 resize-none max-h-32"
          />
          <button
            onClick={send}
            disabled={!body.trim() || sending}
            className="w-10 h-10 bg-teal-500 text-white rounded-full flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 rotate-90">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}
