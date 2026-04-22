import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'

const TransferSchema = z.object({
  squad_id: z.string().uuid(),
})

/**
 * POST /api/squad/transfer
 * Any Premium member can claim leadership if the current leader has been
 * inactive for 30+ days. Leader's is_split_leader flips to false, requester's
 * to true. Squad.leader_id updated.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = TransferSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { squad_id } = parsed.data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    // Fetch squad + leader info
    const { data: squad } = await s
      .from('squads')
      .select('id, leader_id, disbanded_at, name')
      .eq('id', squad_id)
      .is('disbanded_at', null)
      .single()

    if (!squad) return NextResponse.json({ error: 'Squad not found' }, { status: 404 })
    if (squad.leader_id === user.id) {
      return NextResponse.json({ error: 'You are already the leader' }, { status: 400 })
    }

    // Requester must be an active member
    const { data: membership } = await s
      .from('squad_members')
      .select('id')
      .eq('squad_id', squad_id)
      .eq('user_id', user.id)
      .is('removed_at', null)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this squad' }, { status: 403 })
    }

    // Requester must be Premium
    const { data: requesterProfile } = await s
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()

    const isPremium = requesterProfile?.subscription_tier === 'premium' ||
                      requesterProfile?.subscription_tier === 'pro'
    if (!isPremium) {
      return NextResponse.json({ error: 'Leadership transfer requires Premium' }, { status: 403 })
    }

    // Check leader inactivity — must be 30+ days since last training log
    const { data: leaderLogs } = await s
      .from('training_logs')
      .select('logged_at')
      .eq('user_id', squad.leader_id)
      .order('logged_at', { ascending: false })
      .limit(1)

    const lastLog = leaderLogs?.[0]?.logged_at
    if (lastLog) {
      const daysSinceActive = Math.floor(
        (Date.now() - new Date(lastLog).getTime()) / (1000 * 3600 * 24)
      )
      if (daysSinceActive < 30) {
        return NextResponse.json({
          error: `Leader was active ${daysSinceActive} days ago. Transfer requires 30+ days of inactivity.`,
        }, { status: 400 })
      }
    }

    // Execute transfer
    await Promise.all([
      // Update squad leader
      s.from('squads').update({ leader_id: user.id }).eq('id', squad_id),
      // Remove old leader's Split Leader flag
      s.from('profiles').update({ is_split_leader: false }).eq('id', squad.leader_id),
      // Grant requester Split Leader flag
      s.from('profiles').update({ is_split_leader: true }).eq('id', user.id),
      // Post to squad feed
      s.from('squad_feed').insert({
        squad_id,
        user_id:        user.id,
        milestone_type: 'leadership_transfer',
      }).catch(() => {}),
    ])

    return NextResponse.json({ transferred: true, new_leader_id: user.id })
  } catch (err) {
    console.error('Leadership transfer error:', err)
    return NextResponse.json({ error: 'Failed to transfer leadership' }, { status: 500 })
  }
}
