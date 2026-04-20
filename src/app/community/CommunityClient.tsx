'use client'

import { useState } from 'react'
import { useCommunity } from '@/hooks/useCommunity'

const LEAGUE_CONFIG = {
  bronze:   { label: 'Bronze',   emoji: '🥉', colour: 'text-amber-700 bg-amber-50 border-amber-200' },
  silver:   { label: 'Silver',   emoji: '🥈', colour: 'text-slate-600 bg-slate-50 border-slate-200' },
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
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl px-4 pt-4 pb-8 space-y-4 max-w-lg mx-auto">
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" />
        <h2 className="text-base font-black text-slate-900">Join a club</h2>
        <p className="text-sm text-slate-500">Enter the 6-character join code from your club admin.</p>
        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. A3F9C2" maxLength={6}
          className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-lg font-mono text-center tracking-widest outline-none focus:border-teal-400" />
        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        {success && <p className="text-xs text-emerald-600 text-center font-bold">{success}</p>}
        <button onClick={join} disabled={code.length < 6 || loading}
          className="w-full bg-teal-500 text-white py-3.5 rounded-2xl text-sm font-bold disabled:opacity-40 active:scale-95">
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
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl px-4 pt-4 pb-8 max-h-[85dvh] overflow-y-auto space-y-4 max-w-lg mx-auto">
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" />
        <h2 className="text-base font-black text-slate-900">Create a club</h2>

        <div className="flex gap-2 flex-wrap">
          {EMOJIS.map(e => (
            <button key={e} onClick={() => setEmoji(e)}
              className={`text-2xl w-10 h-10 rounded-xl border-2 transition-all ${emoji === e ? 'border-teal-500 bg-teal-50' : 'border-slate-200'}`}>
              {e}
            </button>
          ))}
        </div>

        <input value={name} onChange={e => setName(e.target.value)} placeholder="Club name"
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400" />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
          placeholder="What's your club about? (optional)"
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400 resize-none" />

        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input type="checkbox" checked={isPublic} onChange={e => setPublic(e.target.checked)} className="rounded" />
          Public club (discoverable by anyone)
        </label>

        {error && <p className="text-xs text-red-500">{error}</p>}
        <button onClick={create} disabled={!name.trim() || loading}
          className="w-full bg-teal-500 text-white py-3.5 rounded-2xl text-sm font-bold disabled:opacity-40 active:scale-95">
          {loading ? 'Creating…' : 'Create club →'}
        </button>
      </div>
    </>
  )
}

export default function CommunityClient({ userId, profile }: { userId: string; profile: Profile | null }) {
  const { myClubs, challenges, races, leaderboard, season, loading, refresh } = useCommunity()
  const [tab, setTab]             = useState<'clubs' | 'challenges' | 'races' | 'leaderboard'>('clubs')
  const [showJoin, setShowJoin]   = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  const league      = (profile?.current_league ?? 'bronze') as keyof typeof LEAGUE_CONFIG
  const leagueCfg   = LEAGUE_CONFIG[league] ?? LEAGUE_CONFIG.bronze
  const myRank      = leaderboard.findIndex(l => l.user_id === userId) + 1

  const daysLeft = season ? Math.max(0, Math.ceil((new Date(season.ends_at).getTime() - Date.now()) / (1000 * 3600 * 24))) : null

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
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 pt-12 pb-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-black text-slate-900">Community</h1>
              {season && (
                <p className="text-xs text-slate-400">{season.name} · {daysLeft}d remaining</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${leagueCfg.colour}`}>
                {leagueCfg.emoji} {leagueCfg.label}
              </span>
              {myRank > 0 && (
                <span className="text-xs text-slate-400">#{myRank}</span>
              )}
            </div>
          </div>

          {/* Season XP bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>{profile?.season_xp ?? 0} season XP</span>
              <span>Next league at {league === 'bronze' ? 500 : league === 'silver' ? 1500 : league === 'gold' ? 3000 : league === 'platinum' ? 6000 : '∞'} XP</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, ((profile?.season_xp ?? 0) / (league === 'bronze' ? 500 : 1500)) * 100)}%` }} />
            </div>
          </div>

          {/* Tab nav */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {(['clubs','challenges','races','leaderboard'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all ${tab === t ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>
                {t === 'leaderboard' ? '🏆' : t === 'clubs' ? '👥' : t === 'challenges' ? '🎯' : '🏁'} {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">

        {/* CLUBS TAB */}
        {tab === 'clubs' && (
          <>
            <div className="flex gap-2">
              <button onClick={() => setShowJoin(true)}
                className="flex-1 bg-white border border-slate-200 rounded-2xl py-3 text-sm font-bold text-slate-700 active:bg-slate-50">
                Enter code
              </button>
              <button onClick={() => setShowCreate(true)}
                className="flex-1 bg-teal-500 text-white rounded-2xl py-3 text-sm font-bold active:scale-95">
                + Create club
              </button>
            </div>

            {myClubs.length === 0 && !loading && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
                <div className="text-4xl">👥</div>
                <h2 className="text-base font-bold text-slate-800">No clubs yet</h2>
                <p className="text-sm text-slate-500">Join a club with a code or create your own to start competing with others.</p>
              </div>
            )}

            {myClubs.map(({ clubs: club, role, weekly_km }) => (
              <a key={club.id} href={`/community/club/${club.id}`}
                className="block bg-white rounded-2xl border border-slate-200 p-4 space-y-2 active:bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{club.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900 truncate">{club.name}</p>
                      {role === 'owner' && <span className="text-[10px] text-teal-600 font-bold">Owner</span>}
                    </div>
                    <p className="text-xs text-slate-400">{club.member_count} members</p>
                  </div>
                  <span className="text-slate-300 text-lg shrink-0">›</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-slate-50 rounded-xl py-2">
                    <p className="text-sm font-black text-slate-800">{Math.round(club.weekly_km)}km</p>
                    <p className="text-[10px] text-slate-400">club this week</p>
                  </div>
                  <div className="bg-teal-50 rounded-xl py-2">
                    <p className="text-sm font-black text-teal-700">{Math.round(weekly_km ?? 0)}km</p>
                    <p className="text-[10px] text-teal-500">your contribution</p>
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
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
                <div className="text-4xl">🎯</div>
                <h2 className="text-base font-bold text-slate-800">No active challenges</h2>
                <p className="text-sm text-slate-500">Check back soon — challenges reset regularly.</p>
              </div>
            )}
            {challenges.map(c => {
              const daysLeft = Math.max(0, Math.ceil((new Date(c.ends_at).getTime() - Date.now()) / (1000 * 3600 * 24)))
              const progress = c.my_entry ? Math.min(100, (c.my_entry.progress / c.target_value) * 100) : 0
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900">{c.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{c.description}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-xs font-bold text-teal-600">+{c.reward_xp} XP</p>
                      <p className="text-[10px] text-slate-400">{daysLeft}d left</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>🎯 {c.target_value} {c.target_unit}</span>
                    <span>·</span>
                    <span>👥 {c.entry_count} entered</span>
                    {c.reward_title && <><span>·</span><span>🏷️ {c.reward_title}</span></>}
                  </div>

                  {c.my_entry ? (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>{c.my_entry.completed ? '✓ Complete!' : `${Math.round(c.my_entry.progress)} / ${c.target_value} ${c.target_unit}`}</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${c.my_entry.completed ? 'bg-emerald-500' : 'bg-teal-500'}`}
                          style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => joinChallenge(c.id)}
                      className="w-full bg-teal-50 border border-teal-200 text-teal-700 py-2 rounded-xl text-xs font-bold active:scale-95">
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
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
                <div className="text-4xl">🏁</div>
                <h2 className="text-base font-bold text-slate-800">No upcoming races</h2>
                <p className="text-sm text-slate-500">Virtual races will appear here. Check back soon.</p>
              </div>
            )}
            {races.map(r => {
              const isActive  = new Date(r.starts_at) <= new Date()
              const daysLeft  = Math.max(0, Math.ceil((new Date(r.ends_at).getTime() - Date.now()) / (1000 * 3600 * 24)))
              const isFull    = r.max_entries ? r.entry_count >= r.max_entries : false
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{r.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{r.distance_km}km · {daysLeft}d left</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-slate-900">
                        {r.entry_fee_gbp > 0 ? `£${r.entry_fee_gbp}` : 'Free'}
                      </p>
                      <p className="text-[10px] text-slate-400">{r.entry_count} entered</p>
                    </div>
                  </div>

                  {r.description && <p className="text-xs text-slate-500">{r.description}</p>}

                  {r.my_entry ? (
                    r.my_entry.finish_time_secs ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                        <p className="text-sm font-black text-emerald-700">{fmtTime(r.my_entry.finish_time_secs)}</p>
                        <p className="text-xs text-emerald-600">
                          {r.my_entry.position ? `#${r.my_entry.position} place` : 'Time submitted'}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-center">
                        <p className="text-xs font-bold text-teal-700">✓ Entered — submit your time when done</p>
                      </div>
                    )
                  ) : (
                    <button onClick={() => !isFull && isActive && enterRace(r.id)}
                      disabled={isFull || !isActive}
                      className="w-full bg-teal-500 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 active:scale-95">
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
            <div className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {season?.name ?? 'Season'} — Global XP
              </p>
              {daysLeft !== null && (
                <span className="text-[10px] text-slate-400">{daysLeft} days left</span>
              )}
            </div>

            {leaderboard.map((entry, i) => {
              const isMe     = entry.user_id === userId
              const lCfg     = LEAGUE_CONFIG[(entry.current_league as keyof typeof LEAGUE_CONFIG) ?? 'bronze']
              const name     = entry.display_name ?? (entry.handle ? `@${entry.handle}` : 'Runner')
              const medal    = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
              return (
                <div key={entry.user_id}
                  className={`flex items-center gap-3 rounded-2xl p-3 ${isMe ? 'bg-teal-50 border-2 border-teal-300' : 'bg-white border border-slate-200'}`}>
                  <div className="w-7 text-center shrink-0">
                    {medal ? <span className="text-lg">{medal}</span> : <span className="text-xs font-bold text-slate-400">#{i + 1}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${isMe ? 'text-teal-800' : 'text-slate-900'}`}>
                      {name} {isMe && '(you)'}
                    </p>
                    <p className="text-[10px] text-slate-400">{lCfg.emoji} {lCfg.label}</p>
                  </div>
                  <p className={`text-sm font-black shrink-0 ${isMe ? 'text-teal-700' : 'text-slate-700'}`}>
                    {entry.season_xp} XP
                  </p>
                </div>
              )
            })}

            {leaderboard.length === 0 && !loading && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <p className="text-slate-400 text-sm">No runners yet this season. Be the first!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showJoin   && <JoinClubModal   onClose={() => setShowJoin(false)}   onJoined={refresh} />}
      {showCreate && <CreateClubModal onClose={() => setShowCreate(false)} onCreated={refresh} />}
    </div>
  )
}
