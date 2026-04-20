# NextSplit v2 — Master Dev & Product Document
_Living document — updated every session. Last updated: session 26 (coach platform vision locked)_

---

## QUICK START (beginning of every dev session)

```bash
cd /home/claude/nextsplit-v2
git pull origin main && npm install
node_modules/.bin/next build        # must pass clean
node_modules/.bin/tsc --noEmit      # must show zero errors
```
Then read **IMMEDIATE NEXT ACTIONS** before touching anything.

---

## Repo & Infrastructure

- **GitHub:** https://github.com/NextSplit/Nextsplit-v2
- **Live app:** https://nextsplit-v2.vercel.app
- **Deploy hook** (100/day limit): `https://api.vercel.com/v1/integrations/deploy/prj_pEA372Qu7gpT6SbskQbeuveYZ9Ri/onqfsTdnji`
- **Re-seed plans:** Settings → Developer → Run
- **Supabase:** supabase.com → nextsplit project

### Recent git log
```
7e94c18  Coach platform: design doc, SQL schema, TypeScript types
e179253  docs: merge roadmap into master HANDOFF
1c2b7c4  Fix: supabase-as-any casts, TDEE localStorage, activity logging
39bf61e  Activity logging: cross-training dual-write, Fuel tab summary
bf61c83  PlanClient split, personalised pace zones, activity logging hook
9003168  Fix crashes: getDayType/getSessionType null-safe
```

---

## IMMEDIATE NEXT ACTIONS

### 🔴 Deploy crash fixes (do first, everything else blocked)
Null-safety fixes are in GitHub but not live — Vercel webhook hit rate limit.
Options: wait for limit reset, or set up GitHub Actions CI/CD (see Phase 0).

### 🟠 GitHub Actions CI/CD (1 session — do alongside deploy)
Replaces the brittle webhook permanently. Create `.github/workflows/deploy.yml`:
```yaml
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: node_modules/.bin/tsc --noEmit
      - run: node_modules/.bin/next build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### 🟡 Sentry error monitoring (2 hours)
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```
Add `SENTRY_DSN` to Vercel env vars. Real stack traces instead of screenshots.

### 🟡 Stripe (2-3 sessions — unlocks everything commercial)
See Phase 1 section below for full spec.

---

## SUPABASE SCHEMA

### Existing tables (all ✅)
| Table | Purpose |
|---|---|
| `profiles` | User settings, weight, age, is_pro, Stripe cols |
| `plan_templates` | 17 plan templates + coach author fields (to add) |
| `user_plans` | Active/archived plans with `weeks_data` JSONB |
| `training_logs` | Session logs. `session_i=99` = ad-hoc |
| `gym_logs` | Set/rep/weight logs |
| `wellness_logs` | Sleep, soreness, mood, weight |
| `races` | Race calendar A/B/C priority |
| `recipes` | Meal recipes |
| `meal_plan_entries` | Daily meal assignments |
| `strava_connections` | OAuth tokens |
| `ai_usage` | Rate limiting |
| `push_subscriptions` | Web push tokens |
| `activity_logs` | Cross-training → TDEE ✅ session 26 |

### Tables to add (Phase 2 — coach platform)
Run this SQL in Supabase when starting Phase 2:

```sql
-- Coach profiles
CREATE TABLE coach_profiles (
  user_id           uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name      text NOT NULL,
  slug              text UNIQUE NOT NULL,
  bio               text,
  credentials       text,
  specialities      text[],
  photo_url         text,
  location          text,
  website_url       text,
  instagram_handle  text,
  rate_monthly_gbp  numeric(8,2),
  rate_plan_gbp     numeric(8,2),
  verified          boolean DEFAULT false,
  accepting_athletes boolean DEFAULT true,
  max_athletes      integer DEFAULT 20,
  stripe_account_id text,
  created_at        timestamptz DEFAULT now() NOT NULL,
  updated_at        timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE coach_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages own profile" ON coach_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public reads verified profiles" ON coach_profiles FOR SELECT USING (verified = true);

-- Coach-athlete relationships
CREATE TABLE coach_athletes (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id        uuid REFERENCES coach_profiles(user_id) ON DELETE CASCADE NOT NULL,
  athlete_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status          text DEFAULT 'pending' CHECK (status IN ('pending','active','paused','ended')),
  invite_token    text UNIQUE,
  invited_at      timestamptz,
  accepted_at     timestamptz,
  share_logs      boolean DEFAULT true,
  share_wellness  boolean DEFAULT true,
  share_nutrition boolean DEFAULT false,
  share_body_weight boolean DEFAULT false,
  subscription_id text,
  coach_managed_plan_id text,         -- which of athlete's plans the coach manages
  coach_notes     text,
  athlete_goal    text,
  created_at      timestamptz DEFAULT now() NOT NULL,
  UNIQUE(coach_id, athlete_id)
);
ALTER TABLE coach_athletes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages athletes" ON coach_athletes FOR ALL USING (auth.uid() = coach_id);
CREATE POLICY "Athlete sees own relationships" ON coach_athletes FOR SELECT USING (auth.uid() = athlete_id);
CREATE POLICY "Athlete updates own relationship" ON coach_athletes FOR UPDATE USING (auth.uid() = athlete_id);
CREATE INDEX coach_athletes_coach ON coach_athletes(coach_id);
CREATE INDEX coach_athletes_athlete ON coach_athletes(athlete_id);

-- Session annotations (coach notes on specific sessions)
CREATE TABLE session_annotations (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id        uuid REFERENCES coach_profiles(user_id) ON DELETE CASCADE NOT NULL,
  athlete_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id         text NOT NULL,
  week_n          integer NOT NULL,
  day_i           integer NOT NULL,
  session_i       integer NOT NULL,
  note            text NOT NULL,
  reaction        text CHECK (reaction IN ('great','good','concern','flag')),
  acknowledged_at timestamptz,
  created_at      timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE session_annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages annotations" ON session_annotations FOR ALL USING (auth.uid() = coach_id);
CREATE POLICY "Athlete reads annotations" ON session_annotations FOR SELECT USING (auth.uid() = athlete_id);

-- Messaging
CREATE TABLE coach_messages (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id    uuid REFERENCES coach_profiles(user_id) ON DELETE CASCADE NOT NULL,
  athlete_id  uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sender_id   uuid REFERENCES auth.users(id) NOT NULL,
  body        text NOT NULL,
  read_at     timestamptz,
  created_at  timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach and athlete read messages"
  ON coach_messages FOR ALL USING (auth.uid() = coach_id OR auth.uid() = athlete_id);
CREATE INDEX messages_thread ON coach_messages(coach_id, athlete_id, created_at);

-- Plan purchases
CREATE TABLE plan_purchases (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id        uuid REFERENCES auth.users(id) NOT NULL,
  template_id       uuid REFERENCES plan_templates(id) NOT NULL,
  coach_id          uuid REFERENCES coach_profiles(user_id),
  amount_gbp        numeric(8,2) NOT NULL,
  stripe_payment_id text,
  coach_payout_gbp  numeric(8,2),
  platform_fee_gbp  numeric(8,2),
  purchased_at      timestamptz DEFAULT now() NOT NULL,
  UNIQUE(athlete_id, template_id)
);
ALTER TABLE plan_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Athlete sees own purchases" ON plan_purchases FOR SELECT USING (auth.uid() = athlete_id);
CREATE POLICY "Coach sees their purchases" ON plan_purchases FOR SELECT USING (auth.uid() = coach_id);

-- Add coach mode fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_coach boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS coach_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS coach_applied_at timestamptz;

-- Add coach fields to plan_templates
ALTER TABLE plan_templates
  ADD COLUMN IF NOT EXISTS author_type text DEFAULT 'nextsplit'
    CHECK (author_type IN ('nextsplit', 'coach')),
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES coach_profiles(user_id),
  ADD COLUMN IF NOT EXISTS price_gbp numeric(8,2),
  ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS preview_weeks integer DEFAULT 1;

-- RLS so coaches can see athlete data (add to existing tables)
CREATE POLICY "Coach reads athlete logs when active"
  ON training_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM coach_athletes
      WHERE coach_id = auth.uid() AND athlete_id = training_logs.user_id
        AND status = 'active' AND share_logs = true)
  );
CREATE POLICY "Coach reads athlete wellness when active"
  ON wellness_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM coach_athletes
      WHERE coach_id = auth.uid() AND athlete_id = wellness_logs.user_id
        AND status = 'active' AND share_wellness = true)
  );
CREATE POLICY "Coach reads athlete plans when active"
  ON user_plans FOR SELECT USING (
    EXISTS (SELECT 1 FROM coach_athletes
      WHERE coach_id = auth.uid() AND athlete_id = user_plans.user_id
        AND status = 'active')
  );
CREATE POLICY "Coach reads athlete activity logs when active"
  ON activity_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM coach_athletes
      WHERE coach_id = auth.uid() AND athlete_id = activity_logs.user_id
        AND status = 'active' AND share_logs = true)
  );
```

### Tables to add (Phase 3 — community)
```sql
CREATE TABLE clubs (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  code        text UNIQUE NOT NULL,
  admin_id    uuid REFERENCES auth.users(id) NOT NULL,
  coach_id    uuid REFERENCES coach_profiles(user_id),
  description text,
  visibility  text DEFAULT 'public' CHECK (visibility IN ('public','squad','private')),
  sport_focus text[] DEFAULT ARRAY['running'], -- ['running','cycling','swimming','triathlon']
  auto_created boolean DEFAULT false,          -- true for auto-created squad communities
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE club_members (
  club_id     uuid REFERENCES clubs(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text DEFAULT 'member' CHECK (role IN ('admin','member')),
  joined_at   timestamptz DEFAULT now(),
  PRIMARY KEY (club_id, user_id)
);
```

---

## CODEBASE STRUCTURE

### File sizes (all under 600 lines ✅)
| File | Lines |
|---|---|
| `src/app/today/TodayClient.tsx` | ~960 |
| `src/app/plan/PlanClient.tsx` | 335 |
| `src/app/dashboard/StatsClient.tsx` | 510 |
| `src/app/nutrition/NutritionClient.tsx` | ~400 |
| `src/app/profile/ProfileClient.tsx` | 555 |
| `src/app/gym/live/GymLiveClient.tsx` | 591 |

### Component directories
```
src/components/
  charts/      10 — WeeklyVolumeChart, ACWRChart, PaceTrend, WellnessTrend, etc.
  nutrition/   10 — RecipeFormModal, DayMealCard, AIFuelCoach, CalorieRing, etc.
  plan/         3 — DayDrawer, DayRow, WeekRow
  rpg/         13 — HeroCard, BadgeGrid, StravaSection, LevelUpScreen, etc.
  coach/        0 — Phase 2 target directory
  community/    0 — Phase 3 target directory
```

### Shared libs
| File | Key exports |
|---|---|
| `sessionUtils.ts` | `getSessionType` (null-safe), `parseDet`, `secsToHMS`, `fmtKm` |
| `statsUtils.ts` | `logsArray`, `weeklyKm`, `calcACWR`, `paceToSecs`, `daysUntil` |
| `nutrition.ts` | `getDayType` (null-safe + strength day), `calcCalories` |
| `paceZones.ts` | `derivePaceZones`, `getPersonalisedPace` — Riegel-based zones |
| `rpg.ts` | `computeRPGStats`, `getSessionXP`, 30+ badges |
| `wellness.ts` | `readinessScore` |
| `supabase/db.ts` | `db(supabase)` — zero `(supabase as any)` casts |

---

## CRITICAL CODING PATTERNS

```typescript
// NULL-SAFE session codes — always
s?.c?.startsWith('gym')             // ✅
s.c != null && s.c !== 'rest'       // ✅
s.c.startsWith('gym')               // 💥 WILL CRASH

// Supabase queries — always use db()
import { db } from '@/lib/supabase/db'
await db(supabase).from('training_logs').select('*')  // ✅
await (supabase as any).from(...)                     // 💥 BANNED
```

---

## API ROUTES
```
POST /api/ai/coach          — Coaching card
POST /api/ai/fuel           — Nutrition tip
POST /api/ai/suggestions    — Adaptive suggestions
POST /api/ai/pre-race-brief — Pre-race brief
POST /api/ai/recommend      — Plan recommendation
POST /api/plans/activate    — Activate plan
POST /api/plans/reset       — Reset to week 1
GET  /api/strava/sync       — Strava activities
POST /api/strava/disconnect — Remove Strava
POST /api/notifications/subscribe / send — Push
GET  /api/cron/notify       — Daily cron
POST /api/admin/seed-plans  — Re-seed templates
```

---

## QA & ENGINEERING STANDARDS
_Every session, every phase_

### Before every commit
```bash
node_modules/.bin/tsc --noEmit   # zero errors
node_modules/.bin/next build     # clean compile
```

### Manual test matrix (before major deploys)
- [ ] Fresh signup → onboarding (all 4 paths) → first session logged
- [ ] Gym session: Start → GymLive → sets → celebration → Done state
- [ ] Plan tab: gym session shows amber "Start →" not "Log"
- [ ] Fuel tab: cross-training logged → TDEE updates
- [ ] Character tab: XP correct, badges unlock
- [ ] Settings → Developer → seed button

### Monitoring setup
- **Phase 0:** Sentry (client errors), Vercel Analytics (performance)
- **Phase 1:** PostHog — track `plan_activated`, `session_logged`, `subscription_started`
- **Key funnels:** signup → plan → first log → week 2 → week 4 → Pro conversion

### Testing roadmap
- **Phase 0-1:** Manual test matrix
- **Phase 2:** Vitest unit tests (paceZones, rpg, nutrition, streak — pure functions)
- **Phase 3:** Playwright e2e (onboarding, logging, Stripe, coach invite flow)

### GDPR (build as you go)
- Privacy policy before public launch
- Data export (partially done in settings)
- Account deletion removes ALL user data
- Coach platform: athlete can revoke coach access at any time

---

## PRODUCT ROADMAP

### Vision
NextSplit is the training OS for serious amateur runners — combining AI coaching, gym integration, human coach marketplace, and community. The moat: no competitor does all three seriously. The coach platform is the biggest differentiator: coaches manage athletes, sell plans, and get AI assistance — athletes get expert guidance, community, and gamified progress — all in one place.

**North Star:** Monthly Active Users logging 3+ sessions/week (habit-formed).

---

### PHASE 0 — Stabilise ⬅ CURRENT PHASE
_1–2 weeks_

| Task | Status |
|---|---|
| Deploy crash fixes | ✅ |
| GitHub Actions CI/CD | ✅ |
| Sentry error monitoring | ✅ |
| Vercel Analytics | ✅ |
| Manual test all 4 onboarding flows | ⏳ in progress |
| Proper error boundary with recovery | ✅ |
| Verify push notifications on Android | 🔲 |

---

### PHASE 1 — Monetise
_Weeks 2–5_

| Task | Status |
|---|---|
| Stripe checkout + webhook | 🔲 |
| ProGate properly enforced | 🔲 |
| 7-day free trial | 🔲 |
| Upgrade card in Profile tab | 🔲 |
| Subscription management | 🔲 |
| PostHog analytics | 🔲 |
| Race event API (search real races) | 🔲 |

**Free vs Pro:**
- Free: 3 AI/day, 1 plan, all core logging, basic analytics
- Pro (~£7.99/mo or £59/yr): unlimited AI, ACWR/pace trends, personalised zones, multiple plans

---

### PHASE 2 — AI Coaching Depth + Coach Platform Soft Launch
_Months 2–3_

#### AI coaching deepening
| Task | Status |
|---|---|
| Pace zones wired into coaching prompt | 🔲 |
| ACWR flagging in coaching (>1.3 = injury risk) | 🔲 |
| Wellness trend analysis in coaching | 🔲 |
| Post-session AI analysis on quality sessions | 🔲 |
| Adaptive plan when sessions missed | 🔲 |
| Monday morning weekly AI summary notification | 🔲 |
| Vitest unit tests for lib functions | 🔲 |

#### Coach platform soft launch (2–3 coaches, manual process)
**Target coaches:** Online running coaches already working remotely with athletes.
**Goal:** Replace spreadsheets. Grow naturally into their primary tool.
**Revenue model:** Hybrid — flat monthly fee from coach + commission on plan sales.
**Coach access:** Free up to 5 athletes, then paid (freemium → qualified coaches don't mind paying).

| Task | Status |
|---|---|
| Run coach platform SQL in Supabase | 🔲 |
| Coach profile create/edit | 🔲 |
| Athlete invite flow (coach sends link, athlete accepts) | 🔲 |
| Athlete connection flow (both directions: coach invite + athlete discovery) | 🔲 |
| Athlete privacy controls at connection (athlete chooses what to share) | 🔲 |
| Read-only squad view (reuse existing hooks + new RLS policies) | 🔲 |
| Session annotation (coach leaves note, athlete notified) | 🔲 |
| Athlete sees coach card in Today tab (new note / message indicator) | 🔲 |
| `plan_templates` coach fields (author_id, price_gbp, is_public) | 🔲 |
| NextSplit Official plan branding | 🔲 |
| 2–3 handpicked coach plans seeded manually | 🔲 |

**Athlete privacy defaults (confirmed):**
- Share training logs: ✅ on by default
- Share wellness/readiness: ✅ on by default
- Share nutrition diary: ❌ off — athlete opts in separately
- Share body weight: ❌ off — athlete opts in separately
- Athlete can revoke any permission at any time

**Plan control when under a coach:**
- Coach manages the athlete's primary training plan directly (can modify sessions, load, paces)
- Athlete can also run additional plans alongside (e.g. coach manages marathon build, athlete also follows a gym-only plan)
- Coach sees ALL active plans the athlete has — primary and secondary
- Coach modifications to the primary plan are applied immediately with a notification to the athlete
- Athlete can still log ad-hoc sessions freely — coach sees those too
- **DB implication:** Need a `coach_managed_plan_id` field on `coach_athletes` to track which plan is the coach-managed primary

---

### PHASE 3 — Full Coach Platform + Community
_Months 3–5 — launch community when 300+ active users_

#### Full coach platform
| Task | Status |
|---|---|
| **AI-augmented coaching tools** | |
| AI athlete summary for coach (weekly digest per athlete) | 🔲 |
| AI flags at-risk athletes (injury/dropout) before coach notices | 🔲 |
| AI generates first-draft plan → coach edits and personalises | 🔲 |
| AI helps coach write session rationale faster | 🔲 |
| **Squad dashboard** | |
| Full squad view with 🟢🟡🔴 status indicators | 🔲 |
| Athlete deep-dive: This Week / Plan / Analytics / Wellness tabs | 🔲 |
| ACWR, pace trend, session adherence all visible to coach | 🔲 |
| **Coach tools** | |
| Coach modifies athlete's plan directly (with athlete notification) | 🔲 |
| In-app messaging (coach ↔ athlete) | 🔲 |
| Coach-led clubs (private squad + optional public club) | 🔲 |
| Coach public profile + marketplace page | 🔲 |
| Plan builder UI (coach builds plans in-app, paces as zone references) | 🔲 |
| **Revenue** | |
| Stripe Connect for coach payouts | 🔲 |
| Coach earnings dashboard | 🔲 |
| Plan purchase flow (athlete buys coach plan) | 🔲 |
| 70/30 split (coach/NextSplit) on plan sales | 🔲 |
| Freemium coach tier: free to 5 athletes, paid beyond | 🔲 |
| **Scope** | |
| Any endurance sport — coach sees run/gym/swim/cycle/hike all in one view | 🔲 |
| Triathlon coach support — multi-discipline session types and planning | 🔲 |
| Coach RLS extended to `activity_logs` table | 🔲 |

#### Community & gamification
| Task | Status |
|---|---|
| Season system (monthly leaderboard resets) | 🔲 |
| Time-limited challenges | 🔲 |
| XP leagues (Bronze/Silver/Gold/Platinum) | 🔲 |
| Kit unlocks via achievements | 🔲 |
| Title system ("The Consistent One", "Speed Demon") | 🔲 |
| Running clubs (create/join via code) | 🔲 |
| Club leaderboard + feed (opt-in) | 🔲 |
| Coach-led clubs (their athletes form a squad community) | 🔲 |
| Virtual races | 🔲 |
| Playwright e2e tests | 🔲 |

**Community ↔ Coach integration (confirmed: all of the above):**
Coaches operate across THREE layers simultaneously:
1. **Private athlete squad** — paying clients, full data access, annotations, plan management, messaging. Closed.
2. **Public club** — open to anyone. Leaderboard, challenges, community feed. Coach is the admin. This is their audience-building and client acquisition channel.
3. **Squad community** — the private athletes also form a mini-community with each other. They see each other's progress on a squad leaderboard, can give kudos on sessions, and feel part of something. This is what makes coaching on NextSplit sticky — the athlete isn't just connected to the coach, they're connected to a group.

These three layers use the same club infrastructure but with different visibility settings:
- Public club: anyone can join (coach grows audience)
- Squad community: auto-created when coach has 2+ active athletes (private, athletes only)
- An athlete can be in both — they're in the private squad AND the public club if they choose

**DB implication:** Add `visibility` field to clubs table: `public | squad | private`. Squad clubs are auto-created per coach, linked via `coach_athletes`.

---

### PHASE 4 — Wearables & Native App
_Months 5–9_

| Task | Status |
|---|---|
| Garmin Connect — import workouts + push sessions to device | 🔲 |
| Apple Health — read Apple Watch workouts | 🔲 |
| Capacitor wrapper → App Store + Play Store | 🔲 |
| Background GPS (remove Strava dependency) | 🔲 |
| Apple Watch / Wear OS companion | 🔲 |
| Offline mode | 🔲 |
| Training DNA ("you train best Tuesday mornings") | 🔲 |
| Injury risk model (ACWR + soreness → prediction) | 🔲 |
| AI race strategy (pace by km, course + target time) | 🔲 |
| Running club admin accounts (B2B) | 🔲 |

---

### PHASE 5 — Scale & Exit-Ready
_Month 9+_

| Task | Status |
|---|---|
| Full Vitest + Playwright test suite | 🔲 |
| Load testing (10k concurrent users) | 🔲 |
| Staging Supabase environment | 🔲 |
| GDPR compliance audit + legal review | 🔲 |
| Revenue metrics dashboard | 🔲 |
| Referral programme | 🔲 |
| SEO content + App Store presence | 🔲 |
| Pitch deck / acquisition readiness | 🔲 |

**Exit metrics targets:**
- 1,000+ habit-formed MAU
- 20%+ Pro conversion rate
- <5% monthly churn
- NPS >50
- Documented, clean codebase ✅ (already achieved)

---

## COACH PLATFORM — DETAILED VISION

### What makes this genuinely different

**The gap in the market:** Every existing solution forces a choice. TrainingPeaks is powerful but built for the coach — athletes hate using it. Strava is built for the athlete — coaches are bolted on. Nobody has built the thing where a coach creates a plan inside the same app their athlete uses to execute it, sees the same rich data, and can respond in context.

**The data advantage:** A coach on NextSplit sees what no other platform provides:
- Session completion rate + which sessions get skipped
- RPE logged against each session (not just pace)
- Wellness scores correlated with training load
- Gym completion + weight progression over time
- ACWR trend — is the athlete building load safely?
- Personalised pace zones from actual logged runs
- AI-flagged risks before the coach notices

### The AI + Human Coach combination

AI does what AI is good at (pattern recognition, data synthesis, early warning). Human coach does what humans are good at (relationship, motivation, nuanced judgement). The system:

1. **AI flags** → "James missed his threshold run and soreness is 4/5, ACWR trending up"
2. **Coach decides** → reads the flag, messages James, adjusts next week
3. **AI drafts** → generates first-draft of adjusted plan, coach reviews + personalises
4. **AI writes** → session rationale in coach's voice (coach edits tone), saves coach time
5. **Coach builds relationship** → athlete feels heard and coached, not just tracked

This is the combination that justifies £80/month coaching fees AND the NextSplit platform fee.

### Revenue flywheel

```
Coach joins (brings 15 athletes)
  ↓
Athletes join because coach uses NextSplit
  ↓
Athletes convert to Pro (£7.99/mo each)
  ↓
Athletes tell friends
  ↓
More athletes → attractive for more coaches
  ↓
More coaches → more plan marketplace content
  ↓
More content → more organic discovery
```

**Revenue per coach with 15 athletes:**
- Athlete Pro subscriptions: 15 × £7.99 = £119.85/mo to NextSplit
- Coach platform fee: £29/mo (freemium model)
- Plan sales commission: variable
- **Total from one coach relationship: ~£150/mo ongoing**

### Connection flow (confirmed: both directions)

**Coach-initiated:** Coach sends invite link via WhatsApp/email. Athlete clicks, sees coach profile, accepts and sets privacy preferences.

**Athlete-initiated:** Athlete browses marketplace, finds coach, requests coaching. Coach reviews and accepts.

Both lead to the same `coach_athletes` relationship with athlete-controlled privacy settings.

### Scope (confirmed)
Running + strength (gym sessions) as primary focus. Coach sees all activity the athlete logs including cross-training. Not positioning as triathlon/cycling tool yet — keep running identity strong.

---


## COACH PLATFORM — LOCKED DECISIONS

All design decisions are confirmed. This section is the source of truth for building the coach platform.

### Account Model

**Everyone starts as an athlete.** There is one signup flow. No choice of "athlete or coach" at registration — this keeps onboarding simple and ensures every coach understands the athlete experience from the inside.

**To become a coach — two paths:**

**Path A — Athlete who wants to coach:**
1. Uses the app as an athlete (any amount of time — no minimum sessions required)
2. Goes to Settings → "Become a coach"
3. Fills in coach profile: name, bio, credentials, specialities, photo, location
4. Submits for NextSplit review
5. Approved → Squad tab appears, coach profile goes live

**Path B — Professional coach joining from outside:**
1. Signs up as an athlete (same signup flow)
2. Can apply to become a coach **immediately after signup** — no waiting period, no sessions required
3. Goes to Settings → "Become a coach" → fills in profile
4. Application reviewed — professional credentials fast-track verification
5. Approved → Squad tab appears

In both cases the athlete profile remains intact. A coach is still a runner — they can train themselves and coach others from the same app. Their XP, badges, plan, and character all stay exactly as they are.

**Two coach tiers on approval:**
- **Unverified coach** — profile live, can manage up to 5 athletes free, can sell plans, marked with no badge. Anyone can reach this tier immediately.
- **Verified coach** ✅ — NextSplit has reviewed credentials (qualification or demonstrable experience). Gets a green verification badge, higher marketplace prominence, increased athlete limits, and trust signal to athletes browsing the marketplace.

**Verification review checks:**
- Recognised coaching qualification (UESCA, UK Athletics Level 2+, etc.), OR
- Demonstrable coaching experience (years coaching, competitive background, professional social presence)
- Professional coaches applying on day 1 get priority review — target 48hr turnaround

**DB implication:** Add to profiles table:
```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_coach boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS coach_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS coach_applied_at timestamptz;
```


## THREE-TIER USER MODEL — FULLY LOCKED

This is the complete tier structure for NextSplit. Every product decision should reference this.

---

### TIER 1 — Athlete
**Who:** Everyone. Default account type.
**Cost:** Free (3 AI calls/day) or Pro (£7.99/mo, unlimited AI + advanced features)
**What they can do:**
- Follow training plans (NextSplit Official, coach plans, marketplace)
- Log sessions, gym, wellness, cross-training
- Be coached by a Split Leader or Professional Coach
- Join clubs, compete in challenges, earn XP/badges
- View personalised pace zones, ACWR, all analytics
**Cannot do:** Coach others, create plans for others, appear in marketplace

---

### TIER 2 — Split Leader
**Who:** Runners who want to informally coach friends, share their plans, or grow a small following. Strava influencers, running club pacers, experienced runners with a social following.
**Access:** Unlocked automatically with Pro subscription — no extra cost.
**No accreditation required.** Apply via Settings → "Become a Split Leader" — approved instantly (no review, just toggle on).

**What they get:**
- Squad view — see all their runners at a glance (simplified version)
- Session annotations — leave notes on any runner's completed sessions
- Basic messaging — text only (no voice)
- Shared squad leaderboard — their runners compete together
- Pre-built plan sharing — share their own plan with their squad (runners follow it for free)
- Cap: **5 runners maximum**

**What they cannot do (Pro Coach only):**
- Full squad dashboard + deep analytics
- AI automation rules
- Voice messages
- Plan builder (create custom structured plans)
- Sell plans on the public marketplace
- Verified badge
- Unlimited athletes

**Cost to their runners:** Free. Zero friction. "Join my squad" — no payment required, no Pro needed. Runners just need a NextSplit account (free tier is fine).

**Plan sharing:** Informal only — no selling. Split Leaders share the plan they're following themselves with their squad. Runners get access, no money changes hands. This is intentional — Split Leader is a community and acquisition feature, not a revenue feature. Its job is to bring runners onto NextSplit and into Pro, then feed the upgrade funnel into Professional Coach.

**Why this works:** A Split Leader saying "come do my plan with me, it's free" is one of the most natural user acquisition mechanisms possible. It costs nothing to say yes. Every runner who joins needs a NextSplit account — even a free account is a user acquired. Many will convert to Pro to unlock analytics, AI coaching, and pace zones.

**The upgrade trigger:** Split Leader hits 5 runners and wants more → must upgrade to Professional Coach. Or wants to sell plans, use the plan builder, send voice messages → upgrade. The cap and feature limits are the natural sales funnel.

---

### TIER 3 — Professional Coach
**Who:** Accredited coaches, serious running coaches, PTs who coach runners, coaches building a business on NextSplit.
**Access:** Apply via Settings → "Become a Professional Coach" — requires NextSplit review (48hr target turnaround for professionals with credentials).
**Cost:** £29/month platform fee (freemium: free up to 5 athletes for new coaches to experiment, paid beyond)

**Verification:** Two sub-tiers:
- **Unverified Pro Coach** — applied and approved, profile live, can manage athletes, no badge yet
- **Verified Pro Coach** ✅ — credentials reviewed by NextSplit, green verification badge, priority marketplace placement

**Credentials accepted:**
- Recognised coaching qualification (UESCA, UK Athletics Level 2+, RPTG, similar)
- OR demonstrable professional experience (years coaching, competitive background, professional social presence)

**What they get (everything):**
- Full squad dashboard + athlete deep-dive analytics
- All Split Leader features
- **Unlimited athletes**
- **Full squad dashboard** — 🟢🟡🔴 status per athlete, ACWR, wellness, session completion
- **AI automation rules** — set triggers, coach writes templates, AI acts autonomously within them
- **Voice messages** — 60-second voice notes, stored in Supabase Storage
- **Plan builder** — create custom structured plans in-app, paces as zone references
- **Public marketplace listing** — sell plans to any NextSplit user globally
- **Featured Plans** — eligible for weekly NextSplit editorial and algorithmic featuring
- **Bespoke athlete plans** — create custom plans per athlete (not from a template)
- **Verified badge** — if credentials approved
- **Coach-led public club** — grows their audience, client acquisition channel
- **Private squad community** — their athletes form a mini-community with each other

**Cost to their runners:**
- Runners pay the coach directly via NextSplit (coach sets price, e.g. £80/mo)
- NextSplit takes **20%** of ongoing coaching subscriptions via Stripe Connect
- Plan purchases: **70% coach / 30% NextSplit**
- NextSplit recommended pricing bands shown to coach:
  - Beginner athletes: £40–£80/month
  - Intermediate: £60–£120/month
  - Performance: £100–£200/month
  - Coach sets their own price within or outside these bands

---

### Feature Comparison Matrix

| Feature | Athlete | Split Leader | Pro Coach |
|---|---|---|---|
| Follow plans | ✅ | ✅ | ✅ |
| Log sessions + gym | ✅ | ✅ | ✅ |
| AI coaching card | ✅ (limited) | ✅ (Pro) | ✅ (unlimited) |
| Advanced analytics (ACWR etc.) | Pro only | ✅ | ✅ |
| Be coached | ✅ | ✅ | ✅ |
| Squad view (simplified) | ❌ | ✅ 5 max | ✅ unlimited |
| Session annotations | ❌ | ✅ | ✅ |
| Basic messaging (text) | ❌ | ✅ | ✅ |
| Squad leaderboard | ❌ | ✅ | ✅ |
| Share plans (squad only) | ❌ | ✅ free only | ✅ |
| Full squad dashboard + analytics | ❌ | ❌ | ✅ |
| AI automation rules | ❌ | ❌ | ✅ |
| Voice messages | ❌ | ❌ | ✅ |
| Plan builder | ❌ | ❌ | ✅ |
| Sell plans (marketplace) | ❌ | ❌ | ✅ |
| Bespoke athlete plans | ❌ | ❌ | ✅ |
| Verified badge | ❌ | ❌ | ✅ (if approved) |
| Public marketplace profile | ❌ | ❌ | ✅ |
| Coach-led public club | ❌ | Limited | ✅ |
| Unlimited athletes | ❌ | ❌ (5 max) | ✅ |
| **Cost** | Free/£7.99mo | Included in Pro | £29/mo |

---

### Revenue Model Summary

| Source | Who pays | Amount | NextSplit cut |
|---|---|---|---|
| Athlete Pro subscription | Athlete | £7.99/mo or £59/yr | 100% |
| Pro Coach platform fee | Coach | £29/mo | 100% |
| Ongoing coaching subscription | Athlete → Coach | Coach-set price | 20% |
| Plan purchase (marketplace) | Athlete | Coach-set price | 30% |

**Example: One Professional Coach with 15 athletes at £80/mo:**
- Athlete Pro subs: 15 × £7.99 = £119.85/mo to NextSplit
- Coach platform fee: £29/mo to NextSplit
- Coaching revenue: 15 × £80 × 20% = £240/mo to NextSplit
- **Total from one coach relationship: ~£389/mo recurring**

**The Split Leader funnel:**
- Split Leader with 5 runners → hits cap → upgrades to Pro Coach
- NextSplit gains: £29/mo coach fee + potential 5 new Pro athlete subscriptions
- Net new MRR from one Split Leader upgrade: ~£69–£169/mo

---

### DB Changes Needed for Three-Tier Model

```sql
-- profiles table additions
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_coach boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS coach_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS coach_applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS coach_tier text DEFAULT null
    CHECK (coach_tier IN (null, 'split_leader', 'professional'));

-- Split Leaders don't get a coach_profiles row — they use a lighter structure
CREATE TABLE IF NOT EXISTS split_leader_profiles (
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name  text NOT NULL,
  bio           text,
  photo_url     text,
  max_athletes  integer DEFAULT 5,
  created_at    timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE split_leader_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Split leader manages own profile"
  ON split_leader_profiles FOR ALL USING (auth.uid() = user_id);

-- Split leader athlete relationships (simplified version of coach_athletes)
CREATE TABLE IF NOT EXISTS split_leader_athletes (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  leader_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  athlete_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status          text DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  created_at      timestamptz DEFAULT now() NOT NULL,
  UNIQUE(leader_id, athlete_id)
);
ALTER TABLE split_leader_athletes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leader manages own athletes"
  ON split_leader_athletes FOR ALL USING (auth.uid() = leader_id);
CREATE POLICY "Athlete sees own leader relationships"
  ON split_leader_athletes FOR SELECT USING (auth.uid() = athlete_id);
```

---

### Application Flows

**Becoming a Split Leader:**
1. Settings → "Become a Split Leader"
2. Simple form: display name, short bio, optional photo
3. **Auto-approved instantly** — no review needed
4. Squad tab appears in bottom nav (simplified version)
5. Can immediately invite up to 5 runners

**Becoming a Professional Coach:**
1. Settings → "Become a Professional Coach"
2. Full profile form: name, bio, credentials, specialities, photo, location, social links
3. **Submitted for NextSplit review**
4. If professional (credentials visible): **48-hour target review**
5. If experienced amateur: standard review (2–5 days)
6. Approved → full Squad tab unlocks, marketplace profile goes live
7. Verification badge: separate review of submitted credentials

**Split Leader → Professional Coach upgrade:**
1. Settings → "Upgrade to Professional Coach"
2. Fill in additional credential fields (already have basic profile from Split Leader)
3. Same review process
4. All existing runners migrate automatically to the coach_athletes relationship
5. No interruption to their squad


---

### Coach Dashboard Location
Lives **inside the main app** as an extra tab in the bottom nav:
- Standard user: Today / Plan / Fuel / Coach / Character
- Coach user: Today / Plan / Fuel / **Squad** / Coach / Character
- The Squad tab is the coach dashboard — squad view, athlete drill-downs, messaging, earnings
- Mobile-first, same PWA, no separate app needed
- Coach can switch between their own training (Today tab) and their squad management (Squad tab) seamlessly

### Multi-Sport Scope

**Individual athlete:** Any sport they log — running, cycling, swimming, hiking, yoga. The `activity_logs` table handles cross-training. Running stays the primary plan structure but athletes can log anything.

**Coach platform:** Full multi-sport visibility. A triathlon coach sees all three disciplines. The coach squad view shows a sport breakdown per athlete (runs this week: 3, swims: 2, cycles: 1).

**Phase implication:** 
- Phase 2 soft launch: running + gym (what's built)
- Phase 3 full platform: extend coach views to show all `activity_logs` types
- Future: structured triathlon plan templates (swim/bike/run blocks in `weeks_data`)

### Coach Pricing (Freemium)
- **Free tier:** up to 5 active athletes, full platform access, plan selling enabled
- **Pro coach (£29/mo):** unlimited athletes, advanced analytics, priority in marketplace, custom branding on plan pages
- **No percentage cut on coaching subscriptions** — coach sets their own price, collects directly via Stripe Connect
- **Plan sales:** 70% coach / 30% NextSplit (on one-off plan purchases only)
- **Recommended pricing bands** shown in coach settings to guide new coaches:
  - Beginner athletes: £40–£80/month suggested
  - Intermediate: £60–£120/month suggested
  - Performance/elite: £100–£200/month suggested
  - Coach sets their actual price freely within or outside these bands

### Coach Verification (Two-tier)
| Tier | Badge | How | Benefits |
|---|---|---|---|
| Unverified | None | Self-register | Basic profile, manage 5 athletes free |
| Verified ✅ | Green tick | NextSplit review | Marketplace prominence, higher limits, trust signal |

Verification review checks:
- Coaching qualification (UESCA, UK Athletics, etc.) OR
- Demonstrable experience (competitive running background, years coaching)
- Professional social presence (Strava, Instagram, website)
- Manual review by NextSplit team — not automated

### Messaging Format: Text + Voice
- **Text messages** — default, async, threaded by athlete
- **Voice messages** — coach records a short voice note (up to 2 minutes), athlete plays it in the app
  - This is the differentiator. A 60-second voice message from your coach after a hard session is worth more than a text. It feels personal.
  - Stored as audio file in Supabase Storage
  - Transcription optional (accessibility + searchability)
- No video — keeps it simple and storage manageable
- Both directions: coach sends to athlete AND athlete can send voice/text to coach

**DB implication:** Add `message_type text DEFAULT 'text' CHECK (type IN ('text', 'voice'))` and `audio_url text` to `coach_messages` table.

### Coach Ratings & Reviews
- **Triggered:** after an athlete completes a full plan purchased from a coach, or after 3 months of active coaching
- **Format:** Star rating (1–5) + written review (optional, 500 chars max)
- **Visibility:** Public on coach's marketplace profile
- **Minimum threshold:** Reviews only shown publicly once coach has 5+ reviews (prevents unfair early damage from one bad review)
- **Coach response:** Coach can reply to reviews publicly (one reply per review)
- **Moderation:** NextSplit can hide reviews that violate community standards

**DB schema:**
```sql
CREATE TABLE coach_reviews (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id      uuid REFERENCES coach_profiles(user_id) NOT NULL,
  athlete_id    uuid REFERENCES auth.users(id) NOT NULL,
  plan_id       uuid REFERENCES plan_templates(id),
  rating        integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text   text,
  coach_reply   text,
  is_visible    boolean DEFAULT false,  -- set true once coach hits 5+ reviews
  created_at    timestamptz DEFAULT now() NOT NULL,
  UNIQUE(coach_id, athlete_id)
);
```

### Refund Policy
- **Plan purchases (one-off):** 14-day refund window if athlete hasn't activated the plan. No refund after activation. Handled by NextSplit via Stripe.
- **Ongoing coaching subscriptions:** No refunds — industry standard. Athlete can cancel anytime, access continues to end of billing period.
- **Disputes:** Between coach and athlete in the first instance. NextSplit mediates if unresolved after 7 days. NextSplit can issue refund and remove coach if found at fault.
- **Terms of service:** Clear refund policy shown at checkout — legally required.

### AI Autonomy in Coach Communications
Coach sets rules → AI acts within them autonomously. This is the most powerful model.

**How it works:**
1. Coach configures "automation rules" in their Squad settings:
   - "If athlete misses 2+ sessions in a week → send check-in message"
   - "If athlete logs a PB → send congratulations"
   - "If ACWR > 1.3 → warn athlete to ease off"
   - "If athlete hasn't logged for 3 days → send nudge"
2. Coach writes their own message templates for each trigger (in their voice)
3. AI fills in the specifics (which session, what the PB was, what the ACWR reading is)
4. Message is sent automatically, appears as from the coach
5. Coach sees a log of all auto-sent messages in the messaging tab
6. Coach can override: review and approve before sending (optional mode)

**Why this is the right model:** A coach with 20 athletes cannot personally monitor every session. The AI gives them scale without losing the personal feel. The athlete gets a message that feels from their coach (because the template is the coach's words, the AI just fills the data in). The coach stays informed without being overwhelmed.

**DB schema needed:**
```sql
CREATE TABLE coach_automation_rules (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id    uuid REFERENCES coach_profiles(user_id) ON DELETE CASCADE,
  trigger     text NOT NULL CHECK (trigger IN (
    'session_missed', 'pb_achieved', 'acwr_high', 'acwr_low',
    'streak_achieved', 'plan_completed', 'inactive_3days', 'wellness_low'
  )),
  template    text NOT NULL,     -- coach's message template with {athlete_name}, {session_name} etc.
  is_active   boolean DEFAULT true,
  require_approval boolean DEFAULT false,  -- if true, coach reviews before send
  created_at  timestamptz DEFAULT now()
);
```

### Cold Outreach Rules
- **Athletes → coaches:** Athletes can message any coach from their marketplace profile page ("Send enquiry"). This is how an athlete starts a coaching relationship.
- **Coaches → athletes:** Coaches CANNOT cold-message athletes they don't coach. No spam, no recruitment pressure.
- **Exception:** Coaches can post to their public club feed — athletes who follow the club see it.
- This protects athletes and keeps the platform trust-based. Coaches grow through their marketplace profile and club, not through direct outreach.

### The Squad Tab (Coach Dashboard) — Expanded Design

Bottom nav for coaches:
```
Today | Plan | Fuel | Squad | Coach | Character
```

Squad tab sections:
1. **Squad overview** (default) — athlete status cards (🟢🟡🔴)
2. **Athlete detail** — tap any athlete → full drill-down
3. **Messages** — all conversations, unread badges
4. **Plans** — coach's published plans + earnings
5. **Automation** — rule configuration
6. **Earnings** — Stripe Connect dashboard embed

The Squad tab is coach-only. Athletes with no coach role never see it. The Coach tab (existing) remains the AI coaching card for athletes — separate concern.


---


## FEATURED PLANS — THE CONNECTION LOOP

This is the mechanism that makes the marketplace feel alive and creates a flywheel between runners and coaches.

### What it is
Every week, 3–5 plans are featured prominently across NextSplit:
- **Today tab** — featured plan card shown to athletes without an active plan, or between plans
- **Marketplace homepage** — hero placement above all other plans
- **Push notification** — Monday morning: "This week's featured plan: Sub-4 Marathon by Sarah Jones"
- **Coach profile boost** — featured coach's profile gets higher search ranking that week

### How plans are selected (hybrid algorithm + editorial)

**Algorithmic signals:**
- Starts this week — momentum indicator ("47 runners started this")
- Completion rate — quality indicator (only plans with >70% avg completion eligible)
- Review score — trust indicator (minimum 4.0 stars, minimum 5 reviews)
- Recency boost — new plans from verified coaches get a debut feature window

**Editorial picks (NextSplit curated):**
- NextSplit Official plans always eligible
- Seasonal relevance (spring marathon season → marathon plans featured)
- Distance diversity — always at least one 5K and one beginner plan featured
- New verified coach spotlight — first plan from a newly verified coach gets featured

**Coach can never pay for featuring** — it's purely merit-based. This maintains trust with runners and fairness between coaches.

### The connection loop

```
Runner sees featured plan
        ↓
Social proof: "47 runners started this week"
        ↓
Runner buys plan (coach earns 70%)
        ↓
Runner discovers coach's public club → joins
        ↓
Coach has warm lead for ongoing coaching subscription
        ↓
Runner gets great results → leaves review
        ↓
Review improves plan's featuring score
        ↓
Plan gets featured again → more runners
        ↓
Coach earns more → invests in NextSplit → tells other coaches
```

### What this means for coaches
Being featured on NextSplit is genuinely valuable — exposure to the entire platform user base. A coach with a featured plan might get 20–50 new plan purchases in a week without any additional effort. This is the business case for:
- Writing high quality plans with proper coaching rationale
- Staying on NextSplit (you can't be featured if you leave)
- Getting athletes to complete plans and leave reviews
- Becoming verified (unverified coaches are ineligible for featuring)

### What this means for NextSplit
Featured Plans is an editorial product. Someone (initially you) makes the weekly picks. Over time this becomes a strong brand asset — "NextSplit's Plan of the Week" becomes something coaches aspire to and runners trust.

It also creates a natural content marketing opportunity:
- Weekly email/notification to all users ("This week's featured plans")
- Social media content (coach spotlight, athlete results)
- SEO: "best marathon training plan 2026" — feature the top-rated plan

### DB schema additions

```sql
-- Track featuring history
CREATE TABLE featured_plans (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id     uuid REFERENCES plan_templates(id) NOT NULL,
  week_start      date NOT NULL,               -- Monday of the feature week
  feature_type    text CHECK (feature_type IN ('algorithmic', 'editorial', 'debut')),
  position        integer,                      -- 1-5 placement order
  impressions     integer DEFAULT 0,
  clicks          integer DEFAULT 0,
  conversions     integer DEFAULT 0,            -- plan purchases during feature week
  created_at      timestamptz DEFAULT now()
);

-- Track plan completion rates (needed for featuring algorithm)
-- Add to plan_purchases or compute from user_plans
ALTER TABLE plan_templates
  ADD COLUMN IF NOT EXISTS avg_completion_rate numeric(4,2),  -- 0.00-1.00
  ADD COLUMN IF NOT EXISTS total_starts       integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_completions  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_rating         numeric(3,2),
  ADD COLUMN IF NOT EXISTS review_count       integer DEFAULT 0;

-- These columns are updated by triggers or background jobs when:
-- - A user activates a plan (total_starts++)
-- - A user completes/archives a plan (total_completions++)
-- - A review is submitted (avg_rating recalculated)
```

### Future evolution
Once there are enough plans and coaches:
- **Seasonal campaigns** — "Spring Marathon Season" featured collection
- **Distance collections** — "Best 5K plans" curated page
- **Coach spotlights** — monthly deep-dive on a featured coach (blog + notification)
- **Athlete stories** — runner who followed a featured plan shares their race result
- **Coach earnings transparency** — "Top earning coaches this month" — aspirational for new coaches


---

## COMPETITIVE POSITIONING

| App | Strength | Weakness | Our angle |
|---|---|---|---|
| Strava | Social, tracking | No coaching, no strength | We coach AND track |
| TrainingPeaks | Coach tools | Expensive, ugly, athlete-hostile | We're accessible + beautiful |
| Garmin Connect | Wearable data | Terrible UX, no AI | We're the intelligence layer |
| Nike Run Club | Brand, guided runs | No personalisation, no coach | We know their data |
| Runna | Clean plans | No community, no coach, no gym | We do everything |
| TrainerRoad | Structured training | Cycling-first, no community | We do multi-sport + community |
| Triathlete.com / TrainingPeaks | Multi-sport support | Athlete-hostile UX, no AI | We make multi-sport accessible |

**The pitch:** NextSplit is the only platform where AI coaching, human coach expertise, multi-sport strength and endurance training, and community all live together — built for the serious amateur who wants to improve, coached by people who know how.

**Expanded market:** Supporting triathlon coaches, cyclists who run, and multi-sport athletes significantly expands the addressable market without losing the running-first identity. The app remains running-focused in its branding and defaults — but the coach platform supports any endurance discipline.

---

## ENVIRONMENT VARIABLES
```
# Current (all set in Vercel)
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
ANTHROPIC_API_KEY
NEXT_PUBLIC_STRAVA_CLIENT_ID / STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET
NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_EMAIL
CRON_SECRET
NEXT_PUBLIC_PREMIUM_ENFORCED=false

# Phase 0 — add these
SENTRY_DSN
NEXT_PUBLIC_POSTHOG_KEY

# Phase 1 — add these
STRIPE_SECRET_KEY
STRIPE_PRICE_MONTHLY
STRIPE_PRICE_ANNUAL
STRIPE_WEBHOOK_SECRET

# Phase 2 — add these
STRIPE_COACH_PLATFORM_FEE_PRICE_ID   # coach monthly subscription
```

---

## REVIEW CADENCE

- **Every session:** tick completed tasks, update phase status, commit this doc
- **Weekly:** Sentry for new errors, PostHog funnels
- **Monthly:** adjust phase priorities based on user feedback and metrics
- **Quarterly:** strategic review — market, competitors, what changed

---
_NextSplit Master Document v3 — April 2026_
_Always commit this file at the end of every dev session_

---

## PRE-LAUNCH CHECKLIST
_Things that must be done before opening to real users_

### Supabase Auth
- [ ] Re-enable **Confirm email** (turned off during dev for easy testing — Supabase → Authentication → Providers → Supabase Auth)
- [ ] Verify email confirmation redirect URL is correct for production domain
- [ ] Review RLS policies on all tables

### Stripe
- [ ] Switch from test keys (`sk_test_`) to live keys (`sk_live_`)
- [ ] Update all `STRIPE_*` env vars in Vercel to live values
- [ ] Test live checkout with a real card before announcing

### Monitoring
- [ ] Confirm Sentry is receiving events (trigger a test error)
- [ ] Verify Vercel Analytics showing data
- [ ] PostHog funnel configured and tracking

### Legal
- [ ] Privacy policy live at /privacy
- [ ] Terms of service live at /terms
- [ ] Cookie notice if needed (Stripe/PostHog set cookies)
- [ ] GDPR: account deletion removes ALL user data (verify cascade works)

### General
- [ ] Manual test matrix completed (all 4 onboarding flows)
- [ ] Push notifications verified on Android
- [ ] PWA install prompt tested on iOS and Android
- [ ] All 4 onboarding paths tested end-to-end on mobile
- [ ] `NEXT_PUBLIC_PREMIUM_ENFORCED` set to `true` in Vercel

---

## SESSION 27 PROGRESS

### Sprint 1 — Onboarding Foundation ✅
- Onboarding context (11-step state machine) built
- Welcome screen (Step 1) built
- Character creation screen (Step 2) built — body type, skin tone, hair, face, kit, accessories, starting title, randomise
- @handle system with real-time uniqueness check
- Progress bar with character runner sprite
- OnboardingEntry shell wired (steps 3–11 are placeholders)

### Next session — Sprint 2
Build steps 3–8 in order:
- Step 3: Sport select (running active, others coming soon + notify me)
- Step 4: About You
- Step 5: Your Running (sliders, race times, surfaces)
- Step 6: Goals (A/B/C priority, multiple goal types)
- Step 7: Your Life (days, timing, surfaces)
- Step 8: Gym config

### SQL to run in Supabase before next session
File: `supabase/onboarding-migration.sql` in repo root
Must be run before onboarding save actions will work.
