'use client'

import { useSquad } from '@/hooks/useSquad'
import SquadOrbit from './SquadOrbit'
import SquadLeaderboard from './SquadLeaderboard'
import SquadFeed from './SquadFeed'
import SquadSeasonCard from './SquadSeasonCard'
import Link from 'next/link'

interface Props { userId: string }

export default function SquadPageClient({ userId }: Props) {
  const { squad, role, loading } = useSquad()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3"
            style={{ borderColor: '#84cc16', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Loading squad…</p>
        </div>
      </div>
    )
  }

  if (!squad) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pb-24"
        style={{ background: 'var(--color-bg)' }}>
        <div className="text-4xl mb-4">👥</div>
        <h2 className="text-2xl font-black text-center mb-2" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
          No squad yet
        </h2>
        <p className="text-sm text-center mb-8" style={{ color: 'var(--color-text-tertiary)' }}>
          Training is better together. Start or join a squad.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link href="/squad/create"
            className="py-4 rounded-2xl font-black text-center"
            style={{ background: '#84cc16', color: '#0d1a05' }}>
            👑 Start a squad
          </Link>
          <Link href="/squad/join"
            className="py-4 rounded-2xl font-black text-center"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
            🔗 Join with a code
          </Link>
        </div>
      </div>
    )
  }

  const inviteCode = squad.squad_invites?.[0]?.code

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const members = (squad.squad_members ?? []) as any[]

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 border-b"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-lg mx-auto px-4 pt-12 pb-3 flex items-center justify-between">
          <h1 className="text-base font-black" style={{ color: 'var(--color-text-primary)' }}>
            My Squad
          </h1>
          <div className="flex items-center gap-2">
            <Link href="/leaderboard" className="text-xs font-bold px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
              🏆 Leaderboard
            </Link>
            {role === 'leader' && (
              <Link href="/squad/settings" className="text-xs font-bold px-3 py-1.5 rounded-lg"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
                ⚙ Settings
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto pt-4">
        <SquadOrbit
          squad={squad}
          members={members}
          myUserId={userId}
          role={role ?? 'member'}
          inviteCode={inviteCode}
        />
        <SquadLeaderboard
          squad={squad}
          members={members}
          myUserId={userId}
        />
        <SquadSeasonCard squadId={squad.id} />
        <SquadFeed
          squadId={squad.id}
          myUserId={userId}
        />
      </div>
    </div>
  )
}
