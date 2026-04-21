# NextSplit — Revised Master Delivery Plan
**Version:** 2.0 | **April 2026** | **Alpha-first approach**
**Status:** Living document — reviewed at milestones, not calendar dates

---

## Core Principle (unchanged)

> Users become believers the first time the plan adapts around something
> that went wrong in their life. Everything in this plan serves that moment.

---

## Alpha Philosophy

Premium features remain **unlocked** throughout alpha. The goal is UAT and
E2E testing with a closed pool of trusted users. Revenue activation gates
(PREMIUM_ENFORCED, referral release) are built and visible but not triggered.
Alpha ends when the product is stable, the coach dashboard is complete,
the plan library is full, and design is at a 10/10 standard.

---

## Current Build Status (April 2026)

### ✅ Built and deployed
- Core daily loop (Today, Plan, session logging, undo, date nav)
- Character system (7 classes, XP, 15 levels, 32 badges, class reveal)
- Coach platform (squad, athlete detail, voice messages, plan builder, marketplace)
- Community (clubs, challenges, races, leaderboard)
- Onboarding (all 4 paths, credibility layers, AI Bespoke depth, Lifestyle re-entry)
- Notifications (8 types, guardrails, per-type preferences)
- Lifecycle emails (7-email sequence, Resend integration)
- Split Leader mode toggle (Lead Dashboard, athlete toggle)
- Engineering foundation (52 unit tests, GitHub Actions CI, Playwright config)
- Referral programme (built, behind NEXT_PUBLIC_REFERRAL_ENABLED flag)
- Analytics (25+ PostHog events, AARRR instrumentation)

### 🔴 Critical gaps blocking alpha quality
1. Zod validation on API routes (security + reliability)
2. Cookie consent (legal requirement even for closed alpha)
3. AI adaptation E2E test and quality verification
4. Onboarding funnel PostHog events (measure where people drop)
5. Community features feel incomplete (club feed, challenge mechanics)
6. Coach dashboard — all 5 tiers need full build
7. Plan library — 17 templates is not enough, need 60-80
8. Design is at 3/10 — needs systematic uplift to 10/10
9. Email sender domain not configured (bouncing or spam)

---

## PHASE A — Alpha Foundation
**"Everything must work perfectly before a single real user sees it"**
**No user gate — build-first**
**Timeframe: 4-6 weeks**

---

### A1 — API Security & Validation (Zod)

**What Zod is:** TypeScript-first schema validation. Every API route currently
does `await req.json()` and trusts whatever comes back. Zod rejects bad data
at the door — wrong types, missing fields, SQL injection attempts, undefined
crashes. Without it, confusing production bugs are inevitable.

**Priority routes (in order):**
1. `/api/ai/adapt-plan` — AI call, most expensive route
2. `/api/ai/generate-plan` — plan generation, most consequential
3. `/api/plans/activate` — activates training plans
4. `/api/marketplace/purchase` — financial transaction
5. `/api/coach/invite` — security sensitive

**Pattern for every route:**
```typescript
import { z } from 'zod'
const schema = z.object({ plan_id: z.string().uuid(), week_n: z.number().int().min(1) })
const result = schema.safeParse(await req.json())
if (!result.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
const { plan_id, week_n } = result.data
```

**Deliverable:** Zod on all 15 critical API routes. Install zod, add schemas,
no breaking changes to frontend (schemas match what frontend already sends).

#### A1b — Supabase Type Regeneration

~40 `any` type casts in community and coach routes from tables added after last
type generation. Until this is done, the compiler can't catch real bugs.

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
```

Run, fix the resulting TypeScript errors (mostly adding missing fields to
interface usages), commit. Estimated: 2–3 hours. Do before Zod schemas are
written so schemas can use the correct types.

---

### A2 — Legal Foundation + Cookie Consent

**Non-negotiable before any user, alpha or otherwise.**

#### A2a — Non-code legal tasks (do immediately, parallel with build)

| Item | Action | Cost | Urgency |
|---|---|---|---|
| ICO registration | ico.org.uk — health data requires this | £40/yr | ⚠️ Before alpha |
| Company formation | Companies House online | £12 | ⚠️ Before alpha |
| Privacy policy | Termly free tier. Must cover: health data, coaching liability, analytics, GDPR rights | £0 | ⚠️ Before alpha |
| Terms of service | Termly free tier. Must cover: coaching disclaimer, adaptation limits, subscription terms | £0 | ⚠️ Before alpha |
| Medical disclaimer | Add to: onboarding screen 1, ACWR UI, wellness check-in. "NextSplit is not a medical device. ACWR is a training load indicator, not a medical diagnosis." | £0 | ⚠️ Before alpha |

#### A2b — Cookie consent (code)

PostHog fires on every page load with no consent. ICO requires consent
before analytics cookies fire. Even for a closed alpha.

**Approach:** Full accept/reject. Not a notice. A proper consent mechanism:
- Blocks PostHog from firing until accepted
- Stores consent in localStorage + Supabase profile
- "Manage preferences" in Settings
- Mobile: bottom sheet (feels native, not a desktop banner)
- Brand language, not legal boilerplate

**Copy:** "We use analytics to understand how runners use NextSplit and
improve training plans. No advertising. No third-party sharing."

#### A2c — GDPR data export (verify E2E)

Settings has "Export my data" button. Verify it:
- Actually generates a complete export (all training logs, wellness, goals)
- Downloads as JSON (GDPR requires machine-readable)
- Completes within 30 seconds for a typical user
- Includes a deletion request path ("Delete my account" → confirm → purge all data)

**Deliverables:** ICO registered, Privacy + Terms pages live (real content),
medical disclaimer in 3 places, CookieConsentBanner component, GDPR export E2E verified.

---

### A3 — AI Plan Quality Review Tool

**Problem:** AI Bespoke plan generation has never been reviewed at scale.
A bad plan on first impression = instant churn.

**Build:** Admin page at `/admin/plan-review` (auth-gated to admin users):
- Generate a plan for a test profile (any combination of goals/experience/km)
- See the raw weeks_data JSON rendered as a visual plan
- Check: does week 1 make sense? Is the progression sensible? Are paces correct?
- Flag problematic outputs
- A/B compare prompt versions

**Also:** Review 10 generated plans manually before alpha users arrive.
Document what "good" looks like so the prompt can be improved.

---

### A4 — Onboarding Funnel PostHog Events

**Currently missing:** PostHog can't tell you which onboarding step loses people.
You have events at the end (plan activated) but nothing in between.

**Add events to every screen transition:**
- `onboarding_step_viewed` with `{ step: 'training_path', path: 'ai_bespoke' }`
- `onboarding_path_selected` with `{ path: 'predetermined' }`
- `onboarding_step_completed` with `{ step, time_on_step_secs }`
- `onboarding_abandoned` with `{ last_step, total_time_secs }`

**Dashboard:** PostHog funnel chart showing completion % per step.
Goal: identify the single biggest drop-off step before any real user sees it.

---

### A5 — AI Adaptation E2E Verification

**Problem:** The MissedSessionFlow shows the paywall and triggers adaptation,
but end-to-end verification that the rebuilt plan is sensible hasn't been done.

**Test matrix to build and verify:**
1. Miss 1 easy run — rebuild should shift it, not drop it
2. Miss an interval session — rebuild should protect next quality session
3. Miss a whole week — rebuild should reduce remaining volume proportionally
4. Miss with 4 weeks to race — rebuild should protect the taper
5. Pro user sees rebuilt plan immediately, free user sees paywall (with PREMIUM_ENFORCED=true in a test env)

**Deliverable:** Test matrix document + admin tool to simulate missed sessions
and view adaptation output before it reaches a user.

---

### A6 — Email Sender Domain

**Fix:** Add SPF, DKIM, DMARC records to nextsplit.app DNS.
Resend provides exact records. Takes 20-30 minutes.
Without this, lifecycle emails go to spam.

**Short-term (alpha):** Use Resend subdomain `mail.nextsplit.app` — functional immediately.
**Pre-launch:** Verify full `nextsplit.app` sending domain.

---

### A7 — In-App NPS Prompt

Must be built before alpha so you collect data from day one.

**Trigger:** Day 7 after first session logged, and Day 30.
**Format:** Single question bottom sheet. "How likely are you to recommend
NextSplit to a running friend? (0–10)" + optional free text.
**Store:** PostHog `nps_submitted` event + Supabase `nps_responses` table.
**Coach voice:** "Quick question — it helps us improve." Not "Take our survey."

### A8 — Monday PostHog Dashboard (Non-code setup)

Configure before alpha users arrive. Sections:
- Onboarding funnel (step completion %)
- Day 7 / Day 30 retention
- Session logging rate (sessions/user/week)
- NPS score (rolling 30-day)
- Today tab → session logged conversion

**30 minutes to configure. Do it before first alpha invite goes out.**

### Phase A Gate
- [ ] Zod on all 15 critical routes
- [ ] Supabase types regenerated
- [ ] ICO registered, company formed
- [ ] Privacy + Terms pages live (real content)
- [ ] Medical disclaimer in 3 locations
- [ ] Cookie consent built and blocking PostHog pre-consent
- [ ] GDPR data export verified E2E
- [ ] 10 AI Bespoke plans reviewed manually
- [ ] Onboarding funnel events firing in PostHog
- [ ] Monday PostHog dashboard configured
- [ ] NPS prompt built (Day 7 + Day 30 triggers)
- [ ] Adaptation E2E verified for 5 test scenarios
- [ ] Email sending from verified domain

---

## PHASE B — Coach Dashboard Overhaul
**"Coaches are the flywheel. The product must impress them."**
**No user gate — build-first**
**Timeframe: 3-4 weeks**

---

### B1 — Squad Command Centre (Tier 1)

**Current:** List of athlete cards with status dots. Coach has to tap each
athlete to understand what's happening.

**Target:** A dashboard that tells the coach everything actionable in 30 seconds.

**Layout:**
- **Attention required strip** (top, always visible) — athletes with red/amber
  status, what's wrong, one-tap action (send message, adjust session)
- **Today's sessions** — which athletes have key sessions today, who's done,
  who's outstanding
- **Load risk heatmap** — 5-athlete grid, ACWR colour per athlete for last 4 weeks
  Red = >1.3, Amber = <0.8, Green = 0.8-1.3
- **Weekly overview** — completion bars per athlete (Mon-Sun)
- **Upcoming key sessions** — next 7 days, flagged intervals/races/long runs
- **Quick actions** — bulk "great week" voice note, bulk weekly summary review

---

### B2 — Athlete Drill-Down (Tier 2)

**Current:** 4-tab athlete page. Not structured around coach's questions.

**Target:** Coach immediately answers: "How is this athlete doing and what
do they need from me?"

**Redesign:**
- **Hero card** — name, class, current week, key metric (ACWR), last active, streak
- **12-week load chart** — ACWR plotted over time with key events marked
  (injury, missed week, race) — the coach's most important view
- **This week** — session-by-session with logged km, effort, notes
- **Recent wellness** — readiness/sleep/soreness trend (sparklines)
- **Upcoming sessions** — next 14 days, with ability to annotate ahead of time
- **Communication thread** — full history of voice + text messages in one view
- **Quick reactions** — one-tap emoji reactions to specific sessions (🔥 great effort,
  💙 well paced, ⚡ strong intervals, 🧊 take it easy)

---

### B3 — Communication Layer (Tier 3)

**Current:** Voice messages and text exist but no persistent thread view.
Coach can't see conversation history.

**Build:**
- **Unified message thread** per athlete — voice + text in chronological order
- **Quick reactions** — 4 options per session, no typing required
  (Great session 🔥 / Well controlled 💙 / Take it easy tomorrow 🧊 / Let's talk 📞)
- **Broadcast message** — send voice note to all athletes simultaneously
  (weekly squad motivation, race week message)
- **Response indicators** — did the athlete listen to the voice note? Did they
  read the message? Timestamp visible.
- **Template messages** — coach builds 5-10 reusable messages
  ("Great interval session — your times are improving", "Easy run tomorrow, genuinely easy")

#### Split Leader Invitation Link

Split Leaders need a simple way to invite runners to their squad.

**Flow:**
1. Split Leader taps "Invite athlete" in Lead Dashboard
2. App generates unique invite link (`/invite/[leader_code]`)
3. Invited runner lands on personalised page: "Alex invited you to their squad"
4. Runner signs up / logs in → auto-connected to Split Leader's squad
5. Split Leader gets notification: "New athlete joined your squad"

This is the Growth Pillar's highest-density referral vector. Each Split Leader
with 5 athletes = 5 potential referrals to the platform.

---

### B4 — Plan Build → Athlete Handshake (Tier 4)

**Current:** Coach builds plan in plan builder. Athlete gets it somehow.
The handshake between coach and athlete is not a complete flow.

**Full flow to build:**

1. **Discovery** — Athlete fills intake form (goal, race, current km, strengths,
   weakness, injury history). Coach sees this before building.
2. **Communication** — Coach asks follow-up questions via the message thread.
   Athlete responds. Coach can request a call.
3. **Plan build progress** — Coach marks stages:
   "Reviewing your intake" → "Building week structure" → "Setting pace zones" → "Ready for review"
   Athlete sees progress in app with no action required.
4. **Plan preview** — Athlete sees full plan before accepting.
   Can request one round of changes ("Can we move Tuesday to Thursday?")
5. **Acceptance** — Athlete accepts → payment confirms → plan activates.
   Both get a confirmation. Coach gets notified.
6. **Active coaching** — After acceptance, standard coach-athlete cycle begins.

---

### B5 — Marketplace Performance Dashboard (Tier 5)

**Current:** Coach can publish a plan. No visibility into how it performs.

**Build:**
- Downloads (total, this week, this month)
- Active users (athletes currently on this plan)
- Completion rate (% finishing the plan)
- Average rating + recent reviews
- Revenue earned (total, monthly)
- Geographic distribution (where are buyers?)

---

### Phase B Gate
- [ ] Squad command centre shows actionable data in 30 seconds
- [ ] Athlete drill-down answers the coach's key questions without tapping
- [ ] Communication thread shows full history
- [ ] Quick reactions work on any session
- [ ] Plan build flow has all 6 stages
- [ ] Marketplace performance visible per plan
- [ ] A real coach (test user) can navigate all 5 tiers without instruction

---

## PHASE C — Plan Library Expansion
**"A training plan app with 17 plans is like a restaurant with 3 menu items."**
**No user gate — build-first**
**Timeframe: 2-3 weeks (parallel with B)**

---

### C1 — Marathon Plans (21 plans)

**Target times × durations:**

| Target | 12 weeks | 16 weeks | 20 weeks |
|---|---|---|---|
| Sub 2:30 | ✓ | ✓ | ✓ |
| Sub 2:45 | ✓ | ✓ | ✓ |
| Sub 3:00 | ✓ | ✓ | ✓ |
| Sub 3:15 | ✓ | ✓ | ✓ |
| Sub 3:30 | ✓ | ✓ | ✓ |
| Sub 4:00 | ✓ | ✓ | ✓ |
| Finish (first marathon) | ✓ | ✓ | ✓ |

**Approach:** Generate programmatically. Each plan shares the same structural
template (easy/tempo/long run pattern) with pace zones derived from VDOT.
Target time → VDOT score → all training paces calculated.

---

### C2 — Half Marathon Plans (15 plans)

| Target | 8 weeks | 12 weeks | 16 weeks |
|---|---|---|---|
| Sub 1:30 | ✓ | ✓ | ✓ |
| Sub 1:45 | ✓ | ✓ | ✓ |
| Sub 2:00 | ✓ | ✓ | ✓ |
| Sub 2:15 | ✓ | ✓ | ✓ |
| Finish (first HM) | ✓ | ✓ | ✓ |

---

### C3 — 10K Plans (12 plans)

| Target | 6 weeks | 8 weeks | 12 weeks |
|---|---|---|---|
| Sub 40:00 | ✓ | ✓ | ✓ |
| Sub 45:00 | ✓ | ✓ | ✓ |
| Sub 50:00 | ✓ | ✓ | ✓ |
| Sub 60:00 | ✓ | ✓ | ✓ |

---

### C4 — 5K Plans (9 plans)

| Target | 4 weeks | 6 weeks | 8 weeks |
|---|---|---|---|
| Sub 20:00 | ✓ | ✓ | ✓ |
| Sub 25:00 | ✓ | ✓ | ✓ |
| Sub 30:00 | ✓ | ✓ | ✓ |

---

### C5 — Lifestyle & Base Plans (8 plans)

| Plan | Duration |
|---|---|
| 5K base builder (complete beginner) | 8 weeks |
| 10K base builder | 10 weeks |
| Run/walk progression | 8 weeks |
| Easy 30-min runner (lifestyle) | Ongoing/12 weeks |
| Trail running foundation | 8 weeks |
| Post-race recovery | 4 weeks |
| Return to running (injury/break) | 6 weeks |
| Winter maintenance | 12 weeks |

---

### C6 — AI Pace Zone Adaptation

For predetermined plans: runner inputs their recent 5K time or parkrun time.
System calculates VDOT score and adapts all pace zones in the selected plan.

**VDOT-based pace zones:**
- Easy: VDOT equivalent pace × 1.20–1.29
- Marathon pace: VDOT equivalent pace × 1.08–1.12
- Tempo: VDOT equivalent pace × 1.04–1.07
- Threshold: VDOT equivalent pace × 1.00–1.03
- VO2max (intervals): VDOT equivalent pace × 0.95–0.99

**This removes the need for 7 target time variants per duration** — the runner
picks "16-week marathon plan" and their recent time does the personalisation.
Reduces plan count needed by ~60% and is more accurate.

---

### C7 — Coach Plan Templates

Coaches build plans in the plan builder. The builder needs:
- Pace zone calculator (runner's goal time → all zones auto-calculated)
- Session type library (easy, tempo, interval, long, race, gym, rest)
- Week structure templates (3-run, 4-run, 5-run weeks)
- Progressive overload calculator (3 weeks build, 1 week recovery)
- Plan preview before publishing to marketplace

---

### Phase C Gate
- [ ] 65+ plan templates seeded (marathon + HM + 10K + 5K + lifestyle)
- [ ] All plans have correct pace zones for their target time
- [ ] AI pace zone adaptation works for predetermined path
- [ ] Coach plan builder has pace zone calculator
- [ ] Plan browser shows correct match for any runner profile

---

## PHASE D — Design Uplift: 3/10 → 10/10
**"The product must feel as good as it works."**
**No user gate — highest impact on first impression and alpha UAT feedback**
**Timeframe: 4-5 weeks**

---

### D1 — Typography System

**Problem:** Cormorant Garamond and Outfit are loaded but barely used.
App renders in system-ui everywhere, looking like default Tailwind.

**Fix — 3-level type hierarchy:**

| Level | Font | Weight | Use |
|---|---|---|---|
| Display | Cormorant Garamond | 700-900 | Plan names, class names, race day, section heroes |
| UI | Outfit | 400-700 | All body copy, labels, buttons, nav |
| Data | JetBrains Mono | 400-600 | Pace, distance, XP, times, ACWR numbers |

**Target:** Every pace time, every XP number, every distance uses JetBrains Mono.
Every plan name uses Cormorant. Every UI element uses Outfit.
This single change moves the needle 2-3 points on perceived quality.

---

### D2 — Colour and Surface System

**Problem:** Everything is white/gray-100. No visual hierarchy. Looks generic.

**Dark surface system:**
- Today header: deep forest-to-night gradient (not white)
- Session cards: colour-coded by type (below)
- Plan names in headers: white text on dark gradient
- Profile/Character header: dark with character avatar prominent

**Session type colour system:**
| Session | Card accent | Icon colour |
|---|---|---|
| Easy run | Cool blue-green #4a9b8e | 😌 |
| Tempo/MP | Ember orange #e85d26 | ⚡ |
| Intervals | Red #dc2626 | 🔥 |
| Long run | Track gold #c49a3c | 🏃 |
| Rest | Warm slate #8b9aa8 | 😴 |
| Gym | Forest #2b5c3f | 💪 |
| Race | Night purple #5b21b6 | 🏆 |

---

### D3 — Icon System Migration

**Replace:** Heroicons (used inconsistently, generic)
**With:** Phosphor Icons (6 weights, 1000+ icons, much more distinctive)

Install: `npm install @phosphor-icons/react`
Consistent weight: `regular` for UI, `bold` for active/CTA states.

---

### D4 — Character Avatar — SVG to its limit

**Current:** Basic SVG stick figure. Does not feel like an identity.

**Target:** Detailed, expressive SVG character that feels like a trading card.
Per class, the avatar reflects the class identity:
- Marathon Runner: tall, lean, relaxed arm swing, long stride
- Speed Merchant: coiled, explosive position, forward lean
- Trail Blazer: sturdy build, trail shoes, nature elements
- Base Builder: steady pose, consistent form, calm expression
- All-Rounder: balanced athletic position
- Comeback Runner: triumphant return pose, slightly worn kit
- Warming Up: early morning light, cautious first steps

**Approach:**
1. Extend `renderCharSVG()` with class-specific rendering paths
2. Add: detailed facial features, class-specific kit colours, equipment details
3. Level-based visual progression (level 1 basic kit → level 15 elite kit)
4. Animated idle state (subtle breathing loop in CSS)
5. Run pose for in-session use
6. Victory pose for race completion / PB

**Why SVG not external:** No dependency, loads instantly, matches brand exactly,
can be generated server-side for share cards.

---

### D5 — Session Card Redesign

**Current:** White card, session name, log button. Generic.

**Target:** Each session type has a distinctive visual identity.

**New card structure:**
- Left: colour stripe matching session type (5px, full height)
- Icon: session-specific emoji in coloured circle
- Header: session name in Outfit bold
- Sub: plain-English description ("8km at easy pace — breathing comfortable")
- Stats: km, target pace in JetBrains Mono
- Progress bar: distance logged vs target (fills as user logs)
- CTA: "Log session" button, or green ✓ if done
- Bottom: effort rating row (1-5 dots) if done

---

### D6 — Today Header — Dark Gradient

**Current:** White header with Forest text.

**Target:** Deep forest-to-night gradient. White text. Character SVG peeking in right edge.
Feels like opening a premium training app, not a form.

**Structure:**
- Background: `from-[#1a3a2a] via-[#2b5c3f] to-[#0d3d38]`
- Greeting: Cormorant Garamond, large, white
- Session line: Outfit, smaller, #90cca8 (light forest)
- Streak/progress: right side, JetBrains Mono numbers
- Character SVG: 60px, right edge, partially cropped — creates depth

---

### D7 — XP and Level-Up Animation

**Current:** Toast notification. Basic.

**Target:** Full-screen moment that feels earned.

**Level-up sequence:**
1. Screen dims slightly (0.4s)
2. XP bar fills to 100% with gold glow (0.6s)
3. Level number breaks apart, new number assembles (0.8s in JetBrains Mono)
4. Level name appears in Cormorant, large (0.4s)
5. Particle burst (pure CSS, 12 particles in Ember + Track colours)
6. New level unlocks flash below (badges, cosmetics)
7. CTA: "Share your level" / "Continue training"

All pure CSS + Framer Motion. No external dependencies.

---

### D8 — Plan Week Visualisation

**Current:** List of session cards per day.

**Target:** Visual week arc showing load distribution.

**Week header card:**
- Arc/curve showing planned load across 7 days
- Peak day highlighted (usually Saturday/Sunday long run)
- Recovery days shown in cool colours
- Current day marker
- Week completion percentage
- Week title from plan (e.g. "Base building — Week 3 of 16")

---

### D9 — Class Reveal Redesign

**Current:** Dark gradient screen, emoji, class name. Works but not iconic.

**Target:** Trading card reveal. The moment feels genuinely earned.

**Sequence:**
1. Card face-down, dark (0.5s build)
2. Card flips (CSS 3D transform, 0.8s)
3. Front: full-height character SVG in class-specific scene
4. Class name in Cormorant, large, gold
5. Tagline in Outfit, smaller
6. "Your coaching insight" — collapsible, coach voice
7. Share card generated automatically (OG image quality)
8. "Share my class" → native share / copy link

---

### D10 — Onboarding Visual Uplift

**Current:** slate-50 background, basic card layouts.

**Target:** Each onboarding screen feels like the app's best moment.

- Welcome screen: full-screen dark gradient with animated runner character
- Path selection: cards with distinctive visual character per path
- Character creation: avatar builds in real-time as runner selects options
- Plan preview: the plan should look exciting, not like a spreadsheet
- "Start training": big moment — animation, XP award, character appears

---

### Phase D Gate
- [ ] Typography system applied consistently everywhere
- [ ] Session cards colour-coded and visually distinct
- [ ] Today header uses dark gradient
- [ ] Character avatars are detailed and class-specific
- [ ] Level-up animation feels earned
- [ ] Class reveal feels like a trading card moment
- [ ] Onboarding welcome screen is premium
- [ ] Show to 3 people with no context — do they say "wow"?

---

## PHASE E — Community Completion
**"Make what's built feel complete, not what's partially there."**
**Timeframe: 2-3 weeks**

---

### E1 — Club Feed (Real Posts)

**Current:** Club feed exists but has no content mechanism.

**Build:**
- Session auto-posts: when a member logs a session, it appears in club feed
  (opt-in per user, default on)
- Coach posts: coach/Split Leader can post text + optional image
- Milestone posts: auto-generated (First 20km run, PB, race finish)
- Reactions: 4 emoji options per post (🔥 💙 💪 🙌), no likes count

---

### E2 — Challenge Completion Verification

**Current:** Challenges exist but completion isn't verified.

**Build:**
- Challenge progress tracked against actual logged sessions
- Auto-complete when target hit (km target, session count, streak target)
- Completion notification + badge
- Leaderboard updates in real time

---

### E3 — Race Results

**Current:** Races can be entered but results aren't recorded.

**Build:**
- Post-race result logging (time, position, notes)
- Results visible in race leaderboard
- Personal race history on profile
- Race result share card (existing, just needs to be triggered)

---

### E4 — Runner-to-Runner Interactions

**Spec says:** Training-first. Not a social network. Interaction only where it
serves training quality.

**Build (minimal, purposeful):**
- Session kudos: tap on a squadmate's session to give a reaction
  (visible to them only, not broadcast)
- Race day support: if a squadmate has a race today, prompt for encouragement
- PB recognition: automatic notification when squadmate hits a PB

**Milestone squad notifications:**
When a squad member hits a milestone (first 20km run, PB, race finish):
- Squad feed shows the milestone automatically
- Coach / Split Leader gets a push notification → can send voice response
- Squad members see it in club feed with reaction option

**Do not build:** Comments, general posts, following, likes count, feed algorithm.

---

### Phase E Gate
- [ ] Club feed shows real session activity
- [ ] Challenges auto-complete when criteria met
- [ ] Race results recorded and displayed
- [ ] Kudos system works between squad members
- [ ] A club of 5 people can have a genuinely active week in the app

---

## PHASE F — Pre-Alpha Quality Gates
**Timeframe: 1 week (final check before any user)**

- [ ] Full E2E walkthrough by founder on iPhone and Android
- [ ] All 4 onboarding paths completed start-to-finish
- [ ] Session logged, adapted, week advanced — all work
- [ ] Coach dashboard: create athlete, build plan, send voice message, view metrics
- [ ] Plan purchased from marketplace, activated, first session logged
- [ ] Class reveal works correctly at 4-week mark
- [ ] Push notifications arrive on real device
- [ ] Lifecycle email day 0 arrives within 2 minutes of signup
- [ ] Cookie consent banner appears and correctly gates PostHog
- [ ] Referral link works (even if behind flag)
- [ ] Zero broken routes, zero 500 errors in Sentry
- [ ] Lighthouse score ≥ 90 on Today tab (4G mobile)
- [ ] 3 people with no NextSplit context complete onboarding in < 5 minutes

---

## PHASE G — Alpha (Closed Pool)
**Gate: Phases A-F complete**
**Pool: Trusted users, personal invites only, no public access**

Goals:
- Validate the core loop (plan → session → log → adapt)
- Validate the coach dashboard (5 tiers all used by real coaches)
- Validate onboarding completion rate > 80%
- Identify top 3 friction points from real usage
- Collect NPS at Day 7 and Day 30
- Validate AI plan quality with real runners

---

## PHASE H — Revenue Activation
**Gate: Alpha stable, Day 30 retention ≥ 40%**
**This is NOT in alpha scope — all features built, none enforced**

- Flip `PREMIUM_ENFORCED=true`
- Stripe E2E test with real card
- Referral programme: flip `NEXT_PUBLIC_REFERRAL_ENABLED=true`
- Legal foundation: ICO registered, Privacy + Terms live
- Email domain: nextsplit.app verified
- First paying subscriber

---

## PHASE I — Public Beta + Growth
**Gate: First paying subscriber, legal foundation complete**

- App Store listing (requires Phase 9 — Capacitor native app)
- Garmin integration (Phase 10 — server-side, no native required)
- Running club outreach (5 clubs)
- Coach beta programme (5 coaches)
- PostHog Monday dashboard live
- Referral programme active
- **Custom domain migration (nextsplit.com)**
  When domain changes, all of these must change simultaneously:
  Vercel domain → Supabase SITE_URL → Strava OAuth redirect →
  Stripe webhook URL → Email SPF/DKIM → App Store URL.
  Do not do partial migrations.
- Weekly featured plan (push + email, Monday morning)
- Race season campaigns (spring: Feb–Apr, autumn: Sep–Nov)
- Apple Health sync (via Capacitor HealthKit — requires native app)
- Apple Watch companion (via WatchKit — requires native app + HealthKit)
- Club B2B offering (after 3 active club partnerships proven)
- Training science research programme (after 1,000 users + 50,000 sessions)
- ProfileContext refactor (when complexity causes real bugs — not before)
- **Co-founder search (ongoing — start now, not after alpha)**
  Technical co-founder: Next.js, TypeScript, Supabase, startup pace.
  Product instinct required. Permanent hire before equity signs.
  Do not wait for revenue.
- Hiring: Product designer (after Phase D), Head of Growth (at Phase H), Coach partnerships
- Advisory board outreach (Sports Scientist, Consumer App Growth, Running Industry)

---

## Build Sequence (Dependency-ordered)

```
PARALLEL TRACKS (can run simultaneously):

Track 1 — Security & Legal
  A1 Zod validation      ← Start immediately
  A2 Cookie consent      ← Start immediately
  A6 Email domain        ← 30 min DNS task

Track 2 — Quality Verification
  A3 AI plan review tool
  A4 Onboarding funnel events
  A5 Adaptation E2E test

Track 3 — Coach Dashboard (B1→B5, sequential)
  B1 Squad command centre
  B2 Athlete drill-down
  B3 Communication layer
  B4 Plan build handshake
  B5 Marketplace performance

Track 4 — Plan Library (C1→C7, parallel with B)
  C1-C5 Plan templates (65+)
  C6 AI pace zone adaptation
  C7 Coach plan builder tools

Track 5 — Design (D1→D10, parallel with B+C)
  D1 Typography
  D2 Colour/surface
  D3 Icons
  D4 Character SVG
  D5-D10 Component by component

Track 6 — Community (E1→E4, after B is stable)
  E1 Club feed
  E2 Challenge verification
  E3 Race results
  E4 Runner interactions

THEN:
  Phase F — Pre-alpha quality gates (1 week)
  Phase G — Alpha (closed pool)
  Phase H — Revenue activation
  Phase I — Public beta
```

---

## Revised Phase Mapping vs Original

| Original Phase | Status | Revised Phase |
|---|---|---|
| Phase 01 Core loop | ✅ | Complete |
| Phase 02 Coach + marketplace | ✅ | Complete |
| Phase 03 Legal + revenue | 🔄 Partial | Split: A2 (cookie) + H (revenue) |
| Phase 04 Today tab polish | ✅ | Complete |
| Phase 05 Character system | ✅ | Complete |
| Phase 06 Notifications | ✅ | Complete |
| Phase 07 Split Leader toggle | ✅ | Complete |
| Phase 08 Engineering foundation | ✅ | Complete + A1 (Zod) |
| Phase 09 Native app | ⏸ | Post-alpha (requires Mac/Xcode) |
| Phase 10 Wearables | Garmin→Phase I | Garmin server-side in Phase I |
| Phase 11 Onboarding refinement | ✅ | Complete + A4 (funnel events) |
| Phase 12 Referral | ✅ Built, 🔒 Gated | Release at Phase H |
| Phase 13 Coach beta | Phase I | After coach dashboard complete |
| Phase 14 Content hub | Phase I/II | After public beta |
| Phase 15 Growth infra | Phase I/II | After public beta |
| Phase 16 Community Layer 2 | Phase E now | Pull forward — needed for alpha |
| Phase 17 Platform scale | Post-revenue | After Phase H |
| Phase 18 Exit-ready | Long-term | 12-18 months |

---

## The One Metric Per Phase

| Phase | Single metric that determines success |
|---|---|
| A (Foundation) | Zero 500 errors on 5 critical routes, all events firing |
| B (Coach) | A coach navigates all 5 tiers without needing instruction |
| C (Plans) | 85%+ of runners find a plan that fits their goal and timeframe |
| D (Design) | 3 people with no context say "this looks premium" |
| E (Community) | A club of 5 has an active week without prompting |
| F (Pre-alpha) | Founder completes full E2E on iPhone in < 10 minutes with zero errors |
| G (Alpha) | Day 30 retention ≥ 40%, NPS ≥ 40 |
| H (Revenue) | First paying subscriber within 14 days of going live |
| I (Public) | 100 MAU within 90 days |

---

*Revised April 2026 — Incorporates alpha-first approach, coach dashboard 5 tiers,
plan library expansion, design uplift to 10/10, community completion.
Revenue activation deferred to Phase H (post-alpha). All features built
and visible but not enforced during alpha.*
