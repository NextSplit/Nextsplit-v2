'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import type { Profile } from '@/types/database'

interface UseProfileReturn {
  profile: Profile | null
  loading: boolean
  error: string | null
  updateProfile: (updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>) => Promise<void>
  refresh: () => void
}

/**
 * Reads and mutates the current user's profile row.
 *
 * Usage:
 *   const { profile, loading, updateProfile } = useProfile()
 */
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

      const { data, error: fetchErr } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!cancelled) {
        if (fetchErr) setError(fetchErr.message)
        else setProfile(data as Profile)
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

    const { error: updateErr } = await (supabase as any)
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    if (updateErr) throw new Error(updateErr.message)
    refresh()
  }, [supabase, refresh])

  return { profile, loading, error, updateProfile, refresh }
}
