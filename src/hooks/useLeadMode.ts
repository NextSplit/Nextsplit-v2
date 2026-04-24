'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UseLeadModeReturn {
  isLeadMode:    boolean
  isSplitLeader: boolean
  isProfessional: boolean
  athleteCount:  number
  canToggle:     boolean   // has coach_tier set
  toggleLeadMode: () => void
  exitLeadMode:  () => void
}

const STORAGE_KEY = 'nextsplit_lead_mode'

export function useLeadMode(): UseLeadModeReturn {
  const [isLeadMode, setIsLeadMode]     = useState(false)
  const [coachTier, setCoachTier]       = useState<string | null>(null)
  const [athleteCount, setAthleteCount] = useState(0)

  useEffect(() => {
    // Load lead mode preference from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored === 'true') setIsLeadMode(true)
    } catch { /* ignore */ }

    // Fetch coach tier and athlete count from profile
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;db(supabase)
        .from('profiles')
        .select('coach_tier, is_coach')
        .eq('id', user.id)
        .single()
        .then(({ data }: { data: { coach_tier: string | null; is_coach: boolean } | null }) => {
          if (data?.coach_tier) setCoachTier(data.coach_tier)
        })

      // Count connected athletes
      supabase
        .from('coach_athletes')
        .select('id', { count: 'exact' })
        .eq('coach_id', user.id)
        .eq('status', 'active')
        .then(({ count }) => setAthleteCount(count ?? 0))
    }).catch(() => {})
  }, [])

  const toggleLeadMode = useCallback(() => {
    setIsLeadMode(prev => {
      const next = !prev
      try { localStorage.setItem(STORAGE_KEY, String(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  const exitLeadMode = useCallback(() => {
    setIsLeadMode(false)
    try { localStorage.setItem(STORAGE_KEY, 'false') } catch { /* ignore */ }
  }, [])

  const canToggle    = !!coachTier
  const isSplitLeader  = coachTier === 'split_leader'
  const isProfessional = coachTier === 'professional'

  return {
    isLeadMode: isLeadMode && canToggle,
    isSplitLeader,
    isProfessional,
    athleteCount,
    canToggle,
    toggleLeadMode,
    exitLeadMode,
  }
}
