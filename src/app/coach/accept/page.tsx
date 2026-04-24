import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CoachAcceptClient from './CoachAcceptClient'

export default async function CoachAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  if (!token) redirect('/home')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?redirect=/coach/accept?token=${token}`)

  // Pre-fetch coach info from the token
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invite } = await (supabase as any)
    .from('coach_athletes')
    .select('coach_id, athlete_goal')
    .eq('invite_token', token)
    .eq('status', 'pending')
    .maybeSingle()

  if (!invite) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <div className="text-4xl">❌</div>
          <h1 className="text-lg font-bold text-gray-800">Invalid invite link</h1>
          <p className="text-sm text-gray-500">This link has already been used or has expired.</p>
          <a href="/home" className="text-[var(--ns-ember)] text-sm font-semibold hover:underline block mt-4">
            Go to dashboard →
          </a>
        </div>
      </main>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: coach } = await (supabase as any)
    .from('coach_profiles')
    .select('display_name, bio, specialities, verified, photo_url')
    .eq('user_id', invite.coach_id)
    .single()

  return (
    <CoachAcceptClient
      token={token}
      coachName={coach?.display_name ?? 'Your coach'}
      coachBio={coach?.bio ?? null}
      coachVerified={coach?.verified ?? false}
      specialities={coach?.specialities ?? []}
    />
  )
}
