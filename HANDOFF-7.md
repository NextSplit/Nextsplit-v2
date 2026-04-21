# NextSplit v2 — HANDOFF-7
**Version:** HANDOFF-7 | **April 2026** | **Build:** Production-deployed, alpha preparation
**Live:** https://nextsplit-v2.vercel.app | **Repo:** https://github.com/NextSplit/Nextsplit-v2
**Strategy baseline:** 16 documents — all read and reconciled
**Master plan:** MASTER-DELIVERY-PLAN-V2.md (phases A→I, alpha-first)

---

## Read This First

This replaces HANDOFF-6. The delivery plan was restructured from 18 linear phases
to 8 alpha-first phases (A→I). Revenue features are built but NOT enforced —
alpha users test everything unrestricted. Revenue activation is Phase H,
gated on Day 30 retention ≥ 40%.

**Source of truth for what to build next:** MASTER-DELIVERY-PLAN-V2.md
**This document:** Current build state, environment config, DB schema, immediate next steps.

---

## Founding Principle

> Users become believers the first time the plan adapts around something that went
> wrong in their life. Everything traces back to that moment.

---

## Alpha Philosophy

Premium features remain **unlocked** throughout alpha. Closed pool of trusted users.
Goal: UAT and E2E testing before public release. Every feature visible and functional —
none gated. Revenue activation (PREMIUM_ENFORCED, referral release) built and ready
but not triggered until Phase H.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 App Router + TypeScript strict |
| Backend | Supabase (Postgres + RLS + Auth + Storage) |
| Hosting | Vercel (auto-deploy on push to main) |
| Payments | Stripe (subscriptions + Connect for coaches) |
| Analytics | PostHog (AARRR — 25+ events) |
| Errors | Sentry |
| AI | Anthropic Claude SDK (claude-sonnet-4-20250514) |
| Email | Resend (lifecycle emails, 7-sequence) |
| Styling | Tailwind CSS + NextSplit design tokens |
| Charts | Recharts |
| Testing | Vitest (52 unit tests) + Playwright (E2E config) |
| PWA | next-pwa service worker |

## Design Tokens (brand-locked — do not change)

```css
--ns-forest:       #2b5c3f  /* Primary green */
--ns-ember:        #e85d26  /* Accent orange */
--ns-track:        #c49a3c  /* Gold */
--ns-night:        #2c3e50  /* Dark slate */
--ns-forest-light: #edf4f0  /* Light green background */
```

Fonts loaded: Outfit (body/UI) · Cormorant Garamond (display) · JetBrains Mono (data)
**Note:** Fonts are loaded but underused — D1 (typography system) will fix this.

---

## Environment Variables (Vercel)

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
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_EMAIL
CRON_SECRET
RESEND_API_KEY               ← ⚠️ ADD TO VERCEL (from resend.com)
NEXT_PUBLIC_PREMIUM_ENFORCED=false   ← stays false during alpha
NEXT_PUBLIC_REFERRAL_ENABLED=false   ← flip true at Phase H (Day 30 retention ≥ 40%)
```

---

## Cron Jobs (vercel.json)

```json
{
  "crons": [
    { "path": "/api/cron/notify",           "schedule": "0 * * * *"  },
    { "path": "/api/cron/lifecycle-emails", "schedule": "0 9 * * *"  }
  ]
}
```

---

## Database Schema

### Core tables
```
profiles           id, display_name, handle, email, avatar_url, is_pro,
                   stripe_customer_id, stripe_subscription_id,
                   is_coach, coach_tier ('split_leader'|'professional'),
                   runner_class, runner_class_updated_at, runner_class_revealed,
                   first_session_logged_at,
                   notifications_enabled, notification_time,
                   notif_session_reminder, notif_adaptation_alert,
                   notif_weekly_recap, notif_race_countdown,
                   notif_streak_at_risk, notif_coach_message,
                   notif_at_risk_reengagement, notif_class_revealed,
                   last_notification_at, at_risk_sent_at,
                   lifecycle_email_sent (TEXT[]),
                   referral_code, referred_by, referral_count,
                   referral_reward_given_at,
                   season_xp, current_league,
                   dark_mode, units, text_size

user_plans         id, user_id, template_id, plan_type, status, name,
                   start_date, total_weeks, current_week, race_date,
                   weeks_data (JSON), meta

training_logs      id, user_id, plan_id, week_n, day_n, session_i,
                   done, km, pace, duration_secs, effort, notes, logged_at

wellness_logs      id, user_id, date, readiness, sleep_quality,
                   soreness, motivation, notes

plan_templates     id, slug, name, distance, level, weeks_min, weeks_max,
                   description, meta (includes price_gbp), weeks_data,
                   author_type ('nextsplit'|'coach'), author_id, is_public,
                   avg_completion_rate, total_starts, avg_rating, review_count
```

### Coach & marketplace
```
plan_purchases     id, athlete_id, template_id, coach_id,
                   amount_gbp, stripe_payment_id,
                   coach_payout_gbp (70%), platform_fee_gbp (30%)

voice_messages     id, coach_id, athlete_id, storage_path,
                   duration_secs, listened_at, created_at

coach_profiles     user_id, display_name, slug, verified, photo_url
coach_athletes     id, coach_id, athlete_id, status
coach_messages     id, coach_id, athlete_id, sender_id, body, read_at
session_annotations id, coach_id, athlete_id, training_log_id, reaction, note
```

### ⚠️ SQL to run in Supabase (not yet executed)

Run `supabase/migrations/phase-12-referral.sql` — adds referral columns
and notification preference columns (both included, both idempotent):

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS referral_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_reward_given_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lifecycle_email_sent TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_notification_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS at_risk_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notif_session_reminder BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_adaptation_alert BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_weekly_recap BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_race_countdown BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_streak_at_risk BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_coach_message BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_at_risk_reengagement BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_class_revealed BOOLEAN DEFAULT true;
```

---

## Revenue Model

| Tier | Price | Notes |
|---|---|---|
| Athlete Free | £0 | All features visible during alpha, unrestricted |
| Athlete Pro | £4.99/mo launch → £7.99 long-term | Unlocks when PREMIUM_ENFORCED=true (Phase H) |
| Split Leader | Included in Pro | 5-runner cap |
| Pro Coach | £29/mo | Unlimited athletes, marketplace |
| Plan sale | 30% NextSplit / 70% coach | |
| Coaching sub | 20% NextSplit / 80% coach | |

---

## Build State — What Is Complete

### ✅ Fully shipped (Phases 1–12 of original plan)

**Core product:**
- Today tab, session logging, plan view, undo, date nav, progress strip
- Wellness check-in, readiness → Today tab greeting tone
- Strava connect + session import
- Offline session queue (IndexedDB, auto-sync)
- Gym session tracker (live mode)
- Missed session conversational flow (4-step, paywall reveal)
- Adaptive log modal (4 modes by session type)
- AICoachingNote (ACWR risk flag, readiness, coach voice)
- TodayHeader (time-aware greeting, context strip, race countdown)

**Character system:**
- 7 runner classes with exact spec triggers (Trail Blazer 50%, Speed Merchant 40%, etc.)
- computeXPBonus (8 bonus conditions per session type)
- 8 cosmetic milestone unlocks
- Warming Up anticipation indicator (3 phases)
- Class reveal with coaching insight
- CharacterProfileModal (character as social profile)
- Community leaderboard shows character class emoji
- Coach dashboard shows character per athlete

**Notifications:**
- 8 push notification types with Growth Pillar copy + guardrails
- Per-type notification preferences in Settings
- 7-email lifecycle sequence (Resend, coach voice)
- Cron schedules in vercel.json

**Onboarding:**
- All 4 paths (Predetermined, AI Bespoke, Manual, Lifestyle)
- Credibility layer (methodology-first for Predetermined)
- AI Bespoke depth — "What happened last time you didn't finish a plan?"
- Lifestyle re-entry framing — enjoyment + availability first
- PlanPreviewScreen paywall reveal (blurred adaptation preview)
- Readiness → greeting tone in TodayHeader

**Split Leader mode:**
- useLeadMode hook (coach_tier, localStorage)
- LeadDashboard (needs-attention, completion bars, character emojis)
- TodayClient toggle (display:none preserves hooks)

**Engineering:**
- 52 unit tests (statsUtils, rpg, notifications — all passing)
- GitHub Actions CI (tsc + ESLint + vitest + next build)
- Playwright E2E config (iPhone 14 Pro + Pixel 7)
- Vitest config with coverage

**Referral programme (behind flag):**
- generateReferralCode(), /refer/[code] landing page
- POST /api/referral validates + stores relationship
- ReferralCard component (double-sided reward, native share)
- Signup ?ref= capture + referral banner
- SQL migration file ready
- Flag: NEXT_PUBLIC_REFERRAL_ENABLED=false → flip at Phase H

---

## What Needs Building Next — Phase A (Start Here)

**All of Phase A is pre-user. No exceptions. Build in parallel tracks.**

### Track 1 — Security
- [x] **A1a: Supabase type regeneration** — ⚠️ Run manually: `npx supabase gen types typescript --project-id YOUR_ID > src/types/database.ts`
- [x] **A1b: Zod validation** — ✅ COMPLETE. 27 routes validated (schemas.ts). Committed e7daf56.

### Track 2 — Legal
- [ ] **A2a: ICO registration** — ico.org.uk, £40 — ⚠️ Founder action required
- [ ] **A2a: Company formation** — Companies House, £12 — ⚠️ Founder action required
- [x] **A2b: Privacy policy** — ✅ Real content, GDPR-compliant, /privacy
- [x] **A2b: Terms of service** — ✅ Real content, coaching disclaimer, /terms
- [x] **A2b: Medical disclaimer** — ✅ MedicalDisclaimer component, 3 locations
- [x] **A2b: Cookie consent banner** — ✅ CookieConsentBanner, PostHog gated, useCookieConsent hook
- [ ] **A2c: GDPR data export** — ⚠️ Verify Settings "Export my data" works E2E

### Track 3 — Quality verification
- [ ] **A3: AI plan quality review tool** — Admin page ← NEXT BUILD
- [ ] **A4: Onboarding funnel PostHog events** — `onboarding_step_viewed` per screen
- [ ] **A5: Adaptation E2E test matrix** — 5 scenarios verified
- [ ] **A6: Email sender domain** — Add DNS records for mail.nextsplit.app
- [ ] **A7: In-app NPS prompt** — Day 7 + Day 30 triggers
- [ ] **A8: Monday PostHog dashboard** — Configure before first alpha invite

### Phase A gate
All items complete before Phase B begins. A1 ✅ A2 code ✅ A2 non-code ⚠️ (founder) A3–A8 pending.

---

## Phases B–I Summary (see MASTER-DELIVERY-PLAN-V2.md for full detail)

```
Phase A  Foundation & Legal          ← CURRENT — build all before any user
Phase B  Coach Dashboard Overhaul    5 tiers: command centre → marketplace analytics
Phase C  Plan Library Expansion      65+ templates, VDOT pace adaptation
Phase D  Design Uplift 3→10          Typography, colour, icons, SVG characters
Phase E  Community Completion        Club feed, challenge verification, race results
Phase F  Pre-Alpha Quality Gates     Founder E2E on real device, 3 people test
Phase G  Alpha (Closed Pool)         Trusted users, NPS Day 7+30, retention data
Phase H  Revenue Activation          PREMIUM_ENFORCED=true, Stripe E2E, referral live
Phase I  Public Beta + Growth        App Store, Garmin, coach beta, custom domain
```

---

## Phase A→B Immediate Decision Queue

Decisions to make before writing any Phase B code:

1. **Coach dashboard data source** — does squad-status API need new fields for
   the command centre, or can we extend the existing endpoint?
2. **Plan library approach** — generate 65 templates programmatically via a seeding
   script, or via an admin UI? (Recommendation: script, faster and testable)
3. **Design — character SVG** — how detailed to go in-code vs commission
   static illustrations? (Recommendation: push SVG generation to its limit in D4,
   commission only if SVG quality ceiling is hit)
4. **Community scope** — club feed auto-posts (session auto-published) require
   a privacy decision: opt-in or opt-out default?

---

## Known Issues / Tech Debt

| Issue | Severity | Phase |
|---|---|---|
| Zod missing on all API routes | 🔴 High | A1 |
| Supabase types stale (~40 `any` casts) | 🟠 Medium | A1 |
| PostHog fires before cookie consent | 🔴 High (legal) | A2 |
| AI API routes have no Pro check | 🟡 Low during alpha | Phase H |
| Referral reward not wired to Stripe webhook | 🟡 Low during alpha | Phase H |
| ProfileContext re-renders extensively | 🟢 Low | Phase I (or when it causes bugs) |
| ESLint set-state-in-effect warnings (pre-existing) | 🟢 Low | Suppress or fix incrementally |

---

## Key Files Reference

### Phase A–12 additions
```
src/lib/notifications.ts              8 notification types + guardrails
src/lib/lifecycleEmails.ts            7-email lifecycle HTML generator
src/lib/offlineQueue.ts               IndexedDB offline session queue
src/lib/referral.ts                   Referral code generation + share text
src/lib/rpg.ts                        Character system: classes, XP, cosmetics
src/hooks/useLeadMode.ts              Split Leader mode toggle state
src/components/AICoachingNote.tsx     Coach voice notes (ACWR, readiness)
src/components/LeadDashboard.tsx      Squad view for Split Leader mode
src/components/MissedSessionFlow.tsx  4-step missed session conversational flow
src/components/LogModal.tsx           Adaptive log modal (4 types)
src/components/CharacterProfileModal.tsx  Character as social profile
src/components/ReferralCard.tsx       Referral UI (behind flag)
src/app/today/TodayHeader.tsx         Time-aware greeting, readiness tone
src/app/today/TodayClient.tsx         Main Today tab orchestration
src/app/api/cron/notify/route.ts      8-type push notification dispatcher
src/app/api/cron/lifecycle-emails/    Daily lifecycle email sender
src/app/api/profile/character/        Character data for any user
src/app/api/referral/route.ts         Referral code GET/POST
src/app/refer/[code]/page.tsx         Referral landing page
src/lib/statsUtils.test.ts            ACWR + pace unit tests (13 tests)
src/lib/rpg.test.ts                   XP + class unit tests (26 tests)
src/lib/notifications.test.ts         Notification unit tests (13 tests)
src/test/e2e/core-journey.spec.ts     Playwright E2E tests
.github/workflows/ci.yml              GitHub Actions CI
supabase/migrations/phase-12-referral.sql  Pending SQL migration
MASTER-DELIVERY-PLAN-V2.md            Full revised delivery plan (phases A→I)
```

### API routes (all unvalidated — Zod needed on all)
```
/api/ai/adapt-plan          ← HIGHEST PRIORITY for Zod
/api/ai/generate-plan       ← HIGH PRIORITY
/api/plans/activate
/api/marketplace/purchase
/api/coach/invite
/api/coach/squad-status
/api/community/clubs
/api/referral
/api/runner-class
/api/notifications/subscribe
/api/voice-messages
/api/strava/sync
/api/ai/weekly-summary
/api/ai/coach
/api/stripe/webhook         ← validate Stripe signature (already done via Stripe lib)
```

---

## Analytics Events Reference

| Event | When | Why it matters |
|---|---|---|
| `adaptation_requested` | Missed session → rebuild | The conversion moment |
| `session_logged` | Session marked done | Core retention signal |
| `week_advanced` | Week progresses | Progression tracked |
| `class_revealed` | Runner opens class reveal | Identity moment |
| `plan_purchased` | Marketplace purchase | Revenue event |
| `voice_message_sent` | Coach sends voice | Coach feature signal |
| `subscription_started` | Stripe checkout completes | Revenue |
| `referral_converted` | Referred user upgrades | Growth flywheel |
| `onboarding_step_viewed` | ← MISSING — add in A4 | Funnel measurement |
| `nps_submitted` | ← MISSING — add in A7 | Retention signal |

---

## OKRs — Alpha Period

| Objective | Key Results |
|---|---|
| Prove daily loop creates habit | Alpha users: ≥3 sessions/week · Day 7 retention ≥55% |
| Validate onboarding | Completion ≥80% across all 4 paths · Median < 5 min |
| Validate coach dashboard | 1 coach navigates all 5 tiers without instruction |
| Validate plan quality | 0 AI Bespoke plans are nonsensical after admin review |
| Collect NPS | NPS ≥ 40 at Day 30 from alpha pool |

---

## Legal Checklist (non-code — action these immediately)

| Item | Status | Owner |
|---|---|---|
| ICO registration (£40, ico.org.uk) | ⬜ TODO | Founder |
| Company formation (£12, Companies House) | ⬜ TODO | Founder |
| Privacy policy (Termly, real content) | ⬜ TODO | Founder |
| Terms of service (Termly, real content) | ⬜ TODO | Founder |
| Medical disclaimer (onboarding + ACWR) | ⬜ TODO | Claude build |
| Cookie consent banner | ⬜ TODO | Claude build (Phase A2b) |
| GDPR data export verified E2E | ⬜ TODO | Claude build (Phase A2c) |
| RESEND_API_KEY in Vercel | ⬜ TODO | Founder |
| Email sender domain DNS (Resend) | ⬜ TODO | Founder (30 min) |

---

## Hiring Plan

| Hire | When | What they own |
|---|---|---|
| Technical Co-Founder | **Now — active search** | Full engineering, equity |
| Product Designer | After Phase D design uplift | Visual execution, Figma |
| Head of Growth | Phase H (retention gate met) | CAC, conversion, referral |
| Community & Coach Partnerships | Phase I (coach beta) | Coach relationships, clubs |

---

## Document Index

| # | Document | Contribution |
|---|---|---|
| 1 | Vision & Strategy v2.3 | Adaptation as conversion moment |
| 2 | Company Operating Framework | 8-pillar structure |
| 3 | User Personas v1.3 | 6 archetypes, 4 onboarding paths |
| 4 | Master Roadmap v1.3 | Original 4-horizon sequence |
| 5 | Product & UX Pillar | Design language, session types, coach voice |
| 6 | Coach & Marketplace Pillar | 3-tier model, revenue splits, flywheel |
| 7 | Brand & Identity Pillar | Forest/Ember tokens, taglines |
| 8 | Growth & Marketing Pillar | Lifecycle emails, push strategy, referral |
| 9 | Technology & Engineering Pillar | Stack decisions, test pyramid, Zod requirement |
| 10 | Community & Content Pillar | 4-layer community stack |
| 11 | Operations & People Pillar | Hiring plan, OKRs, legal checklist |
| 12 | Data & Analytics Pillar | AARRR framework, Monday dashboard |
| 13 | Character System Spec | 7 classes, XP bonuses, reveal mechanic |
| 14 | Document Conflict Audit | 8 resolved conflicts |
| 15–16 | HANDOFF-4 through HANDOFF-6 | Previous build state |
| 17 | MASTER-DELIVERY-PLAN-V2.md | Revised A→I phases, alpha-first |
| 18 | HANDOFF-7 (this) | Current state, Phase A is next |

---

*HANDOFF-7 — April 2026 — Supersedes HANDOFF-6*
*Next update: After Phase A complete (all gates passed)*
