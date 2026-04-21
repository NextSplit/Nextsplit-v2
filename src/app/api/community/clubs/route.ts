import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'
import { CreateClubSchema, zodError } from '@/lib/schemas'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

function generateJoinCode(): string {
  return randomBytes(3).toString('hex').toUpperCase() // e.g. A3F9C2
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient() as AnyClient
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') ?? 'mine' // 'mine' | 'discover'

    if (filter === 'mine') {
      // Clubs the user belongs to
      const { data } = await supabase
        .from('club_members')
        .select(`club_id, role, weekly_km, season_xp, clubs(*)`)
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })
      return NextResponse.json({ clubs: data ?? [] })
    }

    // Discover: public clubs sorted by member count
    const { data } = await supabase
      .from('clubs')
      .select('*')
      .eq('is_public', true)
      .order('member_count', { ascending: false })
      .limit(20)
    return NextResponse.json({ clubs: data ?? [] })

  } catch (err) {
    console.error('Get clubs error:', err)
    return NextResponse.json({ error: 'Failed to fetch clubs' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient() as AnyClient
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = CreateClubSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { name, description, emoji, is_public } = parsed.data
    if (!name?.trim()) return NextResponse.json({ error: 'Club name required' }, { status: 400 })

    const slug      = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 40)
    const join_code = generateJoinCode()

    // Check slug not taken — add random suffix if needed
    const { data: existing } = await supabase.from('clubs').select('id').eq('slug', slug).maybeSingle()
    const finalSlug = existing ? `${slug}-${randomBytes(2).toString('hex')}` : slug

    const { data: club, error } = await supabase
      .from('clubs')
      .insert({ name: name.trim(), slug: finalSlug, description: description ?? null, emoji, is_public, join_code, owner_id: user.id })
      .select()
      .single()

    if (error) throw error

    // Add owner as member
    await supabase.from('club_members').insert({
      club_id: club.id, user_id: user.id, role: 'owner',
    })

    return NextResponse.json({ success: true, club })

  } catch (err) {
    console.error('Create club error:', err)
    return NextResponse.json({ error: 'Failed to create club' }, { status: 500 })
  }
}
