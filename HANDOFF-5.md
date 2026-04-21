# NextSplit v2 — Handoff Document
**Version:** HANDOFF-5 | **Date:** April 2026 | **Build:** Production-deployed
**Live:** https://nextsplit-v2.vercel.app | **Repo:** https://github.com/NextSplit/Nextsplit-v2
**Strategy baseline:** 16 strategy documents read and reconciled April 2026

---

## How To Use This Document

This is the single source of truth for any new session, new contributor, or new
Claude instance working on NextSplit. Read this before touching any code.
Every decision traces to one of the 16 source documents listed at the bottom.

---

## The Founding Principle

> Users become believers the first time the plan adapts around something that went
> wrong in their life. Everything traces back to that moment.

The adaptation feature is both the product's greatest moment and its primary revenue
mechanic. It sits behind the paywall deliberately.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 App Router + TypeScript strict |
| Backend | Supabase (Postgres + RLS + Auth + Storage) |
| Hosting | Vercel (auto-deploy on push to main) |
| Payments | Stripe (subscriptions + Connect for coaches) |
| Analytics | PostHog (AARRR instrumentation) |
| Errors | Sentry |
| AI | Anthropic Claude SDK (claude-sonnet-4-20250514) |
| Styling | Tailwind CSS + NextSplit design tokens |
| Charts | Recharts |
| PWA | next-pwa service worker |

## Design Tokens (brand-locked, never change without brand review)

```css
--ns-forest:       #2b5c3f  /* Primary — trust, endurance, nature */
--ns-ember:        #e85d26  /* Accent — energy, achievement */
--ns-track:        #c49a3c  /* Gold — ambition, performance */
--ns-night:        #2c3e50  /* Slate — data, depth */
--ns-forest-light: #edf4f0
--ns-ember-light:  #fdf0ea
```

Fonts: Outfit (body) · Cormorant Garamond (display) · JetBrains Mono (data)

Session type colours: easy #4a9e6b · tempo #e8a020 · intervals #d63031 · long #6c5ce7 · gym #0984e3 · rest #b2bec3

---

## Repository Structure

```
src/
  app/                  # Next.js App Router pages
    api/                # API routes
      ai/               # Claude coaching endpoints
      coach/            # Coach platform endpoints
      marketplace/      # Plan marketplace + purchase
      voice-messages/   # Voice message upload/fetch/mark
      runner-class/     # Class computation + persistence
      webhooks/stripe/  # Stripe webhook handler
      plans/            # Plan activate/reset
    auth/               # Auth pages (login, signup, callback)
    coach/              # Coach platform pages
    community/          # Clubs, challenges, virtual races
    marketplace/        # Plan marketplace
    onboarding/         # 4-path onboarding flow
    profile/            # Stats, analytics, character
    today/              # Core daily loop
    plan/               # Training calendar view
  components/
    coach/              # CoachMessageThread, VoiceRecorder, VoiceMessagePlayer
    rpg/                # RunnerClassReveal, RunnerClassCard
    ui/                 # Shared UI components
  hooks/                # Data hooks (useActivePlan, useTrainingLog, etc.)
  lib/
    analytics.ts        # PostHog — single source of truth for all events
    rpg.ts              # Runner class computation, XP logic
    config/serverConfig # Centralised env vars (never use process.env directly)
    supabase/           # Client + server Supabase instances
  types/
    database.ts         # All TypeScript types — regenerate after schema changes
HANDOFF-5.md            # This document
MASTER-DELIVERY-PLAN.md # Full 18-phase delivery plan
```

---

## Environment Variables

All env vars accessed through `src/lib/config/serverConfig.ts` — never `process.env` directly.

Required in Vercel:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_FOUNDING_PRICE_ID
STRIPE_STANDARD_PRICE_ID
STRIPE_COACH_PRICE_ID
ANTHROPIC_API_KEY
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST
STRAVA_CLIENT_ID
STRAVA_CLIENT_SECRET
NEXT_PUBLIC_PREMIUM_ENFORCED   ← currently 'false' — flip to 'true' after Stripe E2E test
```

---

## Database Schema — Confirmed Tables

### Core tables
```
profiles           id, display_name, avatar_url, is_coach, coach_tier
                   ('split_leader'|'professional'), is_pro, stripe_customer_id,
                   stripe_subscription_id, runner_class, runner_class_updated_at,
                   runner_class_revealed, first_session_logged_at
user_plans         id, user_id, template_id, plan_type, status, name, start_date,
                   total_weeks, current_week, race_date, weeks_data, meta
training_logs      id, user_id, plan_id, week_n, day_n, session_i, done, km, pace,
                   duration_secs, effort, notes, logged_at
wellness_logs      id, user_id, date, readiness, sleep_quality, soreness,
                   motivation, notes
user_goals         id, user_id, goal_type, target_value, target_date, priority
gym_logs           id, user_id, plan_id, week_n, day_n, exercises (JSON), logged_at
activity_logs      id, user_id, activity_type, km, duration_secs, notes, logged_at
user_races         id, user_id, race_name, distance, race_date, finish_time,
                   target_time, notes
```

### Plan templates
```
plan_templates     id, slug, name, subtitle, distance, level, weeks_min, weeks_max,
                   runs_per_week, peak_km_week, longest_run_km, description,
                   meta (JSON — includes price_gbp), weeks_data (JSON),
                   author_type ('nextsplit'|'coach'), author_id, is_public,
                   avg_completion_rate, total_starts, avg_rating, review_count
```

### Coach platform
```
coach_profiles     user_id, display_name, slug, bio, verified, photo_url,
                   specialties, certifications
coach_athletes     id, coach_id, athlete_id, status, created_at
coach_messages     id, coach_id, athlete_id, sender_id, body, read_at, created_at
coach_invites      id, coach_id, token, athlete_email, used_at
coach_reviews      id, coach_id, athlete_id, rating, body, created_at
session_annotations id, coach_id, athlete_id, training_log_id, reaction, note,
                   created_at
```

### Marketplace + voice
```
plan_purchases     id, athlete_id, template_id, coach_id, amount_gbp,
                   stripe_payment_id, coach_payout_gbp (70%), platform_fee_gbp (30%),
                   purchased_at
                   ⚠️ NOT user_id — athlete_id. NOT plan_template_id — template_id.

voice_messages     id, coach_id, athlete_id, storage_path, duration_secs,
                   session_annotation_id, listened_at, created_at
```

### Community
```
clubs              id, name, slug, description, owner_id, is_public, member_count
club_members       id, club_id, user_id, role, joined_at
club_feed          id, club_id, user_id, content_type, content, created_at
challenges         id, club_id, name, description, start_date, end_date, metric
challenge_entries  id, challenge_id, user_id, value, logged_at
virtual_races      id, name, distance, start_date, end_date
virtual_race_entries id, race_id, user_id, finish_time, submitted_at
seasons            id, name, start_date, end_date, xp_multiplier
push_subscriptions id, user_id, endpoint, keys, created_at
```

### Storage buckets
```
voice-messages     Private. Max 5MB. Types: audio/webm, audio/mp4, audio/ogg.
                   RLS: coaches upload to own folder, athletes read messages addressed to them.
```

---

## Revenue Model

| Tier | Price | Notes |
|---|---|---|
| Athlete Free | £0 | Daily loop, plan view, basic logging, Strava read |
| Athlete Pro | £4.99/mo launch → £7.99 long-term | Adaptation, AI bespoke, full analytics, Split Leader |
| Split Leader | Included in Pro | 5-runner hard cap, no plan selling, no voice messages |
| Pro Coach | £29/mo | Unlimited athletes, voice messages, plan builder, marketplace |
| Plan sale | 30% NextSplit / 70% coach | Marketplace plans, one-time purchase |
| Coaching sub | 20% NextSplit / 80% coach | Ongoing coaching subscriptions via Stripe Connect |

Paywall moment: adaptation feature (missed session rebuild). Free users see the rebuilt plan preview then hit the wall.

`NEXT_PUBLIC_PREMIUM_ENFORCED=false` — **flip to true after Stripe E2E test.**

---

## Three-Tier Model (from Coach Pillar)

```
Athlete (Free/Pro) ──upgrade──► Split Leader (in Pro, 5-runner cap)
                                      │
                                      ▼ hits 5-runner cap or wants to sell
                               Pro Coach (£29/mo, application required)
```

Split Leader: cannot sell plans, no voice messages, no plan builder, no marketplace listing.
Job: community and acquisition, not revenue.

---

## Analytics — Event Reference

All events in `src/lib/analytics.ts`. Key events:

| Event | When | Why it matters |
|---|---|---|
| `adaptation_requested` | User triggers plan rebuild | THE conversion moment |
| `adaptation_completed` | AI returns rebuilt plan | Funnel completion |
| `session_logged` | Any session marked done | Core retention signal |
| `week_advanced` | Week advance tapped | Progression tracked |
| `class_revealed` | Runner class reveal dismissed | Identity moment |
| `plan_purchased` | Marketplace plan bought | Revenue event |
| `voice_message_sent` | Coach sends voice note | Coach feature usage |
| `subscription_started` | Stripe subscription created | Revenue |
| `referral_converted` | Referred user goes paid | Growth flywheel |
| `onboarding_completed` | All onboarding steps done | Activation |

PostHog Monday dashboard: Acquisition → Activation → Retention → Revenue → Referral → Training Outcomes.

---

## Phase Completion Checklist (Tech Pillar — mandatory every phase)

Before marking any phase complete:

**Code quality:**
- [ ] `tsc --noEmit` clean — zero errors
- [ ] Zero ESLint errors — no warnings tolerated in new code
- [ ] No `any` types in new files
- [ ] Supabase types regenerated if schema changed
- [ ] No `console.log` in committed code
- [ ] All async operations have try/catch with user-visible error state

**Security:**
- [ ] RLS verified for any new Supabase tables
- [ ] Tested with two different user accounts — data isolation confirmed
- [ ] No secrets in code or committed `.env` files
- [ ] Zod validation on new API route inputs
- [ ] Stripe webhook signature verified if new Stripe events handled

**Performance:**
- [ ] Lighthouse score ≥ 90 (Performance, Accessibility, PWA)
- [ ] Today tab renders under 500ms (Chrome DevTools profiler)
- [ ] Loading states on all data-fetching components
- [ ] Skeleton screens — never blank while loading

**Observability:**
- [ ] PostHog events firing for new user interactions
- [ ] Sentry configured and receiving from staging
- [ ] 30-minute Sentry observation window after deploy

**Deploy:**
- [ ] Push → Vercel deploys → smoke test on mobile viewport
- [ ] PostHog feature flag set correctly for new features
- [ ] README / HANDOFF updated with any new env vars or schema changes

---

## Full 18-Phase Delivery Plan

### Completed
```
Phase 01 ✅  Core Daily Loop
             Today tab, session logging, plan view, undo, date nav,
             progress strip, wellness, Strava connect

Phase 02 ✅  Coach Platform + Community + Brand + Marketplace
             7 runner classes, brand migration (Forest/Ember tokens),
             Split Leader settings, race result share card, voice messages
             (60s, waveform, signed URLs), plan marketplace (browse/detail/
             purchase/ownership), full AARRR analytics (25+ events)

Phase 04 ✅  Today Tab & Session Logging Polish
             Time-aware greeting (Good morning/afternoon/evening [name]),
             adaptive log modal by session type (rest/easy/standard/intervals),
             missed session 4-step conversational flow + paywall reveal,
             AICoachingNote component (ACWR risk flag + readiness, coach voice),
             offline session queue (IndexedDB, auto-sync on reconnect)

Phase 05 ✅  Character System Completion
             Exact class triggers (Trail Blazer 50%, Speed Merchant 40%,
             Marathon Runner 3+ runs ≥18km, Comeback auto on Lifestyle path),
             computeXPBonus (8 bonus conditions per session type),
             8 cosmetic milestones (vest/shoes/medal/flame/title/badge),
             Warming Up anticipation indicator (3 phases, weeks 1-3),
             class reveal coaching insight per class, CharacterProfileModal
             (character as social profile), leaderboard shows class emoji,
             coach dashboard character emoji per athlete
```

### Build now — no users required (Phases 3, 6–11)
```
Phase 03     Legal + Revenue + Infrastructure          ← PARTIALLY DONE
             TODO: ICO registration (£40), company formation, cookie consent,
             Stripe E2E test + PREMIUM_ENFORCED=true, Zod on API routes,
             Supabase type regen, Monday PostHog dashboard, GDPR data export

Phase 06     Production Notifications + Lifecycle Emails  ← NEXT
             8 push notification types with guardrails, 7-email lifecycle
             sequence (Resend), notification preferences in Settings

Phase 07     Split Leader Mode Toggle
             In-app toggle (not separate page), Lead dashboard replaces
             Today tab in Lead mode, athlete view with Lead actions,
             5-athlete cap enforcement, invitation link generation

Phase 08     Engineering Foundation
             Vitest unit tests (ACWR, XP, class logic, Stripe, adaptation),
             integration tests (key API routes), Playwright E2E (critical
             journeys), GitHub Actions CI, PostHog feature flags for
             in-progress work

Phase 09     Native App + App Store
             Capacitor setup, iOS build + TestFlight, App Store listing
             (adaptation story not features), app icon + splash, deep linking,
             Android Play Store

Phase 10     Wearables (Apple Health + Garmin)
             HealthKit read (workouts, HR, HRV), auto-suggest session log,
             Garmin OAuth + activity webhook, session source tracking

Phase 11     Onboarding Refinement
             Predetermined credibility layer, Lifestyle re-entry framing,
             AI Bespoke depth signalling, empty states, multiple sessions
             per day, readiness → Today greeting change, paywall reveal UX
```

### Gate: Day 30 retention ≥ 40%
```
Phase 12     Referral Programme
             Build now behind PostHog flag. Deploy when gate hit.
             Give a month / get a month, triggered at race result,
             Split Leader auto-referral, referral dashboard in Character tab
```

### Gate: Platform proven + early users
```
Phase 13     Coach Beta Programme
             5 coaches (marathon, trail, strength+run, online, club),
             6-month free Pro Coach, credential review workflow,
             coach-led club creation

Phase 14     Content Hub + SEO
             Requires custom domain first. Training plan guides (2/month),
             athlete stories (2/month), coach spotlights (1/month),
             running science explainers (2/month), weekly featured plan

Phase 15     Growth Infrastructure
             Running club outreach (5 clubs, 6-play playbook),
             creator seeding (20 creators 5k-50k followers),
             advisory board (3 advisors), Head of Growth hire,
             Community & Coach Partnerships hire
```

### Gate: Community active
```
Phase 16     Community Layer 2
             Milestone recognition in squad, coach voice note response,
             squad reactions, XP/badge feed in squad, race result in squad feed
             Training-first test applied to every item before shipping
```

### Gate: Scale metrics (1k MAU, £5k MRR)
```
Phase 17     Platform Scale
             Apple Watch companion (gate: iOS DAU ≥ 500),
             Club B2B licensing (gate: 3 active partnerships),
             Training science research (gate: 1k users + 50k sessions),
             ProfileContext refactor, performance audit, international expansion

Phase 18     Exit-Ready Infrastructure
             Full test coverage, clean cap table, audited accounts,
             Series A positioning, acquisition positioning documentation
```

---

## E2E Audit Schedule

| After phase | What gets audited |
|---|---|
| Phase 5 | Full product audit — core spec met before notifications or native app |
| Phase 8 | Engineering audit — tests written, CI live, codebase can be trusted |
| Phase 9 | Device audit — native app on real iOS device, full E2E before App Store |
| Phase 11 | Pre-user audit — all build-first phases complete, product is ready |
| Each phase | Phase completion checklist (TypeScript, Zod, RLS, Lighthouse, Sentry) |

---

## OKRs — Q2 2026 (from Ops Pillar)

| Objective | Key Results |
|---|---|
| Prove daily loop creates habit | 50 beta users logging ≥3 sessions/week · Day 7 retention ≥ 55% · Class reveal for 30+ users |
| Ship onboarding under 5 minutes | Time-to-first-session ≤ 4 min median · All 4 paths tested · Completion rate ≥ 80% |
| Generate first revenue | Adaptation feature used by 20+ users · Paywall live · First 10 paying subscribers |
| Find co-founder seriously | Brief written + shared with 5 networks · 10 qualified conversations · Term sheet extended |

---

## Two Metrics That Matter (Growth Pillar)

**CAC — Cost Per Install**
Target: ≤ 3-month subscription value (≤ £24 at £7.99/mo)
Track by channel. Referral → near zero. Club outreach → low.

**Subscription Conversion Rate**
Target: ≥ 15% of free users converting within 30 days.
Below 10% → freemium boundary wrong or adaptation feature not landing.
Above 20% → free tier may be too restrictive.

If CAC is falling and conversion is rising — everything is working.
If either breaks — stop and diagnose before spending more.

---

## Weekly Review — Every Monday, 30 Minutes (Ops Pillar)

```
0–8 min    Metrics: PostHog WAT, Day 7 retention, Day 30 retention.
           Sentry errors. Stripe MRR. One number moved wrong → hypothesis.
8–16 min   Blockers: named resolution for each, not "figure it out"
16–24 min  Priorities: 3 things that must ship this week. No more.
24–30 min  Strategy pulse: is what we're building the highest-leverage thing?
```

Written in Notion. 3 sentences per section. Non-negotiable.

---

## Legal Checklist (Ops Pillar)

| Item | Urgency | Status |
|---|---|---|
| ICO registration | Now — health data legal requirement | ⬜ TODO |
| Company formation (Companies House) | Now | ⬜ TODO |
| Cookie consent (before PostHog fires) | Before launch | ⬜ TODO |
| Privacy policy (Termly + lawyer review) | Before launch | ⬜ TODO |
| Terms of service | Before launch | ⬜ TODO |
| Medical disclaimer (ACWR + onboarding) | Before launch | ⬜ TODO |
| GDPR data export | Before launch | ⬜ TODO |
| Stripe Connect legal agreement | Before coach payments | ⬜ TODO |
| Employment contracts | At first hire | ⬜ TODO |
| IP assignment | At first hire | ⬜ TODO |

---

## Hiring Plan (Ops Pillar)

| Hire | When | What they own |
|---|---|---|
| Technical Co-Founder | **Now — active search** | Full engineering. Equity. Permanent. |
| Product Designer | Alongside or after Hire 1 | Visual execution, Figma, design system |
| Head of Growth | Day 30 retention ≥ 40% | CAC, conversion, referral |
| Community & Coach Partnerships | Coach beta begins | Coach relationships, club outreach |

---

## Advisory Board Target (Ops Pillar)

| Role | What they bring | Offer |
|---|---|---|
| Sports Scientist | Validates ACWR, pace zones, adaptation algorithm | 0.1–0.25% equity |
| Consumer App Growth | Referral mechanics, lifecycle emails, retention levers | 0.1–0.25% equity |
| Running Industry Connector | Coach network, community introductions | 0.1% equity |

Approach after first paying subscriber. Not before.

---

## Open Design Questions (Product Pillar — unresolved)

These require user testing data to resolve:

1. Does the adaptive log modal feel like a conversation or a form? If a form — rewrite copy before Phase 12.
2. How does Today tab handle multiple sessions in one day? (card stack / accordion / primary only)
3. What is the empty state for a plan not yet started or already ended?
4. Does a low readiness score automatically change the greeting tone and session suggestion?
5. How does Split Leader mode handle the Lead being in their own peak week when an athlete needs attention?
6. What is the exact paywall reveal design — compelling preview without creating resentment?

---

## Document Index (16 source documents)

| # | Document | Key contribution |
|---|---|---|
| 1 | Vision & Strategy v2.3 | Adaptation as conversion moment. Who we serve. |
| 2 | Company Operating Framework | 8-pillar structure. Solo founder constraints. |
| 3 | User Personas v1.3 | 6 archetypes. 4 onboarding paths. |
| 4 | Master Roadmap v1.3 | 4-horizon sequence. Decision log. Success targets. |
| 5 | Product & UX Pillar | Design language. 6 principles. 7am test. Adaptive log modal. Missed session flow. AI visibility. |
| 6 | Coach & Marketplace Pillar | 3-tier model. Revenue splits. Voice messages. Verification. |
| 7 | Brand & Identity Pillar | Forest/Ember tokens. Taglines. Hero brand moment. |
| 8 | Growth & Marketing Pillar | 5 channels. Referral mechanic. 7-email lifecycle. Push notification strategy. Club playbook. |
| 9 | Technology & Engineering Pillar | Stack. Phase checklist. Test pyramid. Performance targets. Security. CI/CD. |
| 10 | Community & Content Pillar | 4-layer community stack. Training-first philosophy. Content calendar. |
| 11 | Operations & People Pillar | Hiring plan. Weekly review. OKRs. Legal checklist. Advisory board. |
| 12 | Data & Analytics Pillar | AARRR framework. Training outcomes. Monday dashboard. Privacy principles. |
| 13 | Character System Spec | 7 classes. Class triggers. XP bonuses. Cosmetic unlocks. Identity architecture. |
| 14 | Document Conflict Audit | 8 resolved conflicts. Split Leader naming. Pricing. Tier model. |
| 15 | HANDOFF-4 | Previous session state. Architecture. DB schema. |
| 16 | HANDOFF-5 (this document) | Current state. Phase 2 complete. Phase 4 starting. |

---

*NextSplit HANDOFF-5 — April 2026 — Update after each phase completion*
*Living document — always reflects current codebase state*
