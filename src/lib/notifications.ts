/**
 * NextSplit Notification Engine
 * Growth Pillar spec: "Timed to their training. Never to our convenience."
 *
 * 8 notification types, strict guardrails:
 * - Max 1 per day per user
 * - Never 10pm–7am in user's local timezone
 * - At-risk notification sent once only
 * - User can configure per-type in Settings
 */

export type NotificationType =
  | 'session_reminder'      // 60min before typical session time
  | 'adaptation_alert'      // plan changed (auto or user-triggered)
  | 'weekly_recap'          // Sunday evening
  | 'at_risk_reengagement'  // 4 days without login — sent once only
  | 'race_countdown'        // final 4 weeks, weekly
  | 'streak_at_risk'        // no log today, streak ≥ 3
  | 'coach_message'         // new voice/text from coach
  | 'class_revealed'        // runner class ready to reveal

export interface NotificationPayload {
  type:    NotificationType
  title:   string
  body:    string
  url:     string
  icon?:   string
}

/**
 * Build notification payload per type.
 * All copy is coach-voice — warm, personal, never accusatory.
 * Growth Pillar spec quotes included as comments.
 */
export function buildNotification(
  type: NotificationType,
  ctx: {
    firstName?:    string
    sessionName?:  string
    sessionKm?:    number
    planName?:     string
    daysToRace?:   number
    weekN?:        number
    totalWeeks?:   number
    streakDays?:   number
    coachName?:    string
    adaptationNote?: string
    classEmoji?:   string
    className?:    string
  }
): NotificationPayload {
  const name = ctx.firstName ?? 'Runner'

  switch (type) {
    case 'session_reminder':
      // Spec: "60 minutes before their logged session time. Personalised to actual training pattern."
      // Spec copy: "Easy run today, Alex — 8km at your own pace. Best done before the day gets away from you."
      return {
        type,
        title: ctx.sessionName
          ? `${ctx.sessionName} today, ${name}`
          : `Training day, ${name}`,
        body: ctx.sessionKm && ctx.sessionName
          ? `${ctx.sessionName} — ${ctx.sessionKm}km. Best done before the day gets away from you.`
          : ctx.planName
          ? `Your ${ctx.planName} session is ready. Keep the momentum going.`
          : 'Your session is ready. Best done before the day gets away from you.',
        url: '/today',
      }

    case 'adaptation_alert':
      // Spec: "What changed and why — in one line. Transparency builds trust."
      // Spec copy: "Plan updated — moved Thursday's intervals to Saturday..."
      return {
        type,
        title: 'Plan updated',
        body: ctx.adaptationNote ?? 'Your plan has been adjusted to keep you on track.',
        url: '/today',
      }

    case 'weekly_recap':
      // Spec: "Sunday evening. Feels like a coach's end-of-week message."
      return {
        type,
        title: ctx.planName ? `Week ${ctx.weekN} recap` : 'Weekly recap',
        body: ctx.planName && ctx.weekN && ctx.totalWeeks
          ? `Week ${ctx.weekN} of ${ctx.totalWeeks} done. Your ${ctx.planName} is on track.`
          : 'Another training week done. Check how it went and what\'s coming next.',
        url: '/today',
      }

    case 'at_risk_reengagement':
      // Spec: "Warm, never accusatory. One gentle notification. No repeat if ignored."
      // Spec copy: "Your plan is still here, Alex. Pick up where you left off whenever you're ready."
      return {
        type,
        title: `Still here, ${name}`,
        body: `Your plan is still here. Pick up wherever you're ready — no catch-up required.`,
        url: '/today',
      }

    case 'race_countdown':
      // Spec: "Final 4 weeks. Weekly countdown with taper context."
      // Spec copy: "3 weeks to race day. Taper has started — the training is done. Trust the work."
      return {
        type,
        title: ctx.daysToRace !== undefined
          ? `${Math.ceil(ctx.daysToRace / 7)} week${Math.ceil(ctx.daysToRace / 7) !== 1 ? 's' : ''} to race day`
          : 'Race countdown',
        body: ctx.daysToRace !== undefined && ctx.daysToRace <= 14
          ? `${ctx.daysToRace} days to go. Taper has started — the training is done. Trust the work.`
          : `${ctx.daysToRace} days to race day. Keep the quality sessions, protect the recovery.`,
        url: '/today',
      }

    case 'streak_at_risk':
      // Spec: "One line, warm, no guilt."
      return {
        type,
        title: `${ctx.streakDays}-day streak today, ${name}`,
        body: 'Log any session to keep it going — even a rest day counts.',
        url: '/today',
      }

    case 'coach_message':
      // Spec: "New voice/text from coach."
      return {
        type,
        title: ctx.coachName ? `Message from ${ctx.coachName}` : 'New coach message',
        body: 'Your coach left you a note. Tap to read.',
        url: '/today',
      }

    case 'class_revealed':
      // Spec: "After 4 weeks + 6 sessions. Fires at natural app open moment."
      return {
        type,
        title: 'Your runner class is ready',
        body: ctx.classEmoji && ctx.className
          ? `${ctx.classEmoji} After 4 weeks of training, NextSplit knows what kind of runner you are. Open to reveal.`
          : 'Four weeks of training data collected. Open NextSplit to discover your runner class.',
        url: '/profile',
      }
  }
}

/**
 * Guardrail checks — all must pass before sending any notification.
 * Growth Pillar: "The runner's trust in the notification channel is worth more
 * than any individual message."
 */
export interface GuardrailContext {
  type:               NotificationType
  userTimezoneOffset: number    // minutes from UTC (e.g. +60 for BST)
  lastNotificationAt: Date | null
  atRiskSentAt:       Date | null  // for at_risk_reengagement one-shot
  notificationsEnabled: boolean
  typePrefs:          Record<string, boolean>  // per-type on/off
}

export function passesGuardrails(ctx: GuardrailContext): { ok: boolean; reason?: string } {
  // Master switch
  if (!ctx.notificationsEnabled) return { ok: false, reason: 'notifications_disabled' }

  // Per-type preference
  if (ctx.typePrefs[ctx.type] === false) return { ok: false, reason: 'type_disabled' }

  // Quiet hours: never 10pm–7am in user's local time
  const nowUtcMs = Date.now()
  const localHour = Math.floor((nowUtcMs + ctx.userTimezoneOffset * 60 * 1000) / (1000 * 3600)) % 24
  if (localHour >= 22 || localHour < 7) {
    return { ok: false, reason: 'quiet_hours' }
  }

  // Max 1 notification per day
  if (ctx.lastNotificationAt) {
    const msSince = nowUtcMs - ctx.lastNotificationAt.getTime()
    if (msSince < 20 * 3600 * 1000) {  // 20hr buffer (not exact 24 to avoid edge cases)
      return { ok: false, reason: 'rate_limit_1_per_day' }
    }
  }

  // At-risk: sent once only, never again
  if (ctx.type === 'at_risk_reengagement' && ctx.atRiskSentAt) {
    return { ok: false, reason: 'at_risk_already_sent' }
  }

  return { ok: true }
}

/**
 * Notification preference defaults — all on by default.
 * Users can turn off per-type in Settings.
 */
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
  session_reminder:     { label: 'Session reminders',     description: 'Before your scheduled training sessions' },
  adaptation_alert:     { label: 'Plan updates',          description: 'When your plan is adjusted or adapted' },
  weekly_recap:         { label: 'Weekly recap',          description: 'Sunday evening summary of your week' },
  at_risk_reengagement: { label: 'Check-in reminder',    description: 'If you haven\'t logged in a few days' },
  race_countdown:       { label: 'Race countdown',        description: 'Weekly updates in your final 4 weeks before race day' },
  streak_at_risk:       { label: 'Streak reminder',       description: 'When your training streak is about to break' },
  coach_message:        { label: 'Coach messages',        description: 'New messages and voice notes from your coach' },
  class_revealed:       { label: 'Class reveal',          description: 'When your runner class is ready to reveal' },
}
