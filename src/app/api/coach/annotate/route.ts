import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { CoachAnnotateSchema, zodError } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import { coachPush } from '@/lib/coach-push'

// BL-C2 — coach annotation lifecycle. Reaction-only inserts are now allowed
// (the DB CHECK in phase-blc2-annotation-reaction-only-v1.sql requires note
// OR reaction; the Zod refine on CoachAnnotateSchema mirrors that). On
// successful insert we close the loop with a push to the athlete so they
// see the coach's reaction in /coach/messages without having to refresh
// the athlete-detail page (which they don't have access to anyway — that
// route is coach-only).

const REACTION_LABELS: Record<string, string> = {
  fire:   '🔥 Great session',
  strong: '💙 Well paced',
  easy:   '🧊 Take it easy',
  talk:   '📞 Let’s talk',
  great:  '🌟 Looking great',
}

function previewBody(note?: string | null, reaction?: string | null): string {
  if (note && note.trim().length > 0) {
    const t = note.trim()
    return t.length > 140 ? t.slice(0, 137) + '…' : t
  }
  if (reaction) return REACTION_LABELS[reaction] ?? 'Coach reacted to your session'
  return 'Coach left you a note'
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = CoachAnnotateSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { athlete_id, plan_id, week_n, day_i, session_i, note, reaction } = parsed.data

    const { data: rel } = await db(supabase)
      .from('coach_athletes')
      .select('id')
      .eq('coach_id', user.id)
      .eq('athlete_id', athlete_id)
      .eq('status', 'active')
      .maybeSingle()

    if (!rel) {
      return NextResponse.json({ error: 'No active coaching relationship' }, { status: 403 })
    }

    // Reaction-only inserts skip the note column entirely so the DB CHECK
    // (note IS NOT NULL OR reaction IS NOT NULL) accepts the row. Building
    // the payload conditionally keeps the typing clean against the
    // generated Insert type which still types `note: string`.
    const payload: Record<string, unknown> = {
      coach_id:   user.id,
      athlete_id,
      plan_id:    plan_id ?? 'general',
      week_n:     week_n ?? 0,
      day_i:      day_i ?? 0,
      session_i:  session_i ?? 0,
      reaction:   reaction ?? null,
    }
    if (note && note.trim().length > 0) payload.note = note.trim()

    const { data, error } = await db(supabase)
      .from('session_annotations')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(payload as any)
      .select()
      .single()

    if (error) throw error

    // BL-C2 close the loop — push the coach's reaction/note to the athlete.
    // Fire-and-forget; in-app notifications fan-out via coachPush even when
    // there's no push subscription, so the recipient still sees the alert.
    const { data: senderProfile } = await db(supabase)
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle()
    const senderName = (senderProfile as { display_name?: string } | null)?.display_name ?? 'Your coach'

    void coachPush({
      recipientId:    athlete_id,
      title:          `${senderName} reacted to your session`,
      body:           previewBody(note, reaction),
      destinationUrl: '/coach/messages',
      type:           'coach_annotation',
      data:           { coach_id: user.id, plan_id: plan_id ?? 'general' },
      feature:        'blc2-annotate',
    })

    return NextResponse.json({ success: true, annotation: data })

  } catch (err) {
    Sentry.captureException(err, { tags: { feature: 'blc2-annotate' }, extra: { context: 'Annotate error:' } })
    return NextResponse.json({ error: 'Failed to save annotation' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const athlete_id = searchParams.get('athlete_id')
    const plan_id    = searchParams.get('plan_id')

    let query = db(supabase)
      .from('session_annotations')
      .select('*')
      .order('created_at', { ascending: false })

    if (athlete_id) {
      query = query.eq('coach_id', user.id).eq('athlete_id', athlete_id)
    } else {
      query = query.eq('athlete_id', user.id)
    }

    if (plan_id) query = query.eq('plan_id', plan_id)

    const { data, error } = await query.limit(50)
    if (error) throw error

    return NextResponse.json({ annotations: data ?? [] })

  } catch (err) {
    Sentry.captureException(err, { tags: { feature: 'blc2-annotate' }, extra: { context: 'Get annotations error:' } })
    return NextResponse.json({ error: 'Failed to fetch annotations' }, { status: 500 })
  }
}
