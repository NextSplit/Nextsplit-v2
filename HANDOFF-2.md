# NextSplit v2 — Dev Session Handoff
_Last updated: end of session 24 — major refactor + codebase hardening_

## START OF SESSION CHECKLIST
1. Reuse GitHub token from conversation history
2. `cd /home/claude/nextsplit-v2 && git pull origin main && npm install`
3. `node_modules/.bin/next build` — confirm clean
4. `node_modules/.bin/tsc --noEmit` — confirm zero errors
5. Read EXACT NEXT STEPS below

---

## Repo
- GitHub: https://github.com/NextSplit/Nextsplit-v2
- Live: https://nextsplit-v2.vercel.app
- Deploy hook (user opens in browser): `https://api.vercel.com/v1/integrations/deploy/prj_pEA372Qu7gpT6SbskQbeuveYZ9Ri/onqfsTdnji`
- Re-seed button: Settings → Developer → Run (after deploy, when plan templates change)

## Git log (latest)
```
93dad1d  Refactor: extract LogModal/SessionCard/AdHocSessionModal/SplitsDisplay, db() helper, deduplicate readinessScore
3736492  docs: comprehensive HANDOFF-2 after session 23 audit
83f4d2e  Audit: null-guard all s.c checks, extract parseDet/secsToHMS to sessionUtils, extend types
cc839f1  Fix crash: e.c.startsWith is not a function — optional chaining everywhere
48e32a1  Fix DayDrawer: gym sessions show Done state; plan template fixes
d88e1d7  Add strength day type to nutrition (gym days show correct fuel guidance)
```

---

## ARCHITECTURE OVERVIEW

### Stack
- **Next.js 16** (App Router) + **Supabase** (Postgres + Auth + RLS) + **PWA**
- All tabs are client components — data fetched via custom hooks
- All AI calls: server-side only, auth-checked, rate-limited via `ai_usage` table
- Deployed on Vercel

### Design system
- **Colours**: teal=brand (#0D9488), amber=gym/warnings, emerald=success, red=danger only
- **No `window.confirm/alert`** — all inline confirmation patterns
- **Haptics**: `hapticLight()` on session log, `hapticSuccess()` on gym/PB
- **Toast system**: `useToast()` via `ToastProvider` in layout.tsx

---

## CODEBASE STRUCTURE

### src/app/ — pages
| Path | Lines | Notes |
|---|---|---|
| `today/TodayClient.tsx` | 941 | Main today view. Was 1530 — split in session 24 |
| `plan/PlanClient.tsx` | 907 | Plan tab |
| `dashboard/StatsClient.tsx` | 1373 | Coach tab — **next to split** |
| `nutrition/NutritionClient.tsx` | 1339 | Fuel tab |
| `profile/ProfileClient.tsx` | 1517 | Character tab |
| `gym/live/GymLiveClient.tsx` | 591 | Live gym tracker |
| `settings/SettingsClient.tsx` | 534 | Settings |
| `history/HistoryClient.tsx` | 307 | Plan history |

### src/components/ — shared UI
| File | Purpose |
|---|---|
| `LogModal.tsx` | Run logging modal (effort/km/pace/HR) — extracted session 24 |
| `SessionCard.tsx` | Session tile with XP animation, quick-done — extracted session 24 |
| `AdHocSessionModal.tsx` | Add extra session modal — extracted session 24 |
| `SplitsDisplay.tsx` | Strava lap splits visualiser — extracted session 24 |
| `CoachingCard.tsx` | AI coaching card (3 modes) |
| `AdaptiveSuggestions.tsx` | AI adaptive training suggestions |
| `WellnessCheckIn.tsx` | Daily readiness check-in |
| `FocusMode.tsx` | Running focus overlay with elapsed timer |
| `PreRaceBrief.tsx` | Pre-race AI brief (7 days before race) |
| `StravaSyncButton.tsx` | Strava activity picker and import |
| `ShareSessionCard.tsx` | Shareable session card image |
| `WeeklyShareCard.tsx` | Shareable weekly summary |
| `PlanCompletionCeremony.tsx` | Plan completion animation |
| `PWAInstallPrompt.tsx` | PWA install prompt |
| `Toast.tsx` | Toast notification system |
| `WeatherWidget.tsx` | Current weather for running days |

### src/lib/ — shared logic
| File | Purpose |
|---|---|
| `sessionUtils.ts` | `getSessionType()`, `parseDet()`, `secsToHMS()`, `secsToMMSS()`, `fmtKm()`, `decodeHtml()` |
| `nutrition.ts` | `getDayType()` (incl. strength), `calcCalories()`, `DAY_TYPE_CONFIG` |
| `rpg.ts` | XP values, `computeRPGStats()`, badges, level config |
| `streak.ts` | `computeStreak()`, `computeConsistency()`, `predictRaceTime()` |
| `personalBests.ts` | `computePersonalBests()`, `checkNewPB()` |
| `wellness.ts` | `readinessScore()` — shared by StatsClient + WellnessCheckIn |
| `gymUtils.ts` | Exercise definitions, `parseDetToExercises()`, rest times |
| `features.ts` | Rate limits: free=3, pro=25, coach=50 AI calls/day |
| `haptics.ts` | `hapticLight()`, `hapticSuccess()` |
| `units.ts` | `useUnits()`, km/miles conversion |
| `supabase/db.ts` | **`db(supabase)` helper** — replaces all 55 `(supabase as any)` casts |

### src/hooks/ — data fetching
All hooks follow the same pattern: Supabase fetch on mount, optimistic updates, `refresh()` to force refetch.
Use `db(supabase)` from `@/lib/supabase/db` for all Supabase queries.

| Hook | Purpose |
|---|---|
| `useActivePlan` | Current plan, weeks, advanceWeek, archivePlan |
| `useTrainingLog` | Session logs, logSession, deleteLog |
| `useGymLog` | Gym set/rep logs, saveGymLog |
| `useAllTrainingLogs` | Cross-plan logs for RPG XP |
| `useProfile` | User profile, updateProfile |
| `useWellness` | Wellness logs, saveWellness |
| `useRaces` | Race calendar |
| `useRecipes` | Meal recipes |
| `useMealPlan` | Meal plan entries |
| `usePlanHistory` | Archived plans with stats |
| `usePlanTemplates` | All 17 plan templates |
| `usePushNotifications` | Push subscription management |

---

## CRITICAL PATTERNS

### Null-safety on session codes
Session `.c` fields can be null/undefined in real data. **Always use optional chaining:**
```typescript
// CORRECT
s?.c?.startsWith('gym')
s.c != null && s.c !== 'rest'

// WILL CRASH
s.c.startsWith('gym')
s.c !== 'rest'
```

### Supabase queries
```typescript
import { db } from '@/lib/supabase/db'

// CORRECT — all queries use db() helper
const { data } = await db(supabase).from('training_logs').select('*')

// BANNED — no longer used anywhere
const { data } = await (supabase as any).from('training_logs').select('*')
```

### Adding a new feature
- **New session type**: add to `SESSION_XP` in `rpg.ts`, `SESSION_TYPES` in `sessionUtils.ts`, `getDayType()` in `nutrition.ts`
- **New AI route**: copy `/api/ai/fuel/route.ts` — auth check → rate limit → Anthropic call → JSON
- **New tab**: `src/app/[name]/page.tsx` (server) + `[Name]Client.tsx` (client), add to bottom nav in `layout.tsx`
- **New Supabase table**: add to `src/types/database.ts`, create hook in `src/hooks/use[Name].ts`, add table name to `src/lib/supabase/db.ts` TableName type

---

## DATABASE SCHEMA

| Table | Purpose |
|---|---|
| `profiles` | User settings, display_name, weight, age, units |
| `plan_templates` | 17 seeded plan templates |
| `user_plans` | Active/archived plans with `weeks_data` JSONB |
| `training_logs` | All session logs. `session_i=99` = ad-hoc |
| `gym_logs` | Detailed set/rep/weight logs |
| `wellness_logs` | Daily readiness: sleep, soreness, mood, weight |
| `races` | Race calendar with priority A/B/C |
| `recipes` | User meal recipes |
| `meal_plan_entries` | Daily meal assignments |
| `strava_connections` | OAuth tokens |
| `ai_usage` | Rate limiting per user per day |
| `push_subscriptions` | Web push tokens |

**Phase 11 SQL (before building Stripe):**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
```

---

## PLAN TEMPLATES

17 JSON files in `/plans/*.json`. **Never edit manually** — use `scripts/`.

Session codes: `run-easy`, `run-int`, `run-tempo`, `run-long`, `run-race`, `gym-a`, `gym-b`, `gym-c`
Build flags: `k`=build, `d`=deload/base, `p`=peak, `r`=race week
Det format: `"Exercise 4x5 · Exercise 4x5 — Coaching rationale"`
Ad-hoc sessions: `session_i=99`, never in plan JSON

**After editing plan JSON**: deploy → Settings → Developer → Run.

---

## EXACT NEXT STEPS (priority order)

### 1. Split StatsClient.tsx (1373 lines) into chart components
Component boundaries already mapped. Extract to `src/components/charts/`:

```
src/components/charts/
  WeeklyVolumeChart.tsx    — lines 145–218 in StatsClient
  ACWRChart.tsx            — lines 219–305
  PaceTrend.tsx            — lines 306–379
  SessionSummary.tsx       — lines 380–445
  RaceCountdown.tsx        — lines 100–144
  TrainingZones.tsx        — lines 769–914
  WellnessTrend.tsx        — lines 915–1046
  WeightTrend.tsx          — lines 1047–1137
  PBCard.tsx               — lines 1138–1174
  RacesSection.tsx         — lines 709–768
```

Dependencies each component uses (from audit):
- All charts: `Record<string, TrainingLog>`, `PlanWeek[]` props
- `secsToHMS`, `secsToMMSS` from `@/lib/sessionUtils`
- `useUnits` from `@/lib/units`
- `logsArray`, `weeklyKm`, `calcACWR` — local helpers in StatsClient, move to `src/lib/statsUtils.ts`
- `WellnessTrend`, `WeightTrend`: use `useWellness` hook directly
- `readinessScore` from `@/lib/wellness`

After split, StatsClient main should be ~200 lines.

### 2. Stripe / Pro tier (Phase 11)
Run SQL above first. Then:

**Env vars needed in Vercel:**
```
STRIPE_SECRET_KEY
STRIPE_PRICE_MONTHLY   (e.g. price_xxx from Stripe dashboard, ~£7.99/mo)
STRIPE_PRICE_ANNUAL    (e.g. price_xxx, ~£59/yr)
STRIPE_WEBHOOK_SECRET
```

**Files to create:**
```
src/app/api/stripe/checkout/route.ts
  POST { priceId } → create Checkout session → return { url }

src/app/api/stripe/webhook/route.ts
  checkout.session.completed → profiles.is_pro = true, pro_expires_at
  customer.subscription.deleted → profiles.is_pro = false
```

**Files to update:**
```
src/types/database.ts — ProfileWithStripe type already exists, promote to Profile
src/components/ProGate.tsx — check profiles.is_pro (currently bypassed)
src/app/profile/ProfileClient.tsx — add Pro upgrade card
```

Free tier limits already set in `src/lib/features.ts`: free=3 AI/day, pro=25, coach=50.

### 3. Other activity types → TDEE
`ActivityLog` type stub exists in `database.ts`. Wire swimming/cycling/walking km into nutrition TDEE.
New table needed: `activity_logs`. New hook: `useActivityLog`.

---

## ALL API ROUTES
```
POST /api/ai/coach          — Coaching card (gym + ad-hoc context aware)
POST /api/ai/fuel           — Nutrition tip (dayType: strength/easy/quality/long/race)
POST /api/ai/suggestions    — Adaptive suggestions (gym data included)
POST /api/ai/pre-race-brief — Pre-race brief
POST /api/ai/recommend      — Plan recommendation (gym pref aware)
POST /api/plans/activate    — Activate plan (include_gym, race date validation)
POST /api/plans/reset       — Reset plan to week 1
GET  /api/strava/sync       — Fetch recent Strava activities
POST /api/strava/disconnect — Remove Strava
POST /api/notifications/subscribe — Push subscription
POST /api/notifications/send      — Push notification  
GET  /api/cron/notify       — Daily training reminder cron
POST /api/admin/seed-plans  — Re-seed plan templates
```

---

## ENVIRONMENT VARIABLES
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
ANTHROPIC_API_KEY
NEXT_PUBLIC_STRAVA_CLIENT_ID
STRAVA_CLIENT_ID
STRAVA_CLIENT_SECRET
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_EMAIL
CRON_SECRET
NEXT_PUBLIC_PREMIUM_ENFORCED=false
```

## BUILD + DEPLOY
```bash
cd nextsplit-v2 && git pull && npm install
node_modules/.bin/next build
node_modules/.bin/tsc --noEmit
git add -A && git commit -m "message" && git push origin main
# Open deploy hook in browser
# If plan JSON changed: Settings → Developer → Run
```
