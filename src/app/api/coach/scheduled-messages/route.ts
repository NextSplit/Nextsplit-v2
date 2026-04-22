import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'

const ScheduleSchema = z.object({
  athlete_id:   z.string().uuid(),
  body:         z.string().min(1).max(2000),
  scheduled_at: z.string().datetime(), // ISO 8601
  message_type: z.enum(['text', 'milestone']).default('text'),
})

/**
 * GET  /api/coach/scheduled-messages?athlete_id=  — list scheduled messages
 * POST /api/coach/scheduled-messages              — create scheduled message (Coach Pro)
 * DELETE /api/coach/scheduled-messages?id=        — cancel a scheduled message
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const athleteId = req.nextUrl.searchParams.get('athlete_id')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    let query = s
      .from('coach_messages')
      .select('id, athlete_id, body, scheduled_at, sent_at, is_scheduled, message_type, created_at')
      .eq('coach_id', user.id)
      .eq('is_scheduled', true)
      .is('sent_at', null) // not yet sent
      .order('scheduled_at', { ascending: true })

    if (athleteId) query = query.eq('athlete_id', athleteId)

    const { data } = await query
    return NextResponse.json({ scheduled: data ?? [] })
  } catch (err) {
    console.error('Scheduled messages fetch error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = ScheduleSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { athlete_id, body, scheduled_at, message_type } = parsed.data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    // Verify Coach Pro
    const { data: coach } = await s
      .from('coach_profiles')
      .select('is_coach_pro, coach_pro_expires_at')
      .eq('user_id', user.id)
      .single()

    const isPro = coach?.is_coach_pro &&
      (!coach.coach_pro_expires_at || new Date(coach.coach_pro_expires_at) > new Date())

    if (!isPro) {
      return NextResponse.json({
        error: 'Scheduled messages require Coach Pro (£19.99/month)',
        requires_pro: true,
      }, { status: 403 })
    }

    // Verify active coaching relationship
    const { data: rel } = await s
      .from('coach_athletes')
      .select('id')
      .eq('coach_id', user.id)
      .eq('athlete_id', athlete_id)
      .eq('status', 'active')
      .maybeSingle()

    if (!rel) return NextResponse.json({ error: 'No active coaching relationship' }, { status: 403 })

    // Enforce max 10 scheduled per athlete
    const { count } = await s
      .from('coach_messages')
      .select('id', { count: 'exact' })
      .eq('coach_id', user.id)
      .eq('athlete_id', athlete_id)
      .eq('is_scheduled', true)
      .is('sent_at', null)

    if ((count ?? 0) >= 10) {
      return NextResponse.json({
        error: 'Maximum 10 scheduled messages per athlete. Delete some to add more.',
      }, { status: 400 })
    }

    // Scheduled time must be in the future
    if (new Date(scheduled_at) <= new Date()) {
      return NextResponse.json({ error: 'Scheduled time must be in the future' }, { status: 400 })
    }

    const { data: msg, error } = await s
      .from('coach_messages')
      .insert({
        coach_id:     user.id,
        athlete_id,
        sender_id:    user.id,
        body:         body.trim(),
        is_scheduled: true,
        scheduled_at,
        message_type,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ scheduled: msg })
  } catch (err) {
    console.error('Schedule message error:', err)
    return NextResponse.json({ error: 'Failed to schedule message' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    // Only the coach can delete their own scheduled messages
    const { error } = await s
      .from('coach_messages')
      .delete()
      .eq('id', id)
      .eq('coach_id', user.id)
      .eq('is_scheduled', true)
      .is('sent_at', null) // can't delete already-sent

    if (error) throw error
    return NextResponse.json({ cancelled: true })
  } catch (err) {
    console.error('Cancel scheduled message error:', err)
    return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 })
  }
}
