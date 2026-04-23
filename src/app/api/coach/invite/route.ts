import * as Sentry from '@sentry/nextjs'
import { config } from '@/lib/config'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import { randomBytes } from 'crypto'
import { CoachInviteSchema, zodError } from '@/lib/schemas'

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
    if (!coachProfile.accepting_athletes) {
      return NextResponse.json({ error: 'Not currently accepting athletes' }, { status: 400 })
    }

    // Check active athlete count
    const { count } = await db(supabase)
      .from('coach_athletes')
      .select('id', { count: 'exact', head: true })
      .eq('coach_id', user.id)
      .eq('status', 'active')

    if ((count ?? 0) >= coachProfile.max_athletes) {
      return NextResponse.json({ error: 'Maximum athletes reached' }, { status: 400 })
    }

    const parsed = CoachInviteSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return zodError(parsed.error)
    const { athlete_goal, coach_notes } = parsed.data

    // Generate unique token — stored in coach_invites table (no athlete_id yet)
    const token = randomBytes(16).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('coach_invites')
      .insert({
        coach_id:     user.id,
        token,
        athlete_goal: athlete_goal ?? null,
        coach_notes:  coach_notes ?? null,
        expires_at:   expiresAt,
      })

    const inviteUrl = `${config.siteUrl}/invite/${token}`
    return NextResponse.json({ token, inviteUrl })

  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Coach invite error:' } })
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }
}
