'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSquad } from '@/hooks/useSquad'
import { useProfile } from '@/hooks/useProfile'
import SquadOrbit from './SquadOrbit'
import SquadLeaderboard from './SquadLeaderboard'
import SquadFeed from './SquadFeed'
import SquadSeasonCard from './SquadSeasonCard'
import SquadDiscoverSection from './SquadDiscoverSection'
import { AppHeader } from '@/components/AppHeader'
import Link from 'next/link'

interface Props { userId: string }

type Tab = 'mine' | 'discover'

// R1 — /community route was a 612-LOC dead end (page.tsx redirected to
// /explore). Resurrected as a "Discover" tab here so the working clubs /
// challenges / races / global-leaderboard surfaces become reachable again.
// "My Squad" stays the primary tab so the founding-thesis inner-ring
// (people you committed to) keeps top billing over the wider tribe.

export default function SquadPageClient({ userId }: Props) {
  const { squad, role, loading } = useSquad()
  const { profile }              = useProfile()
  const searchParams             = useSearchParams()
  const router                   = useRouter()

  const initialTab: Tab = searchParams.get('tab') === 'discover' ? 'discover' : 'mine'
  const [tab, setTab] = useState<Tab>(initialTab)

  // Sync URL when tab changes — keeps deep links shareable and back-button sane.
  useEffect(() => {
    const current = searchParams.get('tab')
    const next    = tab === 'discover' ? 'discover' : null
    if (current === next) return
    const params = new URLSearchParams(searchParams.toString())
    if (next) params.set('tab', next); else params.delete('tab')
    const qs = params.toString()
    router.replace(qs ? `/squad?${qs}` : '/squad', { scroll: false })
  }, [tab, searchParams, router])

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

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>
      <AppHeader
        title={tab === 'mine' ? 'My Squad' : 'Discover'}
        rightSlot={tab === 'mine' && (
          <div className="flex items-center gap-2">
            <Link href="/leaderboard" className="text-xs font-bold px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
              🏆 Leaderboard
            </Link>
            {role === 'leader' && squad && (
              <Link href="/squad/settings" className="text-xs font-bold px-3 py-1.5 rounded-lg"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
                ⚙ Settings
              </Link>
            )}
          </div>
        )}
        bottomSlot={
          <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--color-surface-2)' }}>
            {(['mine', 'discover'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-2 rounded-lg text-xs font-black transition-all"
                style={tab === t
                  ? { background: '#84cc16', color: '#0d1a05' }
                  : { background: 'transparent', color: 'var(--color-text-tertiary)' }
                }>
                {t === 'mine' ? '👥 My Squad' : '🌍 Discover'}
              </button>
            ))}
          </div>
        }
      />

      {/* MY SQUAD tab */}
      {tab === 'mine' && (
        squad ? (
          <div className="max-w-lg mx-auto pt-4">
            <SquadOrbit
              squad={squad}
              members={(squad.squad_members ?? []) as never[]}
              myUserId={userId}
              role={role ?? 'member'}
              inviteCode={squad.squad_invites?.[0]?.code}
            />
            <SquadLeaderboard
              squad={squad}
              members={(squad.squad_members ?? []) as never[]}
              myUserId={userId}
            />
            <SquadSeasonCard squadId={squad.id} />
            <SquadFeed squadId={squad.id} myUserId={userId} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 pt-20 pb-24">
            <div className="text-4xl mb-4">👥</div>
            <h2 className="text-2xl font-black text-center mb-2"
              style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
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
            <button onClick={() => setTab('discover')}
              className="mt-6 text-xs font-bold underline" style={{ color: 'var(--color-text-tertiary)' }}>
              Or browse the wider community →
            </button>
          </div>
        )
      )}

      {/* DISCOVER tab — clubs, challenges, races, global leaderboard */}
      {tab === 'discover' && (() => {
        const ext = (profile ?? {}) as Record<string, unknown>
        return (
          <SquadDiscoverSection
            userId={userId}
            profile={profile ? {
              display_name:    profile.display_name ?? null,
              handle:          (ext.handle as string | null | undefined) ?? null,
              season_xp:       (ext.season_xp as number | null | undefined) ?? null,
              current_league:  (ext.current_league as string | null | undefined) ?? null,
              xp:              (ext.xp as number | null | undefined) ?? null,
            } : null}
          />
        )
      })()}
    </div>
  )
}
