# NextSplit v2 — Dev Session Handoff
_Last updated: end of session 23 — codebase audit + hardening_

## START OF SESSION CHECKLIST
1. Reuse GitHub token from conversation history
2. `cd /home/claude/nextsplit-v2 && git pull origin main && npm install`
3. `node_modules/.bin/next build` — confirm clean before touching anything
4. `node_modules/.bin/tsc --noEmit` — confirm zero type errors
5. Read EXACT NEXT STEPS below

---

## Repo
- GitHub: https://github.com/NextSplit/Nextsplit-v2
- Live: https://nextsplit-v2.vercel.app
- Deploy hook (user opens in browser): `https://api.vercel.com/v1/integrations/deploy/prj_pEA372Qu7gpT6SbskQbeuveYZ9Ri/onqfsTdnji`
- Re-seed button: Settings → Developer → Run (after deploy, when plan templates change)

## Git log (latest)
```
83f4d2e  Audit: null-guard all s.c checks, extract parseDet/secsToHMS to sessionUtils, extend types
cc839f1  Fix crash: e.c.startsWith is not a function — optional chaining everywhere
48e32a1  Fix DayDrawer: gym sessions show Done state; plan template fixes
d88e1d7  Add strength day type to nutrition (gym days show correct fuel guidance)
94ecddd  Fix: week 1 coaching notes, C25K beginner gym, ad-hoc day_i, seed button format
ecc048e  Fix: gym→Track/GymLive not FocusMode; cross/walk XP; RPG totalGym; adaptive gym data
```

---

## KNOWN ISSUES — none outstanding
All audit items from session 23 are closed. Zero TypeScript errors. Build clean.

---

## ARCHITECTURE OVERVIEW

### Stack
- **Next.js 16** (App Router) + **Supabase** (Postgres + Auth + RLS) + **PWA**
- All tabs are client components — data fetched via custom hooks
- All AI calls: server-side only, auth-checked, rate-limited via `ai_usage` table
- Deployed on Vercel, domain via Vercel

### Design system
- **Colours**: teal=brand (#0D9488), amber=gym/warnings, emerald=success, red=danger only
- **No window.confirm/alert** — all inline confirmation patterns
- **Haptics**: `hapticLight()` on session log, `hapticSuccess()` on gym/PB completion
- **Global tap feedback**: `button:active { transform: scale(0.97) }` in globals.css
- **Toast system**: `useToast()` in every tab via `ToastProvider` in layout.tsx

### Key shared utilities (src/lib/)
| File | Purpose |
|---|---|
| `sessionUtils.ts` | Session type config, `parseDet()`, `secsToHMS()`, `secsToMMSS()`, `fmtKm()` |
| `gymUtils.ts` | Exercise definitions, `parseDetToExercises()`, rest time config |
| `nutrition.ts` | `getDayType()`, `calcCalories()`, `DAY_TYPE_CONFIG` (incl. strength day) |
| `rpg.ts` | XP values, `computeRPGStats()`, badges, level config |
| `streak.ts` | `computeStreak()`, `computeConsistency()`, `predictRaceTime()` |
| `personalBests.ts` | `computePersonalBests()`, `checkNewPB()` |
| `features.ts` | Rate limits: free=3, pro=25, coach=50 AI/day |
| `haptics.ts` | `hapticLight()`, `hapticSuccess()` |
| `units.ts` | `useUnits()`, `fmtDistance()`, `secsPerKmToDisplay()` |

### Null-safety rule (important)
Session codes (`s.c`, `session.c`) can be null/undefined in real data (legacy/malformed JSON).
**Always use optional chaining**: `s?.c?.startsWith('gym')` NOT `s.c.startsWith('gym')`.
**Filter nulls**: `s => s.c != null && s.c !== 'rest'` NOT `s => s.c !== 'rest'`.
This was the cause of the `e.c.startsWith is not a function` crash.

---

## DATABASE SCHEMA (Supabase)

All tables exist and have RLS enabled. Key tables:

| Table | Purpose |
|---|---|
| `profiles` | User settings, display_name, weight, age, units |
| `plan_templates` | 17 seeded plan templates (update via seed button after JSON changes) |
| `user_plans` | Active/archived/completed user plans with `weeks_data` JSONB |
| `training_logs` | All session logs incl ad-hoc (session_i=99) |
| `gym_logs` | Detailed set/rep/weight logs from gym live tracker |
| `wellness_logs` | Daily readiness: sleep, soreness, mood, weight |
| `races` | User race calendar with priority A/B/C |
| `recipes` | User meal recipes |
| `meal_plan_entries` | Daily meal plan assignments |
| `strava_connections` | OAuth tokens for Strava |
| `ai_usage` | Rate limiting — call counts per user per day |
| `push_subscriptions` | Web push notification subscriptions |

**Phase 11 SQL** (run before building Stripe):
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
```

---

## PLAN TEMPLATES

17 JSON files in `/plans/*.json`. **Never edit manually** — use scripts in `scripts/`.

**Key scripts:**
```
scripts/add_gym_sessions.py     — Add gym sessions to all plans
scripts/enrich_run_sessions.py  — Add coaching rationale to run sessions  
scripts/progressive_gym.py      — Apply progressive overload (3x12→4x8→4x6)
scripts/fix_week1_gym.py        — Fix week 1 gym type (gym-a day2, gym-b day4)
```

**Session code format** (in `weeks_data` JSON):
- Codes: `run-easy`, `run-int`, `run-tempo`, `run-long`, `run-race`, `gym-a`, `gym-b`, `gym-c`
- Build flags: `k`=build, `d`=deload/base, `p`=peak, `r`=race week
- Det format: `"Back squat 4x5 · RDL 4x5 — Coaching rationale here"`
- Ad-hoc sessions: logged at `session_i=99`, never in plan JSON

**After editing plan JSON**: deploy → Settings → Developer → Run seed.

---

## FEATURE STATE

### ✅ Complete
- Auth (email + Google), PWA, dark mode, units (km/miles)
- Today tab: session cards, log modal, quick-done, FocusMode (running), GymLive (gym), undo, date nav
- Plan tab: week view, day drawer, gym summary strip, week advance, phase filter
- Coach tab: AI coaching card (3 modes), ACWR, race predictions, pace trend, wellness trend, weight trend, PBs
- Character tab: RPG character, XP/levels, badges, kit colours, Strava, export
- Fuel tab: TDEE calculator, calorie ring, macro tracking, meal plan, recipes, AI nutrition coach
- Gym: Live tracker with rest timer, weight suggestions, set editing, celebration screen
- All 4 onboarding flows with gym preference toggle
- Ad-hoc session logging (6 types, feeds AI coach context)
- Social: share cards, public profile `/u/[username]`
- Strava sync with activity picker and splits import
- Push notifications with daily reminder cron
- Plan history with ad-hoc sessions separated
- Settings: all preferences, re-seed button

### 🔲 Next to build
1. **Stripe (Phase 11)** — see SQL above + env vars section
2. **Other activity logging** — swimming, cycling → affects TDEE. Type stub in `database.ts`
3. **Personalised pace zones** — currently hardcoded in plan JSON, should adapt to user's actual times
4. **Garmin export** — Phase 12 placeholder

---

## ALL API ROUTES

```
POST /api/ai/coach          — Coaching card (gym + ad-hoc aware context)
POST /api/ai/fuel           — Nutrition tip (receives dayType: 'strength' for gym days)
POST /api/ai/suggestions    — Adaptive suggestions (gym data included)
POST /api/ai/pre-race-brief — Pre-race brief
POST /api/ai/recommend      — Plan recommendation (gym pref-aware)
POST /api/plans/activate    — Activate plan (include_gym, race date validation)
POST /api/plans/reset       — Reset plan to week 1
GET  /api/strava/sync       — Fetch recent Strava activities
POST /api/strava/disconnect — Remove Strava connection
POST /api/notifications/subscribe — Register push subscription
POST /api/notifications/send      — Send push notification
GET  /api/cron/notify       — Daily training reminder cron
POST /api/admin/seed-plans  — Re-seed plan templates (no auth needed, non-destructive)
```

---

## CODE QUALITY NOTES

### Things that are clean
- Zero TypeScript errors (`tsc --noEmit` passes)
- Zero `window.confirm/alert` — all inline confirm patterns
- All AI calls server-side with auth + rate limiting
- `parseDet()`, `secsToHMS()`, `secsToMMSS()` shared from `sessionUtils.ts`
- Optional chaining on all `s?.c?.startsWith()` calls

### Known tech debt (non-blocking)
- **55 `(supabase as any)` casts** — Supabase's TypeScript support requires `any` for complex queries. Could be wrapped in a typed helper but not a bug.
- **TodayClient.tsx is 1530 lines** — functional but large. Could split `LogModal`, `AdHocModal`, `SessionCard` into separate files. Safe to refactor when needed.
- **StatsClient.tsx is 1373 lines** — same situation. `WeeklyVolumeChart`, `ACWRChart`, `PaceTrend`, `WellnessTrend`, `WeightTrend` could each be their own file.
- **`readinessScore()` defined in 2 places** — `StatsClient.tsx` and `WellnessCheckIn.tsx` with slightly different signatures. Could extract to `src/lib/wellness.ts`.

### Adding new features cleanly
- **New session type**: add to `SESSION_XP` in `rpg.ts`, `SESSION_TYPES` in `sessionUtils.ts`, `getDayType()` in `nutrition.ts`
- **New AI route**: copy `/api/ai/fuel/route.ts` pattern — auth check, rate limit, Anthropic call, return JSON
- **New tab**: add to `src/app/[tabname]/` with `page.tsx` (server) + `[Name]Client.tsx` (client), add to bottom nav in `src/app/layout.tsx`
- **New Supabase table**: add to `src/types/database.ts`, create a `useNewTable.ts` hook following existing hook patterns

---

## ENVIRONMENT VARIABLES (all set in Vercel)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
ANTHROPIC_API_KEY
NEXT_PUBLIC_STRAVA_CLIENT_ID
STRAVA_CLIENT_ID
STRAVA_CLIENT_SECRET
NEXT_PUBLIC_VAPID_PUBLIC_KEY   (also aliased as VAPID_PUBLIC_KEY in older routes)
VAPID_PRIVATE_KEY
VAPID_EMAIL
CRON_SECRET
NEXT_PUBLIC_PREMIUM_ENFORCED=false
```

**Phase 11 will need:**
```
STRIPE_SECRET_KEY
STRIPE_PRICE_MONTHLY
STRIPE_PRICE_ANNUAL
STRIPE_WEBHOOK_SECRET
```

---

## BUILD + DEPLOY

```bash
cd nextsplit-v2 && git pull && npm install
node_modules/.bin/next build          # must pass clean
node_modules/.bin/tsc --noEmit        # must show zero errors
git add -A && git commit -m "message" && git push origin main
# Open deploy hook in browser
# If plan JSON changed: Settings → Developer → Run
```
