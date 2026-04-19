# NextSplit v2 — Dev Session Handoff
_Last updated: end of session 14 (Phase 10 complete)_

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
23248ac  Phase 10: upgraded ShareSessionCard, WeeklyShareCard, public profile, middleware
a41b248  Phase UI-5: PB toast confetti, XP float, check-pop, LevelUp star burst, undo slide-up
5d7a7ce  Phase UI-4: TDEE calculator, AI fuel coach, calorie ring, macro bars
d135c16  Phase UI-3: kit colour, character states, medal overlays
133177f  Phase UI-2: session card redesign, week progress bar, colour tightening
```

## Phases complete
- Phase 0–9  ✅ Foundation, AI, Strava
- Phase UI-1 ✅ Tab renames + reorders
- Phase UI-2 ✅ Session card redesign, progress bar, colour tightening
- Phase UI-3 ✅ Character: kit colour, states, medals
- Phase UI-4 ✅ Fuel: TDEE, AI coach, calorie ring
- Phase UI-5 ✅ Motion & delight: confetti, XP float, check-pop, star burst
- Phase 10  ✅ Social: share cards, public profile /u/[name]

---

## EXACT NEXT STEPS

### Phase 11 — Stripe + Pro tier (NEXT)

#### What exists
- `src/components/ProGate.tsx` — already built, wraps content behind a paywall UI
- `NEXT_PUBLIC_PREMIUM_ENFORCED=false` on Vercel — all features currently open
- `profiles` table has no `is_pro` column yet — needs Supabase migration

#### Tasks

**TASK 1 — Supabase migration**
Add to profiles table:
```sql
ALTER TABLE profiles ADD COLUMN is_pro boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN pro_expires_at timestamptz;
ALTER TABLE profiles ADD COLUMN stripe_customer_id text;
```
Run in Supabase SQL editor, then update `src/types/database.ts` Profile type.

**TASK 2 — Stripe checkout route**
New file: `src/app/api/stripe/checkout/route.ts`
- POST handler: creates Stripe Checkout session, returns URL
- Products: Monthly £7.99/mo (`price_monthly`) and Annual £59/yr (`price_annual`)
- Success URL: `/profile?pro=success`
- Cancel URL: `/profile`
- Env vars needed: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`

**TASK 3 — Stripe webhook**
New file: `src/app/api/stripe/webhook/route.ts`
- Handles `checkout.session.completed` → set profiles.is_pro=true, pro_expires_at
- Handles `customer.subscription.deleted` → set is_pro=false
- Env var: `STRIPE_WEBHOOK_SECRET`

**TASK 4 — Pro gate features**
Once is_pro is in the DB, update ProGate.tsx to check it server-side.
Gate behind Pro:
- AI coaching calls > 5/day (unlimited for Pro)
- Advanced analytics (ACWR chart, pace trend)
- Character cosmetics (kit colour — currently free, move to Pro or keep free for launch)

**TASK 5 — Pro upgrade UI**
In `src/app/profile/ProfileClient.tsx`, add a Pro upgrade card in the Account section (for non-Pro users).
Show: "NextSplit Pro — £7.99/mo or £59/yr" with a checkout button.
For Pro users: show "Pro ✓ active" badge on the hero card.

### Phase 12 — Coach tier (after Phase 11)
- Coach dashboard: view multiple athletes
- Athlete invite links
- Coach-written plan templates
- Pricing: £19.99/mo

---

## Key files
- Today tab:        src/app/today/TodayClient.tsx
- Coach tab:        src/app/dashboard/StatsClient.tsx
- Character tab:    src/app/profile/ProfileClient.tsx
- Fuel tab:         src/app/nutrition/NutritionClient.tsx
- Public profile:   src/app/u/[username]/page.tsx
- Share cards:      src/components/ShareSessionCard.tsx, WeeklyShareCard.tsx
- RPG lib:          src/lib/rpg.ts
- Nutrition lib:    src/lib/nutrition.ts
- Global CSS:       src/app/globals.css (keyframes)
- ProGate:          src/components/ProGate.tsx
- Middleware:       src/lib/supabase/middleware.ts (/u/ now public)
- DB types:         src/types/database.ts

## Architecture
- Next.js 16, Supabase, all tabs client components
- Colour system: teal=brand, amber=warnings, emerald=success, red=danger only
- AI: Anthropic API client-side (fuel coach, coaching card)
- Public profile: /u/[display_name] — no auth required, server-rendered
- Premium: NEXT_PUBLIC_PREMIUM_ENFORCED=false (all open until Phase 11)

## Build + deploy
```bash
cd nextsplit-v2 && git pull && npm install
node_modules/.bin/next build
git config user.email "dev@nextsplit.app" && git config user.name "NextSplit Dev"
git add -A && git commit -m "message" && git push origin main
# User opens deploy hook in browser
```
