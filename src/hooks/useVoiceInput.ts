'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// PR F3 — Voice-first input via the Web Speech API. Used by AIFuelCoach
// so the user can speak their question instead of typing on a phone
// keyboard mid-run. Chrome (Android/Desktop) + Safari (iOS 14.5+) +
// Edge are supported; Firefox is not — feature-detect and hide the
// affordance gracefully when unavailable.
//
// Contract:
//   const { supported, listening, transcript, start, stop, error } =
//     useVoiceInput({ onFinal: q => ask(q) })
//
// onFinal fires once when the recognizer finalises (silence threshold
// reached). transcript updates live while the user speaks.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any

interface UseVoiceInputOpts {
  /** Fires when speech ends and we have a final transcript. */
  onFinal?: (transcript: string) => void
  /** BCP 47 language tag. Defaults to 'en-GB' to match founder market. */
  lang?: string
}

export function useVoiceInput({ onFinal, lang = 'en-GB' }: UseVoiceInputOpts = {}) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const onFinalRef = useRef(onFinal)

  useEffect(() => { onFinalRef.current = onFinal }, [onFinal])

  useEffect(() => {
    if (typeof window === 'undefined') return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setSupported(false); return }
    setSupported(true)

    const r: SpeechRecognitionInstance = new SR()
    r.continuous     = false
    r.interimResults = true
    r.lang           = lang
    r.maxAlternatives = 1
    recognitionRef.current = r

    return () => {
      try { r.stop() } catch { /* ignore */ }
      recognitionRef.current = null
    }
  }, [lang])

  const start = useCallback(() => {
    const r = recognitionRef.current
    if (!r || listening) return
    setError(null)
    setTranscript('')

    r.onresult = (e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => {
      let text = ''
      let isFinal = false
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i]
        text += res[0].transcript
        if (res.isFinal) isFinal = true
      }
      setTranscript(text)
      if (isFinal && text.trim()) onFinalRef.current?.(text.trim())
    }
    r.onerror = (e: { error?: string }) => {
      const code = e.error ?? 'unknown'
      setError(code === 'no-speech' ? 'No speech detected — tap and try again.'
        : code === 'not-allowed' ? 'Microphone permission denied.'
        : code === 'audio-capture' ? 'No microphone available.'
        : `Voice input failed (${code}).`)
      setListening(false)
    }
    r.onend = () => setListening(false)

    try {
      r.start()
      setListening(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start recogniser')
    }
  }, [listening])

  const stop = useCallback(() => {
    const r = recognitionRef.current
    if (!r) return
    try { r.stop() } catch { /* ignore */ }
  }, [])

  return { supported, listening, transcript, error, start, stop }
}
