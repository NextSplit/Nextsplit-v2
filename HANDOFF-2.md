# NextSplit v2 — Dev Session Handoff
_Last updated: end of session 22_

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
e2fc935  Fix week 1 gym alternation, getDayType gym→easy, usePlanHistory ad-hoc exclusion
d884fc8  Ad-hoc session visibility: SessionSummary breakdown, history extra sessions, AI coach
62edbd1  docs: HANDOFF-2 — session 21 complete
18bdf77  Next steps: gym week summary, gym toggle manual+lifestyle, AI gym pref, progressive overload
7156906  Phase C: gym preference in AI onboarding, gym toggle plan browser, include_gym flag
b6b9998  Phase A+B: gym card visual, gym on rest days, AI coach gym awareness
```

---

## ⚠️ DEPLOY + SEED REQUIRED
```
# 1. Open deploy hook in browser
# 2. POST /api/admin/seed-plans with x-seed-secret header to push plan changes to Supabase
```

---

## What's complete

### Gym integration (sessions 19-22)
**Plan templates (17 plans, all verified clean)**
- Gym on all rest days. Beginner=1/wk, intermediate=2/wk, advanced=1/wk. Never in race weeks.
- Week 1: gym-a (lower body) day 2, gym-b (upper body) day 4 with beginner coaching notes ✓ FIXED
- Progressive overload: early=3×12, mid=4×8, late=4×6, peak=4×5, deload=2×12
- All 387 gym sessions updated with correct scheme

**UI**
- Gym cards: amber, "Lower Body"/"Upper Body"/"Mobility" labels, "Start →" pill CTA
- Plan tab: gym week summary strip in current week header
- Ad-hoc session button on Today tab (6 types, logs at session_i=99)

**All 4 onboarding flows have gym toggle**
- AI bespoke: 5-step flow includes gym preference step
- Predetermined, Manual, Lifestyle: all have gym toggle
- `include_gym: false` strips gym sessions server-side at activation

**AI awareness**
- Coaching card context includes gym session completion counts
- Extra/ad-hoc sessions appear in coach context
- AI recommend prompt references gym preference

**Nutrition**
- `getDayType()` now returns `easy` for gym-only days (not `rest`) ✓ FIXED
- Gym day gets correct calorie/carb targets in Fuel tab

**Analytics**
- SessionSummary: planned vs ad-hoc sessions broken out
- History: week rows show ad-hoc sessions separately
- `usePlanHistory`: ad-hoc excluded from planned stats ✓ FIXED

---

## EXACT NEXT STEPS — in priority order

### 1. Stripe + Pro tier (Phase 11)

**Prerequisite SQL in Supabase first:**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
```

**Env vars needed in Vercel:**
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_MONTHLY` — Monthly price ID (suggested £7.99/mo)
- `STRIPE_PRICE_ANNUAL` — Annual price ID (suggested £59/yr)
- `STRIPE_WEBHOOK_SECRET`

**Files to create:**
```
src/app/api/stripe/checkout/route.ts
  POST body: { priceId, successUrl, cancelUrl }
  → create Stripe Checkout session → return { url }

src/app/api/stripe/webhook/route.ts
  Events to handle:
    checkout.session.completed → set profiles.is_pro=true, pro_expires_at
    customer.subscription.deleted → set profiles.is_pro=false
```

**Files to update:**
```
src/types/database.ts — add is_pro, pro_expires_at, stripe_customer_id to Profile type
src/components/ProGate.tsx — check profiles.is_pro from Supabase (currently always returns true)
src/app/profile/ProfileClient.tsx — add Pro upgrade card in Account section
```

**What goes behind Pro when NEXT_PUBLIC_PREMIUM_ENFORCED=true:**
- Unlimited AI calls (free=3/day is already set in features.ts)
- Advanced analytics in Coach tab (ACWR, pace trends — currently always shown)
- The gate just needs wiring; ProGate component exists but currently bypasses

### 2. Other activity logging
Swimming, cycling, walking logged via ad-hoc → affect TDEE calculation.
`src/lib/nutrition.ts` getDayType() could have new types: `cross_training`, `strength`.
The AI fuel coach prompt already receives `dayType` so this flows automatically.

### 3. Gym session weight progression UI
Currently GymLiveClient suggests last session's weight but no UI shows the progression
over multiple weeks. A "Your progress" section on the gym session card (in Today or Plan)
showing weight history per exercise would be motivating.

---

## Key files

| File | Purpose |
|---|---|
| `plans/*.json` | 17 plan templates — NEVER edit manually, use scripts/ |
| `scripts/*.py` | Plan generation: add_gym_sessions, enrich_run_sessions, progressive_gym, fix_week1_gym |
| `src/app/today/TodayClient.tsx` | Today tab (1526 lines) — all session/log/ad-hoc logic |
| `src/app/plan/PlanClient.tsx` | Plan tab — gym week summary, day rows, log modal |
| `src/app/dashboard/StatsClient.tsx` | Coach tab — SessionSummary, weekly stats, coaching card |
| `src/app/history/HistoryClient.tsx` | History — ad-hoc sessions in week rows |
| `src/hooks/usePlanHistory.ts` | History data — excludes ad-hoc from planned stats |
| `src/app/gym/live/GymLiveClient.tsx` | Live gym tracker — sets/reps/rest timer |
| `src/app/api/ai/coach/route.ts` | AI coach context (gym + ad-hoc aware) |
| `src/app/api/plans/activate/route.ts` | Activation (include_gym, race date validation) |
| `src/lib/nutrition.ts` | getDayType (gym→easy), calcCalories, DAY_TYPE_CONFIG |
| `src/lib/sessionUtils.ts` | Session type config (gym=amber) |
| `src/lib/gymUtils.ts` | Exercise definitions, parseDetToExercises |
| `src/lib/features.ts` | Rate limits: free=3, pro=25, coach=50 AI calls/day |
| `src/components/ProGate.tsx` | Feature gating (currently bypassed) |

## All API routes
```
POST /api/ai/coach          — AI coaching (gym + ad-hoc aware)
POST /api/ai/fuel           — Nutrition tip
POST /api/ai/suggestions    — Adaptive suggestions
POST /api/ai/pre-race-brief — Pre-race brief
POST /api/ai/recommend      — Plan recommendation (gym pref aware)
POST /api/plans/activate    — Activate plan (include_gym, race date validation)
POST /api/plans/reset       — Reset to week 1
POST /api/strava/sync       — Strava sync
POST /api/strava/disconnect — Remove Strava
POST /api/notifications/subscribe — Push sub
POST /api/notifications/send — Push notification
GET  /api/cron/notify       — Daily training reminder cron
POST /api/admin/seed-plans  — Re-seed templates (x-seed-secret header required)
```

## Architecture
- Next.js 16 + Supabase + PWA
- All AI: server-side only, auth + rate limited
- Colours: teal=brand, amber=gym/warnings, emerald=success, red=danger
- No window.confirm/alert — inline confirmation patterns throughout
- Haptics: hapticLight() on log, hapticSuccess() on gym/PB
- Premium: NEXT_PUBLIC_PREMIUM_ENFORCED=false (all open until Stripe)

## Build + deploy
```bash
cd nextsplit-v2 && git pull && npm install
node_modules/.bin/next build
git add -A && git commit -m "message" && git push origin main
# Open deploy hook in browser
# POST /api/admin/seed-plans with x-seed-secret header
```
