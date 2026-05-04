# NextSplit v2 — Handoff Document
**Version:** HANDOFF-3 | **Date:** April 2026 | **Build:** Production-deployed

---

## What This App Is

NextSplit is a **training OS for serious amateur runners**. Not a plan PDF. Not a habit tracker. A full coaching platform with AI, RPG progression, real coach integration, community, and data analytics. Think Strava × TrainingPeaks × a personal coach in your pocket.

**Live URL:** https://nextsplit-v2.vercel.app  
**GitHub:** https://github.com/NextSplit/Nextsplit-v2  
**Stack:** Next.js 16.2 (App Router) + Supabase + Tailwind CSS + PWA  
**AI:** Anthropic Claude SDK (`claude-sonnet-4-20250514`)

---

## Critical Credentials & Config

### Supabase
- Project: `nextsplit`
- Find Project ID in: Supabase → Settings → General → Reference ID
- Tables: see schema section below

### Stripe
- Live keys configured in Vercel env vars
- Price IDs:
  - `STRIPE_PRICE_FOUNDING_MONTHLY` = `price_1TOL1IDD4FjAWTScvzPNVNh6` (£7.99/mo)
  - `STRIPE_PRICE_FOUNDING_ANNUAL` = `price_1TOL1IDD4FjAWTScSEBHOefs` (£79.99/yr)
  - `STRIPE_PRICE_STANDARD_MONTHLY` = `price_1TOKuLDD4FjAWTScI3XcaEUK` (£13.99/mo)
  - `STRIPE_PRICE_STANDARD_ANNUAL` = `price_1TOL1IDD4FjAWTSc5TxMPEre` (£99.99/yr)
  - Webhook secret: `whsec_q2Ze0bNVakKzCtXui1BypZ9j5aVzqqx3`
  - Founding member limit: 500

### PostHog
- Host: `eu.posthog.com`, Project: 163005
- Key: `phc_kVx2Q6L88mPFx9hPKtq6QNwL6zj69TFggyBUknGkMLGT`

### Environment variables (all in Vercel)
All accessed via `src/lib/config.ts` — NEVER scatter `process.env` calls directly.
Key vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_PREMIUM_ENFORCED` (currently `false` — see go-live section)

---

## Phase Status

| Phase | Status | Notes |
|---|---|---|
| Phase 0 — Stabilise | ✅ Done | |
| Phase 1 — Monetise (Stripe) | ✅ Done | |
| Phase 2 — Coach Soft Launch | ✅ Done | |
| Phase 3 — Full Coach Platform | ✅ Done | |
| Community | ✅ Done | |
| Analytics & Insights | ✅ Done | |
| Landing page | ✅ Done | |
| Onboarding audit | ✅ Done | 10 fixes applied this session |
| Testing & refinement | 🟡 In progress | Onboarding done, core loop next |
| Phase 4 — Wearables + Native | 🔲 Next | Capacitor, Garmin, Apple Health |
| Phase 5 — Scale + Exit-Ready | 🔲 Future | |

---

## Navigation Structure (FINAL)

### Athletes (4 tabs)
```
Today | Plan | Community | Character
```

### Coaches (5 tabs)
```
Today | Plan | Athletes | Community | Character
```

**Plan tab** has a sub-tab switcher: `📋 Training Plan | 🥗 Fuel`  
The Fuel sub-tab links through to `/nutrition` (full page still accessible directly)

**Character tab** has 3 sub-tabs:
- `🏃 Character` — HeroCard, XP, badges, streak, kit customiser
- `📊 Stats` — WeeklyCoachingSummary (AI), WeeklyVolumeChart, ACWRChart, PaceTrend, WellnessTrend, WeightTrend, TrainingZones, PaceCalculator
- `🏆 Records` — RaceDaySimulation, PBCard, TrainingSummary, links to history

**Athletes tab (coaches only)** → `/coach/squad` — full squad dashboard with status filters, per-athlete cards with ACWR/sessions/last-active, quick message/view actions, coach tools grid, invite modal

---

## Key Architecture Decisions

### Auth flow
1. User signs up → `supabase.auth.signUp` → profile row auto-created via DB trigger (`supabase/profile-trigger.sql`)
2. `profiles.onboarding_complete = false` initially → middleware redirects all app routes to `/onboarding`
3. After onboarding: `onboarding_complete = true` → middleware lets through
4. Google OAuth → `/auth/callback` → checks for active plan → `/onboarding` if none, `/today` if exists
5. Email confirmation is currently OFF (intentional for testing — turn on for public launch)

### Middleware (`src/lib/supabase/middleware.ts`)
- Unauthenticated → `/auth/login`
- Authenticated + auth routes → `/today` or `/onboarding` based on `onboarding_complete`
- Authenticated + app routes + `onboarding_complete = false` → `/onboarding`

### Premium gating
- `src/lib/features.ts` — defines `FeatureKey` type and `FEATURE_TIERS` record
- `src/components/ProGate.tsx` — wraps any JSX behind subscription check
- `NEXT_PUBLIC_PREMIUM_ENFORCED=false` currently — ALL users get all features
- Flip to `true` only when Stripe is end-to-end tested with real card
- ProGate is wired around: ACWR chart, pace trends, wellness trends, WeatherWidget

### Supabase client pattern
- Always use `src/lib/supabase/db.ts` `db()` wrapper for typed queries
- Server components/routes: `createClient()` from `src/lib/supabase/server.ts`
- Client components: `createClient()` from `src/lib/supabase/client.ts` via `useSupabase()` hook
- Service role (bypasses RLS): only in `src/app/api/stripe/webhook/route.ts` — KEEP IT THERE ONLY

---

## Database Schema (key tables)

```
profiles           — user profile, character config, onboarding state, RPG data
user_plans         — active/archived training plans with weeks_data JSON
training_logs      — every session log (done/undone, km, pace, effort, HR)
user_goals         — race targets and goals
wellness_logs      — daily check-ins (sleep, energy, mood, soreness)
meal_plan_entries  — meal planning
recipes            — user recipe library
gym_logs           — gym session logs
activity_logs      — ad-hoc non-plan activities
user_races         — race history
plan_templates     — 17 seeded plan templates
coach_profiles     — coach accounts
coach_athletes     — coach-athlete relationships
coach_messages     — messaging
coach_invites      — invite tokens
coach_reviews      — athlete reviews of coaches
session_annotations— coach annotations on sessions
featured_plans     — marketplace plans
clubs              — community clubs
club_members       — memberships
club_feed          — activity feed
challenges         — weekly/monthly challenges
challenge_entries  — user challenge progress
virtual_races      — virtual race events
virtual_race_entries — race submissions
seasons            — XP seasons
push_subscriptions — web push tokens
```

All migrations are in `supabase/` and have been run. Run `supabase gen types typescript --project-id YOUR_ID > src/types/database.ts` to regenerate types.

---

## Onboarding Flow (12 steps)

```
1  WelcomeScreen          — brand intro, tap to start
2  CharacterCreationScreen — display name, @handle (debounced uniqueness check), character avatar
3  StravaConnectScreen     — optional Strava OAuth, prominent "Skip for now →" button
4  SportSelectScreen       — running / triathlon / trail / ultra
5  AboutYouScreen          — name, age, sex, injuries, health flags
6  YourRunningScreen       — experience, weekly km, recent race times, surfaces
7  GoalsScreen             — race targets (type, distance, date, target time) + "Skip for now" option
8  YourLifeScreen          — training days/week, long run day, preferred run time
9  GymConfigScreen         — gym enabled, sessions/week, equipment, focus
10 TrainingPathScreen      — predetermined / ai_bespoke / manual / lifestyle / coach_marketplace
11 PlanGenerationScreen    — saves profile to DB, generates/activates plan, marks onboarding_complete
12 PlanPreviewScreen       — shows plan summary, +150 XP, redirects to /today
```

**Critical onboarding fixes already applied:**
- Step 12 back button → `setStep(10)` NOT `back()` — prevents duplicate plan creation
- coach_marketplace path creates a placeholder plan so Today isn't empty
- Handle check debounced 500ms
- Progress bar labels use keyed Record (was off-by-one with array)
- localStorage cleared after `onboarding_complete = true`
- Goals screen has "Skip for now" option
- Friendly error messages in auth actions (translates Supabase errors)

**Path-specific plan creation (step 11):**
- `predetermined` → finds best matching template by level+distance+weeks, calls `/api/plans/activate`
- `ai_bespoke` → calls `/api/ai/generate-plan` with full prompt, inserts plan
- `lifestyle` → inserts 52-week skeleton plan
- `coach_marketplace` → inserts 12-week placeholder plan (manual type, placeholder:true in meta)
- `manual` → no plan created (user builds it in Plan tab)

---

## Key Components & Files

### Today tab
- `src/app/today/TodayClient.tsx` — main orchestrator (674 lines)
- `src/app/today/TodayHeader.tsx` — sticky header with plan progress, date nav
- `src/app/today/TodayBelowFold.tsx` — below-fold: coach card, wellness, weather, weekly report
- `src/app/today/TodayModals.tsx` — log modal, undo strip
- `src/app/today/TodayProgressStrip.tsx` — weekly stats strip (km, sessions, streak 🔥, ACWR load bar)
- `src/components/AdaptPlanCard.tsx` — shown when 2+ sessions missed mid-week, AI adapts remaining week

### Plan tab
- `src/app/plan/PlanClient.tsx` — full plan view with Plan|Fuel tab switcher
- `src/components/plan/DayRow.tsx`, `WeekRow.tsx`, `DayDrawer.tsx`

### Character/Profile tab
- `src/app/profile/ProfileClient.tsx` — 3 sub-tabs: Character | Stats | Records
- `src/components/rpg/` — HeroCard, BadgeGrid, CharSelectModal, WeeklyXPChart, StatBar, XPFeed, etc.
- `src/components/charts/` — ACWRChart, PaceTrend, WeeklyVolumeChart, RaceDaySimulation, WeeklyCoachingSummary, etc.

### Coach platform
- `src/app/coach/squad/SquadClient.tsx` — Athletes dashboard (rebuilt in this session)
- `src/app/coach/athlete/[athleteId]/AthleteDetailClient.tsx` — 4-tab athlete detail
- `src/app/coach/plan-builder/PlanBuilderClient.tsx`
- `src/app/coach/[slug]/CoachProfileClient.tsx` — public profile

### Community
- `src/app/community/CommunityClient.tsx` — clubs/challenges/races/leaderboard
- `src/app/community/club/[clubId]/ClubDetailClient.tsx`

### Hooks (all in `src/hooks/`)
- `useActivePlan` — current user_plan + weeks_data
- `useTrainingLog(planId)` — keyed `Record<string, TrainingLog>` for current plan
- `useAllTrainingLogs` — flat `TrainingLog[]` across ALL plans (for RPG XP)
- `useProfile` — profiles row
- `useSubscription` — Stripe subscription state, `isPro`, `canUseFeature()`
- `useCoach` — `useCoachProfile()` and `useMyCoach()` in same file
- `useCommunity` — clubs, challenges, races, leaderboard

### Lib
- `src/lib/rpg.ts` — XP, levels, badges, character system
- `src/lib/statsUtils.ts` — ACWR, weekly km, race predictions (Riegel), pace utils
- `src/lib/paceZones.ts` — training zones from race times
- `src/lib/streak.ts` — streak, consistency, weekly report
- `src/lib/personalBests.ts` — PB detection
- `src/lib/features.ts` — feature flags and tier definitions
- `src/lib/config.ts` — ALL env vars (never import process.env elsewhere)

---

## AI Features

All AI calls use `claude-sonnet-4-20250514`. API key via `serverConfig.anthropicApiKey`.

| Endpoint | What it does |
|---|---|
| `/api/ai/generate-plan` | Full bespoke training plan from profile data |
| `/api/ai/coach` | Daily coaching card feedback on logged session |
| `/api/ai/weekly-summary` | 4-week debrief — adherence, ACWR, effort, sleep analysis |
| `/api/ai/adapt-plan` | Restructures remaining week when sessions missed |
| `/api/ai/pre-race-brief` | Race day strategy from training data |
| `/api/ai/fuel` | Nutrition coaching and meal recommendations |
| `/api/ai/suggestions` | Adaptive training suggestions |
| `/api/ai/recommend` | Plan/template recommendations |
| `/api/ai/coach-digest` | Coach AI digest of athlete data |

Rate limiting: `src/lib/aiRateLimit.ts`

---

## Stripe Integration

- `src/lib/stripe.ts` — lazy `getStripe()` client
- `/api/stripe/checkout` — creates checkout session
- `/api/stripe/webhook` — handles subscription events, writes `is_pro=true` to profiles
- `/api/stripe/portal` — billing portal redirect
- `/api/stripe/connect` — Stripe Connect for coach payouts
- `src/components/UpgradeModal.tsx` — upgrade flow
- `src/hooks/useSubscription.ts` — subscription state hook

**Go-live checklist for Stripe:**
1. Test with real card → verify `profiles.is_pro = true` after payment
2. Verify webhook fires (Stripe dashboard → Developers → Events)
3. Then flip `NEXT_PUBLIC_PREMIUM_ENFORCED=true` in Vercel

---

## Landing Page

`src/app/page.tsx` — full dark marketing page:
- Fixed nav, hero with founding badge + gradient headline
- Stats strip, 6-feature grid, 4 onboarding paths
- Coach platform teaser with mock squad
- Testimonials (3 — update with real ones when available)
- Pricing: Free vs Elite founding (£7.99 founding, £13.99 standard)
- Final CTA + footer

---

## What Was Done This Session (Chronological)

### 1. Full codebase audit
Critical fixes: N+1 queries in community/progress and races (→ Promise.all), dead `supabaseAny` variable, PII in Stripe webhook logs, missing error states in hooks, raw `<img>` → `next/image`.

### 2. Navigation restructure (multiple iterations)
Final structure: Athletes 4 tabs, Coaches 5 tabs with Athletes as primary workspace. Fuel moved into Plan as subtab. Squad page rebuilt as proper Athletes coaching dashboard.

### 3. Analytics & progress visibility
- Today tab: `TodayProgressStrip` — weekly km, sessions, streak 🔥, ACWR colour-coded bar, avg effort dots
- Character tab restructured: 3 sub-tabs (Character | Stats | Records)
- Stats tab: all analytics in one place (ACWR, pace trends, volume, wellness, training zones, pace calculator, weekly AI summary)
- Records tab: race predictions, PBs, training summary, history links

### 4. Features 5-7
- Race day simulation (Riegel formula, 5K/10K/Half/Marathon, ±5% bands, confidence rating)
- Weekly AI coaching summary (4-week analysis, generate on demand)
- Adaptive plan (shown when 2+ sessions missed, AI restructures remaining week)

### 5. Landing page
Full dark marketing site replacing the placeholder.

### 6. Onboarding audit (10 fixes)
See onboarding section above for full list.

---

## What's Next (Priority Order)

### Immediate (this/next session) — Core flow testing
Continue testing the core athlete loop:
1. **Session logging** — tap session → log modal → save → undo → confirmation
2. **Week advance** — does advancing week work? Does ACWR update?
3. **Plan tab** — week rows, day drawer, session detail
4. **Wellness check-in** — daily check-in from Today
5. **Character XP** — does logging a session award XP? Does level-up screen fire?
6. **Stripe checkout** — test with real card (£1 test charge or trial)

### Phase 4 — Wearables + Native
1. **Capacitor** — wrap PWA as native app for App Store / Play Store
2. **Garmin Connect** — pull activities via Garmin Health API
3. **Apple Health** — iOS native data source via Capacitor plugin
4. **Custom domain** — nextsplit.com → update Stripe, Supabase, Strava redirect URLs

### Phase 5 — Scale + Exit-Ready
1. Vitest + Playwright test suite (none exists)
2. Sentry error monitoring (SDK installed, needs DSN config)
3. Performance audit (React DevTools, Lighthouse)

---

## Go-Live Checklist (DO NOT DO UNTIL READY)

```
☐ Test Stripe checkout with real card → verify is_pro=true in profiles
☐ Verify webhook fires (Stripe dashboard → Developers → Event deliveries)
☐ Re-enable email confirmation: Supabase → Auth → Providers → Email → Confirm email ON
☐ Flip NEXT_PUBLIC_PREMIUM_ENFORCED=true in Vercel (ONLY after Stripe tested)
☐ Custom domain + update all redirect URLs
☐ Run: npx supabase gen types typescript --project-id YOUR_ID > src/types/database.ts
```

Currently: `NEXT_PUBLIC_PREMIUM_ENFORCED=false` intentionally — all users get all features during testing.

---

## Known Issues / Tech Debt

1. **~40 `any` types** remain in API routes (community, coach) — mostly tables added after last `supabase gen types` run. Fix: regenerate types.
2. **No test suite** — zero automated tests. High priority before public launch.
3. **ProfileContext** — multiple hooks independently fetch `profiles`. At 300+ MAU, refactor to a single `ProfileContext`.
4. **Dashboard (`/dashboard`)** — full analytics page still exists but has no nav link. Accessible from Character → Records tab "Full analytics dashboard" link.
5. **Strava sync** — connect flow exists, sync endpoint at `/api/strava/sync`, but not deeply integrated.
6. **Push notifications** — `/api/cron/notify` and push subscription infra exists but not tested in production.
7. **Privacy/Terms pages** — stubs exist at `/privacy` and `/terms`, need real content.
