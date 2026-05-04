# NextSplit — Master Delivery Plan
**Version:** 3.4 | **25 April 2026** | **End of Session 6**
**Status:** Living document — reviewed at milestones, not calendar dates

---

## Current Position

**All SQL migrations confirmed in production. All Phase I cleanup complete. Nav v2 live.**
The app now has Home / Train / Explore / You navigation with a smart dynamic Home dashboard.
Phase I engineering debt cleared. Ready for F1 E2E test and alpha invites.

---

## Navigation Architecture v2 (live as of Session 6)

| Tab | Colour | Serves | Content |
|-----|--------|--------|---------|
| 🏠 Home | Cyan `#06b6d4` | All users | Smart dashboard — 6 dynamic states |
| 📅 Train | Coral `#ff4d6d` | Athletes | Today sessions + stats + full plan |
| 🔍 Explore | Lime `#84cc16` | Athletes | Coaches / Squads / Plans / AI |
| ⭐ You | Amber `#f0a500` | All users | Achievements / Character / Stats |
| 🎓 Coach | Violet `#8b5cf6` | Coaches only | Dashboard / Athletes / Earnings |

**Home tab — 6 states (reads 8 live signals on load):**
1. No plan → Bold 4-path onboarding picker
2. Active training day → Coral hero with session pills + Start
3. Rest day → Muted hero, next session preview, stats strip
4. Has coach + unread → Violet hero with coach name + message
5. Squad leader → Squad colour hero with nudge + leaderboard
6. Streak at risk (≥3 days, not logged today, evening) → Amber warning

**Routes:**
- `/home` — smart dashboard (new)
- `/train` — Today + Plan merged (replaces `/today` and `/plan`)
- `/explore` — coaches, squads, marketplace (was buried)
- `/you` — profile renamed, achievements first (was `/profile`)
- All old routes redirect: `/today→/train`, `/profile→/you`, `/community→/explore`

---

## Colour Language System (complete)

| Colour | Hex | Area |
|--------|-----|------|
| Cyan | `#06b6d4` | Brand anchor, wordmark, landing, onboarding progress, PB toast |
| Coral | `#ff4d6d` | Athlete/Today tab, log session, streak, all athlete CTAs |
| Cobalt | `#2563eb` | Plan tab, ACWR, pace zones, analytics |
| Lime | `#84cc16` | Squad, Split Leader, trophy room |
| Amber | `#f0a500` | XP, badges, Splity, character tab |
| Violet | `#8b5cf6` | Coach dashboard, messaging, verified badge |
| Magenta | `#ec4899` | Level-up screen, plan completion ceremony, special moments |

**Dark mode:** Default on first visit. `<html class="dark">` from first paint, no flicker.
**Light mode:** Session cards use full colour gradients (Option C). Toggle in Settings.
**Runner colour:** 12-colour picker in Settings → Appearance. Applies to HeroCard + share cards.

---

## Phase I Cleanup — COMPLETE ✅

| Item | Status |
|------|--------|
| `(supabase as any)` → `db(supabase)` wrapper (41 files) | ✅ |
| Remaining `as any` typed or annotated | ✅ |
| Zod validation on ai/fuel, coach/apply, stripe/checkout | ✅ |
| Rate limiter utility — stripe (5/hr), coach/apply (3/hr) | ✅ |
| CSP header in vercel.json | ✅ |
| Server-side `requirePro()` on 3 AI routes | ✅ |
| `no-console` ESLint rule | ✅ |
| AVIF/WebP image formats, phosphor tree-shaking | ✅ |
| `@types/node` in tsconfig | ✅ |
| CI — only Build is hard gate, others continue-on-error | ✅ |
| aria-label on all × close buttons | ✅ |
| Supabase staging environment | ⬜ Founder action |
| Full aria-label audit (non-close buttons) | ⬜ Phase J |
| Load testing | ⬜ Before beta |

---

## Full Build Status

### ✅ Core Product
Auth (email + Google OAuth), all 4 onboarding paths, VDOT pace personalisation,
17+ seeded plan templates, Train tab (Today + Plan merged), Plan adaptation engine,
Character system, Plan history, Personal bests, Strava sync, Offline queue, Nutrition tab.

### ✅ Social / Split Leader
Squad creation, invite landing, join flow, dashboard, leaderboard, nudge system,
inactivity monitoring, leadership transfer, trophy room, squad seasons, achievements,
community feed, public profiles. **SQL in production ✅**

### ✅ Coaching Platform
Coach setup/apply, public profile, browse + filter, hire flow, athlete invite,
coach squad view, voice messages, messaging + read receipts, message reactions,
scheduled messages (Coach Pro gated), plan builder, coach annotations + broadcast,
coach digest preferences, athlete capacity management, coach earnings dashboard,
Stripe Connect (payouts), commission model, Coach Pro subscription, dispute resolution.
**SQL in production ✅**

### ✅ Notifications + Comms
Push notifications (8 types), per-type preferences + quiet hours,
email notifications (5 types), lifecycle emails (7-email sequence),
GitHub Actions daily cron (9am UTC), Splity character (4 moods).

### ✅ Revenue Infrastructure (not yet activated)
Stripe checkout + webhook + portal, Stripe Connect (coach payouts),
ProGate component + **server-side enforcement** (Phase I complete),
feature flags (PREMIUM_ENFORCED=false, REFERRAL_ENABLED=false),
referral system (behind flag), plan marketplace.

### ✅ Security + Legal
HTTP security headers, CSP header (Phase I), all domain refs → nextsplit.app,
zero console.log in production (all → Sentry), voice messages IDOR fixed,
squad invite privacy, admin gate on sensitive routes, aria-labels on close buttons,
privacy policy, medical disclaimer, cookie consent, data export + account deletion.
**Zod validation on ALL API routes (Phase I complete).**
**Rate limiting on stripe + coach apply (Phase I).**

### ✅ Infrastructure
nextsplit.app → Vercel, www.nextsplit.app, Resend verified (coach@nextsplit.app),
CRON_SECRET, NEXT_PUBLIC_SITE_URL, VAPID keys, all 7 SQL migrations in prod,
build green, 52 tests passing, CI pipeline green (build is hard gate).

---

## Pre-Alpha Gates (F1–F6)

**Do not send alpha invites until all 6 are ✅.**

| Gate | Status | Notes |
|------|--------|-------|
| F1 — Founder E2E on iPhone | ⬜ | Do next — fresh signup to logged session |
| F2 — 3-person alpha test | ⬜ | After F1 |
| F3 — Lighthouse ≥80 mobile | ⬜ | After F1 |
| F4 — Sentry receiving events | ⬜ | Quick check |
| F5 — Infrastructure | ✅ | All migrations confirmed |
| F6 — Alpha invite list (10–20 runners) | ⬜ | Prepare names |

---

## F1 — Founder E2E Checklist (do on iPhone, nextsplit.app)

**Part A — Fresh signup**
- [ ] Visit nextsplit.app → landing page looks correct (dark, cyan accent)
- [ ] Tap "Get started free" → auth/signup loads
- [ ] Sign up with a new email → redirects to /onboarding
- [ ] Complete onboarding (pick Predetermined path, select a plan)
- [ ] Land on /home → Home tab shows correct state

**Part B — Home tab**
- [ ] Wordmark "NextSplit" is cyan
- [ ] XP bar + streak visible in header
- [ ] Hero card shows appropriate state (new user OR training day)
- [ ] Bottom nav shows Home / Train / Explore / You in correct colours
- [ ] Tapping each tab navigates correctly

**Part C — Train tab**
- [ ] Today's sessions show as full-colour hero cards
- [ ] Stats strip visible (weekly km, ACWR, streak)
- [ ] Full plan weeks visible below
- [ ] Tap a session → log modal opens
- [ ] Log a session → XP floats, undo toast appears
- [ ] Session marked done ✓

**Part D — Explore tab**
- [ ] 4 tabs: Coaches / Squads / Plans / AI
- [ ] Coaches tab shows (even if empty)
- [ ] Squads tab — "Start a squad" and "Join a squad" CTAs visible
- [ ] Plans tab shows marketplace + premium upsell
- [ ] AI tab — send a message, get a response
- [ ] BottomNav visible on all Explore sub-pages

**Part E — You tab**
- [ ] Opens on Achievements tab (not Character)
- [ ] Stats and history links visible
- [ ] Settings accessible
- [ ] Dark mode toggle works and persists across page changes

**Part F — Dark mode**
- [ ] Dark is default on fresh visit
- [ ] Toggle in Settings → light mode works
- [ ] Switching tabs does NOT flip between modes

**Part G — Notifications**
- [ ] Settings → Notifications → enable push
- [ ] Receive a test notification (or verify VAPID working)

---

## Immediate Founder Actions

| Action | Status |
|--------|--------|
| ICO registration (ico.org.uk, £40) | ⬜ |
| Companies House (£12) | ⬜ |
| Update privacy policy with ICO number | ⬜ |
| Buy nextsplit.co.uk (~£5) | ⬜ |
| Create Supabase staging project | ⬜ |
| F1 E2E test on iPhone | ⬜ Next |

---

## Phase H — Revenue Activation

**Gate in:** Day 30 retention ≥ 40% from alpha

**Before flipping the switch:**
- ✅ Server-side subscription check on all AI routes (Phase I complete)
- Add Stripe keys to Vercel (4 env vars)
- Create Stripe products: Premium £7.99/mo, £59.99/yr; Coach Pro £19.99/mo
- Test all Stripe flows end-to-end on staging

**The switch:**
- `NEXT_PUBLIC_PREMIUM_ENFORCED=true`
- `NEXT_PUBLIC_REFERRAL_ENABLED=true`

---

## Phase J — Post-Beta Engineering

- Full aria-label audit (non-close buttons — 500+ remaining)
- Typed Supabase client (run gen-types.sh, replace 69 remaining as any)
- CSP nonces for Sentry/inline scripts
- App-layer rate limiting on auth routes (Upstash/Vercel KV)
- Supabase staging environment
- Load test: concurrent user ceiling
- Lighthouse ≥ 90 all key routes
- Bundle size analysis
- Race Together feature
- TrainingPeaks / CSV import
- App Store / Google Play
- Corporate squad accounts

---

## Environment Variables — All Set ✅ (except Stripe)

| Variable | Status |
|----------|--------|
| NEXT_PUBLIC_SUPABASE_URL | ✅ |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✅ |
| SUPABASE_SERVICE_ROLE_KEY | ✅ |
| RESEND_API_KEY | ✅ |
| CRON_SECRET | ✅ |
| NEXT_PUBLIC_SITE_URL | ✅ nextsplit.app |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | ✅ |
| VAPID_PRIVATE_KEY | ✅ |
| ANTHROPIC_API_KEY | ✅ |
| ADMIN_EMAILS | ✅ |
| VERCEL_TOKEN | ✅ |
| STRIPE_SECRET_KEY | ❌ Before Phase H |
| STRIPE_PUBLISHABLE_KEY | ❌ Before Phase H |
| STRIPE_WEBHOOK_SECRET | ❌ Before Phase H |
| STRIPE_CONNECT_CLIENT_ID | ❌ Before Phase H |
| NEXT_PUBLIC_PREMIUM_ENFORCED | false → true at Phase H |
| NEXT_PUBLIC_REFERRAL_ENABLED | false → true at Phase H |

---

## Key Files

| File | Purpose |
|------|---------|
| MASTER-DELIVERY-PLAN-V3.md | This file |
| src/app/home/HomeClient.tsx | Smart Home dashboard |
| src/app/train/TrainClient.tsx | Merged Today + Plan tab |
| src/app/explore/ExploreClient.tsx | Discovery tab |
| src/lib/rateLimit.ts | Rate limiting utility |
| src/lib/serverSubscription.ts | Server-side ProGate |
| src/lib/schemas.ts | All Zod schemas |
| src/components/BottomNav.tsx | 4-tab nav |
| supabase/migrations/ | All SQL migrations |

## Test Account
- Email: nextsplitplans@gmail.com
- Profile ID: 71ac42c2-543a-4672-ac34-e8221c5f071d
