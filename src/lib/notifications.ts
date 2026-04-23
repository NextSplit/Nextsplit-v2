/**
 * NextSplit Notification Engine — Splity voice
 * Growth Pillar spec: "Timed to their training. Never to our convenience."
 *
 * 8 notification types, strict guardrails:
 * - Max 1 per day per user
 * - Never 10pm–7am in user's local timezone
 * - At-risk notification sent once only
 * - User can configure per-type in Settings
 *
 * All copy is written as Splity — warm, expert, direct.
 * Never accusatory, never generic, never spammy.
 */

export type NotificationType =
  | 'session_reminder'      // before scheduled session
  | 'adaptation_alert'      // plan changed
  | 'weekly_recap'          // Sunday evening
  | 'at_risk_reengagement'  // 4 days without login — once only
  | 'race_countdown'        // final 4 weeks
  | 'streak_at_risk'        // no log today, streak ≥ 3
  | 'coach_message'         // new message from coach
  | 'class_revealed'        // runner class ready

export interface NotificationPayload {
  type:    NotificationType
  title:   string
  body:    string
  url:     string
  icon?:   string
}

export function buildNotification(
  type: NotificationType,
  ctx: {
    firstName?:      string
    sessionName?:    string
    sessionKm?:      number
    planName?:       string
    daysToRace?:     number
    weekN?:          number
    totalWeeks?:     number
    streakDays?:     number
    coachName?:      string
    adaptationNote?: string
    classEmoji?:     string
    className?:      string
  }
): NotificationPayload {
  const name = ctx.firstName ?? 'Runner'

  switch (type) {

    case 'session_reminder': {
      // Splity voice: specific, actionable, no fluff
      const titles = ctx.sessionName ? [
        `${ctx.sessionName} today, ${name} 👟`,
        `Time to run, ${name}`,
        `${name} — your session's waiting`,
      ] : [
        `Training day, ${name} 👟`,
        `Splity here — run time, ${name}`,
      ]
      const title = titles[new Date().getMinutes() % titles.length]

      const body = ctx.sessionKm && ctx.sessionName
        ? `${ctx.sessionName} · ${ctx.sessionKm}km. Get it done before the day gets away from you.`
        : ctx.sessionName
        ? `${ctx.sessionName} is on the plan today. Start easy, find your rhythm.`
        : `Your session is ready. Keep the momentum going.`

      return { type, title, body, url: '/today' }
    }

    case 'streak_at_risk': {
      const streak = ctx.streakDays ?? 0
      const title = streak >= 7
        ? `${streak} days, ${name} — don't let it slip 🔥`
        : `Streak at risk, ${name} 🔥`
      const body = streak >= 14
        ? `${streak} days straight. Log something today — even 10 minutes counts.`
        : streak >= 7
        ? `You've been consistent for ${streak} days. Today matters. Even a short run keeps it alive.`
        : `Your ${streak}-day streak is on the line. Splity believes in you. Log today.`
      return { type, title, body, url: '/today' }
    }

    case 'at_risk_reengagement': {
      // Warm, one-shot only, zero pressure
      const titles = [
        `Still here for you, ${name}`,
        `Your plan's waiting, ${name}`,
        `No catch-up needed, ${name}`,
      ]
      const bodies = [
        `Your plan is exactly where you left it. Pick up whenever you're ready — no catch-up required.`,
        `Life gets in the way. That's fine. Your plan adjusts. Come back when you're ready.`,
        `Splity here — your training is paused, not cancelled. Ready when you are.`,
      ]
      const i = new Date().getDay() % 3
      return { type, title: titles[i], body: bodies[i], url: '/today' }
    }

    case 'weekly_recap': {
      const title = ctx.weekN && ctx.totalWeeks
        ? `Week ${ctx.weekN} done, ${name} ✓`
        : `Week done, ${name} ✓`
      const body = ctx.weekN && ctx.totalWeeks
        ? `${ctx.weekN} of ${ctx.totalWeeks} weeks complete${ctx.planName ? ` on ${ctx.planName}` : ''}. See how this week went.`
        : `Another training week in the books. Check your recap and see what's coming next.`
      return { type, title, body, url: '/today' }
    }

    case 'race_countdown': {
      const days = ctx.daysToRace ?? 0
      const weeks = Math.ceil(days / 7)
      const title = days <= 7
        ? `Race week, ${name} 🏁`
        : `${weeks} weeks to go, ${name} 🏁`
      const body = days <= 7
        ? `This is race week. Trust your training. Splity's got you.`
        : days <= 14
        ? `Two weeks out. The hard work is done — now it's about staying sharp.`
        : `${weeks} weeks to race day. Every session now is an investment.`
      return { type, title, body, url: '/today' }
    }

    case 'adaptation_alert': {
      return {
        type,
        title: `Plan updated, ${name}`,
        body: ctx.adaptationNote ?? 'Your plan has been adjusted to keep you on track. Tap to see what changed.',
        url: '/today',
      }
    }

    case 'coach_message': {
      return {
        type,
        title: ctx.coachName ? `Message from ${ctx.coachName}` : 'New coaching message',
        body: `Your coach left you a note. Tap to read it.`,
        url: '/today',
      }
    }

    case 'class_revealed': {
      const emoji = ctx.classEmoji ?? '🏃'
      return {
        type,
        title: `Your runner class is ready ${emoji}`,
        body: ctx.className
          ? `Splity has classified you as: ${ctx.className}. Tap to reveal.`
          : `Four weeks of data, one verdict. Tap to see what kind of runner you are.`,
        url: '/profile',
      }
    }

    default:
      return {
        type,
        title: `NextSplit · Splity`,
        body: `Time to check in on your training.`,
        url: '/today',
      }
  }
}

export interface GuardrailContext {
  type:               NotificationType
  userTimezoneOffset: number  // minutes from UTC
  lastNotificationAt: Date | null
  atRiskSentAt:       Date | null
  notificationsEnabled: boolean
  typePrefs:          Record<string, boolean>
}

export function passesGuardrails(ctx: GuardrailContext): { ok: boolean; reason?: string } {
  if (!ctx.notificationsEnabled) return { ok: false, reason: 'notifications_disabled' }
  if (ctx.typePrefs[ctx.type] === false) return { ok: false, reason: 'type_disabled' }

  // Max 1 per day
  if (ctx.lastNotificationAt) {
    const msSince = Date.now() - ctx.lastNotificationAt.getTime()
    if (msSince < 20 * 3600 * 1000) return { ok: false, reason: 'rate_limit_1_per_day' }
  }

  // At-risk: once only
  if (ctx.type === 'at_risk_reengagement' && ctx.atRiskSentAt) {
    return { ok: false, reason: 'at_risk_already_sent' }
  }

  // Quiet hours: never 10pm–7am local
  const nowUtcMs = Date.now()
  const localHour = Math.floor((nowUtcMs + ctx.userTimezoneOffset * 60 * 1000) / (1000 * 3600)) % 24
  if (localHour >= 22 || localHour < 7) return { ok: false, reason: 'quiet_hours' }

  return { ok: true }
}

export const NOTIFICATION_DEFAULTS: Record<NotificationType, boolean> = {
  session_reminder:     true,
  adaptation_alert:     true,
  weekly_recap:         true,
  at_risk_reengagement: true,
  race_countdown:       true,
  streak_at_risk:       true,
  coach_message:        true,
  class_revealed:       true,
}

export const NOTIFICATION_LABELS: Record<NotificationType, { label: string; description: string }> = {
  session_reminder:     { label: 'Session reminders',   description: 'Before your scheduled training sessions' },
  adaptation_alert:     { label: 'Plan updates',         description: 'When your plan is adjusted or adapted' },
  weekly_recap:         { label: 'Weekly recap',         description: 'Sunday evening summary of your week' },
  at_risk_reengagement: { label: 'Check-in reminder',   description: 'If you haven\'t logged in a few days (sent once)' },
  race_countdown:       { label: 'Race countdown',       description: 'Weekly updates in your final 4 weeks' },
  streak_at_risk:       { label: 'Streak reminder',      description: 'When your training streak is about to break' },
  coach_message:        { label: 'Coach messages',       description: 'New messages and voice notes from your coach' },
  class_revealed:       { label: 'Runner class reveal',  description: 'When your runner class is ready to reveal' },
}
