import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Called after a session is logged — updates challenge progress + club feed + season XP
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { km = 0, done = true, session_type, session_name, duration_secs, pace, effort } = await req.json()

    if (!done) return NextResponse.json({ skipped: true })

    const supabaseAny = supabase as unknown as Record<string, unknown> & {
      from: (table: string) => unknown
      rpc: (fn: string, params: unknown) => unknown
    }

    // 1. Update challenge progress
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: activeEntries } = await (supabase as any)
      .from('challenge_entries')
      .select('id, challenge_id, progress, challenges(challenge_type, target_value, reward_xp, reward_title, reward_badge)')
      .eq('user_id', user.id)
      .eq('completed', false)

    for (const entry of (activeEntries ?? [])) {
      const challenge = entry.challenges
      if (!challenge) continue

      let newProgress = entry.progress
      if (challenge.challenge_type === 'distance') newProgress += (km ?? 0)
      if (challenge.challenge_type === 'sessions') newProgress += 1

      const completed = newProgress >= challenge.target_value

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('challenge_entries')
        .update({
          progress:     newProgress,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq('id', entry.id)

      // Award XP on completion
      if (completed) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).rpc('increment_profile_xp', {
          p_user_id:  user.id,
          p_xp:       challenge.reward_xp ?? 0,
          p_season_xp: challenge.reward_xp ?? 0,
        })
      }
    }

    // 2. Update club member weekly_km + post to feed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: memberships } = await (supabase as any)
      .from('club_members')
      .select('club_id, weekly_km, share_feed')
      .eq('user_id', user.id)

    for (const m of (memberships ?? [])) {
      const newKm = (m.weekly_km ?? 0) + (km ?? 0)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('club_members')
        .update({ weekly_km: newKm })
        .eq('club_id', m.club_id)
        .eq('user_id', user.id)

      // Update club total
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: club } = await (supabase as any)
        .from('clubs')
        .select('weekly_km, total_km')
        .eq('id', m.club_id)
        .single()

      if (club) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('clubs')
          .update({ weekly_km: (club.weekly_km ?? 0) + (km ?? 0), total_km: (club.total_km ?? 0) + (km ?? 0) })
          .eq('id', m.club_id)
      }

      // Post to feed if opted in
      if (m.share_feed && session_name) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('club_feed')
          .insert({
            club_id:      m.club_id,
            user_id:      user.id,
            session_type: session_type ?? 'run',
            session_name,
            km:           km ?? null,
            duration_secs: duration_secs ?? null,
            pace:         pace ?? null,
            effort:       effort ?? null,
          })
      }
    }

    // 3. Award base session XP to season_xp
    const sessionXP = Math.round((km ?? 0) * 10) + 50 // 50 base + 10 per km
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).rpc('increment_season_xp', { p_user_id: user.id, p_xp: sessionXP })

    return NextResponse.json({ success: true, xp_awarded: sessionXP })

  } catch (err) {
    console.error('Community progress error:', err)
    return NextResponse.json({ error: 'Progress update failed' }, { status: 500 })
  }
}
