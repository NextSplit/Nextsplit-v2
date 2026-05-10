'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Analytics } from '@/lib/analytics'
import { nudgeTemplateId } from '@/lib/squad-nudges'

interface AppNotification {
  id:         string
  type:       string
  title:      string
  body:       string
  read:       boolean
  created_at: string
  data:       Record<string, string> | null
}

// P3.9 — squad_nudge notifications carry { nudge_id, message_key,
// template_variant, squad_id } in `data`. The dismiss/open path flips
// squad_nudges.opened_at / dismissed_at via /api/squad/nudge/track AND fires
// a matching PostHog event so recipient-side funnels line up with the
// leader-side `nudge_sent`. Non-nudge notifications just mark read.
async function trackNudge(nudgeId: string, action: 'opened' | 'dismissed') {
  await fetch('/api/squad/nudge/track', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ nudge_id: nudgeId, action }),
  }).catch(() => {})
}

interface NudgeMeta {
  nudge_id:         string
  message_key:      string
  template_variant: 'a' | 'b'
  squad_id:         string
}

function getNudgeMeta(n: AppNotification): NudgeMeta | null {
  if (n.type !== 'squad_nudge') return null
  const d = n.data ?? {}
  const nudge_id = d.nudge_id
  if (typeof nudge_id !== 'string' || nudge_id.length === 0) return null
  const variant = d.template_variant === 'b' ? 'b' : 'a'
  return {
    nudge_id,
    message_key:      typeof d.message_key === 'string' ? d.message_key : 'unknown',
    template_variant: variant,
    squad_id:         typeof d.squad_id    === 'string' ? d.squad_id    : '',
  }
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
    const n = notifications.find(x => x.id === id)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.filter(x => x.id !== id))

    const meta = n ? getNudgeMeta(n) : null
    if (meta) {
      await trackNudge(meta.nudge_id, 'dismissed')
      Analytics.nudgeDismissed({
        template_id:      nudgeTemplateId(meta.message_key, meta.template_variant),
        template_variant: meta.template_variant,
        is_leader_nudge:  true,
        squad_id:         meta.squad_id,
      })
    }
  }

  async function markOpened(id: string) {
    const n = notifications.find(x => x.id === id)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.filter(x => x.id !== id))

    const meta = n ? getNudgeMeta(n) : null
    if (meta) {
      await trackNudge(meta.nudge_id, 'opened')
      Analytics.nudgeOpened({
        template_id:      nudgeTemplateId(meta.message_key, meta.template_variant),
        template_variant: meta.template_variant,
        is_leader_nudge:  true,
        squad_id:         meta.squad_id,
      })
    }
  }

  const unread = notifications.filter(n => !n.read)
  return { notifications: unread, loading, markRead, markOpened, refresh: fetch }
}
