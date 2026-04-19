# NextSplit v2 — Dev Session Handoff
_Last updated: end of session 15 (Quality pass complete)_

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
7f30d60  Quality pass: useToast everywhere, inline confirm dialogs, Fuel empty states, tap feedback
deabb41  docs: update HANDOFF-2 after Phase 10 complete
23248ac  Phase 10: upgraded ShareSessionCard, WeeklyShareCard, public profile, middleware
a41b248  Phase UI-5: PB toast confetti, XP float, check-pop, LevelUp star burst, undo slide-up
5d7a7ce  Phase UI-4: TDEE calculator, AI fuel coach, calorie ring, macro bars
```

## Phases complete
- Phase 0–9  ✅ Foundation, AI, Strava
- Phase UI-1 ✅ Tab renames + reorders
- Phase UI-2 ✅ Session card redesign, progress bar, colour tightening
- Phase UI-3 ✅ Character: kit colour, states, medals
- Phase UI-4 ✅ Fuel: TDEE, AI coach, calorie ring
- Phase UI-5 ✅ Motion & delight: confetti, XP float, star burst
- Phase 10  ✅ Social: share cards, public profile /u/[name]
- Quality   ✅ Toast system, empty states, inline confirms, tap feedback

---

## Quality pass — what was fixed
- **useToast wired into all 5 tabs** (Today, Plan, Coach, Fuel, Character) — every action now has success/error feedback
- **CoachingCard**: violet→teal, smart error messages (rate limit vs API key vs network), three-dot loading animation, mode switching resets state
- **All `window.confirm()`/`window.alert()` removed** — replaced with inline confirm patterns (RaceCard, RecipeCard, LogModal discard warning)
- **Fuel tab**: loading skeletons, no-plan empty state with CTA, better recipes empty state with action button, recipe delete/duplicate/save all show toasts
- **Global tap feedback**: `button:active { transform: scale(0.97) }` in globals.css
- **Coach tab empty state**: better copy ("Your coach is ready") with value proposition
- **Fuel h1**: fixed from `text-[15px]` to `text-lg` to match other tabs
- **LogModal discard**: amber warning card with "Keep editing" / "Discard" instead of browser dialog

---

## EXACT NEXT STEPS

### Phase 11 — Stripe + Pro tier (NEXT)

#### Prerequisite: Supabase migration
Run this in the Supabase SQL editor BEFORE starting Phase 11:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
```
Then update `src/types/database.ts` Profile type to add these 3 fields.

#### Tasks

**TASK 1 — Stripe checkout API route**
`src/app/api/stripe/checkout/route.ts`
POST handler → create Stripe Checkout session → return URL
- Monthly: £7.99/mo, Annual: £59/yr
- Success: `/profile?pro=success`, Cancel: `/profile`
- Env vars needed: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`

**TASK 2 — Stripe webhook**
`src/app/api/stripe/webhook/route.ts`
- `checkout.session.completed` → set profiles.is_pro=true, pro_expires_at
- `customer.subscription.deleted` → set is_pro=false
- Env var: `STRIPE_WEBHOOK_SECRET`

**TASK 3 — ProGate integration**
`src/components/ProGate.tsx` already exists — update to check profiles.is_pro from Supabase.
Gate behind Pro:
- Unlimited AI coaching (currently 5/day)
- ACWR chart + pace trend in Coach tab
- Character cosmetics (kit colour) — decide at build time if gated or free for launch

**TASK 4 — Pro upgrade card**
In `ProfileClient.tsx` Account section — for non-Pro users, show upgrade card.
For Pro users: show "Pro ✓" badge on HeroCard.

### Phase 12 — Coach tier (after Phase 11)

---

## Key files
- Today tab:        src/app/today/TodayClient.tsx
- Coach tab:        src/app/dashboard/StatsClient.tsx
- Character tab:    src/app/profile/ProfileClient.tsx
- Fuel tab:         src/app/nutrition/NutritionClient.tsx
- Plan tab:         src/app/plan/PlanClient.tsx
- Public profile:   src/app/u/[username]/page.tsx
- CoachingCard:     src/components/CoachingCard.tsx (teal, improved errors)
- Share cards:      src/components/ShareSessionCard.tsx, WeeklyShareCard.tsx
- Toast:            src/components/Toast.tsx (useToast hook, ToastProvider in layout)
- Global CSS:       src/app/globals.css (keyframes + global tap feedback)
- ProGate:          src/components/ProGate.tsx
- Middleware:       src/lib/supabase/middleware.ts

## Architecture
- Next.js 16, Supabase, all tabs client components
- Colour system: teal=brand, amber=warnings, emerald=success, red=danger only
- No window.confirm/alert anywhere — all inline confirmation patterns
- Toast system: ToastProvider in layout.tsx, useToast() in every tab
- Premium: NEXT_PUBLIC_PREMIUM_ENFORCED=false (all open until Phase 11)

## Build + deploy
```bash
cd nextsplit-v2 && git pull && npm install
node_modules/.bin/next build
git config user.email "dev@nextsplit.app" && git config user.name "NextSplit Dev"
git add -A && git commit -m "message" && git push origin main
# User opens deploy hook in browser
```
