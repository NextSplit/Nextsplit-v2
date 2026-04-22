'use client'

import { useState } from 'react'
import Link from 'next/link'
import { RUNNER_CLASSES } from '@/lib/rpg'
import type { Squad, SquadMember } from '@/hooks/useSquad'
import { NUDGE_MESSAGES, NUDGE_KEYS } from '@/lib/squad-nudges'


interface Props {
  squad:     Squad
  role:      'leader' | 'member'
  monthlyKm: number
  userId:    string
}

function fmtKm(km: number) {
  return km >= 10 ? `${Math.round(km)}` : km.toFixed(1)
}

function timeAgo(dateStr: string) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function MemberCard({
  member,
  isLeader,
  squadColour,
  onNudge,
  onRemove,
}: {
  member: SquadMember
  isLeader: boolean
  squadColour: string
  onNudge: (userId: string) => void
  onRemove: (userId: string) => void
}) {
  const cls = RUNNER_CLASSES[member.profiles?.runner_class as keyof typeof RUNNER_CLASSES] ?? RUNNER_CLASSES.warming_up
  const lastActive = member.last_active_at
  const daysSinceActive = Math.floor((Date.now() - new Date(lastActive).getTime()) / (1000 * 3600 * 24))
  const isAtRisk = daysSinceActive >= 7 && isLeader

  return (
    <div className="rounded-2xl p-4 transition-all"
      style={{ background: 'var(--color-surface)', border: `1px solid ${isAtRisk ? 'rgba(220,38,38,0.3)' : 'var(--color-border)'}` }}>
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: `${squadColour}20` }}>
          {cls.emoji}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
              {member.profiles?.display_name ?? member.profiles?.handle ?? 'Runner'}
            </p>
            {isAtRisk && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: 'rgba(220,38,38,0.15)', color: '#f87171' }}>
                Inactive
              </span>
            )}
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            {cls.name} · last active {timeAgo(lastActive)}
          </p>
        </div>

        {/* Actions (leader only) */}
        {isLeader && (
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => onNudge(member.user_id)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all active:scale-95"
              style={{ background: `${squadColour}20`, color: squadColour }}
              title="Send a nudge">
              👟
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function LeaderTransferButton({ squadId, squadColour }: { squadId: string; squadColour: string }) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'eligible' | 'ineligible' | 'transferring' | 'done'>('idle')
  const [reason, setReason]   = useState<string | null>(null)

  async function checkAndClaim() {
    setStatus('checking')
    try {
      const res  = await fetch('/api/squad/inactivity')
      const data = await res.json()
      if (!res.ok || data.disbanded) { setStatus('ineligible'); setReason('Squad not found'); return }
      if (data.leaderInactiveDays >= 30) {
        setStatus('eligible')
      } else {
        setStatus('ineligible')
        setReason(`Leader was active ${data.leaderInactiveDays} days ago. Need 30+ days inactivity.`)
      }
    } catch {
      setStatus('ineligible'); setReason('Could not check')
    }
  }

  async function confirmTransfer() {
    setStatus('transferring')
    try {
      const res = await fetch('/api/squad/transfer', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ squad_id: squadId }),
      })
      if (res.ok) { setStatus('done'); setTimeout(() => window.location.reload(), 1500) }
      else { const d = await res.json(); setStatus('ineligible'); setReason(d.error) }
    } catch {
      setStatus('ineligible'); setReason('Transfer failed')
    }
  }

  if (status === 'idle') return (
    <button onClick={checkAndClaim}
      className="w-full py-3 rounded-2xl text-sm font-bold border"
      style={{ borderColor: squadColour + '40', color: squadColour }}>
      👑 Claim leadership
    </button>
  )
  if (status === 'checking') return (
    <div className="w-full py-3 rounded-2xl text-sm text-center" style={{ color: 'var(--color-text-tertiary)' }}>
      Checking eligibility…
    </div>
  )
  if (status === 'eligible') return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: `1px solid ${squadColour}40` }}>
      <p className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
        👑 Take over as leader?
      </p>
      <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
        The current leader has been inactive for 30+ days. You can claim leadership of this squad.
      </p>
      <div className="flex gap-2">
        <button onClick={confirmTransfer}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: squadColour }}>
          Claim leadership
        </button>
        <button onClick={() => setStatus('idle')}
          className="px-4 py-2.5 rounded-xl text-sm border"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}>
          Cancel
        </button>
      </div>
    </div>
  )
  if (status === 'ineligible') return (
    <div className="rounded-2xl p-3 text-xs" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)' }}>
      {reason ?? 'Not eligible to claim leadership yet.'}
    </div>
  )
  if (status === 'transferring') return (
    <div className="w-full py-3 rounded-2xl text-sm text-center" style={{ color: squadColour }}>
      Transferring leadership…
    </div>
  )
  if (status === 'done') return (
    <div className="w-full py-3 rounded-2xl text-sm text-center font-bold" style={{ color: squadColour }}>
      👑 You are now the leader!
    </div>
  )
  return null
}

export default function SquadDashboardClient({ squad, role, monthlyKm, userId }: Props) {
  const colour = squad.colour ?? '#c49a3c'
  const isLeader = role === 'leader'

  const [showNudge, setShowNudge]       = useState(false)
  const [nudgeTarget, setNudgeTarget]   = useState<string | null>(null)
  const [nudgeKey, setNudgeKey]         = useState<string>('missing')
  const [nudgeSending, setNudgeSending] = useState(false)
  const [nudgeSent, setNudgeSent]       = useState<string | null>(null)
  const [showShare, setShowShare]       = useState(false)
  const [coachPromptDismissed, setCoachPromptDismissed] = useState(false)
  const [copied, setCopied]             = useState(false)

  const inviteCode = squad.squad_invites?.[0]?.code
  const inviteUrl  = `${typeof window !== 'undefined' ? window.location.origin : 'https://nextsplit-v2.vercel.app'}/squad/join/${inviteCode}`

  const activeMembers = squad.squad_members ?? []
  const goalProgress  = squad.goal_type && squad.goal_value
    ? Math.min(100, (monthlyKm / squad.goal_value) * 100)
    : null

  // Coach pipeline prompt: show when squad is full (5 members) or leader for 30+ days
  const squadAgeDays = Math.floor((Date.now() - new Date(squad.created_at).getTime()) / (1000 * 3600 * 24))
  const showCoachPrompt = isLeader && !coachPromptDismissed && (
    activeMembers.length >= 5 || squadAgeDays >= 30
  )
  const collectiveKm = monthlyKm

  async function sendNudge() {
    if (!nudgeTarget) return
    setNudgeSending(true)
    try {
      const res = await fetch('/api/squad/nudge', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ to_user: nudgeTarget, message_key: nudgeKey }),
      })
      if (res.ok) {
        setNudgeSent(nudgeTarget)
        setShowNudge(false)
        setTimeout(() => setNudgeSent(null), 3000)
      }
    } finally {
      setNudgeSending(false)
    }
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <main className="min-h-screen pb-28" style={{ background: 'var(--color-bg)' }}>

      {/* Header */}
      <div className="px-4 pt-14 pb-4"
        style={{ background: `linear-gradient(180deg, ${colour}20 0%, var(--color-bg) 100%)` }}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: colour }}>
                {squad.logo_url
                  ? <img src={squad.logo_url} className="w-full h-full object-cover rounded-2xl" alt="" />
                  : '👑'}
              </div>
              <div>
                <h1 className="font-display text-xl font-black" style={{ color: 'var(--color-text-primary)' }}>
                  {squad.name}
                </h1>
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  {isLeader ? '👑 Split Leader' : '🏃 Squad member'} · {activeMembers.length}/5 runners
                </p>
              </div>
            </div>

            {isLeader && (
              <Link href="/squad/settings"
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--color-surface-2)' }}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
            )}
          </div>

          {/* Monthly stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-2xl p-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="text-2xl font-black font-data" style={{ color: colour }}>
                {fmtKm(monthlyKm)}km
              </p>
              <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                Squad this month
              </p>
            </div>
            <div className="rounded-2xl p-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="text-2xl font-black font-data" style={{ color: colour }}>
                {activeMembers.length}/5
              </p>
              <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                Active runners
              </p>
            </div>
          </div>

          {/* Goal progress */}
          {goalProgress !== null && (
            <div className="rounded-2xl p-4 mb-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  Monthly goal: {squad.goal_value}{squad.goal_type === 'km' ? 'km' : ' sessions'}
                </p>
                <p className="text-xs font-data font-bold" style={{ color: colour }}>
                  {Math.round(goalProgress)}%
                </p>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${goalProgress}%`, background: colour }} />
              </div>
              <p className="text-[10px] mt-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
                {fmtKm(monthlyKm)}/{squad.goal_value}km by squad
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4">

        {/* Members */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
              Your runners
            </p>
            {isLeader && activeMembers.length < 5 && inviteCode && (
              <button onClick={() => setShowShare(true)}
                className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: `${colour}20`, color: colour }}>
                + Invite
              </button>
            )}
          </div>

          {activeMembers.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="text-4xl mb-3">🏃</div>
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                No members yet
              </p>
              <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                Share your invite link to get your squad running together.
              </p>
              {isLeader && inviteCode && (
                <button onClick={() => setShowShare(true)}
                  className="px-6 py-3 rounded-xl text-sm font-bold text-white"
                  style={{ background: colour }}>
                  Share invite link
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {activeMembers.map(member => (
                <MemberCard
                  key={member.id}
                  member={member}
                  isLeader={isLeader}
                  squadColour={colour}
                  onNudge={userId => { setNudgeTarget(userId); setShowNudge(true) }}
                  onRemove={userId => {
                    if (confirm('Remove this member from your squad?')) {
                      fetch('/api/squad/members', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: userId }),
                      })
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Invite link section (leader) */}
        {isLeader && inviteCode && activeMembers.length < 5 && (
          <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-xs font-bold mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
              YOUR INVITE LINK
            </p>
            <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              Share this with friends. They get 50% off their first Premium month when they join.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 rounded-xl px-3 py-2.5 text-xs font-data truncate"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)' }}>
                {inviteUrl}
              </div>
              <button onClick={copyInvite}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all active:scale-95 flex-shrink-0"
                style={{ background: copied ? '#059669' : colour }}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {/* Non-leader actions */}
        {!isLeader && (
          <div className="space-y-2">
            {/* Leadership transfer — shown if leader inactive 30+ days */}
            <LeaderTransferButton squadId={squad.id} squadColour={colour} />
            <button
              onClick={() => {
                if (confirm('Leave this squad?')) {
                  fetch('/api/squad/members', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: '{}' })
                    .then(() => window.location.reload())
                }
              }}
              className="w-full py-3 rounded-2xl text-sm border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}>
              Leave squad
            </button>
          </div>
        )}
      </div>

      {/* Nudge sheet */}
      {showNudge && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowNudge(false)}>
          <div className="rounded-t-3xl p-6 max-w-lg w-full mx-auto"
            style={{ background: 'var(--color-surface)' }}
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5"
              style={{ background: 'var(--color-border-2)' }} />
            <p className="text-sm font-black mb-4" style={{ color: 'var(--color-text-primary)' }}>
              👟 Choose your nudge
            </p>
            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {NUDGE_KEYS.map(key => (
                <button key={key} onClick={() => setNudgeKey(key)}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all"
                  style={{
                    background: nudgeKey === key ? `${colour}20` : 'var(--color-surface-2)',
                    border: nudgeKey === key ? `1px solid ${colour}40` : '1px solid transparent',
                    color: 'var(--color-text-secondary)',
                  }}>
                  {NUDGE_MESSAGES[key]}
                </button>
              ))}
            </div>
            <button onClick={sendNudge} disabled={nudgeSending}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm transition-all disabled:opacity-60"
              style={{ background: colour }}>
              {nudgeSending ? 'Sending…' : 'Send nudge 👟'}
            </button>
          </div>
        </div>
      )}

      {/* Share sheet */}
      {showShare && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowShare(false)}>
          <div className="rounded-t-3xl p-6 max-w-lg w-full mx-auto"
            style={{ background: 'var(--color-surface)' }}
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5"
              style={{ background: 'var(--color-border-2)' }} />
            <p className="text-sm font-black mb-2" style={{ color: 'var(--color-text-primary)' }}>
              📣 Invite to {squad.name}
            </p>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Friends who join via your link get 50% off their first Premium month. You earn 1 free month when they upgrade.
            </p>
            <div className="rounded-xl px-4 py-3 mb-4 text-xs font-data break-all"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
              {inviteUrl}
            </div>
            <div className="flex gap-3">
              <button onClick={copyInvite}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all"
                style={{ background: copied ? '#059669' : colour }}>
                {copied ? '✓ Link copied!' : 'Copy link'}
              </button>
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={() => navigator.share({ title: `Join ${squad.name} on NextSplit`, url: inviteUrl })}
                  className="flex-1 py-3 rounded-xl font-bold text-sm border"
                  style={{ borderColor: colour, color: colour }}>
                  Share →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trophy Room link */}
      <div className="max-w-lg mx-auto px-4 mt-2">
        <a href="/squad/trophies"
          className="flex items-center justify-between w-full rounded-2xl px-4 py-3 transition-all active:scale-95"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xl">🏆</span>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Trophy Room</p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>Achievements &amp; season history</p>
            </div>
          </div>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-text-tertiary)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* Coach pipeline prompt */}
      {showCoachPrompt && (
        <div className="max-w-lg mx-auto px-4 mt-2">
          <div className="rounded-2xl p-4 relative"
            style={{ background: 'var(--color-surface)', border: '1px solid #1e3a5f40' }}>
            <button
              onClick={() => setCoachPromptDismissed(true)}
              className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-xs"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)' }}>
              ✕
            </button>
            <p className="text-sm font-black mb-1 pr-8" style={{ color: 'var(--color-text-primary)' }}>
              🎓 You could be a coach
            </p>
            <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              You've led your squad to {Math.round(collectiveKm)}km together. Some coaches started exactly like this. Want to explore becoming a NextSplit coach?
            </p>
            <a href="/coach/setup"
              className="inline-block px-4 py-2 rounded-xl text-xs font-bold text-white"
              style={{ background: '#1e3a5f' }}>
              Explore coaching →
            </a>
          </div>
        </div>
      )}

      {/* Nudge sent toast */}
      {nudgeSent && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-3 rounded-full text-sm font-bold text-white shadow-lg"
          style={{ background: colour }}>
          Nudge sent 👟
        </div>
      )}
    </main>
  )
}
