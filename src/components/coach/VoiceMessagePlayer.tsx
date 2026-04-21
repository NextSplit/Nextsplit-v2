'use client'

import { useState, useRef, useEffect } from 'react'

interface VoiceMessage {
  id: string
  coach_id: string
  athlete_id: string
  storage_path: string
  duration_secs: number | null
  listened_at: string | null
  created_at: string
  url: string | null
}

interface Props {
  message: VoiceMessage
  myId: string
  onListened?: (messageId: string) => void
}

export default function VoiceMessagePlayer({ message, myId, onListened }: Props) {
  const [playing, setPlaying]   = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(message.duration_secs ?? 0)
  const [currentTime, setCurrentTime] = useState(0)
  const [listened, setListened] = useState(!!message.listened_at)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const isFromMe = message.coach_id === myId
  const isNew    = !listened && !isFromMe

  useEffect(() => {
    return () => { audioRef.current?.pause() }
  }, [])

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  async function handlePlay() {
    if (!message.url) return

    if (!audioRef.current) {
      const audio = new Audio(message.url)
      audioRef.current = audio

      audio.onloadedmetadata = () => {
        if (audio.duration && isFinite(audio.duration)) {
          setDuration(audio.duration)
        }
      }
      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime)
        setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0)
      }
      audio.onended = () => {
        setPlaying(false)
        setProgress(100)

        // Mark as listened if athlete hearing it for first time
        if (!listened && !isFromMe) {
          setListened(true)
          fetch('/api/voice-messages', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message_id: message.id }),
          }).catch(() => {})
          onListened?.(message.id)
        }
      }
    }

    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      await audioRef.current.play()
      setPlaying(true)
    }
  }

  function handleScrub(e: React.MouseEvent<HTMLDivElement>) {
    if (!audioRef.current || !audioRef.current.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct  = (e.clientX - rect.left) / rect.width
    audioRef.current.currentTime = pct * audioRef.current.duration
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${
      isFromMe ? 'bg-[var(--ns-forest)] ml-8' : 'bg-gray-100 mr-8'
    }`}>
      {/* Play button */}
      <button
        onClick={handlePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform ${
          isFromMe ? 'bg-white/20 text-white' : 'bg-[var(--ns-forest)] text-white'
        }`}
      >
        {playing ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1"/>
            <rect x="14" y="4" width="4" height="16" rx="1"/>
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>

      {/* Waveform / scrub bar */}
      <div className="flex-1 space-y-1">
        {/* Progress bar — tappable */}
        <div
          className={`h-1.5 rounded-full cursor-pointer overflow-hidden ${
            isFromMe ? 'bg-white/20' : 'bg-gray-300'
          }`}
          onClick={handleScrub}
        >
          <div
            className={`h-full rounded-full transition-all ${
              isFromMe ? 'bg-white' : 'bg-[var(--ns-forest)]'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Time + unread dot */}
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-mono ${isFromMe ? 'text-white/70' : 'text-gray-400'}`}>
            {playing ? formatTime(currentTime) : formatTime(duration)}
          </span>
          <div className="flex items-center gap-1.5">
            {isNew && (
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            )}
            {listened && !isFromMe && (
              <span className={`text-[10px] ${isFromMe ? 'text-white/50' : 'text-gray-400'}`}>
                ✓ Heard
              </span>
            )}
            {isFromMe && message.listened_at && (
              <span className="text-[10px] text-white/50">✓ Heard</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
