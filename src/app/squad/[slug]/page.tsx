import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient()
  const s = supabase as any
  const { data } = await s.from('squads').select('name, colour').eq('slug', slug).maybeSingle()
  if (!data) return { title: 'Squad — NextSplit' }
  return {
    title: `${data.name} — NextSplit Squad`,
    description: `Join ${data.name} on NextSplit and run together.`,
    openGraph: {
      title: `${data.name} — NextSplit`,
      description: `Run with ${data.name}. Track together. Stay accountable.`,
      images: [`/api/squad/og?slug=${slug}`],
    },
    twitter: { card: 'summary_large_image' },
  }
}

export default async function PublicSquadPage({ params }: Props) {
  const { slug } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient()
  const s = supabase as any

  const { data: squad } = await s
    .from('squads')
    .select(`
      id, name, slug, colour, welcome_msg, is_public, created_at, goal_type, goal_value, goal_month,
      squad_invites(code),
      squad_members!squad_id(id, removed_at),
      profiles!leader_id(display_name, handle)
    `)
    .eq('slug', slug)
    .is('disbanded_at', null)
    .maybeSingle()

  if (!squad) notFound()
  if (!squad.is_public) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ background: 'var(--color-bg)' }}>
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="font-display text-xl font-black mb-2 text-center"
          style={{ color: 'var(--color-text-primary)' }}>
          Private squad
        </h1>
        <p className="text-sm text-center mb-6" style={{ color: 'var(--color-text-secondary)' }}>
          This squad is private. You need an invite link to join.
        </p>
        <Link href="/" className="px-6 py-3 rounded-xl font-bold text-white text-sm"
          style={{ background: '#c49a3c' }}>
          Back to NextSplit
        </Link>
      </main>
    )
  }

  const activeMembers = (squad.squad_members ?? []).filter((m: { removed_at: string | null }) => !m.removed_at)
  const inviteCode = squad.squad_invites?.[0]?.code
  const leaderName = squad.profiles?.display_name ?? squad.profiles?.handle ?? 'the leader'

  const { data: monthlyKm } = await s.rpc('squad_monthly_km', { p_squad_id: squad.id })
  const { data: alltimeKm } = await s.rpc('squad_alltime_km', { p_squad_id: squad.id })
  const colour = squad.colour ?? '#c49a3c'

  // Goal progress
  const goalProgress = squad.goal_type && squad.goal_value
    ? Math.min(100, ((monthlyKm ?? 0) / squad.goal_value) * 100)
    : null

  return (
    <main className="min-h-screen pb-16" style={{ background: 'var(--color-bg)' }}>

      {/* Hero */}
      <div className="px-4 pt-16 pb-8 text-center"
        style={{ background: `linear-gradient(180deg, ${colour}25 0%, var(--color-bg) 100%)` }}>
        <div className="max-w-sm mx-auto">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4"
            style={{ background: colour }}>
            👑
          </div>
          <h1 className="font-display text-3xl font-black mb-2"
            style={{ color: 'var(--color-text-primary)' }}>
            {squad.name}
          </h1>
          <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            Led by {leaderName}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            {activeMembers.length}/5 runners · Running since {new Date(squad.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-4 space-y-4">

        {/* Welcome message */}
        {squad.welcome_msg && (
          <div className="rounded-2xl p-5"
            style={{ background: 'var(--color-surface)', border: `1px solid ${colour}30` }}>
            <p className="text-sm italic" style={{ color: 'var(--color-text-secondary)' }}>
              &ldquo;{squad.welcome_msg}&rdquo;
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-2xl font-black font-data" style={{ color: colour }}>
              {(monthlyKm ?? 0) >= 10 ? Math.round(monthlyKm ?? 0) : (monthlyKm ?? 0).toFixed(1)}km
            </p>
            <p className="text-[10px] uppercase tracking-wider mt-0.5"
              style={{ color: 'var(--color-text-tertiary)' }}>
              This month
            </p>
          </div>
          <div className="rounded-2xl p-4"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-2xl font-black font-data" style={{ color: 'var(--color-text-primary)' }}>
              {(alltimeKm ?? 0) >= 100 ? Math.round(alltimeKm ?? 0) : (alltimeKm ?? 0).toFixed(1)}km
            </p>
            <p className="text-[10px] uppercase tracking-wider mt-0.5"
              style={{ color: 'var(--color-text-tertiary)' }}>
              All time
            </p>
          </div>
        </div>

        {/* Goal progress */}
        {goalProgress !== null && (
          <div className="rounded-2xl p-4"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Monthly goal: {squad.goal_value}{squad.goal_type === 'km' ? 'km' : ' sessions'}
              </p>
              <p className="text-xs font-data font-bold" style={{ color: colour }}>
                {Math.round(goalProgress)}%
              </p>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${goalProgress}%`, background: colour }} />
            </div>
          </div>
        )}

        {/* CTA */}
        {inviteCode ? (
          <div className="rounded-2xl p-6 text-center"
            style={{ background: 'var(--color-surface)', border: `1px solid ${colour}40` }}>
            <p className="text-sm font-black mb-1" style={{ color: 'var(--color-text-primary)' }}>
              Join this squad
            </p>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Run with {squad.name} on NextSplit. First Premium month 50% off.
            </p>
            <Link href={`/squad/join/${inviteCode}`}
              className="block w-full py-4 rounded-2xl font-bold text-white text-sm"
              style={{ background: colour }}>
              Join {squad.name} →
            </Link>
          </div>
        ) : activeMembers.length >= 5 ? (
          <div className="rounded-2xl p-5 text-center"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
              Squad is full
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              This squad has 5 members. Start your own on NextSplit.
            </p>
          </div>
        ) : null}

        {/* NextSplit branding */}
        <div className="text-center pt-2 pb-4">
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            Powered by{' '}
            <Link href="/" className="font-bold" style={{ color: colour }}>
              NextSplit
            </Link>
            {' '}— social running accountability
          </p>
        </div>
      </div>
    </main>
  )
}
