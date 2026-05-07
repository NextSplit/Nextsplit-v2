'use server'

// Reaction-notification server action. Called from SquadFeed after a
// successful reaction upsert. Sends a web-push to the feed card's owner
// telling them who reacted with what emoji. No-ops gracefully if:
//   - The reactor is also the owner (no self-notifications)
//   - The owner has no push_subscription row
//   - The web-push send fails (expired subscription, network error)
//
// Auth boundary: the action validates the reactor via auth.getUser() and
// looks up the owner's push_subscription using the SERVICE ROLE client
// (server-only key). RLS on push_subscriptions blocks cross-user reads,
// which is why service-role is needed here. The reactor cannot use this
// action to enumerate someone else's push state — they only get back
// { ok: true | false } with no leakage.

import * as Sentry from '@sentry/nextjs'
import { config, serverConfig } from '@/lib/config'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

interface FeedRowSummary {
  id:             string
  user_id:        string  // owner
  milestone_type: string
  value_km:       number | null
}

interface ReactorProfile {
  display_name: string
}

interface OwnerSubscription {
  endpoint: string
  p256dh:   string
  auth:     string
}

const MILESTONE_PHRASE: Record<string, (km: number | null) => string> = {
  session_logged:     km => km ? `your ${km}km session`     : 'your session',
  plan_complete:      ()  => 'your plan completion',
  distance_pb:        km => km ? `your ${km}km PB`          : 'your PB',
  streak_milestone:   ()  => 'your streak',
  joined_squad:       ()  => 'you joining the squad',
  first_run:          ()  => 'your first run',
  race_result:        ()  => 'your race',
  squad_goal_reached: ()  => 'the squad goal',
}

export async function notifyReactionAction(
  feedCardId: string,
  emoji:      string,
): Promise<{ ok: boolean }> {
  try {
    if (!feedCardId || !emoji) return { ok: false }

    const supabase = await createClient()
    const { data: { user: reactor } } = await supabase.auth.getUser()
    if (!reactor) return { ok: false }

    // 1. Look up the feed card → owner + milestone context.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any
    const { data: feedRow } = await s
      .from('squad_feed')
      .select('id, user_id, milestone_type, value_km')
      .eq('id', feedCardId)
      .single()
    const row = feedRow as FeedRowSummary | null
    if (!row) return { ok: false }

    // 2. No self-notifications — quiet exit.
    if (row.user_id === reactor.id) return { ok: true }

    // 3. Look up reactor's display_name for the push title.
    const { data: profileRow } = await s
      .from('profiles')
      .select('display_name')
      .eq('id', reactor.id)
      .single()
    const reactorName = (profileRow as ReactorProfile | null)?.display_name ?? 'A squad-mate'

    // 4. Look up owner's push_subscription via service role (RLS would
    // otherwise block cross-user reads).
    const admin = createAdminClient(config.supabaseUrl, serverConfig.supabaseServiceRoleKey)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = admin as any
    const { data: subRow } = await a
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', row.user_id)
      .maybeSingle()
    const sub = subRow as OwnerSubscription | null
    if (!sub) {
      // Owner has no push subscription — still log to the in-app
      // notifications table so they see it on next visit.
      await a.from('notifications').insert({
        user_id: row.user_id,
        type:    'reaction',
        title:   `${emoji} ${reactorName}`,
        body:    `reacted ${emoji} to ${(MILESTONE_PHRASE[row.milestone_type] ?? (() => 'your post'))(row.value_km)}.`,
        read:    false,
      }).catch(() => { /* non-blocking */ })
      return { ok: true }
    }

    // 5. Send the web-push.
    const webpush = (await import('web-push')).default
    webpush.setVapidDetails(
      `mailto:${serverConfig.vapidEmail || 'hello@nextsplit.app'}`,
      config.vapidPublicKey,
      serverConfig.vapidPrivateKey,
    )

    const phraseFn = MILESTONE_PHRASE[row.milestone_type] ?? (() => 'your post')
    const phrase   = phraseFn(row.value_km)
    const title    = `${emoji} ${reactorName}`
    const body     = `reacted ${emoji} to ${phrase}.`

    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({ title, body, url: '/squad' }),
    ).catch((err: unknown) => {
      // Subscription may have expired (410 Gone) — Sentry-log and continue.
      Sentry.captureException(err, {
        extra: { context: '[reaction-notify/web-push]', feedCardId, ownerId: row.user_id },
        tags:  { feature: 'p1.1-reactions' },
      })
    })

    // 6. Mirror into the in-app notifications table for history.
    await a.from('notifications').insert({
      user_id: row.user_id,
      type:    'reaction',
      title,
      body,
      read:    false,
    }).catch(() => { /* non-blocking */ })

    return { ok: true }
  } catch (err) {
    Sentry.captureException(err, { extra: { context: '[notifyReactionAction]' } })
    return { ok: false }
  }
}
