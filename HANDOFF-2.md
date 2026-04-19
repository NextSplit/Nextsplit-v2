# NextSplit v2 — Dev Session Handoff
_Last updated: end of session 16 (UX/design audit pass complete)_

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
9d6dcfb  UX audit: auth/onboarding brand alignment, plan browser teal redesign, FocusMode logged state, WellnessCheckIn dismiss fix, PWA card Tailwind, haptic in Plan, form onSubmit fix
7f30d60  Quality pass: useToast everywhere, CoachingCard teal, inline confirms, Fuel empty states, tap feedback
deabb41  docs: update HANDOFF-2 after Phase 10 complete
23248ac  Phase 10: upgraded ShareSessionCard, WeeklyShareCard, public profile, middleware
```

## Phases complete
- Phase 0–9  ✅ Foundation, AI, Strava
- Phase UI-1–5 ✅ Full UI overhaul
- Phase 10  ✅ Social: share cards, public profile
- Quality   ✅ Toast system, empty states, inline confirms
- UX Audit  ✅ Brand alignment, onboarding, auth pages, FocusMode, dismiss fixes

---

## What was fixed in the UX audit passes

### Quality pass (session 15)
- useToast wired into all 5 tabs — every action has feedback
- CoachingCard: violet→teal, smart error messages, three-dot loading
- All window.confirm/alert replaced with inline confirm patterns
- Fuel tab: loading skeletons, no-plan state, better recipe empty state
- Global tap feedback: button:active { transform: scale(0.97) } in globals.css
- LogModal discard: amber warning with Keep/Discard instead of browser dialog

### UX/Design audit (session 16)
- Auth pages (login/signup): dark brand header ("Track. Log. Level up."), teal CTAs, teal focus rings — matches the app visual language
- Auth forms: `form action=` → `form onSubmit=` (client component correctness)
- Onboarding entry: AI bespoke tag violet→teal
- Plan browser (PlanBrowserClient): complete rewrite — teal filter pills, teal CTA, plan detail with teal gradient hero, coach notes promoted to near top with teal card
- FocusMode logged state: now shows "✓ Session logged" + prominent "Done — back to Today" button
- WellnessCheckIn dismiss: replaced `setSaving` hack with proper `dismissed` boolean state
- PWAProfileCard: replaced all inline styles with Tailwind classes (dark mode compatible)
- Plan tab: added hapticLight() on session log success

---

## EXACT NEXT STEPS

### Remaining audit items (lower priority, do when ready)
1. **Explore what happens when onboarding AI call fails mid-flow** — the fallback text is good but never tested
2. **Manual onboarding flow** — not audited in detail, check if it follows the same visual language
3. **Lifestyle onboarding** — quick check that the step flow is smooth

### Phase 11 — Stripe + Pro tier (backlogged)
SQL to run first in Supabase:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
```
Env vars needed: STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL, STRIPE_WEBHOOK_SECRET

### Phase 12 — Coach tier (backlogged)

---

## Key files
- Today tab:        src/app/today/TodayClient.tsx
- Coach tab:        src/app/dashboard/StatsClient.tsx
- Character tab:    src/app/profile/ProfileClient.tsx
- Fuel tab:         src/app/nutrition/NutritionClient.tsx
- Plan tab:         src/app/plan/PlanClient.tsx
- Auth: login       src/app/auth/login/page.tsx
- Auth: signup      src/app/auth/signup/page.tsx
- Onboarding entry  src/app/onboarding/OnboardingEntry.tsx
- Plan browser      src/app/onboarding/predetermined/PlanBrowserClient.tsx
- FocusMode         src/components/FocusMode.tsx
- WellnessCheckIn   src/components/WellnessCheckIn.tsx
- CoachingCard      src/components/CoachingCard.tsx
- Toast             src/components/Toast.tsx
- Global CSS        src/app/globals.css (keyframes + tap feedback)

## Architecture
- Next.js 16, Supabase, all tabs client components
- Colour system: teal=brand, amber=warnings, emerald=success, red=danger only
- No window.confirm/alert — all inline confirmation patterns
- Toast system: ToastProvider in layout.tsx, useToast() in every tab
- Haptics: hapticLight() on session log, plan advance; hapticSuccess() on PB
- Premium: NEXT_PUBLIC_PREMIUM_ENFORCED=false (all open)

## Build + deploy
```bash
cd nextsplit-v2 && git pull && npm install
node_modules/.bin/next build
git config user.email "dev@nextsplit.app" && git config user.name "NextSplit Dev"
git add -A && git commit -m "message" && git push origin main
# User opens deploy hook in browser
```
