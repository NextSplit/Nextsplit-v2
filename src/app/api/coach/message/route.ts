import { NextRequest, NextResponse } from 'next/server'
import { CoachMessageSchema, zodError } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = CoachMessageSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { coach_id, athlete_id, body } = parsed.data
    if (!body?.trim()) return NextResponse.json({ error: 'Message body required' }, { status: 400 })

    // Determine the coach/athlete pair from the sender
    const isCoach = coach_id === user.id

    // Verify relationship exists and is active
    const { data: rel } = await db(supabase)
      .from('coach_athletes')
      .select('id')
      .eq('coach_id', coach_id)
      .eq('athlete_id', athlete_id)
      .eq('status', 'active')
      .maybeSingle()

    if (!rel) {
      return NextResponse.json({ error: 'No active coaching relationship' }, { status: 403 })
    }

    // Coaches can't cold-message — must be in active relationship (already verified above)
    // Athletes can message their coach, coaches can message their athletes
    if (!isCoach && athlete_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
    }

    const { data, error } = await db(supabase)
      .from('coach_messages')
      .insert({
        coach_id,
        athlete_id,
        sender_id: user.id,
        body:      body.trim(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, message: data })

  } catch (err) {
    console.error('Message send error:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const coach_id   = searchParams.get('coach_id')
    const athlete_id = searchParams.get('athlete_id')

    if (!coach_id || !athlete_id) {
      return NextResponse.json({ error: 'coach_id and athlete_id required' }, { status: 400 })
    }

    const { data, error } = await db(supabase)
      .from('coach_messages')
      .select('*')
      .eq('coach_id', coach_id)
      .eq('athlete_id', athlete_id)
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) throw error

    // Mark unread messages as read
    await db(supabase)
      .from('coach_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('coach_id', coach_id)
      .eq('athlete_id', athlete_id)
      .neq('sender_id', user.id)
      .is('read_at', null)

    return NextResponse.json({ messages: data ?? [] })

  } catch (err) {
    console.error('Message fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}
