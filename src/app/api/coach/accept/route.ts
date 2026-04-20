import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { token, share_nutrition = false, share_body_weight = false } = await req.json()
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

    // Find the invite
    const { data: invite } = await db(supabase)
      .from('coach_athletes')
      .select('id, coach_id, status')
      .eq('invite_token', token)
      .eq('status', 'pending')
      .maybeSingle()

    if (!invite) {
      return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 404 })
    }

    // Make sure they're not already connected to this coach
    const { data: existing } = await db(supabase)
      .from('coach_athletes')
      .select('id, status')
      .eq('coach_id', invite.coach_id)
      .eq('athlete_id', user.id)
      .maybeSingle()

    if (existing && existing.status === 'active') {
      return NextResponse.json({ error: 'Already connected to this coach' }, { status: 409 })
    }

    // Accept the invite — update the pending row
    await db(supabase)
      .from('coach_athletes')
      .update({
        athlete_id:       user.id,
        status:           'active',
        accepted_at:      new Date().toISOString(),
        share_logs:       true,
        share_wellness:   true,
        share_nutrition,
        share_body_weight,
      })
      .eq('id', invite.id)

    // Get coach display name for confirmation
    const { data: coach } = await db(supabase)
      .from('coach_profiles')
      .select('display_name, slug')
      .eq('user_id', invite.coach_id)
      .single()

    return NextResponse.json({
      success:      true,
      coach_name:   coach?.display_name,
      coach_slug:   coach?.slug,
    })

  } catch (err) {
    console.error('Coach accept error:', err)
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 })
  }
}
