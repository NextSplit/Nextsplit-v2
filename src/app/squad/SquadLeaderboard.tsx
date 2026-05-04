'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import type { Squad } from '@/hooks/useSquad'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EnrichedMember = any

interface Props {
  squad:    Squad
  members:  EnrichedMember[]
  myUserId: string
}

const RANK_MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']

export default function SquadLeaderboard({ squad, members, myUserId }: Props) {
  const ranked = useMemo(() => {
    return [...members]
      .filter(m => m.profiles?.display_name)
      .sort((a, b) => (b.stats?.weekly_km ?? 0) - (a.stats?.weekly_km ?? 0))
  }, [members])

  const totalKm = ranked.reduce((s, m) => s + (m.stats?.weekly_km ?? 0), 0)
  const isLeader = (m: EnrichedMember) => m.user_id === squad.leader_id

  return (
    <div className="w-full max-w-sm px-4 mt-3">
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>

        {/* Header */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b"
          style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <span className="text-base">🏆</span>
            <p className="text-xs font-black uppercase tracking-widest"
              style={{ color: 'var(--color-text-tertiary)' }}>This week</p>
          </div>
          <p className="text-xs font-black"
            style={{ color: squad.colour ?? '#7fff4d' }}>
            {totalKm.toFixed(1)} km total
          </p>
        </div>

        {/* Rankings */}
        <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {ranked.map((member, idx) => {
            const isMe    = member.user_id === myUserId
            const km      = member.stats?.weekly_km ?? 0
            const streak  = member.stats?.streak ?? 0
            const colour  = member.stats?.runner_colour ?? squad.colour ?? '#4d8aff'
            const topKm   = ranked[0]?.stats?.weekly_km ?? 1
            const barPct  = topKm > 0 ? km / topKm : 0

            return (
              <Link key={member.user_id}
                href={isMe ? '/you' : `/squad/member/${member.user_id}`}
                className="flex items-center gap-3 px-4 py-3 active:opacity-70 transition-opacity"
                style={{ background: isMe ? `${colour}08` : 'transparent' }}>

                {/* Rank */}
                <span className="text-base w-6 text-center flex-shrink-0">
                  {RANK_MEDALS[idx] ?? `${idx + 1}`}
                </span>

                {/* Avatar */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                  style={{ background: `${colour}20`, border: `2px solid ${colour}50`, color: colour }}>
                  {(member.profiles?.display_name ?? '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>

                {/* Name + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-xs font-black truncate"
                      style={{ color: isMe ? colour : 'var(--color-text-primary)' }}>
                      {member.profiles?.display_name ?? 'Runner'}
                      {isLeader(member) && <span className="ml-1">👑</span>}
                      {isMe && <span className="ml-1 text-[9px] font-black px-1.5 py-0.5 rounded-full"
                        style={{ background: `${colour}20`, color: colour }}>you</span>}
                    </p>
                    {streak > 0 && (
                      <span className="text-[9px] font-black flex-shrink-0" style={{ color: '#ffb800' }}>
                        🔥{streak}
                      </span>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="h-1 rounded-full overflow-hidden"
                    style={{ background: 'var(--color-surface-2)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${barPct * 100}%`,
                        background: colour,
                        boxShadow: isMe ? `0 0 6px ${colour}60` : 'none',
                      }} />
                  </div>
                </div>

                {/* km */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black"
                    style={{ color: idx === 0 ? '#ffb800' : 'var(--color-text-primary)' }}>
                    {km.toFixed(1)}
                  </p>
                  <p className="text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>km</p>
                </div>
              </Link>
            )
          })}

          {/* Empty slots */}
          {ranked.length < 5 && Array.from({ length: 5 - ranked.length }).map((_, i) => (
            <div key={`empty-${i}`} className="flex items-center gap-3 px-4 py-3 opacity-30">
              <span className="text-base w-6 text-center">{RANK_MEDALS[ranked.length + i]}</span>
              <div className="w-8 h-8 rounded-full border-2 border-dashed"
                style={{ borderColor: 'var(--color-border-2)' }} />
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                Empty slot — invite a runner
              </p>
            </div>
          ))}
        </div>

        {/* Resets note */}
        <div className="px-4 py-2 text-center border-t"
          style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>
            Resets every Monday · Based on logged sessions
          </p>
        </div>
      </div>
    </div>
  )
}
