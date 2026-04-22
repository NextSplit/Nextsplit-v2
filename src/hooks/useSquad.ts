'use client'

import { useState, useEffect, useCallback } from 'react'

export interface SquadMember {
  id:             string
  user_id:        string
  joined_at:      string
  last_active_at: string
  profiles: {
    display_name: string
    handle:       string | null
    runner_class: string | null
  }
}

export interface Squad {
  id:          string
  name:        string
  slug:        string
  colour:      string
  logo_url:    string | null
  welcome_msg: string | null
  is_public:   boolean
  goal_type:   'km' | 'sessions' | null
  goal_value:  number | null
  goal_month:  string | null
  created_at:  string
  leader_id:   string
  squad_members: SquadMember[]
  squad_invites?: { id: string; code: string; uses: number }[]
  // For member view — leader profile
  profiles?: { display_name: string; handle: string | null; runner_class: string | null }
}

export interface SquadState {
  squad:     Squad | null
  role:      'leader' | 'member' | null
  loading:   boolean
  error:     string | null
  refresh:   () => void
  monthlyKm: number
}

export function useSquad(): SquadState {
  const [squad, setSquad]       = useState<Squad | null>(null)
  const [role, setRole]         = useState<'leader' | 'member' | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [monthlyKm, setMonthlyKm] = useState(0)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await window.fetch('/api/squad')
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSquad(data.squad)
      setRole(data.role)

      // Fetch monthly km if we have a squad
      if (data.squad?.id) {
        const kmRes  = await window.fetch(`/api/squad/stats?squad_id=${data.squad.id}`)
        const kmData = await kmRes.json().catch(() => ({}))
        setMonthlyKm(kmData.monthly_km ?? 0)
      }
    } catch {
      setError('Failed to load squad')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { squad, role, loading, error, refresh: fetch, monthlyKm }
}
