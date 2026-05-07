import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { CoachMessageSchema, zodError } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { config, serverConfig } from '@/lib/config'
import { db } from '@/lib/supabase/db'

// P3.3 push helper — fired fire-and-forget after a message inserts. Looks
// up the recipient's push_subscription via SERVICE ROLE (RLS otherwise
// blocks cross-user reads) and sends a web-push. Subscription expiry
// (410 Gone) is Sentry-logged and non-fatal. Also mirrors into the
// notifications table for in-app history.
async function pushOnNewMessage(opts: {
  recipientId:    string
  senderName:     string
  bodyPreview:    string
  destinationUrl: string  // /coach (athlete-side) or /coach/squad (coach-side)
}) {
  try {
    const admin = createAdminClient(config.supabaseUrl, serverConfig.supabaseServiceRoleKey)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = admin as any

    const { data: subRow } = await a
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', opts.recipientId)
      .maybeSingle()

    const sub = subRow as { endpoint: string; p256dh: string; auth: string } | null

    // Always mirror to notifications table — works even without a push sub.
    await a.from('notifications').insert({
      user_id: opts.recipientId,
      type:    'coach_message',
      title:   opts.senderName,
      body:    opts.bodyPreview,
      read:    false,
    }).catch(() => { /* non-blocking */ })

    if (!sub) return  // No push sub — in-app is enough.

    const webpush = (await import('web-push')).default
    webpush.setVapidDetails(
      `mailto:${serverConfig.vapidEmail || 'hello@nextsplit.app'}`,
      config.vapidPublicKey,
      serverConfig.vapidPrivateKey,
    )
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({
        title: `💬 ${opts.senderName}`,
        body:  opts.bodyPreview,
        url:   opts.destinationUrl,
      }),
    ).catch((err: unknown) => {
      Sentry.captureException(err, {
        extra: { context: '[coach-message push]', recipientId: opts.recipientId },
        tags:  { feature: 'p3.3-messaging' },
      })
    })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: '[pushOnNewMessage]' } })
  }
}

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

    // P3.3 push notification on inbound message. Fire-and-forget — if push
    // fails, the message itself still saved fine and the recipient sees
    // it in-app on next thread load. recipientId derives from sender role.
    const recipientId = isCoach ? athlete_id : coach_id
    if (recipientId !== user.id) {
      // Look up sender's display_name for the push title.
      const { data: senderProfile } = await db(supabase)
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle()
      const senderName = (senderProfile as { display_name?: string } | null)?.display_name
        ?? (isCoach ? 'Your coach' : 'Your athlete')

      // Truncate to keep the push body terse on mobile lock-screens.
      const trimmed = body.trim()
      const bodyPreview = trimmed.length > 140 ? trimmed.slice(0, 137) + '…' : trimmed

      void pushOnNewMessage({
        recipientId,
        senderName,
        bodyPreview,
        // Coach inbound to athlete → /coach surfaces the thread.
        // Athlete inbound to coach → /coach/squad surfaces the roster + thread.
        destinationUrl: isCoach ? '/coach' : '/coach/squad',
      })
    }

    return NextResponse.json({ success: true, message: data })

  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Message send error:' } })
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
    Sentry.captureException(err, { extra: { context: 'Message fetch error:' } })
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}
