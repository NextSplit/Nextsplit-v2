import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'

const SQUAD_COLOURS = ['#c49a3c', '#2b5c3f', '#e85d26', '#1e3a5f', '#7c3aed', '#dc2626', '#0891b2', '#059669']

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

    // Check if user leads a squad
    const { data: ledSquad } = await s
      .from('squads')
      .select(`
        *,
        squad_members!squad_id (
          id, user_id, joined_at, removed_at, last_active_at,
          profiles (display_name, handle, runner_class, is_split_leader)
        ),
        squad_invites (id, code, uses, max_uses, expires_at)
      `)
      .eq('leader_id', user.id)
      .is('disbanded_at', null)
      .maybeSingle()

    if (ledSquad) {
      // Filter out removed members
      ledSquad.squad_members = (ledSquad.squad_members || []).filter(
        (m: { removed_at: string | null }) => !m.removed_at
      )
      return NextResponse.json({ squad: ledSquad, role: 'leader' })
    }

    // Check if user is a member of a squad
    const { data: membership } = await s
      .from('squad_members')
      .select(`
        *,
        squads (
          *,
          squad_members!squad_id (
            id, user_id, joined_at, removed_at, last_active_at,
            profiles (display_name, handle, runner_class)
          ),
          profiles!leader_id (display_name, handle, runner_class)
        )
      `)
      .eq('user_id', user.id)
      .is('removed_at', null)
      .is('squads.disbanded_at', null)
      .maybeSingle()

    if (membership?.squads) {
      const squad = membership.squads
      squad.squad_members = (squad.squad_members || []).filter(
        (m: { removed_at: string | null }) => !m.removed_at
      )
      return NextResponse.json({ squad, role: 'member', membership })
    }

    return NextResponse.json({ squad: null, role: null })
  } catch (err) {
    console.error('Squad GET error:', err)
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
      console.error('Squad create error:', squadErr)
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
      is_split_leader: true,
    }).eq('id', user.id)

    return NextResponse.json({ squad: { ...squad, invite_code: inviteCode } }, { status: 201 })
  } catch (err) {
    console.error('Squad POST error:', err)
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
    console.error('Squad PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update squad' }, { status: 500 })
  }
}
