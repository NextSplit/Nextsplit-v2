# NextSplit — Master Delivery Plan
**Version:** 3.0 | **April 2026** | **Three Pillars Priority**
**Status:** Living document — reviewed at milestones, not calendar dates

---

## The Three Core Pillars

NextSplit is built on three differentiated product pillars. All development
from April 2026 onwards prioritises these in order. Previous open tasks remain
on the list but move behind this work.

**Full strategic spec:** THREE-PILLARS-STRATEGY.md

```
Pillar 1 — Bespoke Digital Coaching
  Free predetermined plans + AI-generated plans + coach-authored plans.
  Plans adapt to real life. VDOT pace personalisation. Lifestyle re-entry.

Pillar 2 — Split Leader
  Premium unlock. Lead a squad of 5. Social accountability layer.
  Collective goals, trophy room, nudges, squad seasons.
  Primary organic growth engine and virality mechanism.

Pillar 3 — Coaching Marketplace + Hub
  Athlete-facing: find, preview, hire a verified coach.
  Coach-facing: manage athletes, build plans, earn revenue.
  Commission model with sliding scale. Verification system.
```

---

## Core Principle

> Users become believers the first time the plan adapts around something
> that went wrong in their life. Everything in this plan serves that moment.
> Social accountability (Pillar 2) multiplies this — when your friends see
> you adapted and kept going, they stay too.

---

## Current Build Status (April 2026)

### ✅ Complete and deployed (Phases A–F + UI overhaul)

| Area | What's built | Commit |
|---|---|---|
| Core daily loop | Today, Plan, logging, undo, date nav, adaptation | Various |
| Character system | 7 classes, XP, 15 levels, 32 badges, class reveal, new SVG avatar | bc750fb |
| Coach platform | Squad view, athlete detail, voice messages, plan builder | Various |
| Community | Clubs, challenges, races, leaderboard, feed with reactions | ab4f41a |
| Onboarding | All 4 paths, VDOT, AI bespoke, lifestyle re-entry | Various |
| Notifications | 8 types, guardrails, per-type preferences | Various |
| Lifecycle emails | 7-email sequence, Resend | Various |
| Referral | Built, behind NEXT_PUBLIC_REFERRAL_ENABLED flag | Various |
| Analytics | 25+ PostHog events, AARRR | Various |
| Legal | Cookie consent, privacy, terms, medical disclaimer | 58a2d6b |
| API security | Zod validation on all 27 routes | e7daf56 |
| Dark theme | Forest-dark throughout (auth, onboarding, all tabs) | ced8f89 |
| Explore tab | Coaches / Plans / AI Coach | 8efe231 |
| Fuel tab | Pre-run/during/recovery/hydration guide | 3ffa892 |
| Seed pipeline | Admin seed page working (ADMIN_EMAILS=nextsplitplans@gmail.com) | 3ffa892 |
| Deploy pipeline | GitHub Actions → Vercel (webhook was broken, now fixed) | 5d3d9ac |

### Critical bug fixes applied
| Bug | Fix | Commit |
|---|---|---|
| VDOT paces had no effect | activate route now reads `recent_race_times` JSON | 12eaa3f |
| Predetermined plan showed same AI plan | Seed API fixed, admin page working | 8efe231 |
| Fuel tab showed training content | Added actual fuel guide content | 3ffa892 |
| Notification guardrails wrong order | Rate limit → at_risk → quiet_hours | bc750fb |

### ⚠️ Pending founder actions (blocking alpha quality)
1. **Seed 36 plans** — go to `/admin/seed` → tap "Seed Plans Now"
2. **Verify VDOT** — new signup → enter 5K time → activate plan → check paces personalised
3. **ICO registration** — ico.org.uk — £40
4. **Company formation** — Companies House — £12
5. **RESEND_API_KEY** — add to Vercel env vars

### 🟡 Remaining UI polish (low priority, continue in background)
- SessionCard done/pending states using `bg-emerald-50` — partially fixed
- Community page explicit dark styling on borders/text
- Settings page edge cases

---

## Phase Priority Order (from April 2026)

```
THREE PILLARS BUILD (priority 1)
  └── Phase SL1 — Split Leader Foundation
  └── Phase SL2 — Split Leader Depth
  └── Phase CM1 — Coaching Marketplace
  └── Phase CM2 — Coaching Revenue
  └── Phase CH1 — Coach Hub Tools
  └── Phase CH2 — Coach Hub Communication

ALPHA (parallel)
  └── Phase G — Closed alpha pool, data collection
  └── Phase H — Revenue activation (Day 30 retention ≥ 40%)

PREVIOUS OPEN TASKS (deprioritised, not cancelled)
  └── Phase I — Post-alpha refinement
  └── Phase J — Corporate tier, Race Together
```

---

## Phase SL1 — Split Leader Foundation
**Priority:** 1 | **Estimated:** 4-5 sessions | **Blocks:** SL2, all marketing

### Database changes required
```sql
-- Squad table
CREATE TABLE squads (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  leader_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name          text NOT NULL CHECK (length(name) <= 30),
  slug          text UNIQUE NOT NULL,
  logo_url      text,
  colour        text DEFAULT '#2b5c3f',
  welcome_msg   text CHECK (length(welcome_msg) <= 200),
  is_public     boolean DEFAULT false,
  goal_km       integer,
  goal_sessions integer,
  goal_month    text, -- YYYY-MM format
  disbanded_at  timestamptz,
  created_at    timestamptz DEFAULT now()
);

-- Squad members
CREATE TABLE squad_members (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id      uuid REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at     timestamptz DEFAULT now(),
  invited_by    uuid REFERENCES auth.users(id),
  converted_via_invite boolean DEFAULT false, -- for referral tracking
  UNIQUE (squad_id, user_id)
);

-- Squad invites
CREATE TABLE squad_invites (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id      uuid REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
  code          text UNIQUE NOT NULL,
  created_at    timestamptz DEFAULT now(),
  expires_at    timestamptz
);

-- Squad achievements
CREATE TABLE squad_achievements (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id      uuid REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
  type          text NOT NULL,
  earned_at     timestamptz DEFAULT now(),
  season_month  text -- YYYY-MM, null = lifetime
);

-- Season snapshots (monthly + annual)
CREATE TABLE squad_seasons (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id      uuid REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
  season_type   text NOT NULL CHECK (season_type IN ('month','year','lifetime')),
  period        text NOT NULL, -- '2026-04' or '2026' or 'all'
  total_km      numeric(10,2) DEFAULT 0,
  total_sessions integer DEFAULT 0,
  goal_hit      boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

-- Profiles additions
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_split_leader boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS split_leader_reward_months integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS split_leader_reward_weeks integer DEFAULT 0;
```

### Features to build

**SL1.1 — Squad creation flow**
- Triggered from: Premium unlock screen + profile "Lead a squad" button
- Steps: name → logo/colour → welcome message → invite link generated
- Validation: name unique per user, 30 char max, profanity filter
- `is_split_leader` set to true on profile on first squad creation

**SL1.2 — Invite link + landing page**
- URL: `nextsplit.app/squad/join/[code]`
- Shows: squad name, logo, leader name + avatar, welcome message
- Shows: member count, collective km this month
- CTA for free users: "Join [Squad Name]" → Premium offer (50% first month)
- CTA for Premium users: "Join [Squad Name]" → immediate join
- Mobile-first, optimised for sharing

**SL1.3 — Squad member join flow**
- Free user: Premium offer modal → if accepts, Premium + squad join
- Free user dismisses offer: can still join (free tier, limited squad features — see decisions)
- Premium user: instant join confirmation
- Confirmation screen: squad welcome message + collective stats
- Squad leader notified: "[Name] joined your squad"

**SL1.4 — Split Leader dashboard**
- New tab/section in athlete's profile or dedicated route `/squad`
- Member grid: avatar + name + today status + streak
- Weekly km per member + squad collective total
- Goal progress bar (if goal set)
- Nudge button (1 per member per day, curated message picker)
- Inactive member flag (45 days no log → prompt to remove)

**SL1.5 — Nudge system**
- Curated message list (8 options, see THREE-PILLARS-STRATEGY.md)
- Sends: push notification + in-app notification
- Rate limit: 1 per member per day
- Leader sees: "Nudge sent" confirmation, timestamp of last nudge

**SL1.6 — Squad feed (milestone reactions)**
- Milestones that trigger feed post: plan completion, race result, distance PB, streak milestone, squad goal reached
- Reactions: 🔥 👏 💪 🎉 ❤️
- Feed is private to squad only
- Separate from club feed

**SL1.7 — Referral reward wiring**
- Track `converted_via_invite` on squad_members
- On Premium subscription created: check if user joined via invite link
- If yes: increment leader's `split_leader_reward_months`
- Leader notified: "[Name] upgraded to Premium! You've earned 1 month free."
- Apply credit at next billing cycle via Stripe

### Acceptance criteria
- [ ] Squad creation completes in < 5 taps
- [ ] Invite link works on mobile Safari + Chrome
- [ ] Nudge delivers push notification within 60 seconds
- [ ] Feed post appears within 5 seconds of milestone trigger
- [ ] Referral reward credited within 1 billing cycle

---

## Phase SL2 — Split Leader Depth
**Priority:** 2 | **Estimated:** 3-4 sessions | **Requires:** SL1 complete

**SL2.1 — Squad goals (monthly)**
- Leader sets: distance target or session count target
- Progress: visible to all members on dashboard
- Completion: triggers squad achievement badge for all

**SL2.2 — Squad Trophy Room**
- Accessible from squad dashboard
- Collective achievements: monthly goals, squad milestones, special events
- Individual contributions displayed (who ran most km that month etc.)
- Trophy types: monthly goal, first collective marathon, 10-week active squad, etc.

**SL2.3 — Squad seasons**
- Monthly: resets 1st of month, archived
- Annual: calendar year, archived Dec 31
- Lifetime: never resets
- Stats: km, sessions, members who participated, goals hit
- All viewable in Trophy Room

**SL2.4 — Public squad page**
- Opt-in by leader
- URL: `nextsplit.app/squad/[slug]`
- Shows: name, logo, collective km, member count (not names), current challenge
- CTA: "Join this squad on NextSplit" → download/signup
- OG image generated for social sharing

**SL2.5 — Leader RPG avatar update**
- Crown accessory added to Split Leader's runner class avatar
- Crown visible: profile, community leaderboard, squad invites
- In community leaderboard: crown icon next to name, tooltip "Split Leader"
- Profile card: "Split Leader — leading [squad name]"

**SL2.6 — Inactivity logic**
- Leader 5 months inactive → warning notification + email
- Leader 6 months inactive → squad disbanded, all members notified
- Member 45 days inactive → leader dashboard flags + prompt to remove/invite new
- Leadership transfer: any Premium squad member can claim if leader inactive 30+ days

**SL2.7 — Squad-to-coach pipeline**
- Prompt at: first full squad (5 members) + every 30 days thereafter
- Message: "You've led your squad to [X] km. Some coaches started just like you."
- CTA: "Explore becoming a NextSplit coach" → coach onboarding funnel

---

## Phase CM1 — Coaching Marketplace
**Priority:** 3 | **Estimated:** 4-5 sessions | **Requires:** SL1 complete (parallel OK)

**CM1.1 — Coach profile redesign**
- Photo (mandatory for verification)
- Video intro (optional, 60 sec, uploaded to storage)
- Bio (500 char max)
- Credentials (upload + verification status)
- Specialty tags (distance, style, athlete type)
- Location context (timezone, language, cultural background)
- Coach PBs (optional, coach-controlled)
- Social links (Strava, Instagram, website)
- Pricing display (subscription + one-off)
- Group availability indicator

**CM1.2 — Verification flow**
- Credential upload (PDF/image)
- Auto-check against UKA/England Athletics database (API)
- Non-UK: self-declared + minimum 3 client reviews before Verified badge
- Two tiers: Listed (profile up) → Credential Verified (confirmed)
- Admin dashboard for manual verification review

**CM1.3 — Marketplace browse**
- Filters: specialty, distance, price range, availability, rating, language
- Sort: rating, price, clients coached, newest
- AI recommendation entry (contextual, not a gate)
- "Featured Coach" slot (editorial — admin-controlled)
- Coach profile card in list view: photo, name, rating, specialty, price from

**CM1.4 — Coach public profile page**
- `/coach/[slug]` (already partially exists — needs full redesign)
- All profile fields displayed
- Sample plan preview (1-3 weeks, coach uploads)
- Reviews section (anonymous by default, named if athlete opts in)
- Completion rate displayed
- "Request coaching" CTA (subscription) + "Buy plan" CTA (one-off)
- Group coaching availability card

**CM1.5 — Review system**
- Unlocked at 50% programme completion (by date, not session count)
- Review: star rating (1-5) + optional text + would-recommend (Y/N)
- Anonymous by default, named testimonial opt-in
- Coach aggregate rating calculated from all reviews
- Completion rate: % of athletes past end date (not early leavers)
- Admin: review moderation queue (flag for abuse)

**CM1.6 — Featured Coach editorial tool (admin)**
- Admin dashboard: select featured coaches for the week
- Featured badge: ⭐ gold on profile + top placement in search
- Featured coaches: higher weighting in AI recommendations
- Criteria tracked: traffic, rating, completion rate, new clients

---

## Phase CM2 — Coaching Revenue
**Priority:** 4 | **Estimated:** 3-4 sessions | **Requires:** CM1 complete

**CM2.1 — Stripe Connect integration**
- Coach onboarding: Stripe Connect account creation
- Commission deduction: automatic on payment processing
- Sliding scale enforcement:
  - 1-9 clients: 15%
  - 10-24 clients: 12%
  - 25-49 clients: 10%
  - 50+ clients: 8%
- Payout: monthly cycle, coach-controlled bank account

**CM2.2 — Subscription coaching purchase**
- Athlete pays → added to coach's athlete list
- Coach notified: "[Name] subscribed to coaching"
- Athlete gets: welcome message template from coach (customisable)
- Coach's squad view updated immediately
- Cancel anytime: removes from coach's list at period end

**CM2.3 — One-off plan purchase**
- Athlete pays → plan delivered to their account
- No ongoing coach relationship (not in their athlete list)
- Plan appears in athlete's "Plan Library" — they activate when ready
- Coach: sees sale in earnings dashboard, no ongoing obligation

**CM2.4 — Group coaching enrolment**
- Coach creates group plan (name, start date, max participants, price)
- Athletes enrol: each pays per-person price
- All enrolees share the plan (same sessions, personalised paces via VDOT)
- Coach manages as a cohort in squad view
- Good for: beginner programmes, race-specific group training

**CM2.5 — Coach earnings dashboard**
- Monthly earnings breakdown (per athlete, per plan sale)
- Commission shown clearly
- YTD total
- Downloadable PDF (monthly) — tax-ready format
- Stripe dashboard link for detailed transaction history

**CM2.6 — Dispute and refund flow**
- 7-day window: athlete raises dispute → automatic refund, coach notified
- After 7 days: no refund, review available
- Subscription: cancel anytime, no mid-month refund
- Repeated disputes same coach: flagged for NextSplit review
- Admin dashboard: dispute queue with resolution tools

---

## Phase CH1 — Coach Hub Tools
**Priority:** 5 | **Estimated:** 4-5 sessions | **Requires:** CM1+CM2

**CH1.1 — Advanced plan builder**
Session editor fields:
- Session type (easy, tempo, long, intervals, gym, race, rest, cross-train)
- Distance target
- Duration target
- Pace target (manual or VDOT-calculated per athlete)
- Sets × reps (e.g. "8 × 400m")
- Recovery (time or distance between reps)
- Heart rate zone (Z1-Z5)
- Effort/RPE (1-10)
- Training zone description
- Coach notes (shown on athlete's session card)
- Mandatory vs optional flag

**CH1.2 — Plan template library**
- Coach saves any plan as a reusable template
- Template: name, description, target athlete type, distance specialty
- Apply template to any new athlete (personalises paces via VDOT)
- Templates can be marked as: private (coach only) or marketplace (for sale)
- Clone + modify: copy any plan or template and edit for specific athlete

**CH1.3 — Import tools**
- TrainingPeaks XML import (parse to NextSplit session format)
- CSV import (defined column format, template provided)
- Garmin Connect (pending API availability)
- Import preview: show plan before confirming

**CH1.4 — Athlete capacity management**
- Coach sets max athlete count (configurable, starts at 10)
- Tier progression (requires NextSplit review to unlock higher tiers):
  - Starter: up to 10
  - Growing: up to 25
  - Established: up to 50
  - Elite: 50+ (NextSplit approval)
- Waitlist: athlete can join waitlist when coach full
- Coach notified when slot opens (they decide who from waitlist to accept)

**CH1.5 — Availability management**
- "Currently accepting: X new athletes" (coach sets number, auto-decrements)
- Profile shows: "Taking new clients" / "Currently full — join waitlist"
- Coach can pause intake: "On break until [date]"
- Prevents athletes engaging coaches who can't take them

---

## Phase CH2 — Coach Hub Communication
**Priority:** 6 | **Estimated:** 2-3 sessions | **Requires:** CH1

**CH2.1 — Scheduled messages**
- Coach writes message now, schedules for future send (date + time)
- Use cases: race day motivation, post-race check-in, plan milestone
- Max 10 scheduled messages per athlete at once
- Coach Pro feature

**CH2.2 — Message reaction tracking**
- Athletes react to coach messages (emoji, already partially built)
- Coach sees reaction in conversation thread
- Read receipt: coach sees "Read [time]" under sent messages

**CH2.3 — Email digest preferences**
- Coach sets: immediate / daily digest / weekly digest
- Digest includes: new messages, athlete completions, new reviews, earnings summary
- Default: daily digest at 8am coach timezone

**CH2.4 — Coach Pro subscription**
- Price: £19.99/month
- Includes: scheduled messages, advanced analytics, bulk plan management,
  priority support, coach referral programme access
- Billing via Stripe, separate from athlete-side Premium
- Coach referral: £100 bonus when referred coach hits 5 paying clients

---

## Phase G — Alpha (Parallel with Three Pillars)
**Gate:** All F1-F6 checklist items complete + 36 plans seeded

### G1 — Invite 10-20 alpha runners
Mix: 2 beginner, 12 intermediate, 6 advanced. At least 2 with coaching experience.
Brief: cold experience, real feedback, no hand-holding.

### G2 — Daily metrics (PostHog)
- Sessions logged per user per week (target ≥ 3)
- Day 7 retention (target ≥ 55%)
- Day 30 retention (target ≥ 40%) ← Phase H gate
- NPS Day 7 + Day 30 (target ≥ 40)
- Onboarding completion (target ≥ 80%)
- Adaptation trigger rate (> 0%)

### G3 — Fix protocol
- P0 (blocks session logging): fix same day
- P1 (confusing UX): fix within 48h
- Feature requests: log, do not build during alpha

---

## Phase H — Revenue Activation
**Gate:** Day 30 retention ≥ 40%

### H1 — Premium enforcement
- Set `NEXT_PUBLIC_PREMIUM_ENFORCED=true`
- Stripe E2E test all payment flows
- Paywall activation: AI coaching, adaptation engine, full analytics
- Free tier: predetermined plans, basic logging, community read-only

### H2 — Referral programme activation
- Set `NEXT_PUBLIC_REFERRAL_ENABLED=true`
- Referral codes live for all Premium users
- Split Leader referral rewards active

### H3 — Annual pricing live
- £59.99/yr option on all upgrade flows
- 37.5% saving vs monthly (£95.88/yr)
- "Best value" badge on annual tier

### H4 — Split Leader upgrade prompt
- Premium paywall modal leads with Split Leader social angle for users with friends on platform
- Copy: "Lead your crew. See who's training. Keep everyone accountable."

---

## Phase I — Post-Alpha Refinement
**Gate:** Phase H live + stable

- Race Together feature (external race data API integration)
- Coach marketplace public launch
- Strava sync improvements
- Performance optimisation (Lighthouse ≥ 90)
- Sentry error monitoring review
- App Store / Google Play submission (if PWA installs are low)

---

## Phase J — Corporate + Scale
**Gate:** 500+ active users, stable revenue

- Corporate squad accounts (up to 50 members)
- Company branding + logo
- HR dashboard (anonymised aggregate data)
- Per-seat pricing model (£5/seat at 20+, £3.50/seat at 100+)
- API for corporate HR system integration
- Race Together full build with external data source

---

## Revenue Projections

### ARPU Targets

| Stage | Users | Monthly Revenue |
|---|---|---|
| Alpha (now) | 20 | £0 (testing) |
| Phase H live | 100 | ~£600 |
| 6 months | 500 | ~£2,000 |
| Year 1 end | 1,500 | ~£7,500 |
| Year 2 | 5,000 | ~£28,000 |

### Split Leader Flywheel Contribution (Year 2 at 3,000 users)
- 600 Premium users → 120 active Split Leaders (20%)
- Average 2 conversions per leader lifetime
- 240 additional Premium conversions at £0 CAC
- Incremental MRR: ~£1,920
- These users churn at lower rates (squad accountability)

### Coach Revenue (Year 2 at 60 coaches)
- Average coach revenue: £500/month
- Average commission: 12% (mid-scale)
- Monthly commission income: £3,600
- Coach Pro subscribers (20 coaches × £19.99): £400/month
- Total coach MRR: ~£4,000

### Annual Pricing Impact
- 30% of Premium users on annual = significant cash flow improvement
- Example: 450 annual subscribers × £59.99 = £26,996 upfront
- Churn reduction: annual subscribers churn at ~25% rate of monthly

---

## Tech Decisions Locked

| Decision | Answer |
|---|---|
| Backend | Supabase (Postgres + Auth + Storage + Realtime) |
| Frontend | Next.js 15 App Router + TypeScript strict |
| Styling | Tailwind + CSS vars (Forest-dark theme) |
| Payments | Stripe (consumer) + Stripe Connect (coach payouts) |
| Email | Resend |
| Analytics | PostHog |
| Errors | Sentry |
| Deploy | Vercel (GitHub Actions pipeline) |
| AI | Anthropic Claude API (claude-sonnet-4-*) |
| Push | Web Push API (PWA) |
| Storage | Supabase Storage (avatars, logos, plan imports) |

---

## Environment Variables Reference

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Anthropic
ANTHROPIC_API_KEY

# Stripe (add before Phase H)
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_CONNECT_CLIENT_ID  ← for coach payouts

# Resend
RESEND_API_KEY  ← ⚠️ still needs adding to Vercel

# Feature flags
NEXT_PUBLIC_PREMIUM_ENFORCED=false  ← flip to true at Phase H
NEXT_PUBLIC_REFERRAL_ENABLED=false  ← flip to true at Phase H

# Admin
ADMIN_EMAILS=nextsplitplans@gmail.com  ← set ✅

# Deploy
VERCEL_TOKEN  ← in GitHub secrets ✅
CRON_SECRET
```

---

## Document Index

| # | Document | Purpose |
|---|---|---|
| 1 | MASTER-DELIVERY-PLAN-V2.md | This file — phases, priorities, status |
| 2 | THREE-PILLARS-STRATEGY.md | Full spec for all three pillars |
| 3 | HANDOFF-7.md | Session state, commits, pending actions |
| 4 | PRE-ALPHA-CHECKLIST.md | F1-F6 founder gate — run before first invite |
| 5 | supabase/migrations/alpha-readiness.sql | All SQL changes to date |
