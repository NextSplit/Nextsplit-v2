# NextSplit v2 — Handoff Document
**Version:** HANDOFF-4 | **Date:** April 2026 | **Build:** Production-deployed
**Strategy Baseline:** 14 strategy documents read and reconciled April 2026

---

## CRITICAL CONTEXT — READ THIS FIRST

This handoff supersedes HANDOFF-3. It incorporates the full 14-document strategy framework
(Vision & Strategy v2.3, Company Operating Framework, User Personas v1.3, Master Roadmap v1.3,
8 Pillar documents, Character System Spec, and Document Conflict Audit). Every build decision
from this point forward must trace back to this document.

**The single most important strategic insight across all 14 documents:**
> Users become believers the first time the plan adapts around something that went wrong in
> their life. That single moment is when NextSplit stops being an app and starts being a coach.

Everything — product, pricing, marketing, brand — builds from that moment.

---

## The Conflict Audit — Resolved Decisions

The Document Conflict Audit identified 8 direct conflicts across strategy docs. Decisions recorded
here so there is one source of truth going forward.

| Conflict | Decision | Rationale |
|---|---|---|
| "Lead" vs "Split Leader" | **Split Leader** wins everywhere | Coaching Roadmap is more specific |
| Two-tier vs Three-tier naming | **Athlete / Split Leader / Pro Coach** | Coaching Roadmap wins — fully specified |
| Split Leader: free vs paid extra | **Included in Pro at no extra cost** | Growth > ARPU at this stage |
| Athlete Pro price: £5 vs £7.99 | **£7.99/mo, £59/yr** — launch: £4.99 founding | Coaching Roadmap pricing confirmed |
| Split Leader athlete cap: range vs hard | **Hard cap: 5 runners maximum** | Upgrade trigger must be precise |
| Split Leader can sell plans? | **No** — Split Leader cannot sell plans | Preserves Pro Coach upgrade funnel |
| Coaching sub cut | **20% of ongoing subs, 30% of plan purchases** | Stripe Connect model |
| Coach dashboard location | **Inside main app — Squad tab in bottom nav** | Already implemented correctly |

---

## What This App Is

NextSplit is a **training OS for serious amateur runners**. Not a plan PDF. Not a habit tracker.
A full coaching platform with AI, RPG progression, real coach integration, community, and analytics.
Think Strava × TrainingPeaks × a personal coach in your pocket.

**Target user:** Ambitious recreational runner. 28–45. Targeting sub-4 marathon, sub-2 half,
sub-20 5K. Owns a GPS watch. Uses Strava. Willing to pay for something that genuinely works.

**Live URL:** https://nextsplit-v2.vercel.app
**GitHub:** https://github.com/NextSplit/Nextsplit-v2
**Stack:** Next.js (App Router) + Supabase + Tailwind + PWA + Anthropic Claude SDK

---

## The Three-Tier Model (Canonical — Conflict Audit resolved)

Every user starts as an Athlete. One signup flow. No role choice at registration.
Coach/Split Leader status applied later via Settings.

### Tier 1 — Athlete (Default)
- **Free:** Daily loop, plan view, 3 AI interactions/day, Strava sync, all 4 onboarding paths
- **Pro — £4.99/mo launch, £7.99/mo long-term, £59/yr:** Plan adaptation, unlimited AI,
  advanced analytics, unlimited plan switching, Split Leader unlocked (no extra cost)
- **Upgrade trigger:** The adaptation feature. When the plan rebuilds around a missed week,
  that is the paywall moment — the conversion insight from all 14 documents.

### Tier 2 — Split Leader (Included in Pro, no extra cost)
- Squad view for up to **5 runners hard cap** (not a range — hard cap triggers upgrade)
- Session annotations, basic messaging, squad leaderboard
- Share own plan with squad — squad follows free
- Squad members need only a free account (acquisition flywheel)
- **Cannot:** sell plans, voice messages, plan builder, marketplace listing
- **Upgrade trigger:** Hits 5-runner cap OR wants to sell plans

### Tier 3 — Professional Coach (Application required)
- **£29/month** platform fee. Free up to 5 athletes to experiment.
- 48hr review for credentialed coaches. Verified badge if credentials approved.
- Full squad dashboard with 🟢🟡🔴 ACWR status per athlete
- Unlimited athletes, voice messages (60-second), plan builder, public marketplace listing
- AI automation rules — trigger-based messaging in coach's voice
- Coach-led public club — audience and acquisition channel
- **Revenue:** Coach sets price. NextSplit takes 20% of ongoing subs, 30% of plan sales.

---

## The Plan Marketplace

- Lives as a discoverable section within the app (Coach tab — accessible to all users)
- Contextual recommendations in Today tab (no active plan / between blocks)
- Pro Coaches publish plans for global sale
- NextSplit Official plans — published by NextSplit itself (already: 17 seeded plan templates)
- Featured Plan of the Week — push notification mechanic

---

## Brand Identity (Canonical — from Brand Pillar)

### Design Language — NextSplit Own (NOT iOS, NOT Material)
| Token | Value | Use |
|---|---|---|
| Forest | `#2b5c3f` | Primary — warmth, nature, endurance |
| Ember | `#e85d26` | Accent — energy, achievement, heat |
| Track | `#c49a3c` | Gold — ambition, performance |
| Night | `#2c3e50` | Slate — data, depth |
| Paper | `#f9f6f0` / `#faf8f3` | Background |
| Ink | `#141410` / `#1a1a14` | Text |

**⚠️ CURRENT CODE GAP:** The app uses `#0D9488` (teal) as primary throughout. The strategy
docs define `#2b5c3f` (Forest) as primary with `#e85d26` (Ember) as accent. This is a
significant brand divergence that needs a migration plan. See Gap Analysis below.

### Typography (from Brand + Product Pillars)
| Role | Font | Use |
|---|---|---|
| Display | Cormorant Garamond | Session names, headings, coaching messages |
| Body | Outfit | All UI text, descriptions, labels |
| Mono | JetBrains Mono | Data labels, pace zones, technical info |

**⚠️ CURRENT CODE GAP:** App uses system fonts / Tailwind defaults. No Cormorant Garamond or
Outfit loaded. The product pillar's design system is not yet implemented.

### Taglines
- **Primary:** "The plan that keeps up with your life."
- **Secondary (coach context):** "Your coach. Your pace. Your race."
- **Race day / campaign:** "Got me to the start line ready."

### Hero Brand Moment
The adaptation. Not race day. Not the PB. The Tuesday morning when life intervened,
the session was missed, and the plan rebuilt itself. All marketing builds from here.

---

## The Six User Personas

### Primary — Build for first
**The Ambitious First-Timer** → Predetermined Path
- 28–42, professional, first/second marathon, Strava-active, GPS watch
- Wants expert-designed structure, not DIY. "Predetermined" must communicate credibility.
- Fear: wrong plan, missed sessions, arriving injured, app abandoned mid-plan.

### Secondary
**The Frustrated Veteran** → AI Bespoke Path
- Has done marathons, knows training theory, frustrated that generic plans don't adapt
- Wants the AI layer — the plan that actually responds to their data

**The Lapsed Runner** → Lifestyle Path or Predetermined
- Was running, stopped (injury, life, burnout), wants back in without overwhelm
- The Comeback Runner character class speaks directly to them

### Future (Phase 2+)
**The Coached Athlete** → Coach Marketplace Path
- Already has or wants a real human coach
- NextSplit as infrastructure their coach uses

**The Split Leader** → Settings upgrade from Pro
- Club captain, running group organiser, pace-setter
- Natural acquisition channel — brings 3–5 friends automatically

**The Professional Coach** → Application
- Credentialed coach looking for platform + income
- The B2B flywheel: athlete → Split Leader → Pro Coach

---

## The Character System (Canonical — from Character System Spec)

**Critical design intent:** This is NOT gamification. It is the emotional and identity core.
The thing that makes a runner open NextSplit on a rest day. The thing they show friends.

### Seven Runner Classes (Earned, not chosen — assigned after 4 weeks of data)

| Class | Emoji | Trigger | Notes |
|---|---|---|---|
| Warming Up | 🌅 | Default — everyone starts here | Holding class, not "beginner" — warm and non-judgmental |
| Marathon Runner | 🏁 | High weekly mileage, easy-moderate effort, long runs dominant | |
| Speed Merchant | ⚡ | High interval volume, fast pace relative to distance | |
| Trail Blazer | 🌲 | Trail/elevation data, off-road pattern | |
| Base Builder | 🔵 | Consistent easy running, building aerobic base | |
| All-Rounder | ⭐ | Mixed training — speed + endurance + gym | |
| Comeback Runner | 💫 | Return after gap of 4+ weeks | Most emotionally powerful class |

**⚠️ CURRENT CODE GAP:** The current character system uses 6 manually-chosen visual avatars
(Alex, Marcus, Kai, Sarah, Amara, Yuki) with `specialty` as flavour text. The Character
System Spec defines 7 **earned** runner classes based on training data analysis over 4 weeks.
These are different systems. The spec's class system needs to be built and integrated.

The class reveal moment (after 4 weeks) is a key product beat — a dedicated screen, notification,
and social share card.

### Reveal Window — 4 Weeks
- Week 1-4: "Warming Up" holding class
- After week 4: Class computed from training data → reveal screen
- Classes can evolve as training patterns change
- Class shown on HeroCard, squad dashboard (coach sees athlete classes), marketplace profiles

---

## Current Code State vs Strategy

### ✅ What's Built and Aligned with Strategy

| Feature | Status | Notes |
|---|---|---|
| Four onboarding paths (Predetermined/AI/Manual/Lifestyle) | ✅ Done | All working |
| Today tab — session logging, undo, date nav | ✅ Done | Core daily loop solid |
| Plan tab — week view, day drawer, week advance | ✅ Done | |
| Log modal — effort/km/pace/duration/notes | ✅ Done | |
| Wellness check-in → wellness_logs | ✅ Done | |
| ACWR / PaceTrend / VolumeChart | ✅ Done | |
| RaceDaySimulation (Riegel formula) | ✅ Done | |
| Weekly AI coaching summary | ✅ Done | |
| Adaptive plan (missed sessions) | ✅ Done | |
| Stripe payments + founding member pricing | ✅ Done | |
| Pro Coach platform — squad, athlete detail, plan builder | ✅ Done | |
| Community — clubs, challenges, virtual races | ✅ Done | |
| Landing page | ✅ Done | |
| PostHog analytics | ✅ Done | Key events instrumented |
| Sentry error tracking | ✅ Done | SDK installed |
| Three-tier nav (Athlete 4 tabs / Coach 5 tabs) | ✅ Done | Correct per strategy |
| Strava sync | ✅ Done (basic) | Connect + import works |

### ⚠️ Built but Diverges from Strategy

| Feature | Current State | Strategy Says | Action |
|---|---|---|---|
| Primary colour | `#0D9488` teal | `#2b5c3f` Forest | Phase 2 brand migration |
| Typography | System/Tailwind defaults | Cormorant Garamond + Outfit + JetBrains Mono | Phase 2 |
| Character classes | 6 visual avatars, manually chosen | 7 earned classes, data-driven, 4-week reveal | Build in Phase 2 |
| Split Leader naming | "coach" in some places | "Split Leader" consistently | Clean up in Phase 2 |
| Athlete Pro price shown | £7.99 founding | Correct — but "£4.99 launch" not surfaced | Fine for now |
| Design tokens | Tailwind teal | Forest/Ember/Track/Night system | Phase 2 |

### ❌ Not Yet Built (Strategy-Defined Features)

| Feature | Priority | Horizon | Notes |
|---|---|---|---|
| **Runner class system** (7 classes, 4-week reveal) | 🔴 HIGH | Phase 2 | Core to identity/retention |
| **Class reveal screen + share card** | 🔴 HIGH | Phase 2 | Key product beat |
| **Referral programme** | 🔴 HIGH | Phase 2 | Ships after Day 30 retention ≥ 40% |
| **Split Leader upgrade flow** (Settings) | 🔴 HIGH | Phase 2 | Currently "Coach setup" only |
| **Brand token migration** (Forest/Ember) | 🟡 MED | Phase 2 | Design language |
| **Font migration** (Cormorant/Outfit) | 🟡 MED | Phase 2 | Brand identity |
| **Voice messages** (60-second, coach ↔ athlete) | 🟡 MED | Phase 2 | Pro Coach differentiator |
| **AI automation rules** (trigger-based coach messages) | 🟡 MED | Phase 2 | Pro Coach feature |
| **Verified coach badge** (credential review) | 🟡 MED | Phase 2 | Trust signal |
| **Plan marketplace** (buy/sell plans) | 🟡 MED | Phase 2 | Revenue layer |
| **Coach-led public clubs** | 🟡 MED | Phase 2 | Acquisition flywheel |
| **Race result share card** (brand moment) | 🟡 MED | Phase 2 | "Got me to the start line ready" |
| **Beta cohort programme** | 🟡 MED | Now | 50 active users target |
| **Running club infiltration** (5 target clubs) | 🟡 MED | Now | Growth channel |
| **A/B testing infrastructure** (PostHog flags) | 🟡 MED | Phase 2 | PostHog already in stack |
| **Capacitor / native app** | 🟡 MED | Phase 3 | iOS/Android App Store |
| **Garmin Health API** | 🟡 MED | Phase 3 | Wearable integration |
| **Apple Health** | 🟡 MED | Phase 3 | iOS native |
| **Weekly user interview cadence** | 🟢 LOW | Now | Process, not code |
| **In-app feedback surface** | 🟢 LOW | Phase 2 | |
| **Newsletter** (brand asset) | 🟢 LOW | Phase 2 | Content/brand |
| **Custom domain** (nextsplit.com) | 🟢 LOW | Phase 3 | Update all redirect URLs |
| **Privacy/Terms pages** (real content) | 🟢 LOW | Before launch | Currently stubs |
| **Test suite** (Vitest + Playwright) | 🟢 LOW | Phase 3 | Zero tests currently |
| **Technical co-founder search** | 🔴 HIRING | Now | First hire per Ops Pillar |

---

## The Execution Plan — Four Horizons

### NOW — 0–6 Weeks (Current focus)

**Goal:** 50 beta users actively logging sessions weekly. Prove core loop. Earn retention.

**Product:**
1. ✅ Core loop audit complete (this session — 5 bugs fixed, pushed)
2. Stripe end-to-end test with real card → flip `NEXT_PUBLIC_PREMIUM_ENFORCED=true`
3. Supabase type regeneration (`npx supabase gen types typescript --project-id ID > src/types/database.ts`)
4. Privacy + Terms pages — real content
5. Fix any bugs found in manual testing of full user journey

**Growth (non-code):**
1. Identify 5 target running clubs for beta outreach
2. Offer club captains free Pro access + squad members extended free trial
3. Start weekly user interviews — even 2/week is enough
4. Set up Notion (when ready) — link to this document

**Data:**
1. PostHog dashboard configured — AARRR metrics live
2. Set thresholds: if Day 30 retention < 25%, pause growth and fix loop
3. Weekly Monday review cadence starts now

### ✅ PHASE 2 COMPLETE — April 2026

| Feature | Status | Notes |
|---|---|---|
| Runner class system | ✅ Done | 7 earned classes, 4-week reveal, share card |
| Brand token migration | ✅ Done | Forest/Ember/Track/Night, Outfit + Cormorant fonts |
| Split Leader upgrade flow | ✅ Done | Settings → activate in one tap |
| Race result share card | ✅ Done | "Got me to the start line ready." |
| Voice messages | ✅ Done | 60s coach audio, waveform, signed URLs |
| Plan marketplace | ✅ Done | Browse, detail modal, purchase, ownership tracking |
| Analytics (AARRR) | ✅ Done | 25+ events, all key funnels instrumented |
| Referral programme | ⏸ Held | Ships after Day 30 retention ≥ 40% |

**Decision gate to Phase 3:** App Store submission, Garmin integration

---

### NEXT — 3–6 Months (Phase 2)

**Goal:** Subscription conversion working. Coach beta relationships. Referral programme live.

**Product — in priority order:**

1. **Runner class system** — 7 earned classes, 4-week reveal, class on HeroCard
   - `src/lib/rpg.ts` — add `computeRunnerClass(logs, weeks)` function
   - Add class reveal screen component
   - Add class share card (race day marketing moment)
   - Add class to squad dashboard (coach sees athlete classes)

2. **Brand token migration**
   - Add Forest/Ember/Track/Night to `tailwind.config.ts`
   - Load Cormorant Garamond + Outfit + JetBrains Mono via next/font
   - Migrate primary colour from `#0D9488` → `#2b5c3f` (Forest)
   - This is a full-app visual change — do in a feature branch

3. **Split Leader upgrade flow**
   - Settings page: "Become a Split Leader" (requires Pro)
   - Separate from "Become a Professional Coach" (requires application)
   - Consistent "Split Leader" naming throughout (audit current "coach" references)

4. **Referral programme**
   - Only ships after Day 30 retention ≥ 40%
   - Give a month, get a month mechanic
   - Triggered at race result sharing moment
   - Split Leader invitations auto-generate referral links
   - Referral dashboard in Character tab

5. **Voice messages** (Pro Coach feature)
   - 60-second audio, coach ↔ athlete
   - Supabase Storage already in stack for audio files
   - Record + playback in CoachCard / coach messaging

6. **Plan marketplace**
   - Extend existing `/marketplace` page
   - Pro Coach publish flow (price + duration + plan JSON)
   - Athlete purchase flow (Stripe Connect)
   - Contextual recommendation in Today tab (no active plan)

7. **Race result share card**
   - Triggers at plan completion / race logging
   - "Got me to the start line ready." — brand moment
   - Native share sheet on mobile

8. **A/B testing** (PostHog feature flags)
   - Paywall placement variants
   - Onboarding copy variants

9. **In-app feedback** surface

**Decision gate to Phase 3:** MRR > £2K + coach beta relationships (5 active coaches)

---

### LATER — 6–12 Months (Phase 3)

**Goal:** Coach marketplace live. Community flywheel turning. Growth channels compounding.

1. **Capacitor wrap** — PWA → native iOS/Android for App Store / Play Store
2. **Garmin Health API** — pull activities, reduce manual logging friction
3. **Apple Health** — iOS native via Capacitor plugin
4. **Custom domain** — nextsplit.com → update Stripe, Supabase, Strava redirect URLs
5. **SEO content hub** — "marathon training plan" long-tail. Decision: hire or outsource?
6. **Coach-led public clubs** with coach as community manager / content anchor
7. **AI automation rules** for Pro Coaches — trigger-based messaging
8. **Verified coach badge** — credential review workflow (48hr, manual initially)
9. **Instagram/TikTok** — discovery channel, product demo content
10. **Vitest + Playwright test suite** — zero automated tests is a debt that grows

**Decision gate to Phase 4:** 1,000 MAU + 3 active coach partnerships + App Store listed

---

### FUTURE — 12–18 Months (Phase 4)

1. Scale coach marketplace — volume + quality flywheel
2. Paid acquisition — only after CAC < LTV proven
3. Enterprise / club accounts
4. International expansion (non-English markets)
5. Exit-ready infrastructure (audit, documentation, clean accounts)

---

## The Growth Flywheel (from Growth Pillar)

```
Athlete signs up
    ↓
Logs consistently → becomes Split Leader
    ↓
Invites 3–5 friends → they sign up free
    ↓
Squad trains together → retention increases
    ↓
Split Leader hits 5-runner cap → upgrades to Pro Coach
    ↓
Pro Coach lists on marketplace → attracts more athletes
    ↓
Athletes recommend → more signups
```

The flywheel's engine is **word of mouth at the race result moment** — the highest motivation
point. Referral programme triggers here: "Give a month, get a month."

Running club infiltration is the fastest way to seed the flywheel:
- Identify 5 target clubs (UK + AU + US)
- Offer captain: free Pro + their squad gets extended trial
- One club captain = one Split Leader = 5 new free users = referral cluster

---

## Data & Analytics — AARRR Framework

**Philosophy:** Measure what changes decisions. Nothing else.
**Tool:** PostHog (already instrumented) + Supabase queries
**Cadence:** Monday weekly review — thresholds, not dashboards.

### Key Metrics and Decision Thresholds

| Stage | North Star Metric | Threshold | Decision |
|---|---|---|---|
| Acquisition | Installs per week | < 10/wk after 6 weeks | Fix channels before spending |
| Activation | Time to first logged session | > 8 min | Redesign onboarding |
| Activation | Onboarding completion rate | < 60% | Fix drop-off point |
| Retention | Day 7 active | < 50% | Fix daily loop before anything else |
| Retention | Day 30 active | < 40% | Stop growth spend. Fix product. |
| Revenue | Free → Pro conversion | < 3% | Move paywall or improve adaptation feature |
| Revenue | Monthly churn | > 5% | Fix retention before acquisition |
| Referral | Referrals per 5 users | < 1 within 90 days | Revisit mechanic timing |

**Two questions data must answer in year one:**
1. What features are users actually using? (Build more of what works)
2. Are users actually training better because of NextSplit? (Does the product do its job?)

**Analytics events already instrumented** (from `src/lib/analytics.ts`):
`onboarding_started`, `onboarding_step_completed`, `onboarding_completed`,
`plan_activated`, `session_logged`, `ai_coach_used`, `upgrade_clicked`,
`subscription_started`, `coach_connected`, `split_leader_followed`, `club_joined`

**Missing events to add:**
- `class_revealed` (when runner class assigned after 4 weeks)
- `referral_sent` / `referral_converted`
- `plan_purchased` (marketplace)
- `voice_message_sent`
- `week_advanced` (plan progression)
- `adaptation_requested` (the conversion moment — most important event to track)

---

## Hiring Plan (from Operations Pillar)

| # | Role | Timing | Notes |
|---|---|---|---|
| 1 | **Technical Co-Founder** | **Active search NOW** | Most important hire. Equity. Full engineering ownership. Must know Next.js + Supabase + PWA + Stripe. Do not wait for revenue. |
| 2 | Product Designer | Alongside or after Hire 1 | Visual execution. Figma. Owns the brand token migration. |
| 3 | Head of Growth | When Day 30 retention ≥ 40% | Not before retention is proven. |
| 4 | Community & Coach Partnerships | When coach beta begins | The flywheel needs a human activator. |

---

## Tech Stack and Standards

**Stack:** Next.js (App Router) · Supabase · Vercel · TypeScript Strict · PostHog · Sentry ·
Stripe Connect · Anthropic API (claude-sonnet-4-20250514) · Recharts

**Non-negotiable rules (all enforced as of this handoff):**
1. Pull + `tsc --noEmit` before any work. Zero errors required.
2. `next build` must pass before every commit.
3. Commit + push after every meaningful unit of work.
4. All env vars via `src/lib/config.ts` — **zero** `process.env` elsewhere (enforced April 2026).
5. No raw `<img>` tags — always `next/image` (enforced April 2026).
6. All Supabase queries handle errors — no silent failures.
7. `db(supabase).from(...)` pattern — not `supabase.from(...)` directly.
8. Service role key only in `/api/stripe/webhook/route.ts`.
9. AI routes use `serverConfig.anthropicApiKey` from config.

**Performance targets (from Tech Pillar):**
- PWA: Time to interactive < 2s on 4G
- API routes: P95 < 500ms
- Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1

---

## Database Schema

```
profiles           — user profile, RPG data, onboarding state, Stripe subscription
                     NEW: runner_class, runner_class_updated_at, runner_class_revealed,
                          first_session_logged_at
user_plans         — active/archived plans with weeks_data JSON
training_logs      — every session log
wellness_logs      — daily check-ins
user_goals         — race targets
meal_plan_entries  — meal planning
recipes            — recipe library
gym_logs           — gym session logs
activity_logs      — ad-hoc activities
user_races         — race history
plan_templates     — 17 seeded plans + coach plans
                     NEW: author_type, author_id, is_public, avg_completion_rate,
                          total_starts, avg_rating, review_count
plan_purchases     — marketplace plan purchases (athlete_id, template_id, coach_id,
                     amount_gbp, stripe_payment_id, coach_payout_gbp, platform_fee_gbp)
voice_messages     — coach voice notes (coach_id, athlete_id, storage_path,
                     duration_secs, listened_at)
coach_profiles     — Pro Coach accounts
coach_athletes     — coach-athlete relationships
coach_messages     — text messaging
coach_invites      — invite tokens
coach_reviews      — athlete reviews
session_annotations— coach notes on sessions
featured_plans     — marketplace featured plans
clubs              — community clubs
club_members       — memberships
club_feed          — activity feed
challenges         — weekly/monthly challenges
challenge_entries  — user progress
virtual_races      — virtual race events
virtual_race_entries — race submissions
seasons            — XP seasons
push_subscriptions — web push tokens
```

**Storage buckets:**
- `voice-messages` — coach audio files (max 5MB, webm/mp4/ogg, private)

---

## Navigation Structure (FINAL — do not change without explicit discussion)

### Athletes (4 tabs)
```
Today | Plan | Community | Character
```

### Coaches / Split Leaders (5 tabs)
```
Today | Plan | Athletes | Community | Character
```

**Plan tab** has sub-tab switcher: `📋 Training Plan | 🥗 Fuel`
**Character tab** has 3 sub-tabs: `🏃 Character | 📊 Stats | 🏆 Records`
**Athletes tab** (coaches only) → `/coach/squad`

---

## Onboarding Flow (12 steps — completed, 10 bugs fixed)

```
1  WelcomeScreen
2  CharacterCreationScreen — display name, @handle
3  StravaConnectScreen — optional
4  SportSelectScreen — running/triathlon/trail/ultra
5  AboutYouScreen — name, age, sex, injuries
6  YourRunningScreen — experience, weekly km, recent times
7  GoalsScreen — race targets (with Skip option)
8  YourLifeScreen — training days, long run day
9  GymConfigScreen — gym enabled, sessions, equipment
10 TrainingPathScreen — predetermined/ai_bespoke/manual/lifestyle/coach_marketplace
11 PlanGenerationScreen — saves to DB, generates plan, marks onboarding_complete
12 PlanPreviewScreen — shows plan, +150 XP, redirects to /today
```

**Critical fixes already in place:**
- Step 12 back → `setStep(10)` (prevents duplicate plan creation)
- `coach_marketplace` path creates placeholder plan (Today not empty)
- Handle check debounced 500ms
- localStorage cleared after `onboarding_complete = true`
- Goals screen has "Skip for now"

---

## Key File Locations

```
src/app/today/TodayClient.tsx          — main Today orchestrator
src/app/today/TodayBelowFold.tsx       — coach card, wellness, weather
src/app/today/TodayModals.tsx          — log modal, undo strip
src/app/today/TodayProgressStrip.tsx   — weekly stats strip
src/components/AdaptPlanCard.tsx       — missed sessions AI adaptation
src/app/plan/PlanClient.tsx            — Plan tab
src/app/profile/ProfileClient.tsx      — Character tab (3 sub-tabs)
src/components/charts/                  — all analytics charts
src/components/rpg/                     — RPG/character system
src/hooks/useActivePlan.ts             — current plan hook
src/hooks/useTrainingLog.ts            — session log hook
src/hooks/useAllTrainingLogs.ts        — cross-plan logs (for RPG)
src/lib/rpg.ts                         — XP/level/badge/character logic
src/lib/statsUtils.ts                  — ACWR, race predictions, pace utils
src/lib/features.ts                    — premium feature flags
src/lib/config.ts                      — ALL env vars (centralised April 2026)
src/lib/analytics.ts                   — all PostHog events
src/lib/wellness.ts                    — shared wellness utils
src/components/LogModal.tsx            — session log modal
src/components/SessionCard.tsx         — session card
src/components/WellnessCheckIn.tsx     — morning check-in
src/components/BottomNav.tsx           — navigation
src/components/UpgradeModal.tsx        — Stripe checkout flow
src/app/marketplace/                   — plan marketplace
src/app/coach/                         — all coach platform pages
src/app/community/                     — clubs, challenges, races
```

---

## What Was Done This Session (April 2026)

### Code Quality — 5 commits pushed to main

1. `42fe926` — **Centralise all env vars** — 25 files, zero `process.env` outside `config.ts`
2. `50073cb` — **Fix cross-plan chart collision** — `allPlanLogsKeyed` was dropping logs for
   users on plan 2+. Charts (ACWR, PaceTrend, PBs, RaceSim) now get complete data.
3. `fc89fc9` — **Fix week advance button** — `isWeekDone` didn't check `gymLogs`, so the
   "Next week →" button never appeared for plans with gym sessions.
4. `3d2e1ac` — **N+1 fixes** — community progress route batch-fetches clubs in one query;
   race position recalculation uses bulk upsert instead of N individual updates.
5. `37f256b` — **Final Strava env var** — 3 remaining `process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID`
   references migrated to `config.stravaClientId`.

### Strategy — 14 documents read and reconciled
All conflicts resolved (see table above). Gap analysis complete. This handoff written.

---

## Immediate Next Steps (Phase 3)

In priority order:

1. **Capacitor native app wrap** — PWA → iOS/Android for App Store
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
   npx cap init NextSplit app.nextsplit.app
   npx cap add ios && npx cap add android
   ```

2. **Garmin Health API** — pull activities automatically
   - Register at Garmin Developer Portal
   - `/api/garmin/callback` — OAuth + activity webhook
   - Map Garmin activity types to NextSplit session types

3. **Apple Health** (iOS via Capacitor plugin)
   ```bash
   npm install @capacitor-community/health-kit
   ```

4. **Custom domain** — nextsplit.com
   - Update Vercel, Supabase auth redirect, Strava OAuth redirect, Stripe webhook

5. **Supabase type regeneration** — eliminates ~40 remaining `any` types
   ```bash
   npx supabase gen types typescript --project-id YOUR_ID > src/types/database.ts
   ```

6. **Stripe end-to-end test** (still pending) → flip `NEXT_PUBLIC_PREMIUM_ENFORCED=true`

---

## Go-Live Checklist (DO NOT DO UNTIL READY)

```
☐ Stripe checkout tested with real card → is_pro = true in profiles
☐ Webhook fires correctly (Stripe dashboard → Developers → Event deliveries)
☐ Re-enable email confirmation: Supabase → Auth → Providers → Email → Confirm email ON
☐ Flip NEXT_PUBLIC_PREMIUM_ENFORCED=true in Vercel (ONLY after Stripe tested)
☐ Custom domain + update all redirect URLs (Stripe, Supabase, Strava)
☐ Supabase type regeneration
☐ Privacy + Terms real content
```

---

## Known Issues / Tech Debt

1. **~40 `any` types** in community/coach API routes — fix with type regeneration
2. **No test suite** — zero automated tests (Vitest + Playwright planned Phase 3)
3. **ProfileContext refactor** — multiple hooks fetch `profiles` independently; refactor to
   single context when MAU > 300
4. **Dashboard page** (`/dashboard`) — full analytics page accessible but no nav link
5. **Strava sync** — connect works, but sync not deeply integrated (no auto-import on open)
6. **Push notifications** — infra exists, not tested in production
7. **Brand token divergence** — `#0D9488` teal vs `#2b5c3f` Forest (Phase 2 migration)
8. **Character class system** — 6 visual avatars vs 7 earned training classes (Phase 2 build)
9. **Referral system** — not built (ships after retention proven)
10. **Voice messages** — not built (Phase 2 Pro Coach feature)

---

## Context Preservation — Where Strategy Lives

Until Notion is set up, all strategic context lives in:
- **`/HANDOFF-4.md`** (this document) — canonical source of truth for all decisions
- **`/CONTINUATION-PROMPT.md`** — operational rules for any AI session
- The 14 HTML strategy documents (uploaded April 2026, store in a known location)
- GitHub commit history — every meaningful change documented in commit messages

**When Notion is ready:** migrate the strategy sections of this document into Notion pages.
Keep HANDOFF-4.md as the technical/code layer. Notion for brand, personas, roadmap, pillars.

**Document review trigger:** Not calendar-based. Review at milestones:
- 50 weekly active users
- Day 30 retention ≥ 40%
- First paying subscriber (post-PREMIUM_ENFORCED=true)
- First coach beta relationship
- App Store submission
