# NextSplit — Master Delivery Plan
**Version:** 1.0 | **Date:** April 2026 | **Author:** Built from 16 strategy documents
**Status:** Living document — reviewed at milestones, not calendar dates

---

## How To Read This Document

This is the single source of truth for what gets built, in what order, and why.
Every item traces back to a specific strategy document. Every phase has a gate —
a measurable condition that must be met before the next phase begins. Every feature
has a stage review — a checkpoint to ask whether it still serves its original purpose.

**The founding principle across all 16 documents:**
> Users become believers the first time the plan adapts around something that went
> wrong in their life. Everything in this plan serves that moment.

---

## Where We Are — Honest Audit (April 2026)

The product is significantly ahead of the original roadmap on features.
The gap is users and revenue activation. These are the only things that matter right now.

### ✅ Complete and deployed

**Core product:**
- Today tab, session logging, undo, date navigation, progress strip
- Plan tab — week view, day drawer, week advance
- Log modal — effort, km, pace, duration, notes, auto-pace calculation
- Wellness check-in → `wellness_logs`, readiness score → Today tab
- Strava connect + session import
- Ad-hoc session logging
- Focus mode (run timer)
- Gym session tracker (live mode)

**Character system:**
- 6 visual avatars, XP, 15 levels, 32 badges
- 7 earned runner classes (Warming Up → Marathon Runner / Speed Merchant /
  Trail Blazer / Base Builder / All-Rounder / Comeback Runner)
- 4-week reveal with animated reveal screen + class share card
- Level-up screen, badge toast, XP feed

**Analytics & stats:**
- ACWR chart, Pace trend, Weekly volume, Race day simulation (Riegel)
- PB detection, Training zones, Pace calculator
- Weekly AI coaching summary
- WellnessTrend, WeightTrend
- TodayProgressStrip (weekly km, sessions, streak, ACWR)

**Coach platform:**
- Pro Coach squad dashboard (🟢🟡🔴 per athlete)
- Athlete detail (4 tabs: overview, sessions, wellness, message)
- Session annotations
- Text messaging
- Voice messages (60-second, waveform recorder, signed-URL player)
- Plan builder
- Coach marketplace listing

**Plan marketplace:**
- Browse with distance/level/search filters
- Plan detail modal with full preview
- Purchase + ownership tracking (athlete_id, coach_id, revenue split)
- "My Plans" tab for purchased coach plans

**Community:**
- Clubs, challenges, virtual races, leaderboard
- Squad leaderboard
- Club feed

**Onboarding:**
- 4 paths: Predetermined / AI Bespoke / Manual / Lifestyle
- 12 steps, all bugs fixed
- Coach Marketplace path creates placeholder plan

**Brand:**
- Forest/Ember/Track/Night token system
- Outfit + Cormorant Garamond + JetBrains Mono fonts loaded
- Race result share card ("Got me to the start line ready.")

**Revenue infrastructure:**
- Stripe subscriptions (founding £7.99, standard £13.99)
- Pro Coach platform fee (£29/mo)
- Marketplace purchase with 70/30 revenue split
- `PREMIUM_ENFORCED=false` — built but not yet activated

**Analytics instrumentation:**
- 25+ PostHog events across full AARRR funnel
- adaptation_requested, class_revealed, plan_purchased, voice_message_sent etc.

**Infrastructure:**
- Config centralisation (zero scattered process.env)
- N+1 query fixes
- Cross-plan chart data collision fixed
- isWeekDone gym session fix
- Sentry error tracking

### ❌ Not yet built (from strategy documents)

| Item | Source document | Phase |
|---|---|---|
| Paywall enforced | Revenue Architecture | Phase 3 |
| Apple Health sync | Tech Pillar / Roadmap H2 | Phase 3 |
| Garmin integration | Tech Pillar / Roadmap H3 | Phase 3 |
| Capacitor native app | Tech Pillar / Roadmap H3 | Phase 3 |
| Referral programme | Growth Pillar | Phase 4 |
| Lifecycle email sequence (7 emails) | Growth Pillar | Phase 3 |
| Push notifications (production) | Growth Pillar / Product Pillar | Phase 3 |
| Session reminder notifications | Growth Pillar | Phase 3 |
| Adaptation alert notifications | Growth Pillar | Phase 3 |
| At-risk re-engagement (4-day) | Growth Pillar | Phase 3 |
| In-app NPS prompt | Data Pillar / Ops Pillar | Phase 3 |
| Cookie consent | Data Pillar (required pre-launch) | Phase 3 |
| Privacy policy (real) | Ops Pillar (legal requirement) | Phase 3 |
| Terms of service (real) | Ops Pillar (legal requirement) | Phase 3 |
| Medical disclaimer | Ops Pillar | Phase 3 |
| GDPR data export (working) | Data Pillar / Ops Pillar | Phase 3 |
| Milestone squad notifications | Community Pillar L2 | Phase 4 |
| Squad reactions to milestones | Community Pillar L2 | Phase 4 |
| Split Leader invitation link flow | Growth Pillar | Phase 4 |
| Running club outreach (5 clubs) | Growth Pillar | Phase 3 (non-code) |
| Coach beta programme (5 coaches) | Coach Pillar / Roadmap | Phase 4 |
| Content hub (20 guides) | Community Pillar / Growth Pillar | Phase 5 |
| SEO foundation | Growth Pillar | Phase 5 |
| Monday PostHog dashboard setup | Data Pillar | Phase 3 |
| Predetermined path credibility layer | Product Pillar / Roadmap | Phase 4 |
| Lifestyle path re-entry flow refinement | Product Pillar / Roadmap | Phase 4 |
| AI Bespoke path depth refinement | Product Pillar / Roadmap | Phase 4 |
| Weekly featured plan (push + email) | Growth Pillar | Phase 4 |
| Race season campaigns | Growth Pillar | Phase 5 |
| Apple Watch companion | Tech Pillar / Roadmap H4 | Phase 5 |
| Club B2B offering | Roadmap H4 | Phase 5 |
| Training science research | Brand Pillar / Roadmap H4 | Phase 5 |
| Test suite (Vitest + Playwright) | Tech Pillar | Phase 5 |
| ProfileContext refactor | Known tech debt | Phase 5 |
| Supabase type regeneration | Tech Pillar | Phase 3 |
| Co-founder search | Ops Pillar (most important hire) | Now — always |
| Product designer hire | Ops Pillar | Phase 4 |
| Advisory board (3 advisors) | Ops Pillar | Phase 4 |
| ICO registration (GDPR) | Ops Pillar (£40, do now) | Now |
| Company formation | Ops Pillar | Now |
| Custom domain (nextsplit.com) | Roadmap | Phase 4 |

---

## The Sequencing Principle

From Master Roadmap v1.3:
> **Nail the loop. Perfect activation. Then grow. Quality before volume.
> Proven retention before paid acquisition. Every phase earned by the one before it.**

No phase begins until its predecessor hits its success metric.
Skipping phases is how startups build impressive features nobody uses.

---

## PHASE 3 — Activate & Legalise
**Timeframe:** Now, no users required — build in parallel with user recruitment
**Goal:** First paying user. Legal foundation. Production notifications. App Store ready.
**Pillar owners:** Product, Revenue, Ops, Data

---

### 3A — Legal Foundation (Do this week, non-code)

These are not optional. Health data + payments = legal requirements.

| Item | Action | Cost | Source |
|---|---|---|---|
| ICO Registration | Register at ico.org.uk | £40/yr | Ops Pillar |
| Company formation | Companies House online | £12 | Ops Pillar |
| Privacy policy | Termly free tier, lawyer review at launch | £0 now | Ops Pillar |
| Terms of service | Termly free tier, include coaching disclaimer | £0 now | Ops Pillar |
| Medical disclaimer | Add to onboarding screen 1 + ACWR UI | £0 | Ops Pillar |
| Cookie consent | Add to app before PostHog fires | £0 | Data Pillar |

**Stage review:** Are Privacy + Terms pages accurate, comprehensive, and readable by a non-lawyer runner? Do they cover health data, coaching liability, and the coaching relationship explicitly?

---

### 3B — Revenue Activation (Build now)

| Item | What | Why |
|---|---|---|
| Stripe E2E test | Test card 4242 4242 4242 4242 → verify `is_pro=true` | Gating everything |
| Flip `PREMIUM_ENFORCED=true` | Activate the paywall | No revenue without this |
| Free tier boundary audit | Confirm exactly what free users see vs can't access | Strategy doc says adaptation = paywall |
| Founding member countdown | Show spots remaining on upgrade modal | FOMO + urgency |

**The paywall boundary (from Revenue Architecture):**

| Free — Always | Paid — £4.99 launch / £7.99 long-term |
|---|---|
| Today tab + session logging | Plan adaptation (missed session rebuild) |
| Plan view (full calendar) | AI Bespoke plan generation |
| 1 active plan at a time | Full analytics (ACWR, pace trends) |
| Basic completion tracking | Unlimited plan switching |
| Strava sync (read) | Split Leader activation |
| All 4 onboarding paths | 3 → unlimited AI coaching interactions |
| Character + XP + badges | Advanced load monitoring |

**Stage review:** Is the adaptation feature compelling enough to convert? Is the paywall placement at the right moment in the user journey? Are we losing users at the wall or converting them?

---

### 3C — Production Notifications (Build now)

From Growth Pillar — push notifications are the primary retention mechanic.
**Never to our convenience. Always timed to their training.**

**Notifications to build:**

| Notification | Trigger | Message style | Priority |
|---|---|---|---|
| Session reminder | 60min before their typical session time | "Easy run today, Alex — 8km at your own pace." | 🔴 Critical |
| Adaptation alert | When AI adapts the plan | "Plan updated — moved Thursday's intervals to Saturday. You're still on track." | 🔴 Critical |
| Weekly recap | Sunday evening | "4 sessions, 42km. Your biggest week yet. Recovery week next." | 🟡 High |
| At-risk re-engagement | 4 days without login | "Your plan is still here. Pick up whenever you're ready." | 🟡 High |
| Race countdown | Final 4 weeks, weekly | "3 weeks to race day. Taper started. Trust the work." | 🟡 High |
| Streak at risk | Haven't logged today, streak ≥ 3 | One line, warm, no guilt | 🟢 Medium |
| Coach message | New voice/text from coach | "New message from [Coach name]" | 🟡 High |
| Class revealed | After 4 weeks + 6 sessions | "Your runner class has been revealed — open to see" | 🟡 High |

**Notification rules (from Growth Pillar — non-negotiable):**
- Maximum 1 per day per user
- Never send between 10pm–7am in user's timezone
- No notification sent purely to serve the product's metrics
- At-risk notification sent once only — no repeat if ignored
- User can configure notification preferences in Settings

**Stage review:** Are notifications being opened? Are session reminder notifications correlating with sessions being logged? Are we sending too many? Check PostHog `notification_received` events vs session_logged same day.

---

### 3D — Lifecycle Email Sequence (Build now)

From Growth Pillar — 7 emails that turn signups into believers. All in coach voice.

| Email | Day | Trigger | Goal |
|---|---|---|---|
| Welcome | Day 0 | Signup | First session within 24hrs |
| Still there | Day 3 | No session logged | Remove guilt barrier, reset clock |
| Week one done | Day 7 | After first session week | Reinforce habit, celebrate |
| Adaptation primer | Day 14 | Pre-paywall | Prime for conversion — show the adaptation before the paywall |
| Soft conversion | Day 21 | Logged sessions exist | First paid ask, earned not pressured |
| At-risk re-engagement | Day 45 | Low activity | Reactivate with race date urgency |
| Post-race | Within 24hr of race date | Race date reached | Log result + referral trigger |

**Email provider:** Choose before Phase 3 ships. Options: Resend (developer-friendly, $0 until 3,000/mo), Loops (built for SaaS lifecycle, $49/mo at scale), Postmark (reliability-focused).

**Stage review:** Day 0 open rate. Day 3 click-through. Day 14 is the most important — does reading about adaptation before the paywall improve conversion? A/B test subject lines on days 14 and 21.

---

### 3E — Monday Analytics Dashboard (Set up this week)

From Data Pillar — one PostHog dashboard, 30 minutes every Monday.

**Dashboard sections:**

| Section | Metrics | Decision threshold |
|---|---|---|
| Acquisition | New installs, install source, signup rate | If installs < 10/wk after 6wks → fix channels |
| Activation | Median time-to-first-session, onboarding completion, drop-off step | If time > 8min → redesign onboarding |
| Retention | WAT, Day 7 retention, Day 30 retention, avg sessions/user | Day 7 < 50% → fix daily loop. Day 30 < 40% → stop growth |
| Revenue | MRR, new subscribers, cancellations, free→paid conversion | Conv < 3% → move paywall or improve adaptation |
| Referral | Race cards shared, referral clicks, referral signups | < 1:5 ratio → revisit mechanic |
| Training outcomes | Plan adherence rate, ACWR red zone %, pace progression | Adherence < 70% → plans too hard |

**Weekly review format (from Ops Pillar — 30 minutes, every Monday):**
- 0–8 min: Metrics check (one number that moved wrong gets a hypothesis)
- 8–16 min: Blockers (each gets a named resolution, not "figure it out")
- 16–24 min: Priority reset (3 things that must ship this week — no more)
- 24–30 min: Strategy pulse (is what we're building the highest-leverage thing?)

**Written in Notion. 3 sentences per section. Do not skip.**

---

### 3F — Supabase Type Regeneration (Build now)

~40 `any` types in community + coach routes from tables added after last type gen.

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
```

Eliminates the technical debt that makes refactoring risky.

---

### Phase 3 Stage Gate

| Metric | Target | Decision if missed |
|---|---|---|
| Paywall live | `PREMIUM_ENFORCED=true` | Do not proceed |
| Legal foundation | ICO registered, Privacy + Terms live | Do not proceed |
| Session reminder notifications live | Firing correctly | Fix before any growth |
| Lifecycle email Day 0 + Day 3 live | Sending on trigger | Fix before user recruitment |
| Monday dashboard configured | PostHog dashboard built | Fix before any growth |
| First paying subscriber | ≥ 1 | Investigate paywall + conversion |

---

## PHASE 4 — Retention & Growth Mechanics
**Timeframe:** After Phase 3 gate + early users onboarded
**Goal:** Day 30 retention ≥ 40%. Referral live. Coach beta (5 coaches). App Store listed.
**Pillar owners:** Product, Growth, Tech, Community, Ops

---

### 4A — Native App (Capacitor)

From Tech Pillar — distribution is the unlock.

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init NextSplit app.nextsplit.app
npx cap add ios && npx cap add android
```

**Deliverables:**
- iOS build → TestFlight internal testing
- App Store listing (screenshots, description, privacy details)
- App icon (1024×1024, no transparency) + splash screen
- Tagline: "The plan that keeps up with your life."
- App Store description leads with adaptation story, not feature list

**Stage review:** Does the native app feel native? Time-to-interactive on 4G. Does it pass App Store review first submission? Are push notifications working on real devices?

---

### 4B — Apple Health + Garmin

From Tech Pillar + Roadmap H3 — reduce logging friction dramatically.

**Apple Health (via Capacitor HealthKit plugin):**
```bash
npm install @capacitor-community/health-kit
```
- Read: workouts, heart rate, HRV
- Auto-suggest session log when workout detected
- Passive: no manual import required
- Requires iOS only, HealthKit permission request on first open

**Garmin Integration:**
- Register NextSplit at Garmin Developer Portal
- OAuth flow: `/api/garmin/callback`
- Garmin pushes activities via webhook → map to session types
- Activity types: Running, TrailRunning, Cycling, Swimming → map to session codes
- Target: same zero-friction experience as Strava import

**Stage review:** Does auto-import reduce session logging friction? Check `session_logged` events with source='health_kit' vs 'manual' — is the ratio improving? Are imported sessions accurate (distance, pace, heart rate)?

---

### 4C — Onboarding Refinement

From Product Pillar + Roadmap H2 — time-to-first-session under 5 minutes.

**Predetermined path — credibility layer:**
- Plan selector must lead with methodology and coaching credentials, not plan names
- "16-week sub-4 marathon plan" → "Built on Daniels' Running Formula. Used by club runners targeting sub-4."
- Trust signal first, name second
- Add: plan methodology badge, sample week preview before activation

**Lifestyle path — re-entry flow:**
- First screen: "How much time do you have each week?" + "What do you enjoy?"
- Not race goals. Not experience level. Availability and enjoyment.
- Warm, judgment-free throughout
- Comeback Runner class pre-selected as likely outcome → sets expectation positively

**AI Bespoke path — depth signalling:**
- Questions must feel intelligent, not like a form
- "What happened the last time you didn't complete a training plan?" > "What's your current fitness level?"
- Depth of question = depth of trust for the Frustrated Veteran persona

**Stage review:** Use PostHog to identify the single biggest drop-off step per path. Fix that one step before any other onboarding work. Measure: time-to-first-session median before and after each change.

---

### 4D — Referral Programme

From Growth Pillar — the primary acquisition channel. Ships after Day 30 retention ≥ 40%.

**Mechanic:**
- Give a month free, get a month free (both referrer and referred)
- Triggered at the race result sharing moment — highest motivation point
- Split Leader invitations auto-generate referral links
- Referral dashboard in Character tab ("You've brought in 3 runners")

**Implementation:**
- Unique referral code per user, stored in profiles
- `/invite/[code]` landing page with referrer context ("Ash invited you")
- On conversion: add 30 days to both accounts via Stripe
- Track: `referral_sent`, `referral_link_clicked`, `referral_converted`

**Shipping gate:** Day 30 retention ≥ 40%. Not before. A referral programme for a product people don't stick with fills a leaky bucket expensively.

**Stage review:** Referral rate target is 1 per 5 active users within 90 days. Is the race result moment the right trigger? Are Split Leader invitations the biggest source? Is the incentive (1 month) compelling enough?

---

### 4E — Split Leader Invitation Flow

From Growth Pillar + Coach Pillar — each Split Leader is a referral engine.

**Current state:** Split Leader can be activated in Settings. No invitation link mechanism.

**What's needed:**
- Split Leader generates unique invitation link
- Link goes to `/join/[leader_code]` — personalised landing page
- Friend sees who invited them and what the squad is about
- Friends onboard as athletes connected to the Split Leader automatically
- No friction — friend doesn't need to understand the model upfront
- Squad shows immediately on Split Leader dashboard

**Stage review:** Are Split Leaders actually inviting friends? Check `split_leader_followed` events. Are squad members logging more consistently than solo users? (They should be — accountability is the mechanic.)

---

### 4F — Squad Milestone Notifications

From Community Pillar Layer 2 — milestone recognition within known groups.

When a squad member hits a milestone — first 20km run, PB, race finish:
- Squad sees it in the squad feed
- Coach/Split Leader gets notified — can send a voice message response
- Squad can add a reaction (4 emoji options — no likes, no general feed)
- XP and badge unlocks visible in squad context

**The test:** Does this feature make the runner train better, more consistently, or with more accountability? If the answer is no — it doesn't ship, regardless of engagement potential. (Community Pillar philosophy.)

**Stage review:** Are milestone notifications driving voice message responses from coaches? Are squads with milestone notifications showing higher Day 30 retention than those without?

---

### 4G — Running Club Outreach (Non-code)

From Growth Pillar — the highest-density early adopter segment.

**The 6-play playbook:**
1. **Identify** — 5 clubs (UK, US, Australia). 50–200 members, active Strava club, identifiable captain.
2. **Outreach** — Personal email to captain. Not a form. Offer: free Split Leader + extended trial for all members.
3. **Activate** — Set up club as squad. Weekly leaderboard creates accountability.
4. **Coach identification** — Most clubs have a coach. After 4 weeks, introduce Pro Coach pathway.
5. **Case study** — After 8 weeks, document completion rates, coach feedback. Publish as content.
6. **Scale** — 3 active clubs producing case studies → playbook runs itself.

**Target:** 3 active club partnerships within 6 months.

---

### 4H — Coach Beta Programme

From Coach Pillar + Ops Pillar — earn the right to put coaches on the platform.

**The principle:** An early coach introduction with a weak product kills the relationship permanently. The product must be strong enough to impress a coach before the first coach sees it.

**5 target coaches:**
- 1 marathon specialist (credentialed, club-affiliated)
- 1 trail/ultra coach (niche, passionate user base)
- 1 strength + run hybrid coach (growing market)
- 1 online coach with existing audience (marketplace proof)
- 1 informal club coach (Split Leader pathway)

**What they get:** Free Pro Coach for 6 months, verified badge, direct product input.
**What NextSplit gets:** Real usage data, marketplace content, testimonials, word of mouth.

**Shipping gate:** Pro Coach features working end-to-end (voice messages, plan builder, squad dashboard, marketplace listing). Do not recruit coaches before the platform is ready.

**Stage review:** Are coaches actually using the platform weekly? Are their athletes logging more consistently? Are coaches publishing marketplace plans? What's the biggest friction point in their workflow?

---

### 4I — Advisory Board (Non-code)

From Ops Pillar — the people who fill the gaps the founding team doesn't have.

| Advisor | Profile | What they bring | Offer |
|---|---|---|---|
| Sports Scientist | Academic or elite coach | Validates ACWR, pace zones, adaptation algorithm | 0.1–0.25% equity |
| Consumer App Growth | Founder/VP Growth at subscription app | Referral mechanics, lifecycle emails, retention levers | 0.1–0.25% equity |
| Running Industry | Coach community connector, UK Athletics adjacent | Coach network, community introductions | 0.1% equity |

**When to approach:** After first paying subscriber. Before that, the product isn't compelling enough to ask for someone's credibility.

---

### Phase 4 Stage Gate

| Metric | Target | Decision if missed |
|---|---|---|
| Day 30 retention | ≥ 40% | Do not launch referral or paid growth |
| Time-to-first-session | ≤ 5 minutes (median) | Fix onboarding before user recruitment |
| App Store listed | iOS app live | Fix before any marketing |
| Coach beta (5 coaches) | Active and giving feedback | Recruit more, or fix platform |
| Free → paid conversion | ≥ 3% | Move paywall or improve adaptation feature |
| Referral rate | 1 per 5 users, 90 days | Revisit trigger timing and incentive |

---

## PHASE 5 — Content, Scale & Platform
**Timeframe:** Month 4–12 from now (after Phase 4 gate)
**Goal:** 1,000 MAU. MRR > £5K. App Store rated 4.5+. Community flywheel turning.
**Pillar owners:** Growth, Community, Brand, Tech, Data

---

### 5A — Content Hub & SEO

From Community Pillar + Growth Pillar — organic search compounds.

**Publishing cadence:**
- 2 athlete stories/month (long-form blog + Instagram carousel + email)
- 1 coach spotlight/month (profile feature + social + marketplace link)
- 2 training plan guides/month (SEO — "best 16-week sub-4 marathon plan")
- 2 running science explainers/month (ACWR, pace zones, easy run value)
- Weekly featured plan (push + email + social — Monday morning)
- 2 race season campaigns/year (spring: Feb–Apr, autumn: Sep–Nov)

**SEO targets:** "marathon training plan", "half marathon training plan", "couch to 5k", "ACWR running", "running pace zones"

**Target:** 5,000 organic monthly visitors by month 6 of content publishing.

**Stage review:** Which content types drive the most plan marketplace conversions? Are athlete stories generating referral installs? Is the weekly featured plan email open rate ≥ 35%?

---

### 5B — Custom Domain

From Roadmap — nextsplit.com unlocks proper brand presence.

**Changes required when domain changes:**
- Vercel: update domain in project settings
- Supabase: update `NEXT_PUBLIC_SITE_URL` + auth redirect URLs
- Strava OAuth: update redirect URL in Strava app settings
- Stripe: update webhook endpoint URL + success/cancel URLs
- Email: update SPF/DKIM/DMARC records for lifecycle emails
- App Store: update website URL in listing

**Do all of these simultaneously.** A partial migration breaks auth.

---

### 5C — Club B2B Offering

From Roadmap H4 — running club licensing model.

**Model:** Club subscription (£X/month for up to N members). Club captain gets
Pro Coach tools. Members get extended free trial. Squad leaderboard across full club.

**Positioning:** "For running clubs that take training seriously."

**Gate:** 3 active club partnerships with proven value before any B2B pricing is offered.

---

### 5D — Apple Watch Companion

From Tech Pillar / Roadmap H4 — logging from the wrist.

Requires: Capacitor + WatchKit extension + HealthKit deep integration.

**Features:** Today's session glanceable. One-tap session start. Auto-sync to app.

**Gate:** Capacitor native app stable + iOS DAU ≥ 500.

---

### 5E — Training Science Research Programme

From Brand Pillar / Roadmap H4 — aggregate data → credibility → content.

Once ≥ 1,000 runners + 50,000 sessions: publish findings on how runners respond
to training. "Runners who maintain ACWR 0.8–1.3 for 12 weeks improve marathon
time by X% on average." Builds moat, creates content at scale, establishes
NextSplit as evidence-based.

**Gate:** Minimum 1,000 users, 50,000 sessions, sports science advisor in place.

---

### 5F — Test Suite

From Tech Pillar — zero automated tests is unsustainable.

**Stack:** Vitest (unit) + Playwright (E2E) + Supabase local dev for integration tests.

**Priority test coverage:**
1. `computeRunnerClass()` — class logic correctness
2. `calcACWR()` — ACWR calculation
3. Session logging → XP → level calculation chain
4. Stripe webhook → `is_pro=true` path
5. Marketplace purchase → plan activation path
6. Onboarding complete → first session flow (Playwright E2E)

---

### Phase 5 Stage Gate

| Metric | Target | Decision if missed |
|---|---|---|
| MAU | ≥ 1,000 | Diagnose funnel before scaling |
| MRR | ≥ £5K | Fix conversion or pricing |
| App Store rating | ≥ 4.5 | Fix the specific complaint category |
| Coach marketplace plans | ≥ 10 live plans | More coach recruitment |
| Organic monthly visitors | ≥ 5,000 | Review content strategy |

---

## PHASE 6 — Exit-Ready
**Timeframe:** Month 12–18 from now
**Goal:** Platform scale. Enterprise relationships. Exit optionality.

| Item | What |
|---|---|
| Running club enterprise | Multi-club licensing. Bulk athlete onboarding. |
| Coaching certification integration | Partnership with UK Athletics, parkrun, coaching bodies |
| International expansion | Non-English markets — start with German, French |
| Series A readiness | Clean cap table, audited accounts, documented processes |
| Acquisition positioning | Strava, TrainingPeaks, Garmin — all want what NextSplit has |

---

## Hiring Plan (Ops Pillar)

| Hire | When | What they own |
|---|---|---|
| Technical Co-Founder | **Now — active search** | Full engineering. Equity. Permanent. |
| Product Designer | Alongside or after Hire 1 | Visual execution. Figma. Brand token system. |
| Head of Growth | When Day 30 retention ≥ 40% | CAC, conversion, referral programme. |
| Community & Coach Partnerships | When coach beta begins | Coach relationships, club outreach, community. |

**Technical co-founder brief (from Ops Pillar):**
- Next.js, TypeScript, Supabase/Postgres, PWA, Stripe
- Product instinct (not just engineering)
- Startup pace comfort — ships things, doesn't gold-plate
- Permanent — get the fit right before equity is signed
- Do not wait for revenue to start the search

---

## Feature Stage Review Schedule

Every feature gets reviewed at the following trigger points:
- **After first 50 active users** — does the feature work as intended in the wild?
- **After Day 30 retention data** — does the feature correlate with retention?
- **At each phase gate** — should it be promoted, refined, or cut?

**Features requiring specific review at 50 users:**

| Feature | Review question | Kill condition |
|---|---|---|
| Runner class reveal | Are users sharing their class? Does reveal moment feel earned? | < 20% of eligible users open the reveal screen |
| Adaptation feature | Is it being triggered? Is it converting free → paid? | < 10% of users who hit the paywall convert |
| Voice messages | Are coaches sending them? Are athletes listening? | < 1 voice message per coach per week |
| Marketplace | Are athletes browsing coach plans? Any purchases? | Zero coach plan purchases in 60 days |
| Wellness check-in | Are users logging daily? Does readiness score affect sessions? | < 30% of users log wellness in week 2 |
| Weekly AI coaching summary | Are users generating it? Are they acting on it? | < 20% of eligible users generate summary in first month |
| Community clubs | Are users joining? Are clubs active? | Average club activity < 1 post per week |
| Squad leaderboard | Is it driving accountability? Are squads training more consistently? | No measurable difference in session rate for squad vs solo users |

---

## The Two Numbers That Matter Most (Growth Pillar)

**Year one. Two metrics. No more.**

**CAC — Cost Per Install:**
Target: ≤ 3-month subscription value (≤ £24 at £7.99/mo)
Track by channel: referral (target: near zero), organic (target: low),
club outreach (target: low), paid (only after retention proven)

**Subscription Conversion Rate:**
Target: ≥ 15% of free users converting within 30 days
Below 10% → freemium boundary is wrong or adaptation feature hasn't landed
Above 20% → free tier may be too restrictive

**If CAC is falling and conversion is rising — everything is working.**
**If either breaks — stop and diagnose before spending more.**

---

## The Flywheel (Growth Pillar)

```
Runner experiences the adaptation →
Becomes a believer →
Refers a friend (race result share card) →
Friend signs up free →
Friend's Split Leader invites them to squad →
Squad accountability drives retention →
Split Leader hits 5-runner cap →
Upgrades to Pro Coach →
Coach publishes marketplace plan →
Plan sells to athletes globally →
Athletes refer more runners →
```

**Every product decision is evaluated against this flywheel.**
**Does it make the flywheel spin faster? If not — deprioritise.**

---

## Document Index

All decisions trace to these sources:

| # | Document | Key contributions to this plan |
|---|---|---|
| 1 | Vision & Strategy v2.3 | The adaptation as conversion moment. Who we serve. |
| 2 | Company Operating Framework | 8-pillar structure. Solo founder constraints. |
| 3 | User Personas v1.3 | 6 archetypes. 4 onboarding paths. |
| 4 | Master Roadmap v1.3 | 4-horizon sequence. Decision log. Success targets. |
| 5 | Product & UX Pillar | Design language. 6 principles. 7am test. |
| 6 | Coach & Marketplace Pillar | 3-tier model. Revenue splits. Flywheel. |
| 7 | Brand & Identity Pillar | Forest/Ember tokens. Taglines. Hero brand moment. |
| 8 | Growth & Marketing Pillar | 5 channels. Referral mechanic. Lifecycle emails. Push strategy. |
| 9 | Technology & Engineering Pillar | Stack decisions. Performance targets. Test pyramid. |
| 10 | Community & Content Pillar | 4-layer community stack. Training-first philosophy. |
| 11 | Operations & People Pillar | Hiring plan. Weekly review cadence. Legal checklist. OKRs. |
| 12 | Data & Analytics Pillar | AARRR framework. Training outcomes. Privacy principles. |
| 13 | Character System Spec | 7 classes. Class triggers. Reveal window. Identity, not gamification. |
| 14 | Document Conflict Audit | 8 resolved conflicts. Split Leader naming. Pricing. |
| 15 | HANDOFF-4 | Current codebase state. Architecture. DB schema. |
| 16 | This session's build log | Voice messages. Marketplace. Analytics. Phase 2 complete. |
