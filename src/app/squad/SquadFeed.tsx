'use client'

// Squad-feed recipient view — completes the loop wired up in P1.1. Until
// this component existed, squad_feed rows had a writer (the SECURITY DEFINER
// RPC `insert_squad_feed_on_log`) but no reader UI; squad members couldn't
// actually see each other's logs. This is the surface that makes the
// "someone notices when you don't show up" thesis observable inside the app.
//
// Renders the most recent 20 rows for the current squad, joining each row's
// user_id to profiles for the display name + runner_class. Cards are
// chronological (newest first) with relative-time labels.
//
// PostHog: fires Analytics.squadFeedCardShown once per mounted card so the
// funnel sees who was actually exposed to a squad-mate's activity. The event
// uses the opaque user_id uuid (council privacy mandate; never display_name
// or email).
//
// Reactions: the squad_feed_reactions table already exists from
// phase-sl1-squads.sql; reaction wiring lands in a follow-up commit so this
// PR stays scoped to the read path.

import { useEffect, useState } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import { Analytics } from '@/lib/analytics'

interface FeedRow {
  id:               string
  squad_id:         string
  user_id:          string
  milestone_type:   string
  value_km:         number | null
  value_secs:       number | null
  value_streak:    number | null
  value_text:       string | null
  training_log_id:  string | null
  created_at:       string
  profiles:         {
    display_name:   string
    runner_class:   string | null
  } | null
}

interface Props {
  squadId:    string
  myUserId:   string
}

const MILESTONE_COPY: Record<string, (row: FeedRow) => string> = {
  session_logged:     r => r.value_km
    ? `logged a ${r.value_km}km session`
    : 'logged a session',
  plan_complete:      ()  => 'finished their plan',
  distance_pb:        r => r.value_km ? `hit a new PB — ${r.value_km}km` : 'hit a new distance PB',
  streak_milestone:   r => r.value_streak ? `is on a ${r.value_streak}-day streak` : 'hit a streak milestone',
  joined_squad:       ()  => 'joined the squad',
  first_run:          ()  => 'ran their first session',
  race_result:        ()  => 'finished a race',
  squad_goal_reached: ()  => 'helped hit the squad goal',
}

function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)   return `${days}d ago`
  const weeks = Math.floor(days / 7)
  return `${weeks}w ago`
}

export default function SquadFeed({ squadId, myUserId }: Props) {
  const supabase = useSupabase()
  const [rows, setRows]       = useState<FeedRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = supabase as any
      const { data } = await s
        .from('squad_feed')
        .select(`
          id, squad_id, user_id, milestone_type, value_km, value_secs,
          value_streak, value_text, training_log_id, created_at,
          profiles:user_id ( display_name, runner_class )
        `)
        .eq('squad_id', squadId)
        .order('created_at', { ascending: false })
        .limit(20)
      if (!cancelled) {
        setRows((data as FeedRow[] | null) ?? [])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [supabase, squadId])

  if (loading) {
    return (
      <div className="px-4 mt-6">
        <h2 className="text-sm font-black mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          Squad activity
        </h2>
        <div className="rounded-2xl px-4 py-8 text-center" style={{ background: 'var(--color-surface)' }}>
          <div className="w-6 h-6 mx-auto rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--ns-cyan)', borderTopColor: 'transparent' }} />
        </div>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="px-4 mt-6">
        <h2 className="text-sm font-black mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          Squad activity
        </h2>
        <div className="rounded-2xl px-4 py-6 text-center"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            No activity yet — log a session to start the feed.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 mt-6">
      <h2 className="text-sm font-black mb-3" style={{ color: 'var(--color-text-secondary)' }}>
        Squad activity
      </h2>
      <ul className="flex flex-col gap-2">
        {rows.map(row => (
          <FeedCard
            key={row.id}
            row={row}
            isMine={row.user_id === myUserId}
          />
        ))}
      </ul>
    </div>
  )
}

function FeedCard({ row, isMine }: { row: FeedRow; isMine: boolean }) {
  // Fire squad_feed_card_shown once per mount — opaque uuid only, never
  // display_name (council privacy mandate; GDPR Art. 5(1)(d)).
  useEffect(() => {
    Analytics.squadFeedCardShown({
      recipient_user_id: row.user_id,
      squad_id:          row.squad_id,
      feed_card_id:      row.id,
      milestone_type:    row.milestone_type,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const copyFn = MILESTONE_COPY[row.milestone_type]
  const copy   = copyFn ? copyFn(row) : 'logged something'
  const name   = row.profiles?.display_name ?? 'A squad-mate'

  return (
    <li
      className="rounded-2xl px-4 py-3 flex items-center gap-3"
      style={{
        background: isMine ? 'rgba(0,212,255,0.06)' : 'var(--color-surface)',
        border: `1px solid ${isMine ? 'rgba(0,212,255,0.2)' : 'var(--color-border)'}`,
      }}>
      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--color-surface-2)' }}>
        <span className="text-sm font-black" style={{ color: 'var(--ns-cyan)' }}>
          {name.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
          <span className="font-bold">{isMine ? 'You' : name}</span>
          {' '}
          <span style={{ color: 'var(--color-text-secondary)' }}>{copy}</span>
        </p>
      </div>
      <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>
        {relativeTime(row.created_at)}
      </span>
    </li>
  )
}
