import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { CoachAcceptSchema, zodError } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = CoachAcceptSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { token, share_nutrition, share_body_weight } = parsed.data
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

    // Find the invite from coach_invites
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: invite } = await (supabase as any)
      .from('coach_invites')
      .select('id, coach_id, athlete_goal, coach_notes, expires_at, used_at')
      .eq('token', token)
      .maybeSingle()

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 })
    }

    if (invite.used_at) {
      return NextResponse.json({ error: 'This invite has already been used' }, { status: 409 })
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })
    }

    // Check not already connected
    const { data: existing } = await db(supabase)
      .from('coach_athletes')
      .select('id, status')
      .eq('coach_id', invite.coach_id)
      .eq('athlete_id', user.id)
      .maybeSingle()

    if (existing?.status === 'active') {
      return NextResponse.json({ error: 'Already connected to this coach' }, { status: 409 })
    }

    // Create the coach-athlete relationship
    if (existing) {
      // Reactivate paused/ended relationship
      await db(supabase)
        .from('coach_athletes')
        .update({ status: 'active', accepted_at: new Date().toISOString(), share_nutrition, share_body_weight })
        .eq('id', existing.id)
    } else {
      await db(supabase)
        .from('coach_athletes')
        .insert({
          coach_id:         invite.coach_id,
          athlete_id:       user.id,
          status:           'active',
          accepted_at:      new Date().toISOString(),
          share_logs:       true,
          share_wellness:   true,
          share_nutrition,
          share_body_weight,
          athlete_goal:     invite.athlete_goal ?? null,
          coach_notes:      invite.coach_notes ?? null,
        })
    }

    // Mark invite as used
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('coach_invites')
      .update({ used_at: new Date().toISOString(), used_by: user.id })
      .eq('id', invite.id)

    // Get coach info for confirmation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: coach } = await (supabase as any)
      .from('coach_profiles')
      .select('display_name, slug')
      .eq('user_id', invite.coach_id)
      .single()

    return NextResponse.json({ success: true, coach_name: coach?.display_name, coach_slug: coach?.slug })

  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Coach accept error:' } })
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 })
  }
}
