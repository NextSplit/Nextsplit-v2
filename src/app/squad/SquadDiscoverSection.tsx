'use client'

import { useState, useEffect } from 'react'
import { useCommunity } from '@/hooks/useCommunity'
import { RUNNER_CLASSES } from '@/lib/rpg'
import CharacterProfileModal from '@/components/CharacterProfileModal'

// R1 — Resurrect of /community content under /squad. The /community route
// previously had its own header (title, season XP bar, league badge) and a
// 5-tab inner nav (Feed / Clubs / Challenges / Races / Leaderboard). When
// we lift it into a "Discover" tab of /squad we drop the duplicate header
// chrome and the inner tabs — instead each section renders as a stacked
// scrollable block. The /squad tab strip is the primary nav; nesting tabs
// inside tabs is the user-confusion failure mode we're avoiding.

const LEAGUE_CONFIG = {
  bronze:   { label: 'Bronze',   emoji: '🥉', colour: 'text-amber-700 bg-amber-50 border-amber-200' },
  silver:   { label: 'Silver',   emoji: '🥈', colour: 'text-[var(--color-text-secondary)] bg-[#f8f8f6] border-[var(--color-border)]' },
  gold:     { label: 'Gold',     emoji: '🥇', colour: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  platinum: { label: 'Platinum', emoji: '💎', colour: 'text-blue-700 bg-blue-50 border-blue-200' },
  elite:    { label: 'Elite',    emoji: '👑', colour: 'text-purple-700 bg-purple-50 border-purple-200' },
}

interface Profile {
  display_name: string | null; handle: string | null
  season_xp: number | null; current_league: string | null; xp: number | null
}

function JoinClubModal({ onClose, onJoined }: { onClose: () => void; onJoined: () => void }) {
  const [code, setCode]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  const join = async () => {
    if (!code.trim()) return
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/community/join', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ join_code: code.trim() }),
      })
      const data = await res.json()
      if (data.error && data.error !== 'Already a member') { setError(data.error); return }
      setSuccess(`Joined ${data.club?.name ?? 'club'}!`)
      setTimeout(() => { onJoined(); onClose() }, 1200)
    } finally { setLoading(false) }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl px-4 pt-4 pb-8 space-y-4 max-w-lg mx-auto"
        style={{ background: 'var(--color-surface)', paddingBottom: 'max(2rem, calc(2rem + env(safe-area-inset-bottom, 0px)))' }}>
        <div className="w-10 h-1 bg-[var(--color-surface-3)] rounded-full mx-auto" />
        <h2 className="text-base font-black" style={{ color: 'var(--color-text-primary)' }}>Join a club</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">Enter the 6-character join code from your club admin.</p>
        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. A3F9C2" maxLength={6}
          className="w-full px-4 py-3 rounded-2xl border border-[var(--color-border)] text-lg font-mono text-center tracking-widest outline-none focus:border-[var(--ns-ember)]" />
        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        {success && <p className="text-xs text-emerald-600 text-center font-bold">{success}</p>}
        <button onClick={join} disabled={code.length < 6 || loading}
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-40 active:scale-95" style={{ background: 'var(--ns-ember)' }}>
          {loading ? 'Joining…' : 'Join club →'}
        </button>
      </div>
    </>
  )
}

function CreateClubModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName]       = useState('')
  const [desc, setDesc]       = useState('')
  const [emoji, setEmoji]     = useState('🏃')
  const [isPublic, setPublic] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const EMOJIS = ['🏃','🚴','🏊','⛰️','🏔️','🌍','⚡','🔥','💪','🎯']

  const create = async () => {
    if (!name.trim()) return
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/community/clubs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: desc, emoji, is_public: isPublic }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      onCreated(); onClose()
    } finally { setLoading(false) }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl px-4 pt-4 pb-8 max-h-[85dvh] overflow-y-auto space-y-4 max-w-lg mx-auto"
        style={{ background: 'var(--color-surface)', paddingBottom: 'max(2rem, calc(2rem + env(safe-area-inset-bottom, 0px)))' }}>
        <div className="w-10 h-1 bg-[var(--color-surface-3)] rounded-full mx-auto" />
        <h2 className="text-base font-black" style={{ color: 'var(--color-text-primary)' }}>Create a club</h2>

        <div className="flex gap-2 flex-wrap">
          {EMOJIS.map(e => (
            <button key={e} onClick={() => setEmoji(e)}
              className={`text-2xl w-10 h-10 rounded-xl border-2 transition-all ${emoji === e ? 'border-[var(--ns-ember)] bg-[var(--color-surface-2)]' : 'border-[var(--color-border)]'}`}>
              {e}
            </button>
          ))}
        </div>

        <input value={name} onChange={e => setName(e.target.value)} placeholder="Club name"
          className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm outline-none focus:border-[var(--ns-ember)]" />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
          placeholder="What's your club about? (optional)"
          className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm outline-none focus:border-[var(--ns-ember)] resize-none" />

        <label className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <input type="checkbox" checked={isPublic} onChange={e => setPublic(e.target.checked)} className="rounded" />
          Public club (discoverable by anyone)
        </label>

        {error && <p className="text-xs text-red-500">{error}</p>}
        <button onClick={create} disabled={!name.trim() || loading}
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-40 active:scale-95" style={{ background: 'var(--ns-ember)' }}>
          {loading ? 'Creating…' : 'Create club →'}
        </button>
      </div>
    </>
  )
}

interface Props { userId: string; profile: Profile | null }

export default function SquadDiscoverSection({ userId, profile }: Props) {
  const { myClubs, challenges, races, leaderboard, season, loading, refresh } = useCommunity()
  const [showJoin, setShowJoin]     = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [viewingCharacter, setViewingCharacter] = useState<{ userId: string; displayName: string; handle?: string } | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [feed, setFeed]             = useState<any[]>([])
  const [feedLoading, setFeedLoading] = useState(false)
  const [reactions, setReactions]   = useState<Record<string, string>>({})

  const league    = (profile?.current_league ?? 'bronze') as keyof typeof LEAGUE_CONFIG
  const leagueCfg = LEAGUE_CONFIG[league] ?? LEAGUE_CONFIG.bronze
  const myRank    = leaderboard.findIndex(l => l.user_id === userId) + 1
  const daysLeft  = season ? Math.max(0, Math.ceil((new Date(season.ends_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24))) : null

  useEffect(() => {
    setFeedLoading(true)
    fetch('/api/community/feed')
      .then(r => r.json())
      .then(d => setFeed(d.feed ?? []))
      .catch(() => {})
      .finally(() => setFeedLoading(false))
  }, [])

  async function reactToFeed(feedId: string, reaction: string) {
    setReactions(r => ({ ...r, [feedId]: reactions[feedId] === reaction ? '' : reaction }))
    await fetch('/api/community/feed', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feed_item_id: feedId, reaction }),
    }).catch(() => {})
  }

  const joinChallenge = async (id: string) => {
    await fetch('/api/community/challenges', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challenge_id: id, action: 'join' }),
    })
    refresh()
  }

  const enterRace = async (id: string) => {
    await fetch('/api/community/races', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ race_id: id, action: 'enter' }),
    })
    refresh()
  }

  const fmtTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`
  }

  const FEED_REACTIONS = ['🔥', '👏', '💪', '🏃']
  const MILESTONE_LABELS: Record<string, string> = {
    first_session: '🌅 First session!',
    first_20k:     '🎉 First 20km!',
    first_half:    '🏅 First half marathon!',
    pb_distance:   '📏 New longest run!',
    pb_pace:       '⚡ New pace PB!',
    streak_7:      '🔥 7-day streak!',
    streak_30:     '🔥🔥 30-day streak!',
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

      {/* Season XP / league chip — global standing, distinct from squad-level season */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-text-tertiary)' }}>
              {season?.name ?? 'Season'}
            </p>
            {daysLeft !== null && (
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{daysLeft}d remaining</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${leagueCfg.colour}`}>
              {leagueCfg.emoji} {leagueCfg.label}
            </span>
            {myRank > 0 && (
              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>#{myRank}</span>
            )}
          </div>
        </div>
        <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
          <span>{profile?.season_xp ?? 0} season XP</span>
          <span>Next league at {league === 'bronze' ? 500 : league === 'silver' ? 1500 : league === 'gold' ? 3000 : league === 'platinum' ? 6000 : '∞'} XP</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
          <div className="h-full bg-[var(--ns-ember)] rounded-full transition-all"
            style={{ width: `${Math.min(100, ((profile?.season_xp ?? 0) / (league === 'bronze' ? 500 : 1500)) * 100)}%` }} />
        </div>
      </div>

      {/* ── ACTIVITY FEED ── */}
      <section>
        <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--color-text-tertiary)' }}>
          📣 Activity from your clubs
        </p>
        <div className="space-y-2">
          {feedLoading && (
            <>{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--color-surface)' }} />)}</>
          )}
          {!feedLoading && feed.length === 0 && (
            <div className="rounded-2xl p-6 text-center"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="text-3xl mb-2">📣</div>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Join a club to see activity here.
              </p>
            </div>
          )}
          {!feedLoading && feed.map((item) => {
            const cls = item.profiles?.runner_class
              ? RUNNER_CLASSES[item.profiles.runner_class as keyof typeof RUNNER_CLASSES]
              : null
            const name = item.profiles?.display_name ?? item.profiles?.handle ?? 'Runner'
            const timeAgo = (() => {
              const mins = Math.floor((Date.now() - new Date(item.created_at).getTime()) / 60000)
              if (mins < 60) return `${mins}m ago`
              const hrs = Math.floor(mins / 60)
              if (hrs < 24) return `${hrs}h ago`
              return `${Math.floor(hrs / 24)}d ago`
            })()
            const myReaction = reactions[item.id]
            const reactionCounts = FEED_REACTIONS.reduce<Record<string, number>>((acc, r) => {
              acc[r] = (item.club_feed_reactions ?? []).filter((fr: { reaction: string }) => fr.reaction === r).length
              return acc
            }, {})

            return (
              <div key={item.id} className="rounded-2xl p-4"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: 'var(--ns-cyan-light)' }}>
                    {cls?.emoji ?? '🏃'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{name}</p>
                      <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>{timeAgo}</span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {item.session_name}
                      {item.km ? <span className="font-data ml-1.5">{item.km}km</span> : null}
                      {item.pace ? <span className="font-data ml-1.5" style={{ color: 'var(--color-text-tertiary)' }}>{item.pace}/km</span> : null}
                    </p>
                    {item.milestone_type && (
                      <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--ns-track-light)', color: 'var(--ns-track)' }}>
                        {MILESTONE_LABELS[item.milestone_type] ?? item.milestone_type}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 mt-3 pl-12">
                  {FEED_REACTIONS.map(r => (
                    <button key={r}
                      onClick={() => reactToFeed(item.id, r)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-xl border text-xs transition-all ${
                        myReaction === r
                          ? 'border-[var(--ns-ember)] bg-[var(--color-surface-2)]'
                          : 'border-[var(--color-border)]'
                      }`}
                      style={myReaction === r ? {} : { background: 'var(--color-surface)' }}>
                      <span>{r}</span>
                      {reactionCounts[r] > 0 && <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{reactionCounts[r]}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── CLUBS ── */}
      <section>
        <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--color-text-tertiary)' }}>
          👥 Clubs
        </p>
        <div className="flex gap-2 mb-2">
          <button onClick={() => setShowJoin(true)}
            className="flex-1 rounded-2xl py-3 text-sm font-bold"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-2)', color: 'var(--color-text-primary)' }}>
            Enter code
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex-1 rounded-2xl py-3 text-sm font-bold text-white active:scale-95"
            style={{ background: 'var(--ns-ember)' }}>
            + Create club
          </button>
        </div>
        {myClubs.length === 0 && !loading && (
          <div className="rounded-2xl p-6 text-center"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="text-3xl mb-2">👥</div>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Join a club with a code or create your own.
            </p>
          </div>
        )}
        <div className="space-y-2">
          {myClubs.map(({ clubs: club, role, weekly_km }) => (
            <a key={club.id} href={`/community/club/${club.id}`}
              className="block rounded-2xl p-4 space-y-2 active:scale-[0.99] transition-all"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{club.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>{club.name}</p>
                    {role === 'owner' && <span className="text-[10px] font-bold" style={{ color: 'var(--ns-ember)' }}>Owner</span>}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{club.member_count} members</p>
                </div>
                <span className="text-lg shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>›</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl py-2" style={{ background: 'var(--color-surface-2)' }}>
                  <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>{Math.round(club.weekly_km)}km</p>
                  <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>club this week</p>
                </div>
                <div className="rounded-xl py-2" style={{ background: 'var(--color-surface-2)' }}>
                  <p className="text-sm font-black" style={{ color: 'var(--ns-ember)' }}>{Math.round(weekly_km ?? 0)}km</p>
                  <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>your contribution</p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ── CHALLENGES ── */}
      <section>
        <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--color-text-tertiary)' }}>
          🎯 Challenges
        </p>
        <div className="space-y-2">
          {challenges.length === 0 && !loading && (
            <div className="rounded-2xl p-6 text-center"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>No active challenges. Check back soon.</p>
            </div>
          )}
          {challenges.map(c => {
            const daysLeft = Math.max(0, Math.ceil((new Date(c.ends_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24)))
            const progress = c.my_entry ? Math.min(100, (c.my_entry.progress / c.target_value) * 100) : 0
            return (
              <div key={c.id} className="rounded-2xl p-4 space-y-3"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{c.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{c.description}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-xs font-bold" style={{ color: 'var(--ns-ember)' }}>+{c.reward_xp} XP</p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{daysLeft}d left</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  <span>🎯 {c.target_value} {c.target_unit}</span>
                  <span>·</span>
                  <span>👥 {c.entry_count} entered</span>
                  {c.reward_title && <><span>·</span><span>🏷️ {c.reward_title}</span></>}
                </div>
                {c.my_entry ? (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                      <span>{c.my_entry.completed ? '✓ Complete!' : `${Math.round(c.my_entry.progress)} / ${c.target_value} ${c.target_unit}`}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
                      <div className={`h-full rounded-full transition-all ${c.my_entry.completed ? 'bg-emerald-500' : 'bg-[var(--ns-ember)]'}`}
                        style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                ) : (
                  <button onClick={() => joinChallenge(c.id)}
                    className="w-full py-2 rounded-xl text-xs font-bold active:scale-95"
                    style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--ns-ember)' }}>
                    Join challenge →
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── RACES ── */}
      <section>
        <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--color-text-tertiary)' }}>
          🏁 Virtual races
        </p>
        <div className="space-y-2">
          {races.length === 0 && !loading && (
            <div className="rounded-2xl p-6 text-center"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>No upcoming races. Check back soon.</p>
            </div>
          )}
          {races.map(r => {
            const isActive = new Date(r.starts_at) <= new Date()
            const racedaysLeft = Math.max(0, Math.ceil((new Date(r.ends_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24)))
            const isFull = r.max_entries ? r.entry_count >= r.max_entries : false
            return (
              <div key={r.id} className="rounded-2xl p-4 space-y-3"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{r.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{r.distance_km}km · {racedaysLeft}d left</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>
                      {r.entry_fee_gbp > 0 ? `£${r.entry_fee_gbp}` : 'Free'}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{r.entry_count} entered</p>
                  </div>
                </div>
                {r.description && <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{r.description}</p>}
                {r.my_entry ? (
                  r.my_entry.finish_time_secs ? (
                    <div className="rounded-xl p-3 text-center"
                      style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.30)' }}>
                      <p className="text-sm font-black font-data" style={{ color: '#10b981' }}>{fmtTime(r.my_entry.finish_time_secs)}</p>
                      <p className="text-xs" style={{ color: '#10b981' }}>
                        {r.my_entry.position === 1 ? '🥇 1st place' :
                         r.my_entry.position === 2 ? '🥈 2nd place' :
                         r.my_entry.position === 3 ? '🥉 3rd place' :
                         r.my_entry.position ? `#${r.my_entry.position} place` : 'Time submitted'}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl p-3 text-center"
                      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                      <p className="text-xs font-bold" style={{ color: 'var(--ns-ember)' }}>✓ Entered — submit your time when done</p>
                    </div>
                  )
                ) : (
                  <button onClick={() => !isFull && isActive && enterRace(r.id)}
                    disabled={isFull || !isActive}
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 active:scale-95"
                    style={{ background: 'var(--ns-ember)' }}>
                    {isFull ? 'Race full' : !isActive ? 'Opens soon' : 'Enter race →'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── GLOBAL LEADERBOARD ── */}
      <section>
        <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--color-text-tertiary)' }}>
          🏆 Global season leaderboard
        </p>
        <div className="space-y-2">
          {leaderboard.map((entry, i) => {
            const isMe = entry.user_id === userId
            const lCfg = LEAGUE_CONFIG[(entry.current_league as keyof typeof LEAGUE_CONFIG) ?? 'bronze']
            const name = entry.display_name ?? (entry.handle ? `@${entry.handle}` : 'Runner')
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
            const cls = entry.runner_class
              ? (RUNNER_CLASSES as Record<string, typeof RUNNER_CLASSES[keyof typeof RUNNER_CLASSES]>)[entry.runner_class]
              : null
            return (
              <button
                key={entry.user_id}
                onClick={() => !isMe && setViewingCharacter({ userId: entry.user_id, displayName: name, handle: entry.handle ?? undefined })}
                className={`w-full flex items-center gap-3 rounded-2xl p-3 text-left transition-all active:scale-[0.98] ${
                  isMe ? 'border-2 border-[var(--ns-ember)]' : 'border border-[var(--color-border)]'
                }`}
                style={{ background: isMe ? 'var(--ns-cyan-light)' : 'var(--color-surface)' }}>
                <div className="w-7 text-center shrink-0">
                  {medal ? <span className="text-lg">{medal}</span> : <span className="text-xs font-bold" style={{ color: 'var(--color-text-tertiary)' }}>#{i + 1}</span>}
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0`}
                  style={cls ? { background: cls.bg.replace('bg-', '') } : { background: 'var(--color-surface-2)' }}>
                  {cls ? cls.emoji : '🏃'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate"
                    style={{ color: isMe ? 'var(--ns-cyan)' : 'var(--color-text-primary)' }}>
                    {name} {isMe && '(you)'}
                    {entry.is_split_leader && (
                      <span title="Split Leader" className="ml-1 inline-block leading-none">👑</span>
                    )}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{lCfg.emoji} {lCfg.label}</span>
                    {cls && (
                      <>
                        <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>·</span>
                        <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{cls.name}</span>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-sm font-black shrink-0"
                  style={{ color: isMe ? 'var(--ns-cyan)' : 'var(--color-text-secondary)' }}>
                  {entry.season_xp} XP
                </p>
              </button>
            )
          })}
          {leaderboard.length === 0 && !loading && (
            <div className="rounded-2xl p-6 text-center"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>No runners yet this season. Be the first!</p>
            </div>
          )}
        </div>
      </section>

      {showJoin   && <JoinClubModal   onClose={() => setShowJoin(false)}   onJoined={refresh} />}
      {showCreate && <CreateClubModal onClose={() => setShowCreate(false)} onCreated={refresh} />}
      {viewingCharacter && (
        <CharacterProfileModal
          userId={viewingCharacter.userId}
          displayName={viewingCharacter.displayName}
          handle={viewingCharacter.handle}
          onClose={() => setViewingCharacter(null)}
        />
      )}
    </div>
  )
}
