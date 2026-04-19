# NextSplit v2 — Dev Session Handoff
_Last updated: end of session 17 (deep audit + security fixes)_

## START OF SESSION CHECKLIST
1. Reuse GitHub token from conversation history
2. `cd /home/claude/nextsplit-v2 && git pull origin main && npm install`
3. `node_modules/.bin/next build` — confirm clean before touching anything
4. Read EXACT NEXT STEPS below before writing any code

---

## Repo
- GitHub: https://github.com/NextSplit/Nextsplit-v2
- Live: https://nextsplit-v2.vercel.app
- Deploy hook (user opens in browser): `https://api.vercel.com/v1/integrations/deploy/prj_pEA372Qu7gpT6SbskQbeuveYZ9Ri/onqfsTdnji`

## Git log (latest first)
```
10ef953  Security: move 3 client-side Anthropic calls to server routes; fix VAPID; race-date warning
9d6dcfb  UX audit: auth/onboarding brand alignment, plan browser teal, FocusMode, WellnessCheckIn
7f30d60  Quality pass: useToast everywhere, CoachingCard teal, inline confirms, Fuel empty states
deabb41  docs: update HANDOFF-2 after Phase 10 complete
23248ac  Phase 10: upgraded ShareSessionCard, WeeklyShareCard, public profile, middleware
```

## Phases complete
- Phase 0–9  ✅ Foundation, AI, Strava, PWA
- Phase UI-1–5 ✅ Full UI overhaul, animations, motion
- Phase 10  ✅ Social sharing, public profile /u/[name]
- Quality   ✅ Toast system, empty states, inline confirms, tap feedback
- UX Audit  ✅ Brand alignment, onboarding, auth pages, FocusMode, dismiss fixes
- Security  ✅ API key exposure fixed, VAPID key fix, race-date logic fix

---

## Audit findings fixed in session 17

### 🔴 Critical — fixed
- **3 client-side Anthropic API calls** → moved to server routes with auth + rate limiting:
  - `NutritionClient` fuel coach → `/api/ai/fuel`
  - `AdaptiveSuggestions` → `/api/ai/suggestions`
  - `PreRaceBrief` → `/api/ai/pre-race-brief`
- **VAPID key env var mismatch** → server routes now use `NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? VAPID_PUBLIC_KEY` (push notifications should now work)

### 🟡 Logic fixes
- **Plan activation race date** → when race is sooner than plan length, shows amber warning toast on Today tab instead of silently starting from today with no explanation
- **PreRaceBrief colour** → "Taper notes" section changed from purple to teal (colour system)

### 🟠 Remaining known issues (lower priority)
1. **`AI_RATE_LIMITS.free = 0`** in features.ts — when PREMIUM_ENFORCED is turned on, free users get zero AI calls with no upgrade prompt. Needs a ProGate wrapper on AI features before enabling enforcement.
2. **`useAllTrainingLogs` no loading state** — Character tab HeroCard can briefly show 0 XP on first load. Minor flash, low priority.
3. **Plan activate doesn't validate race date is in the future** — a user could set a race date in the past. Server-side guard would be clean.

---

## EXACT NEXT STEPS

### Option A — Phase 11 (Stripe)
Prerequisite SQL (run in Supabase SQL editor first):
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
```
Then update `src/types/database.ts` Profile type. Then build checkout + webhook routes.

### Option B — Continue quality/feature work
- Validate race_date is in the future on plan activation
- Add ProGate wrapper to AI features so rate limit enforcement can be turned on safely
- HeroCard XP loading state (brief 0 XP flash)
- Test the full manual onboarding and lifestyle onboarding flows end to end

---

## All API routes
```
POST /api/ai/coach          — Coaching card (auth + rate limited)
POST /api/ai/fuel           — Fuel tab nutrition tip (auth + rate limited) [NEW]
POST /api/ai/suggestions    — Adaptive plan suggestions (auth + rate limited) [NEW]
POST /api/ai/pre-race-brief — Pre-race brief 7 days out (auth + rate limited) [NEW]
POST /api/ai/recommend      — AI onboarding plan recommendation
POST /api/plans/activate    — Activate a plan template
POST /api/plans/reset       — Reset a plan to week 1
POST /api/strava/sync       — Sync Strava activities
POST /api/strava/disconnect — Remove Strava connection
POST /api/notifications/subscribe — Register push subscription
POST /api/notifications/send      — Send push notification
GET  /api/cron/notify       — Daily training reminder cron
```

## Key files
- AI routes:        src/app/api/ai/* (all server-side, all auth+rate-limited)
- Today tab:        src/app/today/TodayClient.tsx
- Coach tab:        src/app/dashboard/StatsClient.tsx
- Character tab:    src/app/profile/ProfileClient.tsx
- Fuel tab:         src/app/nutrition/NutritionClient.tsx
- Plan tab:         src/app/plan/PlanClient.tsx
- Features/limits:  src/lib/features.ts
- Rate limiter:     src/lib/aiRateLimit.ts
- Toast:            src/components/Toast.tsx

## Architecture
- Next.js 16, Supabase, all tabs client components
- All AI calls: server-side only, auth checked, rate limited via ai_usage table
- Colour system: teal=brand, amber=warnings, emerald=success, red=danger only
- No window.confirm/alert — all inline confirmation patterns
- Premium: NEXT_PUBLIC_PREMIUM_ENFORCED=false (all open until Stripe is wired)

## Build + deploy
```bash
cd nextsplit-v2 && git pull && npm install
node_modules/.bin/next build
git config user.email "dev@nextsplit.app" && git config user.name "NextSplit Dev"
git add -A && git commit -m "message" && git push origin main
# User opens deploy hook in browser
```
