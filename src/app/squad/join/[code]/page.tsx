import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { RUNNER_CLASSES } from '@/lib/rpg'

interface Props { params: Promise<{ code: string }> }

export default async function SquadJoinPage({ params }: Props) {
  const { code } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch invite details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = supabase as any

  const { data: invite } = await s
    .from('squad_invites')
    .select(`
      id, code, uses, max_uses, expires_at,
      squads (
        id, name, slug, colour, logo_url, welcome_msg, disbanded_at,
        profiles!leader_id (display_name, handle, runner_class),
        squad_members!squad_id (id, removed_at,
          profiles (display_name, runner_class)
        )
      )
    `)
    .eq('code', code)
    .maybeSingle()

  if (!invite || !invite.squads || invite.squads.disbanded_at) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-bg)' }}>
        <div className="text-center">
          <div className="text-5xl mb-4">💨</div>
          <h1 className="text-xl font-black mb-2" style={{ color: 'var(--color-text-primary)' }}>Squad not found</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            This invite may have expired or the squad was disbanded.
          </p>
          <Link href="/" className="text-sm font-bold" style={{ color: 'var(--ns-ember)' }}>
            Explore NextSplit →
          </Link>
        </div>
      </main>
    )
  }

  const squad   = invite.squads
  const colour  = squad.colour ?? '#c49a3c'
  const leader  = squad.profiles
  const members = (squad.squad_members ?? []).filter((m: { removed_at: string | null }) => !m.removed_at)
  const isFull  = members.length >= 5

  // Is user already a member?
  const isAlreadyMember = user ? members.some((m: { user_id?: string }) => m.user_id === user.id) : false
  const isLeader = user?.id === squad.leader_id

  // Get leader's runner class info
  const leaderClass = RUNNER_CLASSES[leader?.runner_class as keyof typeof RUNNER_CLASSES] ?? RUNNER_CLASSES.warming_up

  // Calculate collective km (rough from RPC)
  const { data: monthlyKm } = await s.rpc('squad_monthly_km', { p_squad_id: squad.id })

  return (
    <main className="min-h-screen" style={{ background: 'var(--color-bg)' }}>

      {/* Hero */}
      <div className="relative overflow-hidden px-4 pt-16 pb-10 text-center"
        style={{ background: `linear-gradient(180deg, ${colour}25 0%, var(--color-bg) 100%)` }}>

        {/* Large squad colour orb */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl opacity-20"
          style={{ background: colour }} />

        <div className="relative">
          {/* Squad logo / crown */}
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-2xl"
            style={{ background: colour }}>
            {squad.logo_url ? (
              <img src={squad.logo_url} className="w-full h-full object-cover rounded-3xl" alt="" />
            ) : '👑'}
          </div>

          <h1 className="text-3xl font-black mb-1" style={{ color: 'var(--color-text-primary)' }}>
            {squad.name}
          </h1>

          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            Led by <strong style={{ color: 'var(--color-text-primary)' }}>
              {leader?.display_name ?? leader?.handle ?? 'A Split Leader'}
            </strong>
            {' '}{leaderClass.emoji}
          </p>

          {/* Stats strip */}
          <div className="flex justify-center gap-6 mb-5">
            <div className="text-center">
              <p className="text-2xl font-black font-data" style={{ color: colour }}>
                {members.length}/5
              </p>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
                Members
              </p>
            </div>
            <div className="w-px" style={{ background: 'var(--color-border)' }} />
            <div className="text-center">
              <p className="text-2xl font-black font-data" style={{ color: colour }}>
                {Math.round(monthlyKm ?? 0)}
              </p>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
                km this month
              </p>
            </div>
          </div>

          {/* Welcome message */}
          {squad.welcome_msg && (
            <div className="max-w-xs mx-auto rounded-2xl px-4 py-3 mb-6"
              style={{ background: `${colour}15`, border: `1px solid ${colour}30` }}>
              <p className="text-sm italic" style={{ color: 'var(--color-text-secondary)' }}>
                &ldquo;{squad.welcome_msg}&rdquo;
              </p>
            </div>
          )}

          {/* Member avatars */}
          {members.length > 0 && (
            <div className="flex justify-center gap-1 mb-6">
              {members.slice(0, 5).map((m: { profiles: { runner_class: string; display_name: string } }, i: number) => {
                const cls = RUNNER_CLASSES[m.profiles?.runner_class as keyof typeof RUNNER_CLASSES] ?? RUNNER_CLASSES.warming_up
                return (
                  <div key={i} className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                    style={{ background: 'var(--color-surface-2)', border: `2px solid ${colour}40` }}
                    title={m.profiles?.display_name}>
                    {cls.emoji}
                  </div>
                )
              })}
              {members.length > 0 && !isFull && (
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm"
                  style={{ background: 'var(--color-surface-2)', border: `2px dashed ${colour}40`, color: 'var(--color-text-tertiary)' }}>
                  +
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CTA section */}
      <div className="max-w-sm mx-auto px-4 space-y-4 pb-12">

        {isLeader ? (
          <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>This is your squad 👑</p>
            <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>Share this link with your friends to invite them.</p>
            <Link href="/squad" className="block w-full py-3 rounded-xl font-bold text-sm text-white text-center"
              style={{ background: colour }}>
              Go to squad dashboard →
            </Link>
          </div>
        ) : isAlreadyMember ? (
          <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>You're already in this squad ✅</p>
            <Link href="/squad" className="block w-full py-3 rounded-xl font-bold text-sm text-white text-center mt-3"
              style={{ background: colour }}>
              Go to squad →
            </Link>
          </div>
        ) : isFull ? (
          <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-2xl mb-2">😔</p>
            <p className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Squad is full</p>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {squad.name} has reached the maximum of 5 members.
            </p>
            <Link href="/auth/signup" className="block w-full py-3 rounded-xl font-bold text-sm text-white text-center"
              style={{ background: 'var(--ns-forest)' }}>
              Start your own squad on NextSplit →
            </Link>
          </div>
        ) : user ? (
          /* Logged-in user, not yet a member */
          <form action={`/api/squad/members`} method="POST">
            <input type="hidden" name="invite_code" value={code} />
            <Link href={`/squad/join/confirm?code=${code}`}
              className="block w-full py-4 rounded-2xl font-bold text-lg text-white text-center transition-all active:scale-95"
              style={{ background: colour }}>
              Join {squad.name} →
            </Link>
          </form>
        ) : (
          /* Logged-out user */
          <>
            {/* Premium offer */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-start gap-3 mb-4">
                <div className="text-2xl">🎁</div>
                <div>
                  <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>
                    Join with Premium for £3.99
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    First month half price. Then £7.99/mo. Cancel anytime.
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {[
                  `See your squad's full activity and stats`,
                  'Get nudges when you need motivation',
                  'Celebrate each other\'s milestones',
                  'Squad Trophy Room and seasons',
                ].map(f => (
                  <div key={f} className="flex items-start gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    <span style={{ color: colour }}>✓</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <Link
                href={`/auth/signup?squad=${code}&offer=squad_invite`}
                className="block w-full py-4 rounded-xl font-bold text-lg text-white text-center transition-all active:scale-95"
                style={{ background: colour }}>
                Join {squad.name} — £3.99 first month →
              </Link>
            </div>

            <div className="text-center">
              <p className="text-xs mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
                Already have an account?
              </p>
              <Link href={`/auth/login?redirect=/squad/join/${code}`}
                className="text-sm font-bold" style={{ color: 'var(--ns-ember)' }}>
                Sign in to join →
              </Link>
            </div>

            <div className="text-center">
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                Join for free — you can upgrade to Premium anytime
              </p>
              <Link href={`/auth/signup?squad=${code}`}
                className="text-sm font-bold mt-1 block" style={{ color: 'var(--color-text-tertiary)' }}>
                Join free (limited squad features)
              </Link>
            </div>
          </>
        )}

        {/* Social proof */}
        <div className="text-center pt-4">
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            NextSplit — Train together. Adapt together.
          </p>
        </div>
      </div>
    </main>
  )
}
