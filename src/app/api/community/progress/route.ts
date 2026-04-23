import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { CommunityProgressSchema, zodError } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'

// Called after a session is logged — updates challenge progress + club feed + season XP
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = CommunityProgressSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { km, done, session_type, session_name, duration_secs, pace, effort } = parsed.data

    if (!done) return NextResponse.json({ skipped: true })

    // 1. Update challenge progress
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: activeEntries } = await (supabase as any)
      .from('challenge_entries')
      .select('id, challenge_id, progress, challenges(challenge_type, target_value, reward_xp, reward_title, reward_badge)')
      .eq('user_id', user.id)
      .eq('completed', false)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await Promise.all((activeEntries ?? []).map(async (entry: any) => {
      const challenge = entry.challenges
      if (!challenge) return

      let newProgress = entry.progress
      if (challenge.challenge_type === 'distance') newProgress += (km ?? 0)
      if (challenge.challenge_type === 'sessions') newProgress += 1
      const completed = newProgress >= challenge.target_value

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('challenge_entries').update({
        progress:     newProgress,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      }).eq('id', entry.id)

      if (completed) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).rpc('increment_profile_xp', {
          p_user_id:   user.id,
          p_xp:        challenge.reward_xp ?? 0,
          p_season_xp: challenge.reward_xp ?? 0,
        })
      }
    }))

    // 2. Update club member weekly_km + post to feed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: memberships } = await (supabase as any)
      .from('club_members')
      .select('club_id, weekly_km, share_feed')
      .eq('user_id', user.id)

    if ((memberships ?? []).length > 0) {
      // Batch-fetch all clubs in one query instead of N individual fetches
      const clubIds = (memberships ?? []).map((m: { club_id: string }) => m.club_id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: clubs } = await (supabase as any)
        .from('clubs')
        .select('id, weekly_km, total_km')
        .in('id', clubIds)

      const clubMap = Object.fromEntries(
        (clubs ?? []).map((c: { id: string; weekly_km: number; total_km: number }) => [c.id, c])
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await Promise.all((memberships ?? []).map(async (m: any) => {
        const newKm  = (m.weekly_km ?? 0) + (km ?? 0)
        const club   = clubMap[m.club_id]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = supabase as any

        await Promise.all([
          s.from('club_members').update({ weekly_km: newKm }).eq('club_id', m.club_id).eq('user_id', user.id),
          club
            ? s.from('clubs').update({
                weekly_km: (club.weekly_km ?? 0) + (km ?? 0),
                total_km:  (club.total_km  ?? 0) + (km ?? 0),
              }).eq('id', m.club_id)
            : null,
          m.share_feed && session_name
            ? s.from('club_feed').insert({ club_id: m.club_id, user_id: user.id, session_type: session_type ?? 'run', session_name, km: km ?? null, duration_secs: duration_secs ?? null, pace: pace ?? null, effort: effort ?? null })
            : null,
        ])
      }))
    }

    // 3. Award base session XP to season_xp
    const sessionXP = Math.round((km ?? 0) * 10) + 50 // 50 base + 10 per km
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).rpc('increment_season_xp', { p_user_id: user.id, p_xp: sessionXP })

    return NextResponse.json({ success: true, xp_awarded: sessionXP })

  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Community progress error:' } })
    return NextResponse.json({ error: 'Progress update failed' }, { status: 500 })
  }
}
