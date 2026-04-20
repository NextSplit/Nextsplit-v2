import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient() as AnyClient
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { join_code, action = 'join' } = await req.json()

    if (action === 'leave') {
      const { club_id } = await req.json()
      // Can't leave if owner
      const { data: membership } = await supabase
        .from('club_members').select('role').eq('club_id', club_id).eq('user_id', user.id).single()
      if (membership?.role === 'owner') {
        return NextResponse.json({ error: 'Transfer ownership before leaving' }, { status: 400 })
      }
      await supabase.from('club_members').delete().eq('club_id', club_id).eq('user_id', user.id)
      // Decrement member count
      await supabase.rpc('decrement_club_members', { p_club_id: club_id })
      return NextResponse.json({ success: true })
    }

    if (!join_code) return NextResponse.json({ error: 'Join code required' }, { status: 400 })

    // Find club by join code
    const { data: club } = await supabase
      .from('clubs').select('id, name, member_count, is_public').eq('join_code', join_code.toUpperCase()).maybeSingle()

    if (!club) return NextResponse.json({ error: 'Invalid join code' }, { status: 404 })

    // Check not already a member
    const { data: existing } = await supabase
      .from('club_members').select('id').eq('club_id', club.id).eq('user_id', user.id).maybeSingle()

    if (existing) return NextResponse.json({ error: 'Already a member', club }, { status: 409 })

    // Join
    await supabase.from('club_members').insert({ club_id: club.id, user_id: user.id, role: 'member' })

    // Increment member count
    await supabase.from('clubs').update({ member_count: club.member_count + 1 }).eq('id', club.id)

    return NextResponse.json({ success: true, club })

  } catch (err) {
    console.error('Club join error:', err)
    return NextResponse.json({ error: 'Failed to join club' }, { status: 500 })
  }
}
