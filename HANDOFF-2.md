# NextSplit v2 — Dev Session Handoff
_Last updated: session 26 — full roadmap complete (excl. Stripe)_

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
- Deploy hook: `https://api.vercel.com/v1/integrations/deploy/prj_pEA372Qu7gpT6SbskQbeuveYZ9Ri/onqfsTdnji`
- Re-seed: Settings → Developer → Run (after plan JSON changes + deploy)

## Git log (latest)
```
1c2b7c4  Fix: all supabase-as-any casts replaced with db(), TDEE localStorage persistence, activity logging
39bf61e  Activity logging: dual-write cross-training, Fuel tab summary, AdHocModal TDEE badge
bf61c83  Complete roadmap: PlanClient split, personalised pace zones, activity logging hook, migration SQL
9003168  Fix crashes: getDayType filters null codes, getSessionType handles null, isRest treats null-c as rest
c5b9929  Refactor: split ProfileClient 1517→555 lines into 13 RPG components
f7fcc69  Refactor: split NutritionClient 1339→385 lines into 10 nutrition components
```

---

## SUPABASE SETUP (already done ✅)
Both SQL migrations have been run in Supabase:

```sql
-- activity_logs table (session 26) ✅
CREATE TABLE activity_logs ( ... )

-- Stripe columns on profiles (ready for Phase 11) ✅
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
```

---

## CODEBASE MAP

### File sizes (all tabs)
| File | Lines |
|---|---|
| `src/app/today/TodayClient.tsx` | ~960 |
| `src/app/plan/PlanClient.tsx` | 335 |
| `src/app/dashboard/StatsClient.tsx` | 510 |
| `src/app/nutrition/NutritionClient.tsx` | ~400 |
| `src/app/profile/ProfileClient.tsx` | 555 |
| `src/app/gym/live/GymLiveClient.tsx` | 591 |
| `src/app/settings/SettingsClient.tsx` | 534 |
| `src/app/history/HistoryClient.tsx` | 307 |

### Component directories
```
src/components/
  charts/          — 10 chart components (WeeklyVolumeChart, ACWRChart, PaceTrend, etc.)
  nutrition/       — 10 nutrition components (RecipeFormModal, DayMealCard, AIFuelCoach, etc.)
  plan/            — 3 plan components (DayDrawer, DayRow, WeekRow)
  rpg/             — 13 RPG components (HeroCard, BadgeGrid, StravaSection, etc.)
  LogModal.tsx     — Run logging modal
  SessionCard.tsx  — Session tile with personalised pace zone display
  AdHocSessionModal.tsx — Add extra session (dual-writes cross-training to activity_logs)
  SplitsDisplay.tsx
```

### Shared libs
| File | Key exports |
|---|---|
| `src/lib/sessionUtils.ts` | `getSessionType`, `parseDet`, `secsToHMS`, `secsToMMSS`, `fmtKm` |
| `src/lib/statsUtils.ts` | `logsArray`, `weeklyKm`, `calcACWR`, `paceToSecs`, `daysUntil` |
| `src/lib/nutrition.ts` | `getDayType` (null-safe), `calcCalories`, `DAY_TYPE_CONFIG` |
| `src/lib/nutritionUtils.ts` | `fmtDate`, `perPortion`, `formatQty`, `inferCategory` |
| `src/lib/paceZones.ts` | `derivePaceZones`, `getPersonalisedPace` — Riegel-based personalised zones |
| `src/lib/rpg.ts` | `computeRPGStats`, `getSessionXP`, badges, levels |
| `src/lib/wellness.ts` | `readinessScore` |
| `src/lib/statsUtils.ts` | Chart data helpers |
| `src/lib/supabase/db.ts` | `db(supabase)` — zero `(supabase as any)` casts in codebase |

### Hooks
| Hook | Purpose |
|---|---|
| `useActivePlan` | Active plan, weeks, advance/archive |
| `useTrainingLog` | Session logs for current plan |
| `useAllTrainingLogs` | Cross-plan logs for RPG XP + pace zones |
| `useGymLog` | Set/rep/weight logs |
| `useActivityLog` | Cross-training logs (swim/cycle/walk) → TDEE |
| `useProfile` | User profile |
| `useWellness` | Readiness logs |
| `useRaces` | Race calendar |
| `useRecipes` | Meal recipes |
| `useMealPlan` | Daily meal assignments |
| `usePlanHistory` | Archived plan stats |
| `usePlanTemplates` | All 17 plan templates |

---

## CRITICAL PATTERNS

### Null-safe session codes
```typescript
// ALWAYS — session.c can be null from DB
s?.c?.startsWith('gym')
s.c != null && s.c !== 'rest'
getDayType(sessions)  // already null-safe internally

// NEVER
s.c.startsWith('gym')
```

### Supabase queries
```typescript
import { db } from '@/lib/supabase/db'
await db(supabase).from('training_logs').select('*')
// Zero (supabase as any) casts remain in the codebase
```

---

## FEATURE STATE

### ✅ Complete
- Auth (email + Google), PWA, dark mode, km/miles units
- Today: sessions, logging, FocusMode, GymLive, undo, date nav, ad-hoc
- Plan: week view, day drawer, gym summary, week advance, phase filter
- Coach: AI coaching (3 modes), ACWR, predictions, pace trend, wellness, PBs
- Character: RPG, XP/levels, 30+ badges, character select, kit colours
- Fuel: TDEE (localStorage persistent), meal plan, recipes, AI tip, supplement tracker
- Fuel: cross-training activities shown + TDEE boost when logged
- Gym: live tracker, rest timer, weight progression, celebration
- All 4 onboarding flows with gym preference toggle
- Ad-hoc logging: dual-writes to training_logs + activity_logs for cross-training
- Personalised pace zones: Riegel formula from logged runs, shown on session cards
- Strava sync, push notifications, public profile, share cards
- Plan history with ad-hoc sessions separated
- Settings: all preferences, re-seed button
- Codebase: all files <600 lines, zero TS errors, zero supabase-as-any casts

### 🔲 Next: Stripe / Pro tier (Phase 11)
Supabase columns already exist. Env vars needed in Vercel:
```
STRIPE_SECRET_KEY
STRIPE_PRICE_MONTHLY   (~£7.99/mo price ID from Stripe dashboard)
STRIPE_PRICE_ANNUAL    (~£59/yr price ID)
STRIPE_WEBHOOK_SECRET
```

Files to create:
```
src/app/api/stripe/checkout/route.ts
  POST { priceId } → Stripe Checkout session → return { url }

src/app/api/stripe/webhook/route.ts
  checkout.session.completed → profiles.is_pro=true, pro_expires_at
  customer.subscription.deleted → profiles.is_pro=false
```

Files to update:
```
src/types/database.ts        — ProfileWithStripe type already exists, add is_pro to Profile
src/components/ProGate.tsx   — check profiles.is_pro (currently always returns true)
src/app/profile/ProfileClient.tsx — add Pro upgrade card
```

---

## ALL API ROUTES
```
POST /api/ai/coach          — Coaching (gym + ad-hoc context)
POST /api/ai/fuel           — Nutrition tip
POST /api/ai/suggestions    — Adaptive suggestions (gym data)
POST /api/ai/pre-race-brief — Pre-race brief
POST /api/ai/recommend      — Plan recommendation
POST /api/plans/activate    — Activate plan (include_gym, race date)
POST /api/plans/reset       — Reset to week 1
GET  /api/strava/sync       — Fetch Strava activities
POST /api/strava/disconnect — Remove Strava
POST /api/notifications/subscribe — Push sub
POST /api/notifications/send      — Send push
GET  /api/cron/notify       — Daily reminder cron
POST /api/admin/seed-plans  — Re-seed templates
```

## BUILD + DEPLOY
```bash
cd nextsplit-v2 && git pull && npm install
node_modules/.bin/next build
node_modules/.bin/tsc --noEmit
git add -A && git commit -m "..." && git push origin main
# Open deploy hook in browser (100/day limit — use sparingly)
# If plan JSON changed: Settings → Developer → Run
```
