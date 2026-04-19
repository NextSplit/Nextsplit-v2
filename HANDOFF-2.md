# NextSplit v2 — Dev Session Handoff
_Last updated: end of session 20 — gym integration complete_

## START OF SESSION CHECKLIST
1. Reuse GitHub token from conversation history
2. `cd /home/claude/nextsplit-v2 && git pull origin main && npm install`
3. `node_modules/.bin/next build` — confirm clean before touching anything
4. Read EXACT NEXT STEPS below

---

## Repo
- GitHub: https://github.com/NextSplit/Nextsplit-v2
- Live: https://nextsplit-v2.vercel.app
- Deploy hook (user opens in browser): `https://api.vercel.com/v1/integrations/deploy/prj_pEA372Qu7gpT6SbskQbeuveYZ9Ri/onqfsTdnji`

## Git log (latest)
```
7156906  Phase C: gym preference in AI onboarding, gym toggle in plan browser, include_gym activate
b6b9998  Phase A+B: gym card visual treatment, gym on rest days, AI coach gym awareness
1d60ed4  Fix week 1 gym sessions: base week gym-a/b not gym-c
85f0195  Core feature: gym sessions in all 17 plans, coached session notes, ad-hoc session logging
ecebd66  docs: HANDOFF-2 updated
```

---

## ⚠️ DEPLOY ACTION REQUIRED
After deploying, re-seed plan templates:
```
POST https://nextsplit-v2.vercel.app/api/admin/seed-plans
Header: x-seed-secret: [SEED_SECRET env var value]
```
Existing active user_plans won't change — gym sessions only appear in newly activated plans.

---

## What's been built — gym integration complete

### Session 19: Foundations
- **Gym sessions in all 17 plan templates** — placement rules: beginner=1 session, intermediate=2, advanced=1. Never in race weeks. Build=gym-a/b alternating, peak=gym-b only, deload/taper=gym-c (mobility)
- **Coached session notes** — every session has `"technical — coaching rationale"`. UI splits at ` — `, shows technical in compact view, coaching note in 🧠 teal callout in log modals
- **Ad-hoc session logging** — "Add a session" button on Today tab. 6 types: easy run, lower body, upper body, mobility, cross-training, walk. Logs at session_i=99

### Session 20: Discoverability + integration
- **Gym card visual identity** — amber palette (not slate), labels "Lower Body" / "Upper Body" / "Mobility", amber "Start →" CTA pill instead of quick-done circle
- **Gym on rest days** — Today tab shows gym session cards on rest days instead of just "😴 Rest day"
- **AI coach gym awareness** — coach context now includes gym session counts in week summaries
- **Gym preference in AI onboarding** — 5-step flow: goal → level → race date → gym? → name → recommendation. "Include strength sessions" / "Running only" choice
- **Gym toggle in plan browser** — toggle on plan detail page, defaults on. Stores preference in activate request
- **`include_gym` flag in activate route** — server strips gym sessions from `weeks_data` before saving if false. Preference stored in plan `meta.include_gym`

---

## NEXT STEPS — in priority order

### 1. Plan tab week view gym summary card (A4 from previous plan)
**File:** `src/app/plan/PlanClient.tsx`
**What:** In the current week section, add a small summary card showing gym sessions for the week with completion status. Currently gym sessions appear in the day rows but there's no at-a-glance weekly strength view.
**Where:** After the week note card, before the day rows list.

### 2. Manual + lifestyle onboarding — gym preference
**Files:** `src/app/onboarding/manual/ManualOnboardingClient.tsx`, `src/app/onboarding/lifestyle/LifestyleOnboardingClient.tsx`
Both currently redirect to `/today` after saving. Neither asks about gym preference. Add a gym toggle (same as predetermined browser) to the final step of each flow before activation.

### 3. AI recommendations referencing gym preference
**File:** `src/app/api/ai/recommend/route.ts`
The route receives `includeGym` in the body but doesn't use it in the prompt. Update the prompt to mention strength training when `includeGym=true` — the recommendation should reference that the plan includes gym sessions and why.

### 4. Gym session week-by-week progression 
Currently all build weeks use the same exercises (3x10 for gym-a/b). A progressive overload approach would have:
- Weeks 1-3: 3x10 (hypertrophy/learning phase)  
- Weeks 4-8: 4x8 (building strength)
- Weeks 9+: 5x5 or 4x6 (strength focus)
This would need updating the plan JSON generation scripts to vary sets/reps by week position.
**Script:** `scripts/add_gym_sessions.py` → update `gym_session()` function to vary scheme by week number within phase.

### 5. Ad-hoc session review in Coach tab
Ad-hoc sessions (session_i=99) are logged to training_logs but the Coach tab doesn't currently distinguish them. The AI coach context already picks them up via the logs query but the UI in StatsClient doesn't call them out. A "Extra sessions this week" line in the weekly stats would surface this.

### 6. Stripe (Phase 11) — backlogged until gym features are stable
SQL to run first: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false` etc.

---

## Plan template structure reference

```
Session c codes: run-easy, run-int, run-tempo, run-long, run-race, gym-a, gym-b, gym-c, rest
Build flags: k=build, d=deload/base, p=peak, r=race week
Gym det format: "Exercise NxM · Exercise NxM — coaching note"
Ad-hoc sessions: logged at session_i=99, never conflict with plan sessions 0-9
include_gym: boolean in activate body, stored in plan meta.include_gym
```

## All API routes
```
POST /api/ai/coach          — AI coaching card (gym-aware)
POST /api/ai/fuel           — Nutrition tip  
POST /api/ai/suggestions    — Adaptive suggestions
POST /api/ai/pre-race-brief — Pre-race brief
POST /api/ai/recommend      — AI onboarding (receives includeGym)
POST /api/plans/activate    — Activate plan (include_gym strips gym sessions)
POST /api/plans/reset       — Reset to week 1
POST /api/strava/sync       — Strava sync
POST /api/strava/disconnect — Remove Strava
POST /api/notifications/subscribe — Push sub
POST /api/notifications/send      — Push send
GET  /api/cron/notify       — Daily cron
POST /api/admin/seed-plans  — Re-seed templates (x-seed-secret header)
```

## Key files
```
src/app/today/TodayClient.tsx         — Today tab, session cards, ad-hoc modal
src/app/plan/PlanClient.tsx           — Plan tab, day rows, log modal
src/app/api/ai/coach/route.ts         — AI coach (gym-aware context)
src/app/api/plans/activate/route.ts   — Plan activation (include_gym)
src/app/onboarding/ai/AIOnboardingClient.tsx      — 5-step AI flow incl gym
src/app/onboarding/predetermined/PlanBrowserClient.tsx — Gym toggle
src/lib/sessionUtils.ts               — Session type config (gym=amber)
src/lib/gymUtils.ts                   — Exercise definitions, parseDetToExercises
plans/*.json                          — 17 plan templates (do not edit manually)
scripts/                              — Plan generation scripts
```

## Build + deploy
```bash
cd nextsplit-v2 && git pull && npm install
node_modules/.bin/next build
git add -A && git commit -m "message" && git push origin main
# Open deploy hook in browser
# POST /api/admin/seed-plans with x-seed-secret header
```
