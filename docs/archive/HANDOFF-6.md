# NextSplit v2 — Handoff Document
**Version:** HANDOFF-6 | **Date:** April 2026 | **Build:** Production-deployed
**Live:** https://nextsplit-v2.vercel.app | **Repo:** https://github.com/NextSplit/Nextsplit-v2
**Strategy baseline:** 16 strategy documents — all read and reconciled

---

## How To Use This Document

Single source of truth for any new session, contributor, or Claude instance.
Read this before touching any code. Every decision traces to one of the 16 source
documents listed at the bottom.

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
| Analytics | PostHog (AARRR instrumentation — 25+ events) |
| Errors | Sentry |
| AI | Anthropic Claude SDK (claude-sonnet-4-20250514) |
| Email | Resend (lifecycle emails) |
| Styling | Tailwind CSS + NextSplit design tokens |
| Charts | Recharts |
| PWA | next-pwa service worker |

## Design Tokens (brand-locked)

```css
--ns-forest:       #2b5c3f  /* Primary */
--ns-ember:        #e85d26  /* Accent */
--ns-track:        #c49a3c  /* Gold */
--ns-night:        #2c3e50  /* Slate */
--ns-forest-light: #edf4f0
```

Fonts: Outfit (body) · Cormorant Garamond (display) · JetBrains Mono (data)

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
RESEND_API_KEY          ← ADD THIS (from resend.com)
NEXT_PUBLIC_PREMIUM_ENFORCED   ← currently 'false' — flip after Stripe E2E test
```

---

## Cron Schedule (vercel.json)

```json
{
  "crons": [
    { "path": "/api/cron/notify",           "schedule": "0 * * * *"  },
    { "path": "/api/cron/lifecycle-emails", "schedule": "0 9 * * *"  }
  ]
}
```

---

## Database Schema — Key Tables

### Core
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

### Coach & Marketplace
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

### ⚠️ Pending SQL (run in Supabase — Phase 12 migration file at supabase/migrations/phase-12-referral.sql)

```sql
ALTER TABLE profiles
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
| Athlete Free | £0 | Daily loop, plan view, basic logging |
| Athlete Pro | £4.99/mo launch → £7.99 long-term | Adaptation, AI bespoke, Split Leader |
| Split Leader | Included in Pro | 5-runner cap, no plan selling |
| Pro Coach | £29/mo | Unlimited athletes, voice, plan builder, marketplace |
| Plan sale | 30% NextSplit / 70% coach | |
| Coaching sub | 20% NextSplit / 80% coach | |

**Paywall:** `NEXT_PUBLIC_PREMIUM_ENFORCED=false` — flip to `true` after Stripe E2E test.

---

## Phase Completion Checklist (Tech Pillar — every phase)

- [ ] `tsc --noEmit` clean
- [ ] Zero ESLint errors in new files
- [ ] No `any` types in new code
- [ ] No `console.log` committed
- [ ] All async has try/catch
- [ ] RLS verified for new tables (two-account test)
- [ ] Zod on new API inputs
- [ ] Lighthouse ≥ 90
- [ ] PostHog events firing
- [ ] Sentry observation 30min after deploy
- [ ] HANDOFF updated

---

## 18-Phase Delivery Plan — Current Status

### ✅ Complete

```
Phase 01  Core Daily Loop
          Today tab, session logging, plan view, undo, date nav,
          progress strip, wellness, Strava connect

Phase 02  Coach Platform + Community + Brand + Marketplace
          7 runner classes, brand migration (Forest/Ember tokens),
          Split Leader settings, race result share card, voice messages
          (60s, waveform, signed URLs), plan marketplace (browse/detail/
          purchase/ownership), full AARRR analytics (25+ events)

Phase 04  Today Tab & Session Logging Polish
          Time-aware greeting, adaptive log modal (rest/easy/standard/intervals),
          missed session 4-step conversational flow + paywall reveal,
          AICoachingNote (ACWR risk flag + readiness, coach voice),
          offline session queue (IndexedDB, auto-sync on reconnect)

Phase 05  Character System Completion
          Exact class triggers (Trail Blazer 50%, Speed Merchant 40%,
          Marathon Runner 3+ runs ≥18km, Comeback auto on Lifestyle path),
          computeXPBonus (8 bonus conditions), 8 cosmetic milestones,
          Warming Up anticipation indicator (3 phases, weeks 1-3),
          class reveal coaching insight per class, CharacterProfileModal
          (character as social profile), leaderboard shows class emoji,
          coach dashboard character per athlete

Phase 06  Production Notifications + Lifecycle Emails
          8 push notification types (Growth Pillar copy + guardrails),
          7-email lifecycle sequence (Resend, coach voice), per-type
          notification prefs in Settings, vercel.json cron schedules

Phase 07  Split Leader Mode Toggle
          useLeadMode hook (coach_tier, localStorage persistence),
          LeadDashboard (clean dashboard standard, needs-attention,
          weekly completion bars, character emojis, invite flow),
          TodayClient wired (toggle button, display:none when Lead mode)
```

### 🔄 Partially done

```
Phase 03  Legal + Revenue + Infrastructure
          TODO: ICO registration (£40), company formation (£12),
          cookie consent before PostHog fires, privacy policy (Termly),
          terms of service, medical disclaimer on ACWR + onboarding,
          Stripe E2E test → PREMIUM_ENFORCED=true,
          Zod validation on all API routes,
          Supabase type regeneration,
          Monday PostHog dashboard setup,
          GDPR data export (working), Sentry configured,
          RESEND_API_KEY in Vercel environment variables
```

### 📋 Build now — no users required

```
Phase 08  Engineering Foundation                        ← NEXT
          Vitest (unit tests: ACWR, XP, class logic, Stripe, adaptation),
          integration tests (key API routes + RLS),
          Playwright E2E (signup→session, free→paywall, purchase),
          GitHub Actions CI (tsc + eslint + vitest on PR),
          PostHog feature flags for in-progress features

Phase 09  Native App + App Store
          Capacitor setup, iOS build + TestFlight,
          App Store listing (adaptation story not features),
          app icon + splash, deep linking, Android Play Store

Phase 10  Wearables (Apple Health + Garmin)
          HealthKit read (workouts, HR, HRV), auto-suggest session log,
          Garmin OAuth + activity webhook, session source tracking

Phase 11  Onboarding Refinement
          Predetermined credibility layer, Lifestyle re-entry framing,
          AI Bespoke depth signalling, empty states, paywall reveal UX
```

### 🔒 User-gated

```
Phase 12  Referral Programme          Gate: Day 30 retention ≥ 40%
          (Build now behind PostHog flag, deploy at gate)

Phase 13  Coach Beta Programme        Gate: platform proven E2E
Phase 14  Content Hub + SEO           Gate: custom domain + coaches
Phase 15  Growth Infrastructure       Gate: early users + referral live
Phase 16  Community Layer 2           Gate: squads active
Phase 17  Platform Scale              Gate: 1k MAU, £5k MRR
Phase 18  Exit-Ready Infrastructure   Gate: Series A ready
```

---

## E2E Audit Schedule

| After phase | What gets audited |
|---|---|
| Phase 8 | Engineering audit — tests written, CI live, codebase trusted |
| Phase 9 | Device audit — native app on real iOS, E2E before App Store |
| Phase 11 | Pre-user audit — all build-first phases complete |
| Each phase | Phase completion checklist (tsc, eslint, Zod, RLS, Lighthouse, Sentry) |

---

## Key Files — Phase 4–7 Additions

```
src/lib/notifications.ts         — 8 notification types, guardrails engine
src/lib/lifecycleEmails.ts       — 7-email lifecycle sequence HTML generator
src/lib/offlineQueue.ts          — IndexedDB offline session queue
src/lib/rpg.ts                   — CLASS_COACHING_INSIGHTS, COSMETIC_MILESTONES,
                                   computeXPBonus, getWarmingUpPhase
src/hooks/useLeadMode.ts         — Split Leader mode state + toggle
src/components/AICoachingNote.tsx — Coach voice coaching notes (ACWR, readiness)
src/components/LeadDashboard.tsx  — Squad view for Split Leader mode
src/components/MissedSessionFlow.tsx — 4-step missed session conversational flow
src/components/LogModal.tsx       — Adaptive log modal (4 modes by session type)
src/components/CharacterProfileModal.tsx — Character as social profile
src/app/today/TodayHeader.tsx     — Time-aware greeting, context strip
src/app/api/cron/notify/route.ts  — 8-type push notification dispatcher
src/app/api/cron/lifecycle-emails/route.ts — Daily lifecycle email sender
src/app/api/profile/character/route.ts — Character data for any user
```

---

## Analytics Event Reference (25+ events)

Key events in `src/lib/analytics.ts`:

| Event | When |
|---|---|
| `adaptation_requested` | THE conversion moment |
| `session_logged` | Core retention signal |
| `week_advanced` | Progression tracked |
| `class_revealed` | Identity moment |
| `plan_purchased` | Revenue event |
| `voice_message_sent` | Coach feature |
| `subscription_started` | Revenue |
| `referral_converted` | Growth flywheel |

---

## OKRs Q2 2026

| Objective | Key Results |
|---|---|
| Prove daily loop creates habit | 50 beta users ≥3 sessions/week · Day 7 retention ≥55% · 30+ class reveals |
| Ship onboarding under 5 minutes | Median ≤4 min · All 4 paths tested · Completion ≥80% |
| Generate first revenue | Paywall live · 10+ paying subscribers |
| Find co-founder seriously | Brief shared with 5 networks · 10 conversations |

---

## Two Metrics That Matter (Growth Pillar)

**CAC:** Target ≤ £24 (3-month sub value). Track by channel.
**Conversion:** Target ≥15% free→paid within 30 days. Below 10% → fix freemium boundary.

---

## Legal Checklist

| Item | Status |
|---|---|
| ICO registration (£40) | ⬜ TODO — do this week |
| Company formation (£12) | ⬜ TODO |
| Cookie consent | ⬜ TODO — before PostHog fires |
| Privacy policy | ⬜ TODO |
| Terms of service | ⬜ TODO |
| Medical disclaimer | ⬜ TODO |
| GDPR data export | ⬜ TODO |

---

## Hiring Plan

| Hire | When |
|---|---|
| Technical Co-Founder | **Now — active search** |
| Product Designer | After Hire 1 |
| Head of Growth | Day 30 retention ≥40% |
| Community & Coach Partnerships | Coach beta begins |

---

## Document Index

| # | Document | Key contribution |
|---|---|---|
| 1 | Vision & Strategy v2.3 | Adaptation as conversion moment |
| 2 | Company Operating Framework | 8-pillar structure |
| 3 | User Personas v1.3 | 6 archetypes, 4 onboarding paths |
| 4 | Master Roadmap v1.3 | 4-horizon sequence, decision log |
| 5 | Product & UX Pillar | Design language, adaptive log modal, missed session flow |
| 6 | Coach & Marketplace Pillar | 3-tier model, revenue splits |
| 7 | Brand & Identity Pillar | Forest/Ember tokens, taglines |
| 8 | Growth & Marketing Pillar | 5 channels, lifecycle emails, push notifications |
| 9 | Technology & Engineering Pillar | Phase checklist, test pyramid, performance targets |
| 10 | Community & Content Pillar | 4-layer community stack |
| 11 | Operations & People Pillar | Hiring plan, OKRs, legal checklist |
| 12 | Data & Analytics Pillar | AARRR framework, Monday dashboard |
| 13 | Character System Spec | 7 classes, XP bonuses, cosmetic milestones |
| 14 | Document Conflict Audit | Resolved conflicts: Split Leader naming, pricing |
| 15 | HANDOFF-5 | Previous session state |
| 16 | HANDOFF-6 (this) | Phase 4–7 complete, Phase 8 next |

---

*HANDOFF-6 — April 2026 — Update after each phase*
