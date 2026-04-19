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
```

### Tables to add (Phase 3 — community)
```sql
CREATE TABLE clubs (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  code        text UNIQUE NOT NULL,
  admin_id    uuid REFERENCES auth.users(id) NOT NULL,
  coach_id    uuid REFERENCES coach_profiles(user_id), -- optional: coach-led club
  description text,
  is_public   boolean DEFAULT true,
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
| Deploy crash fixes | ⏳ rate limit |
| GitHub Actions CI/CD | 🔲 |
| Sentry error monitoring | 🔲 |
| Vercel Analytics | 🔲 |
| Manual test all 4 onboarding flows | 🔲 |
| Proper error boundary with recovery | 🔲 |
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
- Athlete has full freedom — can activate plans independently
- Coach can see and annotate whatever the athlete is doing
- Coach can suggest plan changes, athlete accepts or declines
- No hard lock — coach-athlete relationship is collaborative not restrictive

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
| Running + strength (gym sessions) — full coach visibility | 🔲 |
| Activity logs (swim/cycle) — coach sees cross-training too | 🔲 |

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

**Community ↔ Coach integration (key design decision):**
Coaches can have TWO layers simultaneously:
1. **Private squad** — their paying athletes, full data access, annotations, messaging
2. **Public club** — anyone can join, leaderboard, challenges, community feed
These are linked but separate. A coach's athletes can see each other in the squad leaderboard. The public club is how coaches grow their audience and find new clients.

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

## COMPETITIVE POSITIONING

| App | Strength | Weakness | Our angle |
|---|---|---|---|
| Strava | Social, tracking | No coaching, no strength | We coach AND track |
| TrainingPeaks | Coach tools | Expensive, ugly, athlete-hostile | We're accessible + beautiful |
| Garmin Connect | Wearable data | Terrible UX, no AI | We're the intelligence layer |
| Nike Run Club | Brand, guided runs | No personalisation, no coach | We know their data |
| Runna | Clean plans | No community, no coach, no gym | We do everything |
| TrainerRoad | Structured training | Cycling-first, expensive | We're running-first |

**The pitch:** NextSplit is the only platform where AI coaching, human coach expertise, gym strength training, and community all live together — built for the serious amateur who wants to improve, coached by people who know how.

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
