/**
 * NextSplit Lifecycle Email Engine
 * Growth Pillar spec: "The emails that turn signups into believers."
 * All emails written in coach voice. Never generic. Never pushy.
 *
 * 7-email sequence:
 * Day 0  — Welcome — your plan is ready
 * Day 3  — Still there when you are (if no session logged)
 * Day 7  — Week one done — here's what the data says
 * Day 14 — What happens when your plan needs to adapt (pre-paywall prime)
 * Day 21 — Soft conversion ask
 * Day 45 — At-risk re-engagement
 * Post-race — How did it go? + referral trigger
 */

export type LifecycleEmailId =
  | 'welcome'
  | 'still_there'
  | 'week_one_done'
  | 'adaptation_primer'
  | 'soft_conversion'
  | 'at_risk'
  | 'post_race'

export interface LifecycleEmail {
  id:          LifecycleEmailId
  dayTrigger:  number | null    // null = event-based (post_race, still_there)
  condition?:  'no_session_logged' | 'low_activity' | 'race_date_reached' | 'always'
  subject:     string
  preheader:   string           // preview text in inbox
  goal:        string           // internal — what this email must achieve
}

export const LIFECYCLE_EMAILS: Record<LifecycleEmailId, LifecycleEmail> = {
  welcome: {
    id:         'welcome',
    dayTrigger: 0,
    condition:  'always',
    subject:    'Your plan is ready — here\'s what week 1 looks like',
    preheader:  'Everything you need to start is already set up.',
    goal:       'First session logged within 24 hours',
  },
  still_there: {
    id:         'still_there',
    dayTrigger: 3,
    condition:  'no_session_logged',
    subject:    'Still there when you are',
    preheader:  'Your plan hasn\'t started the clock yet.',
    goal:       'Remove guilt barrier. Reset the clock psychologically.',
  },
  week_one_done: {
    id:         'week_one_done',
    dayTrigger: 7,
    condition:  'always',
    subject:    'Week one done — here\'s what the data says',
    preheader:  'Something worth knowing about your first week.',
    goal:       'Reinforce the habit. Week 1 completion is the strongest predictor of Day 30 retention.',
  },
  adaptation_primer: {
    id:         'adaptation_primer',
    dayTrigger: 14,
    condition:  'always',
    subject:    'What happens when your plan needs to adapt',
    preheader:  'The most common thing that derails training — and how NextSplit handles it.',
    goal:       'Prime for conversion. Introduce adaptation before the paywall appears.',
  },
  soft_conversion: {
    id:         'soft_conversion',
    dayTrigger: 21,
    condition:  'always',
    subject:    'Your free plan is doing its job. Here\'s what\'s next.',
    preheader:  'You\'ve built a real training habit.',
    goal:       'First paid ask. Earned not pressured. Lead with what they\'ve built.',
  },
  at_risk: {
    id:         'at_risk',
    dayTrigger: 45,
    condition:  'low_activity',
    subject:    'Your race is still on the calendar',
    preheader:  'There\'s still time.',
    goal:       'Reactivate before churn. Personalised with actual race date and remaining time.',
  },
  post_race: {
    id:         'post_race',
    dayTrigger: null,
    condition:  'race_date_reached',
    subject:    'How did it go?',
    preheader:  'Log your result — we\'ll save it.',
    goal:       'Race result logging + referral trigger. Highest-motivation moment in entire journey.',
  },
}

/**
 * Generate email HTML for a lifecycle email.
 * Coach voice throughout. Mobile-first. No images (avoids spam filters).
 */
export function buildLifecycleEmailHtml(
  id: LifecycleEmailId,
  ctx: {
    firstName:       string
    planName?:       string
    sessionsLogged?: number
    totalKm?:        number
    raceDate?:       string
    daysToRace?:     number
    proUrl?:         string
    unsubUrl?:       string
  }
): string {
  const name    = ctx.firstName
  const proUrl  = ctx.proUrl  ?? 'https://nextsplit-v2.vercel.app/profile?upgrade=1'
  const unsub   = ctx.unsubUrl ?? 'https://nextsplit-v2.vercel.app/settings?section=notifications'

  const styles = `
    body { margin: 0; padding: 0; background: #f8f8f6; font-family: 'Outfit', -apple-system, sans-serif; }
    .wrap { max-width: 560px; margin: 32px auto; background: #ffffff; border-radius: 16px; overflow: hidden; }
    .header { background: #2b5c3f; padding: 28px 32px; }
    .logo { color: #ffffff; font-size: 20px; font-weight: 900; letter-spacing: -0.02em; margin: 0; }
    .body { padding: 32px; }
    h1 { color: #1a1a14; font-size: 22px; font-weight: 800; margin: 0 0 16px; line-height: 1.3; }
    p { color: #4a4a3a; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
    .cta { display: inline-block; background: #2b5c3f; color: #ffffff !important; text-decoration: none;
           padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 15px; margin: 8px 0 24px; }
    .stat { background: #edf4f0; border-radius: 12px; padding: 16px 20px; margin: 16px 0; }
    .stat-n { color: #2b5c3f; font-size: 28px; font-weight: 900; margin: 0; }
    .stat-l { color: #6b7280; font-size: 12px; margin: 2px 0 0; }
    .divider { height: 1px; background: #f0ede4; margin: 24px 0; }
    .footer { padding: 20px 32px; background: #f8f8f6; }
    .footer p { color: #9ca3af; font-size: 12px; line-height: 1.6; margin: 0; }
    .footer a { color: #2b5c3f; }
  `

  let body = ''

  switch (id) {
    case 'welcome':
      body = `
        <h1>Your plan is ready, ${name}.</h1>
        <p>Everything is set up. Your first week of training is scheduled and waiting — you just need to log the first session.</p>
        ${ctx.planName ? `<p>You're on the <strong>${ctx.planName}</strong>. Here's what week one looks like — a mix of easy running and some structure, nothing that should feel overwhelming.</p>` : ''}
        <p>The most important thing at this stage isn't pace or distance. It's the habit. One session this week, and you're already ahead of where you'd be otherwise.</p>
        <a href="https://nextsplit-v2.vercel.app/today" class="cta">Start week one →</a>
        <div class="divider"></div>
        <p>If anything in the plan doesn't work — a session you can't make, a day that needs shifting — just open the app and let it know. The plan adapts. That's the whole point.</p>
        <p>— Your NextSplit coach</p>
      `
      break

    case 'still_there':
      body = `
        <h1>Still here when you are, ${name}.</h1>
        <p>Your plan hasn't started the clock yet. Whenever you're ready to begin — tomorrow, this weekend, whenever — it picks up from that day.</p>
        <p>No catch-up required. No sense of having fallen behind. The plan adjusts to when you actually start, not when you signed up.</p>
        <a href="https://nextsplit-v2.vercel.app/today" class="cta">Pick up where you left off →</a>
        <div class="divider"></div>
        <p>If something got in the way of starting — work, life, just not feeling ready — that's completely normal. The plan doesn't judge. It just waits.</p>
        <p>— Your NextSplit coach</p>
      `
      break

    case 'week_one_done':
      body = `
        <h1>Week one done${ctx.sessionsLogged ? `, ${name}` : ''}.</h1>
        ${ctx.sessionsLogged ? `
          <div class="stat">
            <p class="stat-n">${ctx.sessionsLogged}</p>
            <p class="stat-l">sessions logged this week</p>
          </div>
          ${ctx.totalKm ? `<div class="stat"><p class="stat-n">${ctx.totalKm.toFixed(1)}km</p><p class="stat-l">total distance</p></div>` : ''}
          <p>That's exactly where you need to be. Week 2 builds on it — slightly more volume, but nothing dramatic. The progression is deliberate.</p>
        ` : `
          <p>The first week of any training plan is about building the habit more than the fitness. If you logged sessions this week, you're already doing the most important thing.</p>
        `}
        <p>One thing worth knowing: the weeks where runners feel like they didn't do enough are usually the weeks that build the most fitness. Easy runs that feel too easy are doing exactly what they're supposed to do.</p>
        <a href="https://nextsplit-v2.vercel.app/today" class="cta">See week 2 →</a>
        <p>— Your NextSplit coach</p>
      `
      break

    case 'adaptation_primer':
      body = `
        <h1>What happens when your plan needs to adapt.</h1>
        <p>The most common thing that derails training isn't injury, illness, or bad weather. It's a missed week — and not knowing how to get back on track without losing ground.</p>
        <p>Most training plans respond to a missed week by doing nothing. You fall behind, the sessions pile up, and the plan becomes a source of guilt rather than structure.</p>
        <p>NextSplit handles this differently.</p>
        <div class="stat" style="background: #edf4f0; border-left: 3px solid #2b5c3f; border-radius: 0 8px 8px 0; padding: 16px 20px;">
          <p style="color: #2b5c3f; font-weight: 600; margin: 0; font-size: 14px; line-height: 1.6;">When you miss a session and tell the app, it rebuilds the plan around what actually happened — adjusting what's left, protecting your key sessions, and keeping you on track for race day.</p>
        </div>
        <p>The plan adapts. Not because you failed, but because life happened — and a good coach adjusts.</p>
        <p>This feature is part of NextSplit Pro. If your plan ever needs to adapt, it's there waiting.</p>
        <a href="${proUrl}" class="cta">Learn about Pro →</a>
        <p>— Your NextSplit coach</p>
      `
      break

    case 'soft_conversion':
      body = `
        <h1>You've built a real training habit, ${name}.</h1>
        <p>Three weeks in. ${ctx.sessionsLogged ? `${ctx.sessionsLogged} sessions logged.` : 'Sessions logged, miles covered.'} ${ctx.totalKm ? `${ctx.totalKm.toFixed(0)}km covered.` : ''} That's not nothing — most people who sign up for a training plan don't make it this far.</p>
        <p>Your free plan has done what it's supposed to do: help you start, help you build, help you see that structured training is something you can actually stick to.</p>
        <p>NextSplit Pro keeps the plan adapting for as long as you need it — through the missed weeks, the illness, the busy periods, the race day. It's the part of the product that responds to real life.</p>
        <a href="${proUrl}" class="cta">Upgrade to Pro — £4.99/month →</a>
        <p style="color: #9ca3af; font-size: 13px;">No pressure. Your free plan continues working. Pro just means the plan can respond when life gets in the way.</p>
        <div class="divider"></div>
        <p>— Your NextSplit coach</p>
      `
      break

    case 'at_risk':
      body = `
        <h1>Your race is still on the calendar, ${name}.</h1>
        ${ctx.raceDate && ctx.daysToRace ? `
          <div class="stat">
            <p class="stat-n">${ctx.daysToRace}</p>
            <p class="stat-l">days until race day</p>
          </div>
          <p>There's still time. The plan is still there, it's still building toward ${ctx.raceDate} — it just needs you to start logging again.</p>
        ` : `
          <p>It's been a couple of weeks since we heard from you. The plan is still there, and there's still time to get the training in before race day.</p>
        `}
        <p>There's no catch-up required. Open the app, mark where you are, and let the plan rebuild from today. Missing weeks doesn't mean starting over — it means adjusting.</p>
        <a href="https://nextsplit-v2.vercel.app/today" class="cta">Get back on track →</a>
        <div class="divider"></div>
        <p>If something got in the way — injury, illness, life — the app can adapt the remaining plan to work with whatever time you have left.</p>
        <p>— Your NextSplit coach</p>
      `
      break

    case 'post_race':
      body = `
        <h1>How did it go, ${name}?</h1>
        <p>Your race was today. Log your result in the app and we'll save it to your training history — along with everything you did to get there.</p>
        <a href="https://nextsplit-v2.vercel.app/today" class="cta">Log your race result →</a>
        <div class="divider"></div>
        <p>Whatever happened out there — a PB, a tough day, just crossing the line — you trained for it. That part is already done.</p>
        <p>When you're ready to think about what's next, the app is there. A recovery week first. Then a new plan, whenever you're ready.</p>
        <p>Know a runner who'd benefit from a training plan that actually responds to real life? You can invite them from your profile — and you'll both get a free month when they upgrade.</p>
        <p>— Your NextSplit coach</p>
      `
      break
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>${styles}</style></head>
<body>
  <div class="wrap">
    <div class="header"><p class="logo">NextSplit</p></div>
    <div class="body">${body}</div>
    <div class="footer">
      <p>NextSplit · The plan that keeps up with your life.<br>
      <a href="${unsub}">Manage email preferences</a> · You're receiving this because you signed up for NextSplit.</p>
    </div>
  </div>
</body>
</html>`
}
