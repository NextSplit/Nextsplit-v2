'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Character, BuildClass } from '@/lib/character'

interface UseCharacterReturn {
  character:    Character | null
  loading:      boolean
  error:        string | null
  refresh:      () => void
  setBuildClass: (buildClass: BuildClass) => Promise<Character>
}

// Reads + writes the caller's character row via /api/character.
// Used by <BuildClassCard> on the You tab and (in subsequent PRs) by the
// /race surface + Home character preview.
export function useCharacter(): UseCharacterReturn {
  const [character, setCharacter] = useState<Character | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [tick, setTick]           = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/character', { cache: 'no-store' })
      .then(r => r.json())
      .then((res: { character: Character | null; error?: string }) => {
        if (cancelled) return
        if (res.error) setError(res.error)
        else { setCharacter(res.character); setError(null) }
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'fetch failed') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tick])

  const setBuildClass = useCallback(async (buildClass: BuildClass): Promise<Character> => {
    const res  = await fetch('/api/character', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ build_class: buildClass }),
    })
    const data = await res.json() as { character?: Character; error?: string }
    if (!res.ok || !data.character) {
      throw new Error(data.error ?? 'Failed to save character')
    }
    setCharacter(data.character)
    return data.character
  }, [])

  return { character, loading, error, refresh, setBuildClass }
}
