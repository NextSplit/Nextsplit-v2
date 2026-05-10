import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/supabase/db'
import MessagesClient from './MessagesClient'

// /coach/messages — athlete's coach-comms inbox (P3.3).
// Counterpart to /coach/athlete/[athleteId]?tab=comms which is the coach
// side of the same thread. The athlete sees ONE thread (with their
// active coach); coaches see N threads (one per athlete).
//
// Surfaces the existing CoachMessageThread component used by the
// athlete-side Today tab CoachCard. Reuses POST /api/coach/message and
// GET /api/coach/message?coach_id&athlete_id for thread fetch.
//
// Push notifications now route here for coach→athlete inbound (PR #46
// fixes the previous routing to /coach which redirected athletes to
// /coach/setup). HomeClient HeroCoach has linked here all along —
// previously 404'd.
//
// Auth gate is server-side: must be logged in AND have an active
// coach_athletes relationship. Athletes without a coach get bounced
// to /coaches (the coach browse surface) so they can find one.

export default async function CoachMessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rel } = await (db(supabase) as any)
    .from('coach_athletes')
    .select('coach_id')
    .eq('athlete_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!rel) redirect('/coaches')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: coachProfile } = await (db(supabase) as any)
    .from('coach_profiles')
    .select('user_id, display_name, slug, photo_url')
    .eq('user_id', rel.coach_id)
    .maybeSingle()

  if (!coachProfile) redirect('/coaches')

  return (
    <MessagesClient
      coachId={rel.coach_id}
      athleteId={user.id}
      coachName={coachProfile.display_name ?? 'Your coach'}
      coachSlug={coachProfile.slug ?? null}
      coachPhotoUrl={coachProfile.photo_url ?? null}
    />
  )
}
