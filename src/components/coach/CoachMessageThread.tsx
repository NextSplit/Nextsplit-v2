'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import VoiceRecorder from './VoiceRecorder'
import VoiceMessagePlayer from './VoiceMessagePlayer'

interface TextMessage {
  kind: 'text'
  id: string
  sender_id: string
  body: string
  created_at: string
  read_at: string | null
}

interface VoiceMessage {
  kind: 'voice'
  id: string
  coach_id: string
  athlete_id: string
  storage_path: string
  duration_secs: number | null
  listened_at: string | null
  created_at: string
  url: string | null
}

type ThreadItem = TextMessage | VoiceMessage

interface Props {
  coachId:   string
  athleteId: string
  coachName: string
  onClose:   () => void
  isCoach?:  boolean
}

export function CoachMessageThread({ coachId, athleteId, coachName, onClose, isCoach = false }: Props) {
  const [items, setItems]         = useState<ThreadItem[]>([])
  const [body, setBody]           = useState('')
  const [sending, setSending]     = useState(false)
  const [myId, setMyId]           = useState<string | null>(null)
  const [showVoice, setShowVoice] = useState(false)
  const [loading, setLoading]     = useState(true)
  const bottomRef                 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setMyId(user.id)
    })
  }, [])

  async function loadThread() {
    setLoading(true)
    try {
      const [textRes, voiceRes] = await Promise.all([
        fetch(`/api/coach/message?coach_id=${coachId}&athlete_id=${athleteId}`).then(r => r.json()),
        fetch(`/api/voice-messages?athlete_id=${isCoach ? athleteId : coachId}`).then(r => r.json()),
      ])
      const textItems: TextMessage[] = (textRes.messages ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (m: any) => ({ kind: 'text' as const, ...m })
      )
      const voiceItems: VoiceMessage[] = (voiceRes.messages ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (m: any) => ({ kind: 'voice' as const, ...m })
      )
      const all: ThreadItem[] = [...textItems, ...voiceItems].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      setItems(all)
    } catch { /* non-fatal */ }
    finally { setLoading(false) }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadThread() }, [coachId, athleteId])

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [items])

  async function send() {
    if (!body.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/coach/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coach_id: coachId, athlete_id: athleteId, body }),
      })
      const d = await res.json()
      if (d.message) { setItems(prev => [...prev, { kind: 'text', ...d.message }]); setBody('') }
    } finally { setSending(false) }
  }

  function handleVoiceSent() { setShowVoice(false); loadThread() }

  function handleListened(messageId: string) {
    setItems(prev => prev.map(item =>
      item.kind === 'voice' && item.id === messageId
        ? { ...item, listened_at: new Date().toISOString() } : item
    ))
  }

  const fmt = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  const unreadVoice = items.filter(i =>
    i.kind === 'voice' && !i.listened_at && !isCoach &&
    (i as VoiceMessage).coach_id === coachId
  ).length

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl flex flex-col max-h-[88dvh] max-w-lg mx-auto">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background: 'var(--ns-violet-light)' }}>🏃</div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">{coachName}</p>
            <p className="text-xs text-gray-400">
              {isCoach ? 'Athlete' : 'Your coach'}
              {unreadVoice > 0 && <span className="ml-2 text-[10px] font-bold text-red-500">{unreadVoice} new voice message{unreadVoice > 1 ? 's' : ''}</span>}
            </p>
          </div>
          <button aria-label="Close" onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
          {loading && <div className="flex justify-center py-8"><div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-[var(--ns-violet)] animate-spin" /></div>}
          {!loading && items.length === 0 && (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">👋</p>
              <p className="text-gray-400 text-sm">No messages yet.</p>
              {isCoach && <p className="text-gray-400 text-xs mt-1">Tap the mic to leave a voice note</p>}
            </div>
          )}
          {items.map((item, i) => {
            const isMine = item.kind === 'text' ? item.sender_id === myId : item.coach_id === myId
            const prev = items[i - 1]
            const showDate = i === 0 || fmtDate(prev.created_at) !== fmtDate(item.created_at)
            return (
              <div key={item.id}>
                {showDate && <div className="text-center text-[10px] text-gray-300 my-2">{fmtDate(item.created_at)}</div>}
                {item.kind === 'text' ? (
                  <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${isMine ? 'text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}
                      style={isMine ? { background: 'var(--ns-ember)' } : {}}>
                      <p className="leading-relaxed">{item.body}</p>
                      <p className={`text-[10px] mt-1 ${isMine ? 'text-white/60 text-right' : 'text-gray-400'}`}>
                        {fmt(item.created_at)}{isMine && item.read_at && ' · Read'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <VoiceMessagePlayer message={item} myId={myId ?? ''} onListened={handleListened} />
                    <p className={`text-[10px] text-gray-300 ${isMine ? 'text-right pr-1' : 'pl-1'}`}>🎙️ {fmt(item.created_at)}</p>
                  </div>
                )}
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Voice recorder */}
        {showVoice && isCoach && (
          <div className="px-4 pb-2 flex-shrink-0">
            <VoiceRecorder athleteId={athleteId} onSent={handleVoiceSent} onCancel={() => setShowVoice(false)} />
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-100 flex gap-2 items-end flex-shrink-0">
          {isCoach && !showVoice && (
            <button onClick={() => setShowVoice(true)}
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0 active:scale-90 transition-all"
              title="Send voice message">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          )}
          <textarea value={body} onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Message…" rows={1}
            className="flex-1 px-3 py-2.5 rounded-2xl border border-gray-200 text-sm outline-none focus:border-[var(--ns-ember)] resize-none max-h-32 transition-colors" />
          <button onClick={send} disabled={!body.trim() || sending}
            className="w-10 h-10 text-white rounded-full flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all shrink-0"
            style={{ background: 'var(--ns-ember)' }}>
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 rotate-90"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z" /></svg>
          </button>
        </div>
      </div>
    </>
  )
}
