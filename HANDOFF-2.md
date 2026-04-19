# NextSplit v2 — Dev Session Handoff
_Last updated: end of session 21 — gym integration fully complete_

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
18bdf77  Next steps: gym week summary, gym toggle manual+lifestyle, AI gym pref, progressive overload
7156906  Phase C: gym preference in AI onboarding, gym toggle in plan browser, include_gym activate
b6b9998  Phase A+B: gym card visual treatment, gym on rest days, AI coach gym awareness
1d60ed4  Fix week 1 gym sessions
85f0195  Core: gym sessions in all 17 plans, coached session notes, ad-hoc session logging
```

---

## ⚠️ DEPLOY ACTION REQUIRED
After deploying, re-seed plan templates to push gym sessions + coached notes + progressive loading:
```
POST https://nextsplit-v2.vercel.app/api/admin/seed-plans
Header: x-seed-secret: [SEED_SECRET env var value]
```

---

## Complete gym integration — what's shipped

### Plan templates (17 plans, all verified)
- Gym sessions on rest days: beginner=1/week (day 2), intermediate=2/week (days 2+4), advanced=1/week (day 4)
- Never in race weeks (b=r). Deload/taper=gym-c (mobility). Build=gym-a/b alternating. Peak=gym-b only
- **Progressive overload:** 387 gym sessions updated
  - Early phase (weeks 1-3): 3×12 — learning patterns, higher reps
  - Mid phase (weeks 4-7): 4×8 — building volume and strength
  - Late phase (weeks 8+): 4×6 — strength focus
  - Peak weeks: 4×5 — heavy, max strength
  - Deload: 2×12 — light maintenance
- Every session has coached rationale: "technical detail — why you're doing this"
- Week 1 correctly uses gym-a/b (not gym-c taper note)

### UI (Today + Plan tabs)
- Gym cards: amber palette, labels "Lower Body" / "Upper Body" / "Mobility"
- Gym session cards: amber "Start →" pill CTA (not quick-done circle)
- Rest days with gym sessions: shown as amber tappable cards instead of "😴 Rest day"
- Plan tab current week: gym summary strip showing week's strength sessions + completion
- Ad-hoc session button on Today: 6 types (easy run, lower/upper body, mobility, cross-train, walk)

### All 4 onboarding flows have gym toggle
- AI bespoke: 5-step flow (goal→level→race date→**gym?**→name→recommendation)
- Predetermined: toggle on plan detail page, defaults on
- Manual: toggle in details step
- Lifestyle: toggle in name step
- All flows pass `include_gym` to activate route
- Activate route strips gym sessions from weeks_data when include_gym=false
- include_gym stored in plan meta for future reference

### AI coach gym awareness
- Coach context includes gym session counts per week: "gym 2/2" in weekly summary
- AI recommend prompt references gym preference and mentions strength work when included

---

## EXACT NEXT STEPS

### Priority 1: Ad-hoc sessions visible in history + analytics

Ad-hoc sessions (session_i=99) are logged to training_logs but the Coach tab's weekly stats
and history page don't distinguish them from plan sessions. Three things needed:

**A — Coach tab: "Extra sessions" line**
In `src/app/dashboard/StatsClient.tsx`, the stats section shows sessions_done/sessions_planned
but ad-hoc sessions (session_i=99) aren't counted or called out separately.
Add a line: "Extra sessions: X this week" when session_i=99 logs exist.

**B — History page: show ad-hoc sessions**
In `src/app/history/HistoryClient.tsx`, the session log shows plan sessions but
ad-hoc ones (session_i=99) could be surfaced as "additional sessions" in the week view.

**C — AI coach prompt: mention ad-hoc sessions**
In `/api/ai/coach/route.ts`, the logs query fetches all done=true sessions.
Add a count: `adHocSessionsThisWeek = logs.filter(l => l.session_i === 99 && l.week_n === currentWeekN).length`
and include it in context: "Additional sessions logged: X" — lets coach comment on extra work.

### Priority 2: Stripe + Pro tier (backlogged)

SQL to run in Supabase FIRST:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
```
Then update `src/types/database.ts` Profile type.

Env vars needed:
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_MONTHLY` (price ID from Stripe dashboard, suggested £7.99/mo)
- `STRIPE_PRICE_ANNUAL` (suggested £59/yr)
- `STRIPE_WEBHOOK_SECRET`

Files to create:
- `src/app/api/stripe/checkout/route.ts` — POST → create Checkout session → return URL
- `src/app/api/stripe/webhook/route.ts` — checkout.session.completed + subscription.deleted

Files to update:
- `src/components/ProGate.tsx` — check profiles.is_pro
- `src/app/profile/ProfileClient.tsx` — Pro upgrade card in Account section

Free tier: 3 AI calls/day (already set in features.ts). Pro: 25/day, coach: 50/day.
Gate behind Pro when enforced: unlimited AI, advanced analytics.

### Priority 3: Other activity logging (long term)
Swimming, cycling, walking → affects fuelling calculations and analytics.
The ad-hoc session "Walk" and "Cross-training" types already log — need to wire km/duration
from these into the nutrition TDEE calculation (currently only running km is factored).

---

## Key files reference

| File | Purpose |
|---|---|
| `plans/*.json` | 17 plan templates — edit via scripts/ only |
| `scripts/add_gym_sessions.py` | Adds gym sessions to all plans |
| `scripts/enrich_run_sessions.py` | Adds coaching rationale to run sessions |
| `scripts/fix_week1_gym.py` | Fixes week 1 gym type |
| `scripts/progressive_gym.py` | Applies progressive overload to gym schemes |
| `src/app/today/TodayClient.tsx` | Today tab — session cards, ad-hoc modal, gym rest day |
| `src/app/plan/PlanClient.tsx` | Plan tab — gym week summary, day rows, log modal |
| `src/app/dashboard/StatsClient.tsx` | Coach tab — AI coaching card, stats |
| `src/app/api/ai/coach/route.ts` | AI coach context (gym-aware) |
| `src/app/api/ai/recommend/route.ts` | AI plan recommendation (gym pref-aware) |
| `src/app/api/plans/activate/route.ts` | Plan activation — include_gym strips sessions |
| `src/app/onboarding/ai/AIOnboardingClient.tsx` | 5-step AI onboarding |
| `src/app/onboarding/predetermined/PlanBrowserClient.tsx` | Plan browser + gym toggle |
| `src/app/onboarding/manual/ManualOnboardingClient.tsx` | Manual onboarding + gym toggle |
| `src/app/onboarding/lifestyle/LifestyleOnboardingClient.tsx` | Lifestyle onboarding + gym toggle |
| `src/lib/sessionUtils.ts` | Session type config (gym=amber) |
| `src/lib/gymUtils.ts` | Exercise definitions, parseDetToExercises |
| `src/lib/features.ts` | Rate limits: free=3, pro=25, coach=50 AI/day |

## All API routes
```
POST /api/ai/coach          — AI coaching card (gym-aware context)
POST /api/ai/fuel           — Nutrition tip
POST /api/ai/suggestions    — Adaptive plan suggestions
POST /api/ai/pre-race-brief — Pre-race brief
POST /api/ai/recommend      — AI plan recommendation (gym pref-aware)
POST /api/plans/activate    — Activate plan (include_gym param)
POST /api/plans/reset       — Reset plan to week 1
POST /api/strava/sync       — Strava sync
POST /api/strava/disconnect — Remove Strava
POST /api/notifications/subscribe — Push subscription
POST /api/notifications/send      — Push notification
GET  /api/cron/notify       — Daily training reminder cron
POST /api/admin/seed-plans  — Re-seed plan templates (x-seed-secret header)
```

## Architecture
- Next.js 16, Supabase, all tabs client components
- All AI: server-side, auth + rate limited via ai_usage table
- Colours: teal=brand, amber=gym/warnings, emerald=success, red=danger
- No window.confirm/alert — all inline confirmation patterns
- Haptics: hapticLight() on log, hapticSuccess() on gym/PB
- Premium: NEXT_PUBLIC_PREMIUM_ENFORCED=false (all open)

## Build + deploy
```bash
cd nextsplit-v2 && git pull && npm install
node_modules/.bin/next build
git add -A && git commit -m "message" && git push origin main
# Open deploy hook in browser
# POST /api/admin/seed-plans with x-seed-secret header
```
