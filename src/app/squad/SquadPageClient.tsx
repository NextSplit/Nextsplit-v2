'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import SquadDashboardClient from './SquadDashboardClient'
import MedicalDisclaimer from '@/components/MedicalDisclaimer'

interface Props { userId: string }

export default function SquadPageClient({ userId }: Props) {
  const [loading, setLoading]   = useState(true)
  const [squad, setSquad]       = useState<any>(null)
  const [role, setRole]         = useState<'leader' | 'member' | null>(null)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/squad')
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setSquad(data.squad)
        setRole(data.role)
      })
      .catch(() => setError('Failed to load squad'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: 'var(--ns-track)', animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-bg)' }}>
        <div className="text-center">
          <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>{error}</p>
          <button onClick={() => window.location.reload()}
            className="text-xs font-bold px-4 py-2 rounded-xl"
            style={{ background: 'var(--ns-ember)', color: 'white' }}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (squad && role) {
    return <SquadDashboardClient squad={squad} role={role} monthlyKm={0} userId={userId} />
  }

  // No squad — show explainer
  return (
    <main className="min-h-screen pb-28" style={{ background: 'var(--color-bg)' }}>
      <div className="px-4 pt-12 pb-2 flex items-center gap-3">
        <Link href="/today" className="text-sm font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
          ← Today
        </Link>
      </div>
      <div className="px-4 pt-2" style={{ background: 'linear-gradient(180deg, #c49a3c18 0%, var(--color-bg) 100%)' }}>
        <div className="max-w-lg mx-auto pb-6">
          <div className="text-5xl mb-3">👑</div>
          <h1 className="font-display text-2xl italic mb-1" style={{ color: 'var(--color-text-primary)' }}>
            Split Leader
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Lead a squad of up to 5 friends. Keep each other running. Earn free months when they join Premium.
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4">
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          {[
            { icon: '👟', title: 'Nudge your squad', desc: "Send motivating messages when someone hasn't run" },
            { icon: '📊', title: 'Track together', desc: 'See who ran today, weekly totals, collective goals' },
            { icon: '🏆', title: 'Celebrate milestones', desc: 'Squad Trophy Room, monthly seasons, achievements' },
            { icon: '🎁', title: 'Earn free months', desc: 'Get 1 free month for every friend who joins Premium' },
          ].map(f => (
            <div key={f.title} className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">{f.icon}</span>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{f.title}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Link href="/squad/create"
          className="block w-full py-4 rounded-2xl font-black text-lg text-white text-center active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, var(--ns-track) 0%, #a8832a 100%)' }}>
          👑 Create your squad
        </Link>

        <p className="text-xs text-center" style={{ color: 'var(--color-text-tertiary)' }}>
          Have an invite link? Open it to join a squad as a member.
        </p>
        <div className="mt-2">
          <MedicalDisclaimer variant="compact" />
        </div>
      </div>
    </main>
  )
}
