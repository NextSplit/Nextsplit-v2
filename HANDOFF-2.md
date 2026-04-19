# NextSplit v2 — Dev Session Handoff
_Last updated: end of session 25 — StatsClient split complete_

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
1d70f20  Refactor: split StatsClient 1373→510 lines into 10 chart components + statsUtils
2784c8e  docs: HANDOFF-2 updated after session 24 refactor
93dad1d  Refactor: extract LogModal/SessionCard/AdHocSessionModal/SplitsDisplay, db() helper
3736492  docs: HANDOFF-2 after session 23 audit
83f4d2e  Audit: null-guard all s.c checks, extract parseDet/secsToHMS to sessionUtils
cc839f1  Fix crash: e.c.startsWith is not a function
```

---

## CODEBASE MAP (post-refactor)

### File sizes — all tabs and key files
| File | Lines | Status |
|---|---|---|
| `src/app/today/TodayClient.tsx` | 940 | ✅ Split in session 24 |
| `src/app/dashboard/StatsClient.tsx` | 510 | ✅ Split in session 25 |
| `src/app/nutrition/NutritionClient.tsx` | 1339 | 🔲 Next candidate to split |
| `src/app/profile/ProfileClient.tsx` | 1517 | 🔲 Next candidate to split |
| `src/app/plan/PlanClient.tsx` | 907 | Acceptable |
| `src/app/gym/live/GymLiveClient.tsx` | 591 | Fine |
| `src/app/settings/SettingsClient.tsx` | 534 | Fine |
| `src/app/history/HistoryClient.tsx` | 307 | Fine |

### Extracted chart components (`src/components/charts/`)
| File | Component | Props |
|---|---|---|
| `WeeklyVolumeChart.tsx` | Running volume bar chart | `logs, weeks` |
| `ACWRChart.tsx` | Acute:Chronic workload ratio | `logs, weeks` |
| `PaceTrend.tsx` | Pace over time trend | `logs` |
| `SessionSummary.tsx` | Plan completion stats | `logs, weeks` |
| `RaceCountdown.tsx` | Days to race ring | `raceDate, planName` |
| `TrainingZones.tsx` | Pace zone distribution | `logs` |
| `WellnessTrend.tsx` | Readiness/sleep/mood trend | self-contained (uses useWellness) |
| `WeightTrend.tsx` | Weight over time | self-contained (uses useWellness) |
| `PBCard.tsx` | Personal bests table | `logs` |
| `PaceCalculator.tsx` | Race time calculator | self-contained |

### Extracted UI components (`src/components/`)
| File | Extracted from | Purpose |
|---|---|---|
| `LogModal.tsx` | TodayClient | Run logging modal |
| `SessionCard.tsx` | TodayClient | Session tile + XP animation |
| `AdHocSessionModal.tsx` | TodayClient | Add extra session modal |
| `SplitsDisplay.tsx` | TodayClient/LogModal | Strava lap splits |

### Shared libs (`src/lib/`)
| File | Key exports |
|---|---|
| `sessionUtils.ts` | `getSessionType`, `parseDet`, `secsToHMS`, `secsToMMSS`, `fmtKm`, `decodeHtml` |
| `statsUtils.ts` | `logsArray`, `weeklyKm`, `calcACWR`, `paceToSecs`, `daysUntil`, `dayLabel`, `hmsToSecs`, `paceMinsPerKm`, `fmtPaceForUnits` |
| `nutrition.ts` | `getDayType` (incl. strength), `calcCalories`, `DAY_TYPE_CONFIG` |
| `rpg.ts` | `computeRPGStats`, `getSessionXP`, badges, levels |
| `streak.ts` | `computeStreak`, `predictRaceTime` |
| `wellness.ts` | `readinessScore` |
| `gymUtils.ts` | `parseDetToExercises`, `suggestWeight`, `getRestTime` |
| `features.ts` | Rate limits: free=3, pro=25, coach=50 AI/day |
| `supabase/db.ts` | `db(supabase)` — replaces all `(supabase as any)` casts |

---

## CRITICAL PATTERNS

### Null-safe session code access
```typescript
// CORRECT
s?.c?.startsWith('gym')
s.c != null && s.c !== 'rest'
// CRASHES if c is null
s.c.startsWith('gym')
```

### Supabase queries
```typescript
import { db } from '@/lib/supabase/db'
// All queries use:
const { data } = await db(supabase).from('training_logs').select('*')
// Never use (supabase as any) — zero remaining in codebase
```

### Adding new features
- **New session type**: `SESSION_XP` in `rpg.ts` → `SESSION_TYPES` in `sessionUtils.ts` → `getDayType()` in `nutrition.ts`
- **New AI route**: copy `/api/ai/fuel/route.ts` pattern
- **New tab**: `src/app/[name]/page.tsx` + `[Name]Client.tsx`, add to bottom nav in `layout.tsx`
- **New chart component**: add to `src/components/charts/`, import in `StatsClient.tsx`
- **New Supabase table**: add to `src/types/database.ts`, create hook, add to `TableName` in `supabase/db.ts`

---

## DATABASE SCHEMA
| Table | Purpose |
|---|---|
| `profiles` | User settings, display_name, weight, age |
| `plan_templates` | 17 seeded plan templates |
| `user_plans` | Active/archived plans with `weeks_data` JSONB |
| `training_logs` | Session logs. `session_i=99` = ad-hoc |
| `gym_logs` | Set/rep/weight logs from gym live tracker |
| `wellness_logs` | Sleep, soreness, mood, weight |
| `races` | Race calendar A/B/C priority |
| `recipes` | Meal recipes |
| `meal_plan_entries` | Daily meal assignments |
| `strava_connections` | OAuth tokens |
| `ai_usage` | Rate limiting per user per day |
| `push_subscriptions` | Web push tokens |

**Phase 11 SQL (run before Stripe):**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
```

---

## EXACT NEXT STEPS (priority order)

### 1. Stripe / Pro tier (Phase 11)
**Env vars needed in Vercel:**
```
STRIPE_SECRET_KEY
STRIPE_PRICE_MONTHLY   (price ID from Stripe dashboard, ~£7.99/mo)
STRIPE_PRICE_ANNUAL    (price ID, ~£59/yr)
STRIPE_WEBHOOK_SECRET
```

**Files to create:**
```
src/app/api/stripe/checkout/route.ts
  POST { priceId } → create Checkout session → return { url }

src/app/api/stripe/webhook/route.ts
  checkout.session.completed → profiles.is_pro=true, pro_expires_at
  customer.subscription.deleted → profiles.is_pro=false
```

**Files to update:**
```
src/types/database.ts        — ProfileWithStripe already exists, promote to Profile type
src/components/ProGate.tsx   — check profiles.is_pro (currently bypassed/returns true always)
src/app/profile/ProfileClient.tsx — add Pro upgrade card in Account section
src/lib/features.ts          — already has free=3, pro=25, coach=50 AI/day limits
```

### 2. Split NutritionClient.tsx (1339 lines)
Natural split points:
- `RecipeModal` (~200 lines) → `src/components/RecipeModal.tsx`
- `MealSlotCard` (~100 lines) → `src/components/MealSlotCard.tsx`
- `MacroRing` + `MacroBar` (~60 lines) → `src/components/MacroDisplay.tsx`
- `SupplementTracker` (~100 lines) → `src/components/SupplementTracker.tsx`
After split NutritionClient should be ~400 lines.

### 3. Split ProfileClient.tsx (1517 lines)
Natural split points:
- `CharacterDisplay` + `StatBars` (~200 lines) → `src/components/rpg/CharacterCard.tsx`
- `BadgeGrid` (~150 lines) → `src/components/rpg/BadgeGrid.tsx`
- `LevelProgressBar` (~80 lines) → `src/components/rpg/LevelProgress.tsx`
- `KitColourPicker` (~100 lines) → `src/components/rpg/KitPicker.tsx`
After split ProfileClient should be ~400 lines.

### 4. Activity logging (Phase 12 stub)
`ActivityLog` type already in `database.ts`. Wire swimming/cycling/walking into TDEE.
New Supabase table: `activity_logs`. New hook: `useActivityLog.ts`.

---

## ALL API ROUTES
```
POST /api/ai/coach          — Coaching (gym + ad-hoc context)
POST /api/ai/fuel           — Nutrition tip (strength/easy/quality/long/race day types)
POST /api/ai/suggestions    — Adaptive suggestions (gym data included)
POST /api/ai/pre-race-brief — Pre-race brief
POST /api/ai/recommend      — Plan recommendation (gym pref aware)
POST /api/plans/activate    — Activate plan (include_gym, race date validation)
POST /api/plans/reset       — Reset plan to week 1
GET  /api/strava/sync       — Fetch Strava activities
POST /api/strava/disconnect — Remove Strava
POST /api/notifications/subscribe — Push sub
POST /api/notifications/send      — Send push
GET  /api/cron/notify       — Daily reminder cron
POST /api/admin/seed-plans  — Re-seed templates
```

## ENVIRONMENT VARIABLES
```
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
ANTHROPIC_API_KEY
NEXT_PUBLIC_STRAVA_CLIENT_ID / STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET
NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_EMAIL
CRON_SECRET
NEXT_PUBLIC_PREMIUM_ENFORCED=false
```

## BUILD + DEPLOY
```bash
cd nextsplit-v2 && git pull && npm install
node_modules/.bin/next build      # must pass
node_modules/.bin/tsc --noEmit    # must be zero errors
git add -A && git commit -m "..." && git push origin main
# Open deploy hook in browser
# If plan JSON changed: Settings → Developer → Run
```
