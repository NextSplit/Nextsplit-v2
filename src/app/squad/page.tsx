import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic' // Prevent all caching — squad state is user-specific
export const revalidate = 0
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SquadDashboardClient from './SquadDashboardClient'

export const metadata = { title: 'My Squad — NextSplit' }

export default async function SquadPage() {
  try {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Use service client for squad reads — RLS on squads/squad_members
  // uses auth.uid() which doesn't resolve correctly in server components
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = supabase as any
  const svc = createServiceClient() as any

  // Check if leader using service client (bypasses RLS)
  const { data: mySquad, error: mySquadErr } = await svc
    .from('squads')
    .select('id')
    .eq('leader_id', user.id)
    .is('disbanded_at', null)
    .maybeSingle()

  console.log('[squad] user.id:', user.id, '| mySquad:', mySquad?.id ?? 'null', '| err:', mySquadErr?.message ?? 'none')

  if (mySquad?.id) {
    // Fetch squad without nested profile join (causes PGRST200 with service client)
    const { data: ledSquad } = await svc
      .from('squads')
      .select(`*, squad_members!squad_id(id, user_id, joined_at, last_active_at, removed_at), squad_invites(id, code, uses, max_uses, expires_at)`)
      .eq('id', mySquad.id)
      .single()

    if (ledSquad) {
      // Filter out removed members
      const activeMembers = (ledSquad.squad_members ?? []).filter(
        (m: { removed_at: string | null }) => !m.removed_at
      )
      // Fetch profiles for each member separately
      const memberIds = activeMembers.map((m: { user_id: string }) => m.user_id)
      const { data: memberProfiles } = memberIds.length > 0
        ? await svc.from('profiles').select('id, display_name, handle, runner_class').in('id', memberIds)
        : { data: [] }
      const profileMap = Object.fromEntries((memberProfiles ?? []).map((p: { id: string; display_name: string | null; handle: string | null; runner_class: string | null }) => [p.id, p]))
      ledSquad.squad_members = activeMembers.map((m: { user_id: string }) => ({
        ...m,
        profiles: profileMap[m.user_id] ?? null,
      }))
      return <SquadDashboardClient squad={ledSquad} role="leader" monthlyKm={0} userId={user.id} />
    }
  }

  // Check if member — use service client, avoid nested joins
  const { data: myMembership } = await svc
    .from('squad_members')
    .select('squad_id')
    .eq('user_id', user.id)
    .is('removed_at', null)
    .maybeSingle()

  if (myMembership?.squad_id) {
    const { data: sq } = await svc
      .from('squads')
      .select('*, squad_members!squad_id(id, user_id, joined_at, last_active_at, removed_at), squad_invites(id, code, uses, max_uses, expires_at)')
      .eq('id', myMembership.squad_id)
      .single()

    if (sq) {
      const activeMembers = (sq.squad_members ?? []).filter((m: { removed_at: string | null }) => !m.removed_at)
      const memberIds = activeMembers.map((m: { user_id: string }) => m.user_id)
      const { data: memberProfiles } = memberIds.length > 0
        ? await svc.from('profiles').select('id, display_name, handle, runner_class').in('id', memberIds)
        : { data: [] }
      const profileMap = Object.fromEntries((memberProfiles ?? []).map((p: { id: string }) => [p.id, p]))
      sq.squad_members = activeMembers.map((m: { user_id: string }) => ({ ...m, profiles: profileMap[m.user_id] ?? null }))
      return <SquadDashboardClient squad={sq} role="member" monthlyKm={0} userId={user.id} />
    }
  }

  // Not in a squad — show options
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  // ALPHA: Squad/Split Leader open to all users during alpha testing.
  // Set NEXT_PUBLIC_PREMIUM_ENFORCED=true at go-live to re-enable paywall.
  const premiumEnforced = process.env.NEXT_PUBLIC_PREMIUM_ENFORCED === 'true'
  const isPremium = !premiumEnforced || profile?.subscription_tier === 'premium'

  return (
    <main className="min-h-screen pb-28" style={{ background: 'var(--color-bg)' }}>
      {/* Back nav */}
      <div className="px-4 pt-12 pb-2 flex items-center gap-3">
        <Link href="/today" className="text-sm font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
          ← Today
        </Link>
      </div>
      <div className="px-4 pt-2" style={{ background: 'linear-gradient(180deg, #c49a3c18 0%, var(--color-bg) 100%)' }}>
        <div className="max-w-lg mx-auto pb-6">
          <div className="text-5xl mb-3">👑</div>
          <h1 className="font-display text-2xl font-black mb-1" style={{ color: 'var(--color-text-primary)' }}>
            Split Leader
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Lead a squad of up to 5 friends. Keep each other running. Earn free months when they join Premium.
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4">
        {/* What is Split Leader */}
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          {[
            { icon: '👟', title: 'Nudge your squad', desc: 'Send motivating messages when someone hasn\'t run' },
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

        {isPremium ? (
          <Link href="/squad/create"
            className="block w-full py-4 rounded-2xl font-bold text-lg text-white text-center"
            style={{ background: '#c49a3c' }}>
            👑 Create your squad
          </Link>
        ) : (
          <div className="rounded-2xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid #c49a3c40' }}>
            <p className="text-sm font-black mb-1" style={{ color: 'var(--color-text-primary)' }}>
              Split Leader is a Premium feature
            </p>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Upgrade to Premium to create your squad, lead your crew, and start earning free months.
            </p>
            <Link href="/settings?upgrade=true"
              className="block w-full py-4 rounded-xl font-bold text-sm text-white text-center"
              style={{ background: '#c49a3c' }}>
              Upgrade to Premium — £7.99/mo →
            </Link>
          </div>
        )}

        <p className="text-xs text-center" style={{ color: 'var(--color-text-tertiary)' }}>
          Have an invite link? Open it to join a squad as a member.
        </p>
      </div>
    </main>
  )
  } catch (err) {
    console.error('[squad/page] unhandled error:', String(err))
    throw err
  }
}
