/**
 * Splity Notification Emails
 * Uses Resend to send notification-style emails when push isn't available.
 * Same 8 triggers as push notifications, adapted for email format.
 * All copy is Splity voice — warm, specific, never spammy.
 */

export type NotificationEmailType =
  | 'session_reminder'
  | 'streak_at_risk'
  | 'weekly_recap'
  | 'at_risk_reengagement'
  | 'race_countdown'

interface NotifEmailCtx {
  firstName:    string
  email:        string
  sessionName?: string
  sessionKm?:   number
  planName?:    string
  weekN?:       number
  totalWeeks?:  number
  streakDays?:  number
  daysToRace?:  number
  kmThisWeek?:  number
  sessionsDone?: number
  sessionsPlanned?: number
}

export function buildNotificationEmail(type: NotificationEmailType, ctx: NotifEmailCtx): {
  subject: string
  html: string
  text: string
} {
  const name = ctx.firstName

  switch (type) {

    case 'session_reminder': {
      const subject = ctx.sessionName
        ? `${ctx.sessionName} today, ${name} 👟`
        : `Training day, ${name} 👟`

      const sessionLine = ctx.sessionName && ctx.sessionKm
        ? `<strong>${ctx.sessionName}</strong> — ${ctx.sessionKm}km`
        : ctx.sessionName
        ? `<strong>${ctx.sessionName}</strong>`
        : 'Your session'

      const html = splityEmail({
        name,
        mood: 'encouraging',
        headline: subject,
        body: `${sessionLine} is on your plan today.<br><br>Best done before the day gets away from you. Start easy, find your rhythm — the rest takes care of itself.`,
        cta: { label: 'Open today\'s session →', url: 'https://nextsplit-v2.vercel.app/today' },
        footer: 'You\'re getting this because session reminders are on. Turn off in Settings.',
      })

      return {
        subject,
        html,
        text: `${subject}\n\n${ctx.sessionName ?? 'Your session'} is on your plan today. Open NextSplit to log it: https://nextsplit-v2.vercel.app/today`,
      }
    }

    case 'streak_at_risk': {
      const streak = ctx.streakDays ?? 0
      const subject = streak >= 7
        ? `${streak} days, ${name} — don't let it slip 🔥`
        : `Streak at risk, ${name} 🔥`

      const body = streak >= 14
        ? `${streak} days straight. That's real consistency — don't let today be the one that breaks it.<br><br>Even a short easy run counts. Log something today.`
        : `Your ${streak}-day streak is on the line.<br><br>You don't have to do the full session. A short run, a walk, anything logged keeps it alive.`

      const html = splityEmail({
        name,
        mood: 'urgent',
        headline: `🔥 ${streak} days and counting`,
        body,
        cta: { label: 'Log today\'s session →', url: 'https://nextsplit-v2.vercel.app/today' },
        footer: 'You\'re getting this because streak reminders are on. Turn off in Settings.',
      })

      return {
        subject,
        html,
        text: `${subject}\n\nYour ${streak}-day streak is at risk. Log something today: https://nextsplit-v2.vercel.app/today`,
      }
    }

    case 'weekly_recap': {
      const subject = ctx.weekN
        ? `Week ${ctx.weekN} done, ${name} ✓`
        : `Your week in review, ${name}`

      const statsLine = ctx.sessionsDone !== undefined && ctx.sessionsPlanned !== undefined
        ? `${ctx.sessionsDone} of ${ctx.sessionsPlanned} sessions completed`
        : ''
      const kmLine = ctx.kmThisWeek ? `${Math.round(ctx.kmThisWeek)}km logged this week` : ''

      const html = splityEmail({
        name,
        mood: 'happy',
        headline: subject,
        body: `${statsLine ? statsLine + '.<br>' : ''}${kmLine ? kmLine + '.<br><br>' : '<br>'}${
          ctx.weekN && ctx.totalWeeks
            ? `Week ${ctx.weekN} of ${ctx.totalWeeks}${ctx.planName ? ` on ${ctx.planName}` : ''} — you're making progress.`
            : 'Another training week in the books.'
        }<br><br>See what's coming up next week and make sure your plan still fits your schedule.`,
        cta: { label: 'See next week →', url: 'https://nextsplit-v2.vercel.app/plan' },
        footer: 'You\'re getting this because weekly recaps are on. Turn off in Settings.',
      })

      return {
        subject,
        html,
        text: `${subject}\n\n${statsLine}. ${kmLine}.\n\nSee next week: https://nextsplit-v2.vercel.app/plan`,
      }
    }

    case 'at_risk_reengagement': {
      const subject = `Still here for you, ${name}`
      const html = splityEmail({
        name,
        mood: 'default',
        headline: 'Your plan is exactly where you left it.',
        body: `No catch-up. No guilt. Your training clock doesn't start until you do.<br><br>Whenever you're ready — even if that's today — just open the app and pick up from where you were. Splity's got you.`,
        cta: { label: 'Pick up where you left off →', url: 'https://nextsplit-v2.vercel.app/today' },
        footer: 'This is a one-time message. We won\'t send this again.',
      })

      return {
        subject,
        html,
        text: `${subject}\n\nYour plan is still there. No catch-up required. Pick up whenever you're ready: https://nextsplit-v2.vercel.app/today`,
      }
    }

    case 'race_countdown': {
      const days = ctx.daysToRace ?? 0
      const weeks = Math.ceil(days / 7)
      const subject = days <= 7
        ? `Race week, ${name} 🏁`
        : `${weeks} weeks to go, ${name} 🏁`

      const body = days <= 7
        ? `This is race week. The training is done — you've put in the work.<br><br>Trust the process. Trust your legs. Splity's in your corner on race day.`
        : days <= 14
        ? `Two weeks out. The hard work is banked — now it's about staying sharp and arriving fresh.<br><br>Don't do anything new. Trust the plan.`
        : `${weeks} weeks to race day. Every session between now and the start line is an investment.<br><br>Keep the consistency going.`

      const html = splityEmail({
        name,
        mood: 'happy',
        headline: subject,
        body,
        cta: { label: 'See your race plan →', url: 'https://nextsplit-v2.vercel.app/today' },
        footer: 'You\'re getting race countdown updates because you have a race date set.',
      })

      return {
        subject,
        html,
        text: `${subject}\n\n${body.replace(/<br><br>/g, '\n\n').replace(/<[^>]+>/g, '')}\n\nhttps://nextsplit-v2.vercel.app/today`,
      }
    }
  }
}

// ── Email template ────────────────────────────────────────────────────────────

interface SplityEmailOptions {
  name: string
  mood: 'default' | 'happy' | 'urgent' | 'encouraging'
  headline: string
  body: string
  cta: { label: string; url: string }
  footer: string
}

function splityEmail({ name, mood, headline, body, cta, footer }: SplityEmailOptions): string {
  const accentColor = mood === 'urgent' ? '#e85d26' : mood === 'happy' ? '#c49a3c' : '#2b5c3f'
  const splityMoodEmoji = mood === 'happy' ? '😄' : mood === 'urgent' ? '⚡' : mood === 'encouraging' ? '💪' : '👟'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline}</title>
</head>
<body style="margin:0;padding:0;background:#f8f7f5;font-family:'Outfit',system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7f5;padding:24px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:20px;font-weight:800;color:#2b5c3f;letter-spacing:-0.03em;">NextSplit</span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;color:#9e9c97;">from Splity ${splityMoodEmoji}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e8e6e3;">

              <!-- Accent bar -->
              <div style="height:4px;background:linear-gradient(90deg,#2b5c3f,${accentColor},#c49a3c);"></div>

              <div style="padding:28px 28px 24px;">

                <!-- Splity avatar + name -->
                <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                  <tr>
                    <td style="padding-right:10px;">
                      <div style="width:40px;height:40px;background:#fdf7ec;border-radius:50%;text-align:center;line-height:40px;font-size:20px;">👟</div>
                    </td>
                    <td>
                      <div style="font-size:10px;font-weight:700;color:#9e9c97;text-transform:uppercase;letter-spacing:0.1em;">Splity · your coach</div>
                      <div style="font-size:11px;color:#6b6b67;margin-top:1px;">NextSplit AI Coach</div>
                    </td>
                  </tr>
                </table>

                <!-- Headline -->
                <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#1a1a18;letter-spacing:-0.02em;line-height:1.2;">${headline}</h1>

                <!-- Body -->
                <p style="margin:0 0 24px;font-size:15px;color:#6b6b67;line-height:1.6;">${body}</p>

                <!-- CTA -->
                <a href="${cta.url}"
                  style="display:block;background:#e85d26;color:#ffffff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:14px;font-size:15px;font-weight:700;letter-spacing:-0.01em;">
                  ${cta.label}
                </a>

              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 8px 8px;text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;color:#9e9c97;">${footer}</p>
              <p style="margin:0;font-size:11px;color:#c4c2bd;">
                <a href="https://nextsplit-v2.vercel.app/settings" style="color:#9e9c97;">Manage notifications</a>
                &nbsp;·&nbsp;
                <a href="https://nextsplit-v2.vercel.app" style="color:#9e9c97;">nextsplit.app</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
