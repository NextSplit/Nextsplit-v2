import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'

const SQUAD_COLOURS = ['#c49a3c', '#06b6d4', '#ff4d6d', '#1e3a5f', '#7c3aed', '#dc2626', '#0891b2', '#059669']

const CreateSquadSchema = z.object({
  name:        z.string().min(2).max(30),
  colour:      z.string().regex(/^#[0-9a-f]{6}$/i).default('#c49a3c'),
  welcome_msg: z.string().max(200).optional(),
  is_public:   z.boolean().default(false),
})

const UpdateSquadSchema = z.object({
  name:        z.string().min(2).max(30).optional(),
  colour:      z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  welcome_msg: z.string().max(200).optional(),
  is_public:   z.boolean().optional(),
  logo_url:    z.string().url().optional(),
  goal_type:   z.enum(['km', 'sessions']).optional().nullable(),
  goal_value:  z.number().int().positive().optional().nullable(),
  goal_month:  z.string().regex(/^\d{4}-\d{2}$/).optional().nullable(),
})


// Fetch weekly km and streak for a list of user IDs
async function fetchMemberStats(s: any, memberIds: string[]) {
  if (!memberIds.length) return {}
  
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const { data: logs } = await s
    .from('training_logs')
    .select('user_id, km, done, created_at')
    .in('user_id', memberIds)
    .eq('done', true)
    .gte('created_at', sevenDaysAgo.toISOString())
  
  // Get active plans for each member
  const { data: plans } = await s
    .from('user_plans')
    .select('user_id, name, goal, race_date, current_week, total_weeks')
    .in('user_id', memberIds)
    .eq('status', 'active')
  
  // Get runner colours
  const { data: profiles } = await s
    .from('profiles')
    .select('id, runner_colour')
    .in('id', memberIds)

  const stats: Record<string, { weekly_km: number; streak: number; plan_name: string | null; race_date: string | null; current_week: number; total_weeks: number; runner_colour: string }> = {}
  
  const planMap = Object.fromEntries((plans ?? []).map((p: any) => [p.user_id, p]))
  const colourMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.runner_colour]))
  
  for (const uid of memberIds) {
    const userLogs = (logs ?? []).filter((l: any) => l.user_id === uid)
    const weeklyKm = userLogs.reduce((s: number, l: any) => s + (l.km ?? 0), 0)
    
    // Simple streak: consecutive days with done logs
    const days = new Set(userLogs.map((l: any) => l.created_at.slice(0, 10)))
    let streak = 0
    const d = new Date()
    for (let i = 0; i < 7; i++) {
      if (days.has(d.toISOString().slice(0, 10))) streak++
      else if (streak > 0) break
      d.setDate(d.getDate() - 1)
    }
    
    const plan = planMap[uid]
    stats[uid] = {
      weekly_km:    Math.round(weeklyKm * 10) / 10,
      streak,
      plan_name:    plan?.name ?? null,
      race_date:    plan?.race_date ?? null,
      current_week: plan?.current_week ?? 0,
      total_weeks:  plan?.total_weeks ?? 0,
      runner_colour: colourMap[uid] ?? '#06b6d4',
    }
  }
  return stats
}

/**
 * GET  /api/squad       — get current user's squad (as leader or member)
 * POST /api/squad       — create a new squad
 * PATCH /api/squad      — update squad settings
 */

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    // Check if user leads a squad — no nested profile join (causes PGRST200)
    const { data: ledSquad, error: ledErr } = await s
      .from('squads')
      .select('*, squad_members!squad_id(id, user_id, joined_at, removed_at, last_active_at), squad_invites(id, code, uses, max_uses, expires_at)')
      .eq('leader_id', user.id)
      .is('disbanded_at', null)
      .maybeSingle()

    if (ledErr) Sentry.captureException(ledErr, { extra: { context: 'ledSquad error' } })

    if (ledSquad) {
      const activeMembers = (ledSquad.squad_members || []).filter(
        (m: { removed_at: string | null }) => !m.removed_at
      )
      // Fetch profiles separately
      const memberIds = activeMembers.map((m: { user_id: string }) => m.user_id)
      const { data: profiles } = memberIds.length > 0
        ? await s.from('profiles').select('id, display_name, handle, runner_class, is_split_leader').in('id', memberIds)
        : { data: [] }
      const profileMap = Object.fromEntries((profiles ?? []).map((p: { id: string }) => [p.id, p]))
      // Include leader in members list (leader_id is not in squad_members table)
      const allIds = [user.id, ...memberIds.filter((id: string) => id !== user.id)]
      const leaderStats = await fetchMemberStats(s, allIds)
      
      // Add leader profile if not already in profileMap
      if (!profileMap[user.id]) {
        const { data: leaderProfile } = await s.from('profiles').select('id, display_name, handle, runner_class, is_split_leader').eq('id', user.id).single()
        if (leaderProfile) profileMap[user.id] = leaderProfile
      }
      
      // Synthetic leader entry at position 0
      const leaderEntry = {
        id: `leader-${user.id}`,
        user_id: user.id,
        joined_at: ledSquad.created_at,
        last_active_at: new Date().toISOString(),
        removed_at: null,
        profiles: profileMap[user.id] ?? null,
        stats: leaderStats[user.id] ?? null,
      }
      
      ledSquad.squad_members = [
        leaderEntry,
        ...activeMembers.filter((m: { user_id: string }) => m.user_id !== user.id).map((m: { user_id: string }) => ({
          ...m,
          profiles: profileMap[m.user_id] ?? null,
          stats: leaderStats[m.user_id] ?? null,
        }))
      ]
      return NextResponse.json({ squad: ledSquad, role: 'leader' })
    }

    // Check if user is a member of a squad — no nested joins
    const { data: myMembership } = await s
      .from('squad_members')
      .select('squad_id')
      .eq('user_id', user.id)
      .is('removed_at', null)
      .maybeSingle()

    if (myMembership?.squad_id) {
      const { data: squad } = await s
        .from('squads')
        .select('*, squad_members!squad_id(id, user_id, joined_at, removed_at, last_active_at), squad_invites(id, code, uses, max_uses, expires_at)')
        .eq('id', myMembership.squad_id)
        .is('disbanded_at', null)
        .maybeSingle()

      if (squad) {
        const activeMembers = (squad.squad_members || []).filter((m: { removed_at: string | null }) => !m.removed_at)
        const memberIds = activeMembers.map((m: { user_id: string }) => m.user_id)
        const { data: profiles } = memberIds.length > 0
          ? await s.from('profiles').select('id, display_name, handle, runner_class').in('id', memberIds)
          : { data: [] }
        const profileMap = Object.fromEntries((profiles ?? []).map((p: { id: string }) => [p.id, p]))
        // Also fetch leader stats if not in members
        const leaderId = squad.leader_id
        const allIds = [...new Set([leaderId, ...memberIds])]
        const memberStats = await fetchMemberStats(s, allIds)
        
        if (!profileMap[leaderId]) {
          const { data: lp } = await s.from('profiles').select('id, display_name, handle, runner_class, is_split_leader').eq('id', leaderId).single()
          if (lp) profileMap[leaderId] = lp
        }
        
        const leaderInMembers = activeMembers.some((m: { user_id: string }) => m.user_id === leaderId)
        const leaderEntry = !leaderInMembers ? [{
          id: `leader-${leaderId}`,
          user_id: leaderId,
          joined_at: squad.created_at,
          last_active_at: new Date().toISOString(),
          removed_at: null,
          profiles: profileMap[leaderId] ?? null,
          stats: memberStats[leaderId] ?? null,
        }] : []
        
        squad.squad_members = [
          ...leaderEntry,
          ...activeMembers.map((m: { user_id: string }) => ({
            ...m,
            profiles: profileMap[m.user_id] ?? null,
            stats: memberStats[m.user_id] ?? null,
          }))
        ]
        return NextResponse.json({ squad, role: 'member' })
      }
    }

    return NextResponse.json({ squad: null, role: null })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Squad GET error:' } })
    return NextResponse.json({ error: 'Failed to fetch squad' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = CreateSquadSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { name, colour, welcome_msg, is_public } = parsed.data

    // Validate colour is from approved palette
    if (!SQUAD_COLOURS.includes(colour)) {
      return NextResponse.json({ error: 'Invalid colour' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    // Check user doesn't already lead a squad
    const { data: existing } = await s
      .from('squads')
      .select('id')
      .eq('leader_id', user.id)
      .is('disbanded_at', null)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'You already lead a squad' }, { status: 400 })
    }

    // Generate unique slug
    const baseSlug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 20)
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`

    // Create squad
    const { data: squad, error: squadErr } = await s.from('squads').insert({
      leader_id:   user.id,
      name:        name.trim(),
      slug,
      colour,
      welcome_msg: welcome_msg?.trim() ?? null,
      is_public,
    }).select().single()

    if (squadErr) {
      Sentry.captureException(squadErr, { extra: { context: 'Squad create error:' } })
      return NextResponse.json({ error: squadErr.message }, { status: 500 })
    }

    // Generate invite code
    const inviteCode = `${slug}-${Math.random().toString(36).slice(2, 8)}`
    await s.from('squad_invites').insert({
      squad_id:   squad.id,
      code:       inviteCode,
      created_by: user.id,
    })

    // Mark user as Split Leader
    await s.from('profiles').update({
      is_split_leader:       true,
      split_leader_squad_id: squad.id,
    }).eq('id', user.id)

    return NextResponse.json({ squad: { ...squad, invite_code: inviteCode } }, { status: 201 })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Squad POST error:' } })
    return NextResponse.json({ error: 'Failed to create squad' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = UpdateSquadSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    const { data: squad } = await s
      .from('squads')
      .select('id')
      .eq('leader_id', user.id)
      .is('disbanded_at', null)
      .single()

    if (!squad) return NextResponse.json({ error: 'Not a squad leader' }, { status: 403 })

    const { data: updated } = await s
      .from('squads')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', squad.id)
      .select()
      .single()

    return NextResponse.json({ squad: updated })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Squad PATCH error:' } })
    return NextResponse.json({ error: 'Failed to update squad' }, { status: 500 })
  }
}
