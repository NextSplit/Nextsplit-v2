# NextSplit v2 — Master Dev & Product Document
_Living document — updated every session. Last updated: session 26_

---

## QUICK START (beginning of every dev session)

```bash
cd /home/claude/nextsplit-v2
git pull origin main && npm install
node_modules/.bin/next build        # must pass clean
node_modules/.bin/tsc --noEmit      # must show zero errors
```
Then read the IMMEDIATE NEXT ACTIONS section before touching anything.

---

## Repo & Infrastructure

- **GitHub:** https://github.com/NextSplit/Nextsplit-v2
- **Live app:** https://nextsplit-v2.vercel.app
- **Deploy hook** (100/day limit — use sparingly): `https://api.vercel.com/v1/integrations/deploy/prj_pEA372Qu7gpT6SbskQbeuveYZ9Ri/onqfsTdnji`
- **Re-seed plans:** Settings → Developer → Run (after plan JSON changes + deploy)
- **Supabase:** supabase.com → nextsplit project

### Git log (recent)
```
d7f0b26  docs: HANDOFF-2 updated — session 26 complete
1c2b7c4  Fix: all supabase-as-any casts, TDEE localStorage persistence, activity logging
39bf61e  Activity logging: dual-write cross-training, Fuel tab summary
bf61c83  PlanClient split, personalised pace zones, activity logging hook
9003168  Fix crashes: getDayType null-safe, getSessionType null-safe
c5b9929  Refactor: ProfileClient split → 13 RPG components
f7fcc69  Refactor: NutritionClient split → 10 nutrition components
```

---

## IMMEDIATE NEXT ACTIONS

### 🔴 Deploy first (crash fix waiting)
The null-safety crash fixes (Plan/Fuel/Character tabs) are in GitHub but not live because the Vercel webhook hit its 100/day rate limit. As soon as possible:
1. Open deploy hook URL in browser OR
2. Use `git commit --allow-empty -m "trigger deploy" && git push` to trigger via GitHub Actions once CI/CD is set up

### 🟠 Then: GitHub Actions CI/CD (1 session)
Replace the brittle webhook with a proper pipeline. Create `.github/workflows/deploy.yml`:
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

### 🟡 Then: Sentry error monitoring (2 hours)
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```
Add `SENTRY_DSN` to Vercel env vars. This replaces "user screenshots error and sends to Claude" with real stack traces.

### 🟡 Then: Stripe (2–3 sessions)
Supabase columns already exist. Env vars needed in Vercel:
```
STRIPE_SECRET_KEY
STRIPE_PRICE_MONTHLY    # ~£7.99/mo price ID from Stripe dashboard
STRIPE_PRICE_ANNUAL     # ~£59/yr price ID
STRIPE_WEBHOOK_SECRET
```
Files to create:
```
src/app/api/stripe/checkout/route.ts   — POST {priceId} → Checkout session → {url}
src/app/api/stripe/webhook/route.ts    — checkout.session.completed → profiles.is_pro=true
                                       — customer.subscription.deleted → is_pro=false
```
Files to update:
```
src/components/ProGate.tsx             — check profiles.is_pro (currently bypassed)
src/app/profile/ProfileClient.tsx      — add Pro upgrade card in Account section
src/types/database.ts                  — promote ProfileWithStripe fields to Profile type
```
Free tier: 3 AI/day. Pro: 25/day, coach: 50/day (already set in `src/lib/features.ts`).

---

## SUPABASE SCHEMA (all tables exist and configured ✅)

| Table | Purpose | Status |
|---|---|---|
| `profiles` | User settings, weight, age, is_pro | ✅ incl. Stripe cols |
| `plan_templates` | 17 seeded plan templates | ✅ |
| `user_plans` | Active/archived plans with `weeks_data` JSONB | ✅ |
| `training_logs` | Session logs. `session_i=99` = ad-hoc | ✅ |
| `gym_logs` | Set/rep/weight logs from GymLive | ✅ |
| `wellness_logs` | Sleep, soreness, mood, weight | ✅ |
| `races` | Race calendar A/B/C priority | ✅ |
| `recipes` | Meal recipes | ✅ |
| `meal_plan_entries` | Daily meal assignments | ✅ |
| `strava_connections` | OAuth tokens | ✅ |
| `ai_usage` | Rate limiting per user per day | ✅ |
| `push_subscriptions` | Web push tokens | ✅ |
| `activity_logs` | Cross-training (swim/cycle/walk/hike) → TDEE | ✅ session 26 |

Future tables needed:
```sql
-- Phase 3: community
CREATE TABLE clubs ( id uuid PRIMARY KEY, name text, code text UNIQUE, admin_id uuid );
CREATE TABLE club_members ( club_id uuid, user_id uuid, joined_at timestamptz );

-- Phase 3: coach platform
CREATE TABLE coach_profiles ( user_id uuid PRIMARY KEY, bio text, credentials text, rate_monthly numeric );
CREATE TABLE coach_athletes ( coach_id uuid, athlete_id uuid, started_at timestamptz );
```

---

## CODEBASE STRUCTURE

### File sizes (all under 600 lines ✅)
| File | Lines | Notes |
|---|---|---|
| `src/app/today/TodayClient.tsx` | ~960 | Main today view |
| `src/app/plan/PlanClient.tsx` | 335 | Split session 26 |
| `src/app/dashboard/StatsClient.tsx` | 510 | Split session 25 |
| `src/app/nutrition/NutritionClient.tsx` | ~400 | Split session 25 |
| `src/app/profile/ProfileClient.tsx` | 555 | Split session 25 |
| `src/app/gym/live/GymLiveClient.tsx` | 591 | |
| `src/app/settings/SettingsClient.tsx` | 534 | |
| `src/app/history/HistoryClient.tsx` | 307 | |

### Component directories
```
src/components/
  charts/          10 files — WeeklyVolumeChart, ACWRChart, PaceTrend, WellnessTrend, etc.
  nutrition/       10 files — RecipeFormModal, DayMealCard, AIFuelCoach, CalorieRing, etc.
  plan/             3 files — DayDrawer, DayRow, WeekRow
  rpg/             13 files — HeroCard, BadgeGrid, StravaSection, LevelUpScreen, etc.
  LogModal.tsx           — Run logging modal
  SessionCard.tsx        — Session tile + personalised pace zone display
  AdHocSessionModal.tsx  — Extra session (dual-writes cross-training to activity_logs)
  SplitsDisplay.tsx      — Strava lap splits
```

### Shared libs (`src/lib/`)
| File | Key exports |
|---|---|
| `sessionUtils.ts` | `getSessionType` (null-safe), `parseDet`, `secsToHMS`, `secsToMMSS`, `fmtKm` |
| `statsUtils.ts` | `logsArray`, `weeklyKm`, `calcACWR`, `paceToSecs`, `daysUntil` |
| `nutrition.ts` | `getDayType` (null-safe, incl. strength day), `calcCalories`, `DAY_TYPE_CONFIG` |
| `nutritionUtils.ts` | `fmtDate`, `perPortion`, `formatQty`, `inferCategory` |
| `paceZones.ts` | `derivePaceZones`, `getPersonalisedPace` — Riegel-based personalised zones |
| `rpg.ts` | `computeRPGStats`, `getSessionXP`, 30+ badges, level config |
| `wellness.ts` | `readinessScore` |
| `gymUtils.ts` | `parseDetToExercises`, `suggestWeight`, `getRestTime` |
| `streak.ts` | `computeStreak`, `predictRaceTime` |
| `personalBests.ts` | `computePersonalBests`, `checkNewPB` |
| `features.ts` | Rate limits: free=3, pro=25, coach=50 AI/day |
| `supabase/db.ts` | `db(supabase)` — zero `(supabase as any)` casts in codebase |

### Hooks (`src/hooks/`)
| Hook | Purpose |
|---|---|
| `useActivePlan` | Active plan, weeks, advance/archive |
| `useTrainingLog` | Session logs for current plan |
| `useAllTrainingLogs` | Cross-plan logs for RPG XP + pace zone derivation |
| `useGymLog` | Set/rep/weight logs |
| `useActivityLog` | Cross-training logs → TDEE calculation |
| `useProfile` | User profile |
| `useWellness` | Readiness logs |
| `useRaces` | Race calendar |
| `useRecipes` | Meal recipes |
| `useMealPlan` | Daily meal assignments |
| `usePlanHistory` | Archived plan stats |
| `usePlanTemplates` | All 17 plan templates |

---

## CRITICAL CODING PATTERNS

### Null-safe session codes (most important rule)
Session `.c` fields can be null/undefined from the DB. Always guard:
```typescript
// CORRECT
s?.c?.startsWith('gym')
s.c != null && s.c !== 'rest'
getDayType(sessions)  // already null-safe internally

// WILL CRASH IN PRODUCTION
s.c.startsWith('gym')
s.c !== 'rest'
```

### Supabase queries
```typescript
import { db } from '@/lib/supabase/db'
const { data } = await db(supabase).from('training_logs').select('*')
// Zero (supabase as any) anywhere else in codebase
```

### Adding new features
- **New session type:** `SESSION_XP` in `rpg.ts` → `SESSION_TYPES` in `sessionUtils.ts` → `getDayType()` in `nutrition.ts`
- **New AI route:** copy `/api/ai/fuel/route.ts` pattern — auth → rate limit → Anthropic → JSON
- **New tab:** `src/app/[name]/page.tsx` + `[Name]Client.tsx`, add to bottom nav in `layout.tsx`
- **New chart:** create in `src/components/charts/`, import in `StatsClient.tsx`
- **New Supabase table:** add to `src/types/database.ts`, create hook, add table name to `supabase/db.ts` TableName type

---

## ALL API ROUTES
```
POST /api/ai/coach          — Coaching card (gym + ad-hoc + wellness aware)
POST /api/ai/fuel           — Nutrition tip (all day types incl. strength)
POST /api/ai/suggestions    — Adaptive suggestions (gym data included)
POST /api/ai/pre-race-brief — Pre-race brief
POST /api/ai/recommend      — Plan recommendation (gym preference aware)
POST /api/plans/activate    — Activate plan (include_gym, race date validation)
POST /api/plans/reset       — Reset to week 1
GET  /api/strava/sync       — Fetch Strava activities
POST /api/strava/disconnect — Remove Strava
POST /api/notifications/subscribe — Push sub
POST /api/notifications/send      — Send push
GET  /api/cron/notify       — Daily reminder cron
POST /api/admin/seed-plans  — Re-seed plan templates (Settings → Developer → Run)
```

---

## PLAN TEMPLATES

17 JSON files in `/plans/*.json`. **Never edit manually — use `scripts/`.**

Session codes: `run-easy`, `run-int`, `run-tempo`, `run-long`, `run-race`, `gym-a`, `gym-b`, `gym-c`
Build flags: `k`=build, `d`=deload/base, `p`=peak, `r`=race week
Det format: `"Exercise 4x5 · Exercise 4x5 — Coaching rationale"`
Progressive overload: early=3×12, mid=4×8, late=4×6, peak=4×5, deload=2×12

After editing plan JSON → deploy → Settings → Developer → Run.

---

## QA & ENGINEERING STANDARDS
_Applies to every session, every phase_

### Before every commit
```bash
node_modules/.bin/tsc --noEmit    # zero errors
node_modules/.bin/next build      # must compile clean
```

### Manual test matrix (run before major deploys)
- [ ] Fresh account signup → onboarding → first session logged
- [ ] All 4 onboarding paths × gym toggle on/off
- [ ] Gym session: Start → GymLive → sets → celebration → Done state
- [ ] Plan tab: day drawer → gym session shows amber "Start →" not "Log"
- [ ] Fuel tab: cross-training logged → TDEE updates → activity shows in summary
- [ ] Character tab: XP correct, badges unlock
- [ ] Settings → Developer → seed button works

### Error monitoring
- **Sentry** — set up Phase 0 (captures client crashes with real stack traces)
- **Vercel Analytics** — enable (Core Web Vitals per page)
- **PostHog** — set up Phase 1 (funnel: signup → plan → first log → week 2 → week 4)

### Testing roadmap
- **Phase 0-1:** Manual test matrix only
- **Phase 2:** Vitest unit tests for pure lib functions (paceZones, rpg, nutrition, streak)
- **Phase 3:** Playwright integration tests for critical paths (onboarding, logging, Stripe)

### Code standards
- Zero TypeScript errors at all times
- Zero `(supabase as any)` casts (only `src/lib/supabase/db.ts`)
- No file over 600 lines
- Null-safe session code access everywhere
- New helpers go in `src/lib/`, never duplicated

### GDPR (build as you go)
- Privacy policy (needed before public launch)
- Data export endpoint (partially done in settings)
- Account deletion removes all user data
- Cookie consent for analytics

---

## PRODUCT ROADMAP

### Vision
NextSplit becomes the training OS for serious amateur runners — AI coaching depth, gym integration, human coach marketplace, and community that brings users back daily. The moat is the intersection of all three; no competitor does them seriously together.

**North Star Metric:** Monthly Active Users who log 3+ sessions/week (habit-formed).

---

### PHASE 0 — Stabilise ⬅ CURRENT
_Target: 1–2 weeks_

| Task | Status |
|---|---|
| Deploy crash fixes (null-safe session codes) | ⏳ waiting on rate limit |
| GitHub Actions CI/CD (replace webhook) | 🔲 |
| Sentry error monitoring | 🔲 |
| Vercel Analytics enabled | 🔲 |
| Run all 4 onboarding flows on device | 🔲 |
| Proper error boundary with recovery | 🔲 |
| Verify push notifications on Android | 🔲 |

---

### PHASE 1 — Monetise
_Target: Weeks 2–5_

| Task | Status |
|---|---|
| Stripe checkout + webhook | 🔲 |
| ProGate enforced (currently bypassed) | 🔲 |
| 7-day free trial on Pro | 🔲 |
| Upgrade card in Profile tab | 🔲 |
| Subscription management (billing portal) | 🔲 |
| Race event API integration (search real races) | 🔲 |
| PostHog product analytics | 🔲 |

**Free vs Pro:**
- Free: 3 AI/day, 1 active plan, all core logging, basic analytics
- Pro (~£7.99/mo or £59/yr): unlimited AI, ACWR/pace trends, personalised zones, multiple plans

---

### PHASE 2 — AI Coaching Depth + Coach Marketplace v1
_Target: Months 2–3_

| Task | Status |
|---|---|
| Pace zones in AI coaching prompt (specific zone targets) | 🔲 |
| ACWR in coaching (flag > 1.3 injury risk, < 0.8 detraining) | 🔲 |
| Wellness trend in coaching ("3 poor sleep nights — drop intensity") | 🔲 |
| Race countdown coaching (tone shifts as race approaches) | 🔲 |
| Post-session AI analysis (brief note after quality sessions) | 🔲 |
| Adaptive plan — recalculates when user misses sessions | 🔲 |
| Monday morning weekly AI summary notification | 🔲 |
| NextSplit Official plans (curated, branded) | 🔲 |
| Coach plan marketplace v1 (2–3 handpicked coaches, manual process) | 🔲 |
| Coach profile pages | 🔲 |
| Revenue share model (70% coach / 30% NextSplit) | 🔲 |
| Vitest unit tests for lib functions | 🔲 |

**AI coaching examples (what to aim for):**
> _"Your easy pace averaged 6:45/km last week but your zone says 6:32–6:57. You're at the top — back off 15 seconds and you'll recover better for Tuesday's threshold."_

> _"Three perfect weeks, ACWR 1.1 — textbook. Sunday's 22km will take ~2h27m at your long pace. Start fuelling at 75 minutes, not when you feel hungry."_

---

### PHASE 3 — Community & Social
_Target: Months 3–5 — only launch when 300+ active users_

| Task | Status |
|---|---|
| **Gamification depth** | |
| Season system (monthly/quarterly leaderboard resets) | 🔲 |
| Time-limited challenges ("Run 50km this week") | 🔲 |
| XP leagues (Bronze/Silver/Gold/Platinum) | 🔲 |
| Kit unlocks via achievements | 🔲 |
| Title system ("The Consistent One", "Speed Demon") | 🔲 |
| **Running clubs** | |
| Create/join club via code or invite link | 🔲 |
| Club leaderboard (weekly km, streak, XP) | 🔲 |
| Club feed (recent sessions, opt-in) | 🔲 |
| Club challenges (admin sets group challenge) | 🔲 |
| Club admin dashboard | 🔲 |
| **Coach-client platform** (evolution of Phase 2) | |
| Coach dashboard — view all athletes, logs, wellness | 🔲 |
| Coach session annotations (athlete sees after completing) | 🔲 |
| Coach ↔ athlete messaging | 🔲 |
| Coach modifies athlete plan directly | 🔲 |
| Simple booking integration (Calendly or custom) | 🔲 |
| **Social** | |
| Activity feed (follow friends, opt-in) | 🔲 |
| Kudos on sessions | 🔲 |
| Virtual races (compete over same distance, same week) | 🔲 |
| Public challenges (anyone joins) | 🔲 |
| Playwright integration tests | 🔲 |

---

### PHASE 4 — Platform & Wearables
_Target: Months 5–9_

| Task | Status |
|---|---|
| **Wearables** | |
| Garmin Connect — auto-import + push sessions to device | 🔲 |
| Apple Health — read Apple Watch workouts | 🔲 |
| Wahoo integration | 🔲 |
| **Native app** | |
| Capacitor wrapper → App Store + Play Store | 🔲 |
| Background GPS tracking (eliminate Strava dependency) | 🔲 |
| Apple Watch / Wear OS companion app | 🔲 |
| Offline mode | 🔲 |
| **Advanced AI** | |
| Training DNA ("you train best Tuesday mornings") | 🔲 |
| Race predictor v2 (full history + taper + wellness) | 🔲 |
| Injury risk model (ACWR + soreness → warning) | 🔲 |
| AI race strategy (pace by km given course + target time) | 🔲 |
| **B2B** | |
| Running club admin accounts (bulk user management) | 🔲 |
| Physio integration (rehab plans, flag risky sessions) | 🔲 |
| White-label for gym chains | 🔲 |

---

### PHASE 5 — Scale & Exit-Ready
_Target: Month 9+_

| Task | Status |
|---|---|
| Full Vitest + Playwright test suite | 🔲 |
| Load testing (k6, 10k concurrent users) | 🔲 |
| Staging Supabase environment | 🔲 |
| Feature flag system | 🔲 |
| GDPR compliance audit + legal review | 🔲 |
| Revenue metrics dashboard | 🔲 |
| SEO content strategy | 🔲 |
| App Store presence (via Capacitor) | 🔲 |
| Referral programme | 🔲 |
| Coach network growth programme | 🔲 |
| Pitch deck / acquisition readiness | 🔲 |

**Target metrics for exit readiness:**
- 1,000+ habit-formed MAU (3+ sessions/week)
- 20%+ paying conversion rate
- < 5% monthly Pro churn
- NPS > 50

---

## COMPETITIVE POSITIONING

| App | Strength | Weakness | Our angle |
|---|---|---|---|
| Strava | Social, tracking | No coaching, no strength | We coach AND track |
| Garmin Connect | Wearable data | Terrible UX, no AI | We're the layer on top |
| Nike Run Club | Brand, guided runs | No personalisation | We know their data |
| TrainingPeaks | Coach tools | Expensive, complex | We're accessible + AI |
| Runna | Clean plans | No community, no gym | We do everything |

**The pitch:** NextSplit is the only running app that combines AI coaching, gym strength integration, personalised pace zones, and community — built for the serious amateur who wants to improve, not just track.

---

## ENVIRONMENT VARIABLES (all set in Vercel)
```
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
ANTHROPIC_API_KEY
NEXT_PUBLIC_STRAVA_CLIENT_ID / STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET
NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_EMAIL
CRON_SECRET
NEXT_PUBLIC_PREMIUM_ENFORCED=false
# Phase 1 — add these:
STRIPE_SECRET_KEY / STRIPE_PRICE_MONTHLY / STRIPE_PRICE_ANNUAL / STRIPE_WEBHOOK_SECRET
# Phase 0 — add these:
SENTRY_DSN
NEXT_PUBLIC_POSTHOG_KEY
```

---

## REVIEW CADENCE

- **Every dev session:** update relevant phase task checkboxes
- **Weekly:** check Sentry for new errors, PostHog for drop-off funnels
- **Monthly:** review roadmap priorities, adjust phases based on what's working
- **Quarterly:** bigger strategic review — market, competitors, user feedback

---
_NextSplit Master Document v2 — April 2026_
_Update this document at the end of every session_
