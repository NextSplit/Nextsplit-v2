'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import type { Profile } from '@/types/database'
import { db } from '@/lib/supabase/db'

interface UseProfileReturn {
  profile: Profile | null
  loading: boolean
  error: string | null
  updateProfile: (updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>) => Promise<void>
  refresh: () => void
}

/** Sync profile theme/unit preferences to localStorage so ThemeWrapper can apply them */
function syncPrefsToStorage(profile: Profile) {
  try {
    localStorage.setItem('nextsplit_dark_mode', String(profile.dark_mode ?? false))
    localStorage.setItem('nextsplit_text_size', profile.text_size ?? 'default')
    localStorage.setItem('nextsplit_units', profile.units ?? 'km')
    window.dispatchEvent(new Event('nextsplit-theme-change'))
    window.dispatchEvent(new Event('nextsplit-units-change'))
  } catch {}
}

export function useProfile(): UseProfileReturn {
  const supabase = useSupabase()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function fetchProfile() {
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr || !user) {
        if (!cancelled) { setError('Not authenticated'); setLoading(false) }
        return
      }

      const { data, error: fetchErr } = await db(supabase)
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!cancelled) {
        if (fetchErr) {
          setError(fetchErr.message)
        } else {
          const p = data as Profile
          setProfile(p)
          syncPrefsToStorage(p)
        }
        setLoading(false)
      }
    }

    fetchProfile()
    return () => { cancelled = true }
  }, [supabase, tick])

  const updateProfile = useCallback(async (
    updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
  ) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error: updateErr } = await db(supabase)
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    if (updateErr) throw new Error(updateErr.message)
    refresh()
  }, [supabase, refresh])

  return { profile, loading, error, updateProfile, refresh }
}
