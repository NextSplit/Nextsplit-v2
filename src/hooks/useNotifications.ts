'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AppNotification {
  id:         string
  type:       string
  title:      string
  body:       string
  read:       boolean
  created_at: string
  data:       Record<string, string> | null
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading]             = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('notifications')
        .select('id, type, title, body, read, created_at, data')
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(5)
      setNotifications(data ?? [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function markRead(id: string) {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const unread = notifications.filter(n => !n.read)
  return { notifications: unread, loading, markRead, refresh: fetch }
}
