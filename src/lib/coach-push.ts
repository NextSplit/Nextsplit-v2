import * as Sentry from '@sentry/nextjs'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { config, serverConfig } from '@/lib/config'

// Coach-loop push helper. Lifts the pattern from /api/coach/message into a
// reusable shape for BL-C2 (annotation react) and BL-C3 (plan-change reason)
// so both routes mirror the existing observability + fallback behaviour:
//
//   1. Look up recipient's push_subscription via SERVICE ROLE (RLS otherwise
//      blocks cross-user reads; the API route runs as the sender).
//   2. Mirror to `notifications` regardless of push subscription state — the
//      in-app notification surface stays accurate even if the device has
//      no push registration or the registration is expired.
//   3. Fire web-push fire-and-forget; 410 Gone / network errors get
//      Sentry-captured under `feature: <feature>` for the cross-feature
//      alert rule (BL-X8) and never propagate.
//
// Notes table `read` defaults to false in the schema; we don't set it here.

export interface CoachPushArgs {
  recipientId:    string
  title:          string  // push notification title (becomes notifications.title)
  body:           string  // push body / preview (becomes notifications.body)
  destinationUrl: string  // tap-through URL embedded in the push payload
  type:           string  // notifications.type — feeds NotifStrip styling + filtering
  data?:          Record<string, string>  // notifications.data — used by useNotifications + NotifStrip
  feature:        string  // Sentry tag — e.g. 'p3.3-messaging', 'blc2-annotate', 'blc3-plan-change'
}

export async function coachPush(args: CoachPushArgs): Promise<void> {
  try {
    const admin = createAdminClient(config.supabaseUrl, serverConfig.supabaseServiceRoleKey)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = admin as any

    const { data: subRow } = await a
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', args.recipientId)
      .maybeSingle()

    const sub = subRow as { endpoint: string; p256dh: string; auth: string } | null

    await a.from('notifications').insert({
      user_id: args.recipientId,
      type:    args.type,
      title:   args.title,
      body:    args.body,
      data:    args.data ?? null,
    }).catch(() => { /* non-blocking */ })

    if (!sub) return

    const webpush = (await import('web-push')).default
    webpush.setVapidDetails(
      `mailto:${serverConfig.vapidEmail || 'hello@nextsplit.app'}`,
      config.vapidPublicKey,
      serverConfig.vapidPrivateKey,
    )
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({
        title: args.title,
        body:  args.body,
        url:   args.destinationUrl,
      }),
    ).catch((err: unknown) => {
      Sentry.captureException(err, {
        tags:  { feature: args.feature },
        extra: { context: '[coachPush]', recipientId: args.recipientId },
      })
    })
  } catch (err) {
    Sentry.captureException(err, {
      tags:  { feature: args.feature },
      extra: { context: '[coachPush wrapper]' },
    })
  }
}
