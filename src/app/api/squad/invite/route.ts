import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/squad/invite?code=xxx
 * Public endpoint — returns squad preview for invite landing page
 */
export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')
    if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    // Fetch invite + squad info
    const { data: invite } = await s
      .from('squad_invites')
      .select(`
        id, code, uses, max_uses, expires_at,
        squads (
          id, name, slug, colour, logo_url, welcome_msg, is_public, disbanded_at,
          profiles!leader_id (display_name, handle, runner_class),
          squad_members!squad_id (id, removed_at,
            profiles (display_name, runner_class)
          )
        )
      `)
      .eq('code', code)
      .maybeSingle()

    if (!invite) return NextResponse.json({ error: 'Invalid invite' }, { status: 404 })

    const squad = invite.squads
    if (!squad || squad.disbanded_at) {
      return NextResponse.json({ error: 'Squad no longer exists' }, { status: 404 })
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite expired' }, { status: 410 })
    }
    if (invite.max_uses && invite.uses >= invite.max_uses) {
      return NextResponse.json({ error: 'Invite full' }, { status: 410 })
    }

    // Active members only, don't expose removed
    const activeMembers = (squad.squad_members || [])
      .filter((m: { removed_at: string | null }) => !m.removed_at)
      .map((m: { profiles: { display_name: string; runner_class: string } }) => ({
        display_name: m.profiles?.display_name ?? 'Runner',
        runner_class: m.profiles?.runner_class ?? 'warming_up',
      }))

    // Calculate collective km this month (RPC)
    const { data: monthlyKm } = await s.rpc('squad_monthly_km', { p_squad_id: squad.id })

    return NextResponse.json({
      invite: {
        code,
        squad_id: squad.id,
        squad_name: squad.name,
        squad_colour: squad.colour,
        squad_logo: squad.logo_url,
        welcome_msg: squad.welcome_msg,
        leader_name: squad.profiles?.display_name ?? squad.profiles?.handle ?? 'The Leader',
        leader_class: squad.profiles?.runner_class ?? 'warming_up',
        member_count: activeMembers.length,
        members: activeMembers, // first names only
        monthly_km: monthlyKm ?? 0,
        is_full: activeMembers.length >= 5,
      }
    })
  } catch (err) {
    console.error('Invite lookup error:', err)
    return NextResponse.json({ error: 'Failed to fetch invite' }, { status: 500 })
  }
}
