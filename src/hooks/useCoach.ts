'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/supabase/db'
import type { CoachProfile, CoachAthlete } from '@/types/database'

interface UseCoachReturn {
  coachProfile:  CoachProfile | null
  athletes:      CoachAthlete[]
  isCoach:       boolean
  loading:       boolean
  refresh:       () => void
}

export function useCoach(): UseCoachReturn {
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null)
  const [athletes, setAthletes]         = useState<CoachAthlete[]>([])
  const [loading, setLoading]           = useState(true)
  const [tick, setTick]                 = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { if (!cancelled) setLoading(false); return }

        const [profileRes, athletesRes] = await Promise.all([
          db(supabase).from('coach_profiles').select('*').eq('user_id', user.id).maybeSingle(),
          db(supabase).from('coach_athletes').select('*').eq('coach_id', user.id).neq('status', 'ended'),
        ])

        if (!cancelled) {
          setCoachProfile(profileRes.data as CoachProfile | null)
          setAthletes((athletesRes.data ?? []) as CoachAthlete[])
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [tick])

  return {
    coachProfile,
    athletes,
    isCoach:  !!coachProfile,
    loading,
    refresh,
  }
}

interface UseMyCoachReturn {
  coach:     CoachProfile | null
  relationship: CoachAthlete | null
  hasCoach:  boolean
  loading:   boolean
}

export function useMyCoach(): UseMyCoachReturn {
  const [coach, setCoach]               = useState<CoachProfile | null>(null)
  const [relationship, setRelationship] = useState<CoachAthlete | null>(null)
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { if (!cancelled) setLoading(false); return }

        const { data: rel } = await db(supabase)
          .from('coach_athletes')
          .select('*')
          .eq('athlete_id', user.id)
          .eq('status', 'active')
          .maybeSingle()

        if (rel && !cancelled) {
          const { data: coachData } = await db(supabase)
            .from('coach_profiles')
            .select('*')
            .eq('user_id', rel.coach_id)
            .single()
          setCoach(coachData as CoachProfile | null)
          setRelationship(rel as CoachAthlete)
        }
        if (!cancelled) setLoading(false)
      } catch {
        if (!cancelled) setLoading(false)
      }
    }
    load()
  }, [])

  return { coach, relationship, hasCoach: !!coach, loading }
}
