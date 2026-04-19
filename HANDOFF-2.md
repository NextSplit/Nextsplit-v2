# NextSplit v2 — Dev Session Handoff
_Last updated: end of session 18 — all audit items closed_

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
ad5d579  Audit closes: gym no-exercises error handling, AI free tier limit 0→3, gym celebration
c8da7d9  Audit fixes: gym error handling + celebration, HeroCard XP skeleton, race date validation
10ef953  Security: 3 client-side Anthropic calls → server routes; VAPID fix; race-date warning
9d6dcfb  UX audit: auth/onboarding brand alignment, plan browser teal, FocusMode, WellnessCheckIn
7f30d60  Quality pass: useToast everywhere, CoachingCard teal, inline confirms, Fuel empty states
```

## Phases + audit status
- Phase 0–9  ✅ Foundation, AI, Strava, PWA
- Phase UI-1–5 ✅ Full UI overhaul, animations, motion
- Phase 10  ✅ Social sharing, public profile /u/[name]
- Quality   ✅ Toast system, empty states, inline confirms, tap feedback
- UX Audit  ✅ Brand alignment, onboarding, auth pages, FocusMode, dismiss fixes
- Security  ✅ API key exposure fixed, VAPID, race-date logic
- Audit 2   ✅ Gym error handling, XP skeleton, all audit items CLOSED

---

## ✅ ALL KNOWN AUDIT ITEMS CLOSED

### What was fixed across the audit sessions

**Security (critical)**
- 3 client-side Anthropic API calls → server routes with auth + rate limiting
  - `/api/ai/fuel` — nutrition tip
  - `/api/ai/suggestions` — adaptive plan suggestions
  - `/api/ai/pre-race-brief` — pre-race brief
- VAPID public key env var mismatch fixed (push notifications now work)

**Logic bugs**
- Race date server validation — rejects past dates with clear error
- raceTooSoon flag handled in all 3 onboarding flows (predetermined, manual, lifestyle)
- AI free tier limit was 0 → now 3/day (enforcement-safe)
- Gym session save unguarded → try/catch + toast + hapticSuccess()
- Gym "no exercises" fallback also unguarded → fixed

**UX fixes**
- HeroCard XP skeleton while useAllTrainingLogs loads
- Gym completion: 2.5s celebration screen before returning to Today
- CoachingCard: violet→teal, smart error messages, three-dot loading
- FocusMode logged state: prominent "Done — back to Today" button
- WellnessCheckIn dismiss: proper `dismissed` boolean (no more state hack)
- All window.confirm/alert replaced with inline confirm patterns
- PWAProfileCard: inline styles → Tailwind
- PreRaceBrief taper colour: purple → teal

**Brand alignment**
- Auth pages (login/signup): dark brand header matching onboarding
- Plan browser: teal throughout, coach notes promoted, teal CTAs
- Onboarding AI bespoke: violet→teal tag colour

---

## EXACT NEXT STEPS

### Phase 11 — Stripe + Pro (backlogged, ready when wanted)

**Prerequisite: run this SQL in Supabase dashboard first:**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
```
Then add those 3 fields to the Profile type in `src/types/database.ts`.

**Env vars needed in Vercel:**
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_MONTHLY` (price ID from Stripe dashboard)
- `STRIPE_PRICE_ANNUAL`
- `STRIPE_WEBHOOK_SECRET`

**Files to create:**
- `src/app/api/stripe/checkout/route.ts` — POST → create Checkout session → return URL
- `src/app/api/stripe/webhook/route.ts` — handle `checkout.session.completed` + `customer.subscription.deleted`

**Files to update:**
- `src/components/ProGate.tsx` — check `profiles.is_pro` server-side
- `src/app/profile/ProfileClient.tsx` — add Pro upgrade card in Account section

**Pricing:** £7.99/mo or £59/yr. Free tier keeps 3 AI calls/day.
**Gate behind Pro:** unlimited AI (currently 3 free → 25 pro), advanced analytics.

### Phase 12 — Coach tier (after Phase 11)
---

## All API routes (current)
```
POST /api/ai/coach          — Coaching card (server, auth + rate limited)
POST /api/ai/fuel           — Fuel tip (server, auth + rate limited)
POST /api/ai/suggestions    — Adaptive suggestions (server, auth + rate limited)
POST /api/ai/pre-race-brief — Pre-race brief (server, auth + rate limited)
POST /api/ai/recommend      — AI onboarding recommendation
POST /api/plans/activate    — Activate a plan (validates race date, returns raceTooSoon)
POST /api/plans/reset       — Reset plan to week 1
POST /api/strava/sync       — Sync Strava activities
POST /api/strava/disconnect — Remove Strava connection
POST /api/notifications/subscribe — Register push subscription
POST /api/notifications/send      — Send push notification
GET  /api/cron/notify       — Daily training reminder cron
```

## Key files
- AI routes:        src/app/api/ai/* (all server-side, auth + rate limited)
- Rate limits:      src/lib/features.ts (free=3, pro=25, coach=50 per day)
- Today tab:        src/app/today/TodayClient.tsx
- Coach tab:        src/app/dashboard/StatsClient.tsx
- Character tab:    src/app/profile/ProfileClient.tsx
- Fuel tab:         src/app/nutrition/NutritionClient.tsx
- Plan tab:         src/app/plan/PlanClient.tsx
- Gym live:         src/app/gym/live/GymLiveClient.tsx
- ProGate:          src/components/ProGate.tsx
- Toast:            src/components/Toast.tsx (useToast everywhere)
- Global CSS:       src/app/globals.css (keyframes + tap feedback)

## Architecture
- Next.js 16, Supabase, all tabs client components
- All AI calls: server-side only, auth checked, rate limited via ai_usage table
- Colour system: teal=brand, amber=warnings, emerald=success, red=danger only
- No window.confirm/alert — all inline confirmation patterns
- Haptics: hapticLight() on log, hapticSuccess() on gym/PB
- Premium: NEXT_PUBLIC_PREMIUM_ENFORCED=false (all features open until Stripe)
- When enforcing: free=3 AI/day, pro=25, coach=50

## Build + deploy
```bash
cd nextsplit-v2 && git pull && npm install
node_modules/.bin/next build
git config user.email "dev@nextsplit.app" && git config user.name "NextSplit Dev"
git add -A && git commit -m "message" && git push origin main
# User opens deploy hook in browser
```
