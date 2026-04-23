'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  athleteId: string
  onSent: () => void
  onCancel: () => void
}

type RecordState = 'idle' | 'recording' | 'recorded' | 'sending' | 'sent' | 'error'

const MAX_SECS = 60

export default function VoiceRecorder({ athleteId, onSent, onCancel }: Props) {
  const [state, setState]           = useState<RecordState>('idle')
  const [secsRecorded, setSecsRecorded] = useState(0)
  const [secsLeft, setSecsLeft]     = useState(MAX_SECS)
  const [audioUrl, setAudioUrl]     = useState<string | null>(null)
  const [errorMsg, setErrorMsg]     = useState('')
  const [waveform, setWaveform]     = useState<number[]>(Array(30).fill(2))

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef        = useRef<Blob[]>([])
  const blobRef          = useRef<Blob | null>(null)
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const analyserRef      = useRef<AnalyserNode | null>(null)
  const waveRafRef       = useRef<number>(0)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      cancelAnimationFrame(waveRafRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function startRecording() {
    setErrorMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Waveform analyser
      const ctx      = new AudioContext()
      const source   = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64
      source.connect(analyser)
      analyserRef.current = analyser

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'

      const mr = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mr
      chunksRef.current = []

      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        blobRef.current = blob
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }

      mr.start(100)
      setState('recording')
      setSecsRecorded(0)
      setSecsLeft(MAX_SECS)

      // Countdown timer
      timerRef.current = setInterval(() => {
        setSecsRecorded(s => {
          const next = s + 1
          setSecsLeft(MAX_SECS - next)
          if (next >= MAX_SECS) stopRecording()
          return next
        })
      }, 1000)

      // Waveform animation
      const dataArr = new Uint8Array(analyser.frequencyBinCount)
      const drawWave = () => {
        analyser.getByteFrequencyData(dataArr)
        const bars = Array.from({ length: 30 }, (_, i) => {
          const v = dataArr[Math.floor(i * dataArr.length / 30)] ?? 0
          return Math.max(2, Math.round((v / 255) * 40))
        })
        setWaveform(bars)
        waveRafRef.current = requestAnimationFrame(drawWave)
      }
      drawWave()

    } catch {
      setErrorMsg('Microphone access denied. Please allow mic access and try again.')
      setState('error')
    }
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    cancelAnimationFrame(waveRafRef.current)
    mediaRecorderRef.current?.stop()
    setState('recorded')
  }

  function discard() {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    blobRef.current = null
    setSecsRecorded(0)
    setWaveform(Array(30).fill(2))
    setState('idle')
  }

  async function send() {
    if (!blobRef.current) return
    setState('sending')
    try {
      const form = new FormData()
      form.append('audio', blobRef.current, `voice-${Date.now()}.webm`)
      form.append('athlete_id', athleteId)
      form.append('duration_secs', String(secsRecorded))

      const res  = await fetch('/api/voice-messages', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Send failed')

      setState('sent')
      setTimeout(() => onSent(), 1200)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to send')
      setState('error')
    }
  }

  const progressPct = (secsRecorded / MAX_SECS) * 100

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🎙️</span>
          <span className="text-sm font-bold text-gray-900">Voice message</span>
          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">max 60s</span>
        </div>
        <button onClick={onCancel} className="text-gray-400 text-lg leading-none">×</button>
      </div>

      <div className="px-4 py-5">
        {/* Waveform display */}
        <div className="flex items-center justify-center gap-0.5 h-12 mb-4">
          {waveform.map((h, i) => (
            <div
              key={i}
              className="w-1.5 rounded-full transition-all duration-75"
              style={{
                height: `${h}px`,
                background: state === 'recording'
                  ? `hsl(${142 - (i / 30) * 20}, 60%, ${40 + (h / 40) * 20}%)`
                  : 'var(--ns-ember)',
                opacity: state === 'idle' ? 0.2 : 0.8,
              }}
            />
          ))}
        </div>

        {/* Progress bar */}
        {(state === 'recording' || state === 'recorded') && (
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${progressPct}%`,
                background: progressPct > 80 ? '#ef4444' : 'var(--ns-ember)',
              }}
            />
          </div>
        )}

        {/* Timer */}
        {state === 'recording' && (
          <p className="text-center text-sm font-mono text-gray-500 mb-4">
            <span className={secsLeft <= 10 ? 'text-red-500 font-bold' : ''}>
              {secsLeft}s remaining
            </span>
          </p>
        )}
        {state === 'recorded' && (
          <p className="text-center text-xs text-gray-400 mb-4">
            {secsRecorded}s recorded
          </p>
        )}

        {/* Audio preview */}
        {audioUrl && state === 'recorded' && (
          <audio
            src={audioUrl}
            controls
            className="w-full mb-4 rounded-xl"
            style={{ height: '36px' }}
          />
        )}

        {/* Error */}
        {errorMsg && (
          <p className="text-xs text-red-500 text-center mb-4">{errorMsg}</p>
        )}

        {/* Sent confirmation */}
        {state === 'sent' && (
          <div className="text-center py-2 mb-4">
            <span className="text-2xl">✓</span>
            <p className="text-sm font-bold text-gray-700 mt-1">Voice message sent!</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3">
          {state === 'idle' && (
            <button
              onClick={startRecording}
              className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 active:scale-95 transition-all"
              style={{ background: 'var(--ns-ember)' }}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
              Start recording
            </button>
          )}

          {state === 'recording' && (
            <button
              onClick={stopRecording}
              className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 active:scale-95 transition-all bg-red-500"
            >
              <span className="w-3 h-3 rounded-sm bg-white" />
              Stop
            </button>
          )}

          {state === 'recorded' && (
            <>
              <button
                onClick={discard}
                className="flex-1 py-3.5 rounded-2xl text-sm font-semibold text-gray-600 border border-gray-200 active:scale-95 transition-all"
              >
                Re-record
              </button>
              <button
                onClick={send}
                className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white active:scale-95 transition-all"
                style={{ background: 'var(--ns-ember)' }}
              >
                Send →
              </button>
            </>
          )}

          {state === 'sending' && (
            <div className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white text-center opacity-70"
              style={{ background: 'var(--ns-ember)' }}>
              Sending…
            </div>
          )}

          {state === 'error' && (
            <button
              onClick={() => setState('idle')}
              className="flex-1 py-3.5 rounded-2xl text-sm font-bold border border-gray-200 text-gray-600 active:scale-95"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
