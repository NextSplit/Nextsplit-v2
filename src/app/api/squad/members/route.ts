import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'

const JoinSchema = z.object({
  invite_code: z.string().min(1),
})

const RemoveSchema = z.object({
  user_id: z.string().uuid(),
})

/**
 * POST /api/squad/members  — join a squad via invite code
 * DELETE /api/squad/members — remove a member (leader only) or leave (self)
 */

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = JoinSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { invite_code } = parsed.data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    // Fetch invite
    const { data: invite } = await s
      .from('squad_invites')
      .select('id, squad_id, uses, max_uses, expires_at')
      .eq('code', invite_code)
      .maybeSingle()

    if (!invite) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite expired' }, { status: 410 })
    }
    if (invite.max_uses && invite.uses >= invite.max_uses) {
      return NextResponse.json({ error: 'Invite full' }, { status: 410 })
    }

    // Check squad isn't disbanded and has space
    const { data: squad } = await s
      .from('squads')
      .select('id, name, leader_id, disbanded_at')
      .eq('id', invite.squad_id)
      .single()

    if (!squad || squad.disbanded_at) {
      return NextResponse.json({ error: 'Squad no longer exists' }, { status: 404 })
    }

    // Can't join own squad as leader
    if (squad.leader_id === user.id) {
      return NextResponse.json({ error: 'You lead this squad' }, { status: 400 })
    }

    // Check not already a member
    const { data: existingMember } = await s
      .from('squad_members')
      .select('id, removed_at')
      .eq('squad_id', invite.squad_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingMember && !existingMember.removed_at) {
      return NextResponse.json({ error: 'Already a member' }, { status: 400 })
    }

    // Check squad isn't full (max 5 members)
    const { count } = await s
      .from('squad_members')
      .select('id', { count: 'exact' })
      .eq('squad_id', invite.squad_id)
      .is('removed_at', null)

    if ((count ?? 0) >= 5) {
      return NextResponse.json({ error: 'Squad is full (max 5 members)' }, { status: 400 })
    }

    // Check user's Premium status
    const { data: profile } = await s
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()
    const isPremium = profile?.subscription_tier === 'premium' || profile?.subscription_tier === 'pro'

    // Join or rejoin
    if (existingMember?.removed_at) {
      await s.from('squad_members').update({
        removed_at:          null,
        removed_by:          null,
        joined_at:           new Date().toISOString(),
        invite_code,
        converted_via_invite: true,
        is_premium_at_join:   isPremium,
        last_active_at:       new Date().toISOString(),
      }).eq('id', existingMember.id)
    } else {
      await s.from('squad_members').insert({
        squad_id:            invite.squad_id,
        user_id:             user.id,
        invited_by:          squad.leader_id,
        invite_code,
        converted_via_invite: true,
        is_premium_at_join:   isPremium,
      })
    }

    // Increment invite use count
    await s.from('squad_invites').update({ uses: invite.uses + 1 }).eq('id', invite.id)

    // Post to squad feed
    await s.from('squad_feed').insert({
      squad_id:       invite.squad_id,
      user_id:        user.id,
      milestone_type: 'joined_squad',
    }).catch(() => {})

    // Notify leader
    // (non-blocking — notification system handles delivery)

    return NextResponse.json({ joined: true, squad_id: invite.squad_id })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Squad join error:' } })
    return NextResponse.json({ error: 'Failed to join squad' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const isLeaderRemoval = RemoveSchema.safeParse(body).success
    const targetUserId = isLeaderRemoval ? body.user_id : user.id

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    if (isLeaderRemoval) {
      // Verify requester is the squad leader
      const { data: squad } = await s
        .from('squads')
        .select('id')
        .eq('leader_id', user.id)
        .is('disbanded_at', null)
        .maybeSingle()

      if (!squad) return NextResponse.json({ error: 'Not a squad leader' }, { status: 403 })

      await s.from('squad_members').update({
        removed_at: new Date().toISOString(),
        removed_by: user.id,
      }).eq('squad_id', squad.id).eq('user_id', targetUserId)
    } else {
      // User leaving their own squad
      await s.from('squad_members').update({
        removed_at: new Date().toISOString(),
        removed_by: user.id,
      }).eq('user_id', user.id).is('removed_at', null)
    }

    return NextResponse.json({ left: true })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Squad leave/remove error:' } })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
