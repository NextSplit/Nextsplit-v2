import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Verify user is a coach
    const { data: coachProfile } = await db(supabase)
      .from('coach_profiles')
      .select('user_id, max_athletes, accepting_athletes')
      .eq('user_id', user.id)
      .single()

    if (!coachProfile) return NextResponse.json({ error: 'Not a coach' }, { status: 403 })
    if (!coachProfile.accepting_athletes) return NextResponse.json({ error: 'Not currently accepting athletes' }, { status: 400 })

    // Check active athlete count
    const { count } = await db(supabase)
      .from('coach_athletes')
      .select('id', { count: 'exact', head: true })
      .eq('coach_id', user.id)
      .eq('status', 'active')

    if ((count ?? 0) >= coachProfile.max_athletes) {
      return NextResponse.json({ error: 'Maximum athletes reached' }, { status: 400 })
    }

    const { athlete_goal, coach_notes } = await req.json().catch(() => ({}))

    // Generate unique invite token — store without athlete_id until accepted
    const token = randomBytes(16).toString('hex')

    // Use a pending_invites pattern — no athlete_id yet
    // We store in coach_athletes with a NULL athlete_id placeholder
    // athlete_id gets set when they accept
    const { error } = await db(supabase)
      .from('coach_athletes')
      .insert({
        coach_id:     user.id,
        athlete_id:   user.id,  // temporary — overwritten on accept
        status:       'pending',
        invite_token: token,
        invited_at:   new Date().toISOString(),
        athlete_goal: athlete_goal ?? null,
        coach_notes:  coach_notes ?? null,
      })

    if (error) {
      console.error('Invite insert error:', error)
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
    }

    const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/coach/accept?token=${token}`
    return NextResponse.json({ token, inviteUrl })

  } catch (err) {
    console.error('Coach invite error:', err)
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }
}
