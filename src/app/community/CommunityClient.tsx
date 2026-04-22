'use client'

import { useState, useEffect } from 'react'
import { useCommunity } from '@/hooks/useCommunity'
import { RUNNER_CLASSES } from '@/lib/rpg'
import CharacterProfileModal from '@/components/CharacterProfileModal'

const LEAGUE_CONFIG = {
  bronze:   { label: 'Bronze',   emoji: '🥉', colour: 'text-amber-700 bg-amber-50 border-amber-200' },
  silver:   { label: 'Silver',   emoji: '🥈', colour: 'text-gray-600 bg-[#f8f8f6] border-gray-200' },
  gold:     { label: 'Gold',     emoji: '🥇', colour: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  platinum: { label: 'Platinum', emoji: '💎', colour: 'text-blue-700 bg-blue-50 border-blue-200' },
  elite:    { label: 'Elite',    emoji: '👑', colour: 'text-purple-700 bg-purple-50 border-purple-200' },
}

interface Profile {
  display_name: string | null; handle: string | null
  season_xp: number | null; current_league: string | null; xp: number | null
}

function JoinClubModal({ onClose, onJoined }: { onClose: () => void; onJoined: () => void }) {
  const [code, setCode]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
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
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl px-4 pt-4 pb-8 space-y-4 max-w-lg mx-auto" style={{ background: "var(--color-surface)" }}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
        <h2 className="text-base font-black" style={{ color: 'var(--color-text-primary)' }}>Join a club</h2>
        <p className="text-sm text-gray-500">Enter the 6-character join code from your club admin.</p>
        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. A3F9C2" maxLength={6}
          className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-lg font-mono text-center tracking-widest outline-none focus:border-[var(--ns-forest)]" />
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
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl px-4 pt-4 pb-8 max-h-[85dvh] overflow-y-auto space-y-4 max-w-lg mx-auto" style={{ background: "var(--color-surface)" }}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
        <h2 className="text-base font-black" style={{ color: 'var(--color-text-primary)' }}>Create a club</h2>

        <div className="flex gap-2 flex-wrap">
          {EMOJIS.map(e => (
            <button key={e} onClick={() => setEmoji(e)}
              className={`text-2xl w-10 h-10 rounded-xl border-2 transition-all ${emoji === e ? 'border-[var(--ns-forest)] bg-[var(--ns-forest-light)]' : 'border-gray-200'}`}>
              {e}
            </button>
          ))}
        </div>

        <input value={name} onChange={e => setName(e.target.value)} placeholder="Club name"
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[var(--ns-forest)]" />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
          placeholder="What's your club about? (optional)"
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[var(--ns-forest)] resize-none" />

        <label className="flex items-center gap-3 text-sm text-gray-700">
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

export default function CommunityClient({ userId, profile }: { userId: string; profile: Profile | null }) {
  const { myClubs, challenges, races, leaderboard, season, loading, refresh } = useCommunity()
  const [tab, setTab]             = useState<'feed' | 'clubs' | 'challenges' | 'races' | 'leaderboard'>('feed')
  const [showJoin, setShowJoin]   = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [viewingCharacter, setViewingCharacter] = useState<{ userId: string; displayName: string; handle?: string } | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [feed, setFeed]           = useState<any[]>([])
  const [feedLoading, setFeedLoading] = useState(false)
  const [reactions, setReactions] = useState<Record<string, string>>({})

  const league      = (profile?.current_league ?? 'bronze') as keyof typeof LEAGUE_CONFIG
  const leagueCfg   = LEAGUE_CONFIG[league] ?? LEAGUE_CONFIG.bronze
  const myRank      = leaderboard.findIndex(l => l.user_id === userId) + 1

  const daysLeft = season ? Math.max(0, Math.ceil((new Date(season.ends_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24))) : null

  // Fetch feed when tab selected
  useEffect(() => {
    if (tab !== 'feed') return
    setFeedLoading(true)
    fetch('/api/community/feed')
      .then(r => r.json())
      .then(d => setFeed(d.feed ?? []))
      .catch(() => {})
      .finally(() => setFeedLoading(false))
  }, [tab])

  async function reactToFeed(feedId: string, reaction: string) {
    setReactions(r => ({ ...r, [feedId]: reactions[feedId] === reaction ? '' : reaction }))
    await fetch('/api/community/feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--color-bg)" }}>
      {/* Header */}
      <div className="border-b px-4 pt-12 pb-4 sticky top-0 z-40" style={{ background: "var(--color-bg)", borderColor: "var(--color-border)" }}>
        <div className="max-w-lg mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl italic" style={{ color: 'var(--color-text-primary)' }}>Community</h1>
              {season && (
                <p className="text-xs text-gray-400">{season.name} · {daysLeft}d remaining</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${leagueCfg.colour}`}>
                {leagueCfg.emoji} {leagueCfg.label}
              </span>
              {myRank > 0 && (
                <span className="text-xs text-gray-400">#{myRank}</span>
              )}
            </div>
          </div>

          {/* Season XP bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>{profile?.season_xp ?? 0} season XP</span>
              <span>Next league at {league === 'bronze' ? 500 : league === 'silver' ? 1500 : league === 'gold' ? 3000 : league === 'platinum' ? 6000 : '∞'} XP</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[var(--ns-forest)] rounded-full transition-all"
                style={{ width: `${Math.min(100, ((profile?.season_xp ?? 0) / (league === 'bronze' ? 500 : 1500)) * 100)}%` }} />
            </div>
          </div>

          {/* Tab nav */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
            {(['feed','clubs','challenges','races','leaderboard'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-shrink-0 flex-1 py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all min-w-[52px] ${tab === t ? 'text-gray-900 shadow' : 'text-gray-500'}`}>
                {t === 'feed' ? '📣' : t === 'leaderboard' ? '🏆' : t === 'clubs' ? '👥' : t === 'challenges' ? '🎯' : '🏁'} {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">

        {/* FEED TAB */}
        {tab === 'feed' && (
          <>
            {feedLoading && (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
              </div>
            )}
            {!feedLoading && feed.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <div className="text-4xl mb-3">📣</div>
                <h2 className="text-sm font-bold text-gray-800 mb-1">No activity yet</h2>
                <p className="text-xs text-gray-500">Join a club and log sessions to see your squad's activity here.</p>
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
              const MILESTONE_LABELS: Record<string, string> = {
                first_session: '🌅 First session!',
                first_20k:     '🎉 First 20km!',
                first_half:    '🏅 First half marathon!',
                pb_distance:   '📏 New longest run!',
                pb_pace:       '⚡ New pace PB!',
                streak_7:      '🔥 7-day streak!',
                streak_30:     '🔥🔥 30-day streak!',
              }
              const FEED_REACTIONS = ['🔥', '👏', '💪', '🏃']
              const myReaction = reactions[item.id]
              const reactionCounts = FEED_REACTIONS.reduce<Record<string, number>>((acc, r) => {
                acc[r] = (item.club_feed_reactions ?? []).filter((fr: { reaction: string }) => fr.reaction === r).length
                return acc
              }, {})

              return (
                <div key={item.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
                      style={{ background: 'var(--ns-forest-light)' }}>
                      {cls?.emoji ?? '🏃'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-gray-900" style={{ color: 'var(--color-text-primary)' }}>{name}</p>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {item.session_name}
                        {item.km ? <span className="font-data ml-1.5 text-gray-500">{item.km}km</span> : null}
                        {item.pace ? <span className="font-data ml-1.5 text-gray-400">{item.pace}/km</span> : null}
                      </p>
                      {item.milestone_type && (
                        <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--ns-track-light)', color: 'var(--ns-track)' }}>
                          {MILESTONE_LABELS[item.milestone_type] ?? item.milestone_type}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Reactions */}
                  <div className="flex gap-1.5 mt-3 pl-12">
                    {FEED_REACTIONS.map(r => (
                      <button key={r}
                        onClick={() => reactToFeed(item.id, r)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-xl border text-xs transition-all ${
                          myReaction === r
                            ? 'border-[var(--ns-forest)] bg-[var(--ns-forest-light)]'
                            : 'border-gray-100 bg-white hover:border-gray-200'
                        }`}>
                        <span>{r}</span>
                        {reactionCounts[r] > 0 && <span className="text-[10px] text-gray-500">{reactionCounts[r]}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* CLUBS TAB */}
        {tab === 'clubs' && (
          <>
            <div className="flex gap-2">
              <button onClick={() => setShowJoin(true)}
                className="flex-1 rounded-2xl py-3 text-sm font-bold" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-2)", color: "var(--color-text-primary)" }}>
                Enter code
              </button>
              <button onClick={() => setShowCreate(true)}
                className="flex-1 rounded-2xl py-3 text-sm font-bold text-white active:scale-95" style={{ background: 'var(--ns-ember)' }}>
                + Create club
              </button>
            </div>

            {myClubs.length === 0 && !loading && (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
                <div className="text-4xl">👥</div>
                <h2 className="text-base font-bold text-gray-800">No clubs yet</h2>
                <p className="text-sm text-gray-500">Join a club with a code or create your own to start competing with others.</p>
              </div>
            )}

            {myClubs.map(({ clubs: club, role, weekly_km }) => (
              <a key={club.id} href={`/community/club/${club.id}`}
                className="block bg-white rounded-2xl border border-gray-200 p-4 space-y-2 active:bg-[#f8f8f6]">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{club.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>{club.name}</p>
                      {role === 'owner' && <span className="text-[10px] text-[var(--ns-forest)] font-bold">Owner</span>}
                    </div>
                    <p className="text-xs text-gray-400">{club.member_count} members</p>
                  </div>
                  <span className="text-gray-300 text-lg shrink-0">›</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-[#f8f8f6] rounded-xl py-2">
                    <p className="text-sm font-black text-gray-800">{Math.round(club.weekly_km)}km</p>
                    <p className="text-[10px] text-gray-400">club this week</p>
                  </div>
                  <div className="bg-[var(--ns-forest-light)] rounded-xl py-2">
                    <p className="text-sm font-black text-[var(--ns-forest)]">{Math.round(weekly_km ?? 0)}km</p>
                    <p className="text-[10px] text-[var(--ns-forest-mid)]">your contribution</p>
                  </div>
                </div>
              </a>
            ))}
          </>
        )}

        {/* CHALLENGES TAB */}
        {tab === 'challenges' && (
          <>
            {challenges.length === 0 && !loading && (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-2">
                <div className="text-4xl">🎯</div>
                <h2 className="text-base font-bold text-gray-800">No active challenges</h2>
                <p className="text-sm text-gray-500">Check back soon — challenges reset regularly.</p>
              </div>
            )}
            {challenges.map(c => {
              const daysLeft = Math.max(0, Math.ceil((new Date(c.ends_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24)))
              const progress = c.my_entry ? Math.min(100, (c.my_entry.progress / c.target_value) * 100) : 0
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{c.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-xs font-bold text-[var(--ns-forest)]">+{c.reward_xp} XP</p>
                      <p className="text-[10px] text-gray-400">{daysLeft}d left</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>🎯 {c.target_value} {c.target_unit}</span>
                    <span>·</span>
                    <span>👥 {c.entry_count} entered</span>
                    {c.reward_title && <><span>·</span><span>🏷️ {c.reward_title}</span></>}
                  </div>

                  {c.my_entry ? (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>{c.my_entry.completed ? '✓ Complete!' : `${Math.round(c.my_entry.progress)} / ${c.target_value} ${c.target_unit}`}</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${c.my_entry.completed ? 'bg-emerald-500' : 'bg-[var(--ns-forest)]'}`}
                          style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => joinChallenge(c.id)}
                      className="w-full bg-[var(--ns-forest-light)] border border-[var(--ns-forest-light)] text-[var(--ns-forest)] py-2 rounded-xl text-xs font-bold active:scale-95">
                      Join challenge →
                    </button>
                  )}
                </div>
              )
            })}
          </>
        )}

        {/* RACES TAB */}
        {tab === 'races' && (
          <>
            {races.length === 0 && !loading && (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-2">
                <div className="text-4xl">🏁</div>
                <h2 className="text-base font-bold text-gray-800">No upcoming races</h2>
                <p className="text-sm text-gray-500">Virtual races will appear here. Check back soon.</p>
              </div>
            )}
            {races.map(r => {
              const isActive  = new Date(r.starts_at) <= new Date()
              const daysLeft  = Math.max(0, Math.ceil((new Date(r.ends_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24)))
              const isFull    = r.max_entries ? r.entry_count >= r.max_entries : false
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{r.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{r.distance_km}km · {daysLeft}d left</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-gray-900">
                        {r.entry_fee_gbp > 0 ? `£${r.entry_fee_gbp}` : 'Free'}
                      </p>
                      <p className="text-[10px] text-gray-400">{r.entry_count} entered</p>
                    </div>
                  </div>

                  {r.description && <p className="text-xs text-gray-500">{r.description}</p>}

                  {r.my_entry ? (
                    r.my_entry.finish_time_secs ? (
                      <div className="space-y-2">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                          <p className="text-sm font-black font-data text-emerald-700">{fmtTime(r.my_entry.finish_time_secs)}</p>
                          <p className="text-xs text-emerald-600">
                            {r.my_entry.position === 1 ? '🥇 1st place' :
                             r.my_entry.position === 2 ? '🥈 2nd place' :
                             r.my_entry.position === 3 ? '🥉 3rd place' :
                             r.my_entry.position ? `#${r.my_entry.position} place` : 'Time submitted'}
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            const res = await fetch(`/api/community/race-leaderboard?race_id=${r.id}`)
                            const data = await res.json()
                            alert(
                              `${r.name} — Top finishers:\n` +
                              (data.results ?? []).slice(0, 10).map(
                                (e: {position: number; display_name: string; finish_time_secs: number}) =>
                                  `${e.position === 1 ? '🥇' : e.position === 2 ? '🥈' : e.position === 3 ? '🥉' : `#${e.position}`} ${e.display_name} — ${fmtTime(e.finish_time_secs)}`
                              ).join('\n')
                            )
                          }}
                          className="w-full text-xs font-bold py-2 rounded-xl border border-gray-200 text-gray-600 hover:border-gray-300 transition-colors"
                        >
                          View full leaderboard ({r.entry_count} finishers)
                        </button>
                      </div>
                    ) : (
                      <div className="bg-[var(--ns-forest-light)] border border-[var(--ns-forest-light)] rounded-xl p-3 text-center">
                        <p className="text-xs font-bold text-[var(--ns-forest)]">✓ Entered — submit your time when done</p>
                      </div>
                    )
                  ) : (
                    <button onClick={() => !isFull && isActive && enterRace(r.id)}
                      disabled={isFull || !isActive}
                      className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 active:scale-95" style={{ background: 'var(--ns-ember)' }}>
                      {isFull ? 'Race full' : !isActive ? 'Opens soon' : 'Enter race →'}
                    </button>
                  )}
                </div>
              )
            })}
          </>
        )}

        {/* LEADERBOARD TAB */}
        {tab === 'leaderboard' && (
          <div className="space-y-2">
            <div className="bg-white rounded-2xl border border-gray-100 p-3 flex items-center justify-between">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {season?.name ?? 'Season'} — Global XP
              </p>
              {daysLeft !== null && (
                <span className="text-[10px] text-gray-400">{daysLeft} days left</span>
              )}
            </div>

            {leaderboard.map((entry, i) => {
              const isMe  = entry.user_id === userId
              const lCfg  = LEAGUE_CONFIG[(entry.current_league as keyof typeof LEAGUE_CONFIG) ?? 'bronze']
              const name  = entry.display_name ?? (entry.handle ? `@${entry.handle}` : 'Runner')
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
              // Character class chip — spec: "squad leaderboard shows characters not photos"
              const cls = entry.runner_class
                ? (RUNNER_CLASSES as Record<string, typeof RUNNER_CLASSES[keyof typeof RUNNER_CLASSES]>)[entry.runner_class]
                : null
              return (
                <button
                  key={entry.user_id}
                  onClick={() => !isMe && setViewingCharacter({ userId: entry.user_id, displayName: name, handle: entry.handle ?? undefined })}
                  className={`w-full flex items-center gap-3 rounded-2xl p-3 text-left transition-all active:scale-[0.98] ${
                    isMe
                      ? 'border-2 border-[var(--ns-forest)]'
                      : 'bg-white border border-gray-100'
                  }`}
                  style={isMe ? { background: 'var(--ns-forest-light)' } : {}}
                >
                  <div className="w-7 text-center shrink-0">
                    {medal ? <span className="text-lg">{medal}</span> : <span className="text-xs font-bold text-gray-400">#{i + 1}</span>}
                  </div>
                  {/* Character class badge — replaces generic avatar per spec */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0 ${cls ? '' : 'bg-gray-100'}`}
                    style={cls ? { background: cls.bg.replace('bg-', '') } : {}}>
                    {cls ? cls.emoji : '🏃'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${isMe ? '' : 'text-gray-900'}`}
                      style={isMe ? { color: 'var(--ns-forest)' } : {}}>
                      {name} {isMe && '(you)'}
                      {entry.is_split_leader && (
                        <span title="Split Leader" className="ml-1 inline-block leading-none">👑</span>
                      )}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-gray-400">{lCfg.emoji} {lCfg.label}</span>
                      {cls && (
                        <>
                          <span className="text-[10px] text-gray-300">·</span>
                          <span className="text-[10px] text-gray-400">{cls.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <p className={`text-sm font-black shrink-0 ${isMe ? '' : 'text-gray-700'}`}
                    style={isMe ? { color: 'var(--ns-forest)' } : {}}>
                    {entry.season_xp} XP
                  </p>
                </button>
              )
            })}

            {leaderboard.length === 0 && !loading && (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <p className="text-gray-400 text-sm">No runners yet this season. Be the first!</p>
              </div>
            )}
          </div>
        )}
      </div>

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
