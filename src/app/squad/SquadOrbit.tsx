'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Squad, SquadMember } from '@/hooks/useSquad'

// ── Types ──────────────────────────────────────────────────────────────────────

interface MemberStats {
  weekly_km:    number
  streak:       number
  plan_name:    string | null
  race_date:    string | null
  current_week: number
  total_weeks:  number
  runner_colour: string
}

interface EnrichedMember extends SquadMember {
  stats: MemberStats | null
}

interface Props {
  squad:    Squad
  members:  EnrichedMember[]
  myUserId: string
  role:     'leader' | 'member'
  inviteCode?: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_SLOTS = 5
const EMPTY_SLOT_COLOUR = '#2a2a2a'
const LEADER_COLOUR     = '#f0a500' // gold

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMemberColour(member: EnrichedMember | null, isLeader: boolean, squadColour: string): string {
  if (!member) return EMPTY_SLOT_COLOUR
  if (isLeader) return LEADER_COLOUR
  return member.stats?.runner_colour ?? squadColour ?? '#06b6d4'
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function daysUntil(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
}

// ── Orbit arc component ───────────────────────────────────────────────────────

function ProgressArc({ pct, colour, size }: { pct: number; colour: string; size: number }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * Math.min(pct, 1)
  return (
    <svg width={size} height={size} className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={colour}
        strokeWidth={4} strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
    </svg>
  )
}

// ── Member circle ─────────────────────────────────────────────────────────────

function MemberCircle({
  member, isLeader, squadColour, size, isFocused, isEmpty, inviteCode,
  onClick,
}: {
  member:      EnrichedMember | null
  isLeader:    boolean
  squadColour: string
  size:        number
  isFocused:   boolean
  isEmpty:     boolean
  inviteCode?: string
  onClick:     () => void
}) {
  const colour   = getMemberColour(member, isLeader, squadColour)
  const weeklyKm = member?.stats?.weekly_km ?? 0
  const streak   = member?.stats?.streak ?? 0
  const pct      = member?.stats?.total_weeks
    ? member.stats.current_week / member.stats.total_weeks
    : 0

  if (isEmpty) {
    return (
      <button onClick={onClick}
        className="flex flex-col items-center justify-center rounded-full border-2 border-dashed transition-all"
        style={{
          width: size, height: size,
          borderColor: 'rgba(255,255,255,0.15)',
          background: 'rgba(255,255,255,0.03)',
        }}>
        <span className="text-lg">+</span>
        <span className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Invite</span>
      </button>
    )
  }

  return (
    <button onClick={onClick} className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* Progress arc */}
      {isFocused && pct > 0 && (
        <ProgressArc pct={pct} colour={colour} size={size} />
      )}
      {/* Avatar circle */}
      <div className="absolute inset-2 rounded-full flex items-center justify-center font-black transition-all duration-300"
        style={{
          background: `${colour}25`,
          border: `3px solid ${colour}`,
          boxShadow: isFocused ? `0 0 0 4px ${colour}30, 0 8px 32px ${colour}40` : 'none',
          fontSize: isFocused ? size * 0.22 : size * 0.28,
          color: colour,
        }}>
        {getInitials(member?.profiles?.display_name ?? '?')}
      </div>
      {/* Leader crown */}
      {isLeader && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-xs">👑</div>
      )}
      {/* Streak badge */}
      {streak > 0 && isFocused && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-full px-2 py-0.5"
          style={{ background: '#ff4d6d', fontSize: 9, color: 'white', fontWeight: 900, whiteSpace: 'nowrap' }}>
          🔥{streak}
        </div>
      )}
    </button>
  )
}

// ── Main orbit ────────────────────────────────────────────────────────────────

export default function SquadOrbit({ squad, members, myUserId, role, inviteCode }: Props) {
  const router = useRouter()

  // Build slot array: current user always at index 0, others fill 1-4
  const me = members.find(m => m.user_id === myUserId)
  const others = members.filter(m => m.user_id !== myUserId)

  // Pad to 5 slots
  const slots: (EnrichedMember | null)[] = [
    me ?? null,
    ...others,
    ...Array(Math.max(0, MAX_SLOTS - 1 - others.length)).fill(null),
  ]

  // focusIndex: which slot is at the top/hero position
  const [focusIndex, setFocusIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const touchStartX = useRef<number | null>(null)

  const focused = slots[focusIndex]
  const focusIsLeader = focused?.user_id === squad.leader_id
  const focusColour = getMemberColour(focused, focusIsLeader, squad.colour)
  const isSelf = focused?.user_id === myUserId

  // Swipe handling
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < 40) return
    if (dx < 0) rotateTo((focusIndex + 1) % MAX_SLOTS)
    else rotateTo((focusIndex + MAX_SLOTS - 1) % MAX_SLOTS)
  }

  function rotateTo(idx: number) {
    if (isAnimating) return
    setIsAnimating(true)
    setFocusIndex(idx)
    setTimeout(() => setIsAnimating(false), 400)
  }

  // Dot indicator click
  function handleInviteSlot() {
    if (inviteCode) {
      navigator.clipboard?.writeText(`${window.location.origin}/squad/join/${inviteCode}`)
        .catch(() => {})
    }
    router.push('/squad/invite')
  }

  // Overall squad goal progress
  const totalWeeklyKm = members.reduce((s, m) => s + (m.stats?.weekly_km ?? 0), 0)
  const goalPct = squad.goal_type === 'km' && squad.goal_value
    ? Math.min(totalWeeklyKm / squad.goal_value, 1)
    : null

  // Position angles for non-focus circles (evenly distributed around bottom arc)
  // Focus slot is at top (270deg). Others spread 180deg to 360deg (bottom half)
  const nonFocusSlots = Array.from({ length: MAX_SLOTS - 1 }, (_, i) => {
    const slotIdx = (focusIndex + 1 + i) % MAX_SLOTS
    return { slotIdx, slot: slots[slotIdx] }
  })

  return (
    <div className="flex flex-col items-center"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}>

      {/* ── Background colour wash based on focused member ── */}
      <div className="fixed inset-0 pointer-events-none transition-all duration-500 opacity-20"
        style={{ background: `radial-gradient(ellipse at 50% 30%, ${focusColour} 0%, transparent 70%)` }} />

      {/* ── Squad name + goal ── */}
      <div className="w-full max-w-sm text-center mb-2 px-4">
        <h2 className="text-2xl font-black tracking-tight" style={{ color: squad.colour, letterSpacing: '-0.02em' }}>
          {squad.name}
        </h2>
        {squad.goal_type === 'km' && squad.goal_value && (
          <div className="mt-2">
            <div className="flex justify-between text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <span>{totalWeeklyKm.toFixed(1)}km this week</span>
              <span>Goal: {squad.goal_value}km</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(goalPct ?? 0) * 100}%`, background: squad.colour }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Orbit SVG container ── */}
      <div className="relative" style={{ width: 320, height: 320 }}>

        {/* Orbit ring */}
        <svg className="absolute inset-0" width={320} height={320}>
          <circle cx={160} cy={160} r={130}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1.5}
            strokeDasharray="6 6" />
          {/* Orbit progress arc for squad goal */}
          {goalPct !== null && (
            <circle cx={160} cy={160} r={130}
              fill="none" stroke={squad.colour} strokeWidth={2.5}
              strokeLinecap="round" opacity={0.6}
              strokeDasharray={`${2 * Math.PI * 130 * goalPct} ${2 * Math.PI * 130}`}
              style={{ transform: 'rotate(-90deg)', transformOrigin: '160px 160px', transition: 'stroke-dasharray 0.8s ease' }} />
          )}
        </svg>

        {/* Focus member — hero centre */}
        <div className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <div className={`transition-all duration-400 ${isAnimating ? 'scale-95 opacity-80' : 'scale-100 opacity-100'}`}>
            <MemberCircle
              member={focused}
              isLeader={focusIsLeader}
              squadColour={squad.colour}
              size={110}
              isFocused={true}
              isEmpty={!focused}
              inviteCode={inviteCode}
              onClick={() => {
                if (!focused) { handleInviteSlot(); return }
                if (!isSelf) router.push(`/squad/member/${focused.user_id}`)
              }}
            />
          </div>
        </div>

        {/* Orbital members — positioned around the ring */}
        {nonFocusSlots.map(({ slotIdx, slot }, i) => {
          // Spread from 200deg to 340deg (bottom arc, 5 positions)
          const angleDeg = 200 + (i * 35)
          const angleRad = (angleDeg * Math.PI) / 180
          const x = 160 + 130 * Math.cos(angleRad)
          const y = 160 + 130 * Math.sin(angleRad)
          const isLeader = slot?.user_id === squad.leader_id
          // Size varies slightly based on position — centre-bottom largest
          const distFromCentre = Math.abs(i - 2)
          const size = 56 - distFromCentre * 4

          return (
            <div key={slotIdx} className="absolute transition-all duration-400"
              style={{ left: x - size/2, top: y - size/2 }}>
              <MemberCircle
                member={slot}
                isLeader={isLeader}
                squadColour={squad.colour}
                size={size}
                isFocused={false}
                isEmpty={!slot}
                inviteCode={inviteCode}
                onClick={() => {
                  if (!slot) { handleInviteSlot(); return }
                  rotateTo(slotIdx)
                }}
              />
            </div>
          )
        })}

        {/* Swipe hint dots */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {Array.from({ length: MAX_SLOTS }).map((_, i) => (
            <button key={i} onClick={() => rotateTo(i)}
              className="rounded-full transition-all"
              style={{
                width: i === focusIndex ? 16 : 6,
                height: 6,
                background: i === focusIndex ? focusColour : 'rgba(255,255,255,0.2)',
              }} />
          ))}
        </div>
      </div>

      {/* ── Focus member stats card ── */}
      <div className="w-full max-w-sm px-4 mt-4 transition-all duration-400">
        {focused ? (
          <div className="rounded-2xl p-4"
            style={{ background: `${focusColour}10`, border: `1.5px solid ${focusColour}30` }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest mb-0.5"
                  style={{ color: focusColour }}>
                  {isSelf ? 'You' : (focusIsLeader ? '👑 Split Leader' : 'Member')}
                </p>
                <p className="text-xl font-black text-white" style={{ letterSpacing: '-0.02em' }}>
                  {focused.profiles?.display_name ?? 'Runner'}
                </p>
              </div>
              {!isSelf && (
                <Link href={`/squad/member/${focused.user_id}`}
                  className="text-xs font-black px-3 py-1.5 rounded-xl text-white"
                  style={{ background: focusColour }}>
                  View →
                </Link>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl p-2.5 text-center"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                <p className="text-lg font-black text-white">{focused.stats?.weekly_km ?? 0}</p>
                <p className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>km / 7d</p>
              </div>
              <div className="rounded-xl p-2.5 text-center"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                <p className="text-lg font-black"
                  style={{ color: (focused.stats?.streak ?? 0) > 0 ? '#ff4d6d' : 'white' }}>
                  {(focused.stats?.streak ?? 0) > 0 ? `🔥${focused.stats!.streak}` : '—'}
                </p>
                <p className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>streak</p>
              </div>
              <div className="rounded-xl p-2.5 text-center"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                <p className="text-lg font-black text-white">
                  {focused.stats?.total_weeks
                    ? `${focused.stats.current_week}/${focused.stats.total_weeks}`
                    : '—'}
                </p>
                <p className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>wk</p>
              </div>
            </div>

            {focused.stats?.plan_name && (
              <p className="text-xs mt-2.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                📋 {focused.stats.plan_name}
                {focused.stats.race_date && ` · ${daysUntil(focused.stats.race_date)}d 🏁`}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-2xl p-4 text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1.5px dashed rgba(255,255,255,0.1)' }}>
            <p className="text-sm font-black text-white mb-1">Empty slot</p>
            <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Invite a friend to fill this spot
            </p>
            {inviteCode && (
              <button
                onClick={handleInviteSlot}
                className="text-xs font-black px-4 py-2 rounded-xl text-white"
                style={{ background: '#84cc16', color: '#0d1a05' }}>
                📋 Copy invite link
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Squad achievements strip ── */}
      <div className="w-full max-w-sm px-4 mt-3">
        <Link href="/squad/trophies"
          className="flex items-center gap-3 rounded-2xl p-3"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <span className="text-xl">🏆</span>
          <div className="flex-1">
            <p className="text-xs font-black" style={{ color: 'var(--color-text-primary)' }}>
              Squad achievements
            </p>
            <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
              Trophies, season standings, leaderboard →
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}
