'use client'

// Squad-feed recipient view — completes the loop wired up in P1.1. Renders
// the most recent 20 squad_feed rows for the current squad, joined to
// profiles for display_name and to squad_feed_reactions for the reaction
// counts. Cards are chronological (newest first), tinted cyan for own rows.
//
// Reactions: 5 emoji from the squad_feed_reactions CHECK constraint
// (🔥 👏 💪 🎉 ❤️). UNIQUE (feed_item_id, user_id) at the DB layer means
// each user can have at most one reaction per card; tapping a different
// emoji upserts, tapping the same emoji removes. Optimistic UI updates
// before the round-trip; reverts on failure.
//
// PostHog: Analytics.squadFeedCardShown fires once per mounted card with
// the opaque recipient user_id (council privacy mandate; never display_name
// or email; GDPR Art 5(1)(d)).

import { useEffect, useState } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import { Analytics } from '@/lib/analytics'
import { notifyReactionAction } from './actions'

type Emoji = '🔥' | '👏' | '💪' | '🎉' | '❤️'
const REACTIONS: Emoji[] = ['🔥', '👏', '💪', '🎉', '❤️']

interface ReactionRow {
  user_id:  string
  reaction: Emoji
}

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
  squad_feed_reactions: ReactionRow[]
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

const PAGE_SIZE = 20

export default function SquadFeed({ squadId, myUserId }: Props) {
  const supabase = useSupabase()
  const [rows, setRows]                 = useState<FeedRow[]>([])
  const [loading, setLoading]           = useState(true)
  const [loadingMore, setLoadingMore]   = useState(false)
  const [reachedEnd, setReachedEnd]     = useState(false)

  // Pagination — fetch the next 20 rows older than the current oldest.
  // Hides the button if the page returned fewer than PAGE_SIZE (no more
  // history to paginate).
  async function loadMore() {
    if (loadingMore || reachedEnd || rows.length === 0) return
    setLoadingMore(true)
    const oldestSeen = rows[rows.length - 1].created_at
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any
    const { data } = await s
      .from('squad_feed')
      .select(`
        id, squad_id, user_id, milestone_type, value_km, value_secs,
        value_streak, value_text, training_log_id, created_at,
        profiles:user_id ( display_name, runner_class ),
        squad_feed_reactions ( user_id, reaction )
      `)
      .eq('squad_id', squadId)
      .lt('created_at', oldestSeen)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)
    const next = (data as FeedRow[] | null) ?? []
    setRows(prev => [...prev, ...next])
    if (next.length < PAGE_SIZE) setReachedEnd(true)
    setLoadingMore(false)
  }

  // Optimistic-update toggle: tap same emoji again → DELETE; tap a different
  // emoji → upsert (DB UNIQUE on (feed_item_id, user_id) handles the swap).
  // On failure we revert to the previous client state.
  async function toggleReaction(feedId: string, emoji: Emoji) {
    const previous = rows
    const current  = rows.find(r => r.id === feedId)
    const myExisting = current?.squad_feed_reactions.find(r => r.user_id === myUserId)
    const removing  = myExisting?.reaction === emoji

    // Optimistic: drop my old reaction (if any), add new one (unless removing).
    setRows(rs => rs.map(row => {
      if (row.id !== feedId) return row
      const others = row.squad_feed_reactions.filter(r => r.user_id !== myUserId)
      return {
        ...row,
        squad_feed_reactions: removing ? others : [...others, { user_id: myUserId, reaction: emoji }],
      }
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any
    const op = removing
      ? s.from('squad_feed_reactions').delete()
          .eq('feed_item_id', feedId).eq('user_id', myUserId)
      : s.from('squad_feed_reactions').upsert(
          { feed_item_id: feedId, user_id: myUserId, reaction: emoji },
          { onConflict: 'feed_item_id,user_id' },
        )
    const { error } = await op
    if (error) {
      // Revert on failure — squad_feed_reactions RLS rejects, network blip, etc.
      setRows(previous)
      return
    }

    // Notify the feed-card owner via push (and mirror into notifications
    // table). Only fire on add/swap, not on remove — un-reacting shouldn't
    // ping anyone. notifyReactionAction handles owner = reactor (no self-
    // notify) and missing push_subscriptions internally.
    if (!removing) {
      void notifyReactionAction(feedId, emoji).catch(() => { /* non-blocking */ })
    }
  }

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
          profiles:user_id ( display_name, runner_class ),
          squad_feed_reactions ( user_id, reaction )
        `)
        .eq('squad_id', squadId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)
      if (!cancelled) {
        const initial = (data as FeedRow[] | null) ?? []
        setRows(initial)
        if (initial.length < PAGE_SIZE) setReachedEnd(true)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [supabase, squadId])

  // Realtime — listen for new squad_feed rows and prepend them. The Postgres
  // INSERT payload doesn't include the joined profiles + reactions, so on
  // each detection we fetch the full row by id with the joins. Cheap (single-
  // row PK lookup) and keeps the rendered shape consistent with initial-load
  // rows. Cleanup unsubscribes the channel on unmount or squadId change.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any
    const channel = s.channel(`squad-feed-${squadId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'squad_feed',
        filter: `squad_id=eq.${squadId}`,
      }, async (payload: { new: { id: string } }) => {
        const { data } = await s
          .from('squad_feed')
          .select(`
            id, squad_id, user_id, milestone_type, value_km, value_secs,
            value_streak, value_text, training_log_id, created_at,
            profiles:user_id ( display_name, runner_class ),
            squad_feed_reactions ( user_id, reaction )
          `)
          .eq('id', payload.new.id)
          .single()
        if (data) {
          setRows(prev => {
            // De-dupe in case the initial fetch already grabbed it.
            if (prev.some(r => r.id === data.id)) return prev
            return [data as FeedRow, ...prev]
          })
        }
      })
      .subscribe()
    return () => { s.removeChannel(channel) }
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
            myUserId={myUserId}
            onToggleReaction={toggleReaction}
          />
        ))}
      </ul>
      {!reachedEnd && rows.length >= PAGE_SIZE && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full mt-3 py-3 rounded-2xl text-xs font-bold disabled:opacity-50 transition-opacity"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}>
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  )
}

interface FeedCardProps {
  row:               FeedRow
  isMine:            boolean
  myUserId:          string
  onToggleReaction:  (feedId: string, emoji: Emoji) => void
}

function FeedCard({ row, isMine, myUserId, onToggleReaction }: FeedCardProps) {
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

  // Reaction counts + my current pick for this card
  const counts: Record<Emoji, number> = { '🔥': 0, '👏': 0, '💪': 0, '🎉': 0, '❤️': 0 }
  let myPick: Emoji | null = null
  for (const r of row.squad_feed_reactions) {
    if (REACTIONS.includes(r.reaction)) counts[r.reaction]++
    if (r.user_id === myUserId) myPick = r.reaction
  }

  return (
    <li
      className="rounded-2xl px-4 py-3"
      style={{
        background: isMine ? 'rgba(0,212,255,0.06)' : 'var(--color-surface)',
        border: `1px solid ${isMine ? 'rgba(0,212,255,0.2)' : 'var(--color-border)'}`,
      }}>
      <div className="flex items-center gap-3">
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
      </div>
      <div className="mt-2 flex items-center gap-1">
        {REACTIONS.map(emoji => {
          const picked = myPick === emoji
          const count  = counts[emoji]
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => onToggleReaction(row.id, emoji)}
              aria-label={picked ? `Remove ${emoji} reaction` : `React with ${emoji}`}
              aria-pressed={picked}
              className="flex items-center gap-0.5 px-2 py-1 rounded-full text-xs transition-colors"
              style={{
                background: picked ? 'rgba(0,212,255,0.18)' : 'transparent',
                border: `1px solid ${picked ? 'rgba(0,212,255,0.45)' : 'var(--color-border)'}`,
                color:  picked ? 'var(--ns-cyan)' : 'var(--color-text-secondary)',
              }}>
              <span>{emoji}</span>
              {count > 0 && <span className="font-bold">{count}</span>}
            </button>
          )
        })}
      </div>
    </li>
  )
}
