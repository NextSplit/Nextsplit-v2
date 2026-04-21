'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const LEAGUE_CONFIG = {
  bronze:   { emoji: '🥉' },
  silver:   { emoji: '🥈' },
  gold:     { emoji: '🥇' },
  platinum: { emoji: '💎' },
  elite:    { emoji: '👑' },
}

interface Club {
  id: string; name: string; emoji: string; description: string | null
  join_code: string; member_count: number; weekly_km: number; is_public: boolean
  owner_id: string
}

interface Member {
  user_id: string; role: string; weekly_km: number; season_xp: number
  profiles: { display_name: string | null; handle: string | null; current_league: string | null }
}

interface FeedItem {
  id: string; user_id: string; session_type: string; session_name: string
  km: number | null; duration_secs: number | null; pace: string | null
  note: string | null; logged_at: string
  profiles: { display_name: string | null; handle: string | null }
}

interface Props {
  club:       Club
  membership: { role: string; weekly_km: number; season_xp: number } | null
  members:    Member[]
  feed:       FeedItem[]
  userId:     string
}

export default function ClubDetailClient({ club, membership, members, feed, userId }: Props) {
  const router = useRouter()
  const [tab, setTab]         = useState<'leaderboard' | 'feed'>('leaderboard')
  const [showCode, setShowCode] = useState(false)
  const [copied, setCopied]   = useState(false)
  const isOwner               = club.owner_id === userId
  const isMember              = !!membership

  const copyCode = async () => {
    await navigator.clipboard.writeText(club.join_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const leaveClub = async () => {
    const confirmed = window.confirm(`Leave ${club.name}?`)
    if (!confirmed) return
    await fetch('/api/community/join', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'leave', club_id: club.id }),
    })
    router.push('/community')
  }

  const fmtDuration = (secs: number | null) => {
    if (!secs) return null
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return m >= 60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m}:${String(s).padStart(2,'0')}`
  }

  const fmtDate = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffH = Math.round((now.getTime() - d.getTime()) / 3600000)
    if (diffH < 1) return 'just now'
    if (diffH < 24) return `${diffH}h ago`
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto space-y-3">
          <div className="flex items-center gap-3">
            <a href="/community" className="text-gray-400 text-xl">←</a>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">{club.emoji}</span>
                <h1 className="text-base font-black text-gray-900 truncate">{club.name}</h1>
              </div>
              <p className="text-xs text-gray-400">{club.member_count} members · {Math.round(club.weekly_km)}km this week</p>
            </div>
            {(isOwner || membership) && (
              <button onClick={() => setShowCode(!showCode)}
                className="text-xs bg-[var(--ns-forest-light)] border border-[var(--ns-forest-light)] text-[var(--ns-forest)] px-3 py-1.5 rounded-xl font-bold">
                Invite
              </button>
            )}
          </div>

          {showCode && (
            <div className="bg-[var(--ns-forest-light)] border border-[var(--ns-forest-light)] rounded-2xl p-3 space-y-2">
              <p className="text-xs text-[var(--ns-forest)] font-semibold">Share this code to invite members:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-center text-2xl font-black text-teal-800 tracking-widest">{club.join_code}</code>
                <button onClick={copyCode}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold ${copied ? 'bg-emerald-500 text-white' : 'bg-[var(--ns-forest)] text-white'}`}>
                  {copied ? '✓' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(['leaderboard', 'feed'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${tab === t ? 'bg-white text-gray-900 shadow' : 'text-gray-500'}`}>
                {t === 'leaderboard' ? '🏆 Leaderboard' : '📡 Feed'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">

        {/* LEADERBOARD */}
        {tab === 'leaderboard' && (
          <>
            {members.map((m, i) => {
              const isMe   = m.user_id === userId
              const name   = m.profiles?.display_name ?? (m.profiles?.handle ? `@${m.profiles.handle}` : 'Runner')
              const league = (m.profiles?.current_league ?? 'bronze') as keyof typeof LEAGUE_CONFIG
              const medal  = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
              return (
                <div key={m.user_id}
                  className={`flex items-center gap-3 rounded-2xl p-3 ${isMe ? 'bg-[var(--ns-forest-light)] border-2 border-teal-300' : 'bg-white border border-gray-200'}`}>
                  <div className="w-7 text-center shrink-0">
                    {medal ? <span className="text-lg">{medal}</span> : <span className="text-xs font-bold text-gray-400">#{i+1}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${isMe ? 'text-teal-800' : 'text-gray-900'}`}>
                      {name} {isMe && '(you)'}
                      {m.role === 'owner' && <span className="ml-1 text-[10px] text-[var(--ns-forest-mid)]">Owner</span>}
                    </p>
                    <p className="text-[10px] text-gray-400">{LEAGUE_CONFIG[league]?.emoji} {m.season_xp} XP this season</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-black ${isMe ? 'text-[var(--ns-forest)]' : 'text-gray-700'}`}>{Math.round(m.weekly_km)}km</p>
                    <p className="text-[10px] text-gray-400">this week</p>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* FEED */}
        {tab === 'feed' && (
          <>
            {feed.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-2">
                <div className="text-4xl">📡</div>
                <p className="text-sm text-gray-500">No sessions shared yet. Be the first!</p>
              </div>
            )}
            {feed.map(item => {
              const name = item.profiles?.display_name ?? item.profiles?.handle ?? 'Runner'
              return (
                <div key={item.id} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[var(--ns-forest-light)] flex items-center justify-center text-sm">🏃</div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">{name}</p>
                      <p className="text-[10px] text-gray-400">{fmtDate(item.logged_at)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{item.session_name}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                      {item.km && <span>{item.km}km</span>}
                      {item.duration_secs && <span>{fmtDuration(item.duration_secs)}</span>}
                      {item.pace && <span>{item.pace}/km</span>}
                    </div>
                  </div>
                  {item.note && <p className="text-xs text-gray-500 italic">&quot;{item.note}&quot;</p>}
                </div>
              )
            })}
          </>
        )}

        {/* Leave club */}
        {isMember && !isOwner && (
          <button onClick={leaveClub} className="w-full text-xs text-red-400 hover:text-red-600 py-3">
            Leave {club.name}
          </button>
        )}
      </div>
    </div>
  )
}
