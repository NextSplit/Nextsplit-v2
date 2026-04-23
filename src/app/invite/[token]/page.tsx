import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InviteLandingClient from './InviteLandingClient'

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase  = await createClient()

  // Fetch invite + coach info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invite } = await (supabase as any)
    .from('coach_invites')
    .select('coach_id, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (!invite || invite.used_at || new Date(invite.expires_at) < new Date()) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <div className="text-4xl">❌</div>
          <h1 className="text-lg font-bold text-white">Invalid invite link</h1>
          <p className="text-sm text-gray-400">This link has expired or already been used.</p>
          <a href="/" className="text-[var(--ns-cyan-mid)] text-sm font-semibold hover:underline block mt-4">
            Learn about NextSplit →
          </a>
        </div>
      </main>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: coach } = await (supabase as any)
    .from('coach_profiles')
    .select('display_name, bio, verified, specialities, photo_url, location')
    .eq('user_id', invite.coach_id)
    .single()

  // Check if user is already logged in
  const { data: { user } } = await supabase.auth.getUser()

  // If logged in — go straight to accept page
  if (user) {
    redirect(`/coach/accept?token=${token}`)
  }

  return (
    <InviteLandingClient
      token={token}
      coachName={coach?.display_name ?? 'Your coach'}
      coachBio={coach?.bio ?? null}
      coachVerified={coach?.verified ?? false}
      coachLocation={coach?.location ?? null}
      specialities={coach?.specialities ?? []}
      photoUrl={coach?.photo_url ?? null}
    />
  )
}
