# NextSplit — Master Handoff
**Version:** 9.1 | **6 May 2026** | **Canonical — replaces all previous HANDOFF files**
<!-- 9.1: deploy unblocked — Session 9's "webhook broken" theory was wrong, real cause was Hobby cron-tier validation. Fixed by reducing smart-notify to once daily. -->
**Live URL:** https://nextsplit.app
**GitHub:** https://github.com/NextSplit/Nextsplit-v2
**Stack:** Next.js 15 App Router · TypeScript strict · Supabase · Tailwind · CSS vars · PWA · Anthropic SDK

> Previous handoffs (HANDOFF.md through HANDOFF-8.md) are archived in `/docs/archive/`.
> This is the single source of truth going forward.

---

## ✅ Deploy Pipeline — Unblocked (6 May 2026)

**Status:** Auto-deploy on push to `main` is working again. Session 9's "Vercel webhook not firing" diagnosis was wrong from the start.

**Real root cause:** Vercel Hobby tier rejects any cron expression that fires more than once per day. `vercel.json` had `smart-notify` on `0 9,14,18 * * *` (3× daily, added in commit `b466b6f` Session 8). Every deploy from that commit onward failed at build-time validation with the error `Hobby accounts are limited to daily cron jobs.` Pushes were going through, GitHub was notifying Vercel, Vercel was building — and the build was dying silently at cron validation. The auto-deploy on `main` never surfaced the error in any UI Session 9 looked at; the failure only became visible when a PR was opened in Session 10 and the PR check showed "Vercel — Deployment failed".

**Fix:** commit `8b84582` reduced `smart-notify` to `0 14 * * *` (single 14:00 UTC fire). One push and every commit since `b466b6f` shipped in one go — Option E redesign, Splity, 4-tab nav, 20-feature build, plus Session 10's plan-activate and AI-plan fixes.

**Notification dispatch:** the `smart-notify` route at `src/app/api/cron/smart-notify/route.ts` was rewritten to suit the once-daily fire. Each user now gets at most one notification per day, prioritised:
- Sunday → "Weekly wrap" (regardless of log state)
- Mon–Sat with active plan and not logged today → "Keep the streak — log before evening"
- Otherwise → no notification

If you later upgrade to Vercel Pro and want to restore split morning/midday/evening dispatches, re-introduce the hour conditions and bump `vercel.json` back to a multi-fire schedule.

**Cleanup outstanding:**
- Close the Vercel support ticket — webhooks were never broken, no action needed from their side.
- The Session 9 diagnostic commits (`f4f6ff8`, `7e65a4c`, `8bcff06`, `e7a8bba`, `0ee3757`, `1f2e448`) are no-op chore commits and the GitHub Actions deploy-hook workflow they introduced is now redundant. Safe to leave for history; can be tidied up later.

---

## How to Start a New Session

Read this file. Then run:
```bash
cd /home/claude/nextsplit-v2
git pull origin main
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "Cannot find module\|jsx-runtime" | head -20
```

Then push any changes using:
```bash
git add -A && git commit -m "type: description"
git push https://ghp_YOUR_PAT@github.com/NextSplit/Nextsplit-v2.git main
```

**Deploy:** auto-deploy on push to `main` is working. PR checks surface Vercel build failures — if a check goes red, read the Vercel log first; don't reach for webhook diagnostics.

If you ever add a cron to `vercel.json`, it must fire **once per day or less** while we're on Hobby (e.g. `0 14 * * *` ✓, `*/30 * * * *` ✗, `0 9,14,18 * * *` ✗). Anything more frequent fails the deploy with `Hobby accounts are limited to daily cron jobs.`

---

## Product Position

**NextSplit** is a running training app built around social accountability. The core thesis: the number one predictor of long-term running consistency is having people who notice when you don't show up.

**Go-to-market strategy:** Athlete-first → athlete invites friends via squad → squad introduces coach → coach brings their full roster.

**Pricing:** Free tier (plans + basic logging) + Elite £7.99/mo founding price (AI coaching, ACWR, adaptive plans, squad leadership, coach marketplace). 500 founding member spots.

**Three pillars:**
1. **Bespoke digital coaching** — predetermined plans (17 templates), AI-generated plans, coach-authored plans. All VDOT pace-personalised.
2. **Squad / Split Leader** — private accountability squads of up to 5. Orbital UI, nudges, leaderboard, collective goals.
3. **Coaching marketplace** — verified coaches, plan marketplace, athlete management tools.

---

## Current App State (May 2026)

### Navigation
| Tab | Colour | Content |
|-----|--------|---------|
| 🏠 Home | `#00d4ff` cyan | Smart dashboard — 6 hero states, daily quests, streak widget |
| 📅 Train | `#ff3d6e` coral | SVG illustrated plan path + today sessions + week tap sheet |
| 🔍 Explore | `#7fff4d` lime | Coaches / Squads / Plans / AI — squad orbit if already in squad |
| ⭐ You | `#ffb800` amber | Achievements / Character / Stats / Account |

### Features Built ✅
| Feature | State | Notes |
|---------|-------|-------|
| Auth (email + Google OAuth) | ✅ Live | |
| Full onboarding (4 paths) | ✅ Live | Predetermined / AI bespoke / Manual / Lifestyle |
| Plan browser (17 templates) | ✅ Live | Filterable by distance, level, duration |
| Plan activation + VDOT personalisation | ✅ Live | Race date alignment warning |
| AI plan generation | ✅ Live | Claude Sonnet 4, 8000 token plans |
| Session logging (LogModal) | ✅ Live | Effort, km, pace, notes |
| Session celebration | ✅ Live | Full screen confetti, XP float, Splity, sound, haptics |
| SVG illustrated plan path | ✅ Live | 5 environments, animated runner, progress arcs |
| Week tap → session sheet | ✅ Live | Tap any week node to see sessions, tap to log |
| Daily quests | ✅ Live | 3 quests/day, XP rewards, progress bars |
| Streak widget | ✅ Live | Pulsing amber when active, red warning at evening |
| XP + levelling system | ✅ Live | 20 levels, runner classes |
| Squad orbital UI | ✅ Live | Circular orbit, swipe to focus, per-member stats |
| Squad member detail page | ✅ Live | 7-day heatmap, plan progress, nudge button |
| Nudge system | ✅ Live | 6 message options, rate-limited 1/day |
| Explore → squad inline | ✅ Live | Shows squad card if in squad, join/create if not |
| You tab (4 sub-tabs) | ✅ Live | Achievements / Character / Stats / Account |
| Dark-only visual system | ✅ Live | Deep navy `#0a0e1a` base, vivid accents, single mode |
| Bold & bright colour system | ✅ Live | Cyan/coral/cobalt/lime/amber/violet palette |
| Coach application flow | ✅ Live | Split Leader vs Professional coach |
| Plan browser (marketplace) | ✅ Live | Browse / My Plans tabs |
| AI coach chat | ✅ Live | In Explore → AI tab |
| Strava connect | ✅ Built | Not wired to env var |
| Push notifications | ✅ Built | VAPID, Android Chrome |
| PWA (installable) | ✅ Live | Manifest, service worker |
| UAT test suite | ✅ Built | Playwright + DB verify + 105 manual cases |
| Back buttons | ✅ Fixed | Coaches, squad create, settings |
| Re-onboarding | ✅ Fixed | Archive plan → skips to step 7 (Goals), not step 1 |

### Features Pending / Partial
| Feature | State | Notes |
|---------|-------|-------|
| Stripe payments | ⚠️ Partial | Code built, signed up to Stripe, keys not confirmed in Vercel |
| Resend email | ⚠️ Partial | Code built, key status unknown — needs confirming in Vercel |
| AI plan double sessions | ⚠️ Partial | Prompt fixed, needs testing with new plan generation |
| Plan activation error | ⚠️ Partial | Zod fix deployed, needs real-device confirmation |
| Squad/squad page 404 | ⚠️ Check | `/squad/` trailing slash issue |
| Strava OAuth | ⚠️ Built | Not connected to live Strava app |
| Coaching marketplace | ⚠️ Partial | UI built, no live coaches yet |
| ACWR chart | ⚠️ Unlocks | Shows after 4+ sessions logged |
| Lifecycle emails (cron) | ⚠️ Partial | Built, needs RESEND_API_KEY confirmed |

---

## Visual System (single mode — never change)

```css
/* Base */
--color-bg:           #0a0e1a;   /* Deep navy */
--color-surface:      #111827;
--color-surface-2:    #1a2235;
--color-surface-3:    #243048;
--color-border:       rgba(99,130,255,0.12);
--color-border-2:     rgba(99,130,255,0.22);
--color-text-primary:   #f8faff;
--color-text-secondary: rgba(248,250,255,0.72);
--color-text-tertiary:  rgba(248,250,255,0.38);

/* Brand colours */
--ns-cyan:    #00d4ff;   /* Brand anchor, Home tab */
--ns-ember:   #ff3d6e;   /* Athlete/CTA, Train tab */
--ns-cobalt:  #4d8aff;   /* Plan/data */
--ns-lime:    #7fff4d;   /* Squad, Split Leader */
--ns-amber:   #ffb800;   /* XP/gold, You tab */
--ns-violet:  #a855f7;   /* Coach */
--ns-forest:  #00e676;   /* Success/easy run */
--ns-magenta: #ff2d9e;   /* Level up, special moments */
```

**No light mode. No toggle. One consistent experience.**

---

## Environment Variables

### Confirmed in Vercel Production ✅
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
NEXT_PUBLIC_SENTRY_DSN
SENTRY_AUTH_TOKEN
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_PREMIUM_ENFORCED=false
ADMIN_EMAILS=nextsplitplans@gmail.com
```

### Needs Confirming / Adding ⚠️
```
STRIPE_SECRET_KEY              — signed up to Stripe, key needs adding to Vercel
STRIPE_WEBHOOK_SECRET          — set up after adding secret key
STRIPE_PRICE_FOUNDING_MONTHLY  — create price in Stripe dashboard
STRIPE_PRICE_FOUNDING_ANNUAL   — create price in Stripe dashboard
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
RESEND_API_KEY                 — check if this is in Vercel already
```

### Future (not needed yet)
```
NEXT_PUBLIC_REFERRAL_ENABLED=false  — flip to true when referral goes live
NEXT_PUBLIC_VAPID_PUBLIC_KEY        — for push notifications
```

---

## Database

**Production:** Supabase project `wlrmeiczqgmharvfmalq`
**Staging:** nextsplit-staging (separate project, same schema)

### Tables (all migrated ✅)
`profiles` · `user_plans` · `training_logs` · `plan_templates` · `squads` · `squad_members` · `squad_invites` · `squad_nudges` · `squad_feed` · `coach_profiles` · `coach_athletes` · `coach_messages` · `coaching_subscriptions` · `coach_earnings` · `ai_usage` · `notifications` · `push_subscriptions`

### Key RPCs
`computeStreakForUser` · `getACWR` · `can_nudge` · `marketplace_coaches` · `squad_monthly_km`

### Test Account
```
Email:    uat@nextsplit.app
Password: UATtest2026!
Created by: scripts/uat-db-verify.ts
```

---

## Key File Locations

```
src/app/home/HomeClient.tsx          Smart Home dashboard (6 states)
src/app/train/TrainClient.tsx        Train tab (path + today + week sheet)
src/app/explore/ExploreClient.tsx    Explore (4 tabs, inline squad)
src/app/profile/ProfileClient.tsx    You tab (4 sub-tabs)
src/app/squad/SquadPageClient.tsx    Squad page wrapper
src/app/squad/SquadOrbit.tsx         Circular orbital squad UI
src/app/squad/member/[userId]/       Member detail page
src/app/onboarding/                  All 4 onboarding paths
src/app/api/squad/                   Squad API routes
src/app/api/ai/                      AI routes (coach, generate, adapt)
src/app/api/plans/activate/          Plan activation
src/app/api/stripe/                  Stripe (checkout, webhook, connect, portal)

src/components/SessionCelebration.tsx  Full screen post-log celebration
src/components/DailyQuests.tsx         Daily quest strip
src/components/plan/PlanPathSVG.tsx    SVG illustrated plan path
src/components/LogModal.tsx            Session logging modal

src/lib/rpg.ts           XP, levels, runner classes
src/lib/vdot.ts          Pace calculator
src/lib/stripe.ts        Stripe singleton
src/lib/schemas.ts       All Zod schemas
src/lib/squad-nudges.ts  8 nudge message templates

src/hooks/useActivePlan.ts      Active plan + weeks data
src/hooks/useAllTrainingLogs.ts All logs for current user
src/hooks/useSquad.ts           Squad state
src/hooks/useProfile.ts         Profile + RPG data
src/hooks/useSubscription.ts    Pro/free status
```

---

## What's Next (Priority Order)

### Pre-Alpha Prep
1. **Verify nextsplit.app shows redesign** — deep navy, Splity in hero, 4-tab nav without labels (deploy is now live, refresh and confirm)
2. **Confirm Stripe keys in Vercel** — already in env vars list, double-check working
3. **Confirm Resend key in Vercel** — already in env vars list, test send
4. **Test plan activation on device** — Session 10 added `details[]` surfacing in all 5 callers, so any future Zod failure now shows the failing field name in the error message
5. **Test AI plan generation** — confirm double-session gym days render correctly. Session 10 fixed the session-shape mismatch (AI was emitting `{type, name, detail}`, app reads `{c, n, det}`); plans now go through `normalizeAIWeeks()` before insert
6. **Smart-notify** — single 14:00 UTC fire. Sundays send "Weekly wrap"; other days send "Keep the streak" if user has an active plan and hasn't logged. One notification per user per day, max

### Short Term — Before Friend Test
6. **Founder F1 test** — 4-5 friends on real Android devices, multiple accounts, full flow
7. **Fix any blockers** found in F1 test
8. **Run UAT DB verify** — `SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/uat-db-verify.ts`

### Medium Term — After Friend Test
9. **Stripe payments live** — flip `NEXT_PUBLIC_PREMIUM_ENFORCED=true`, test checkout flow
10. **Wider alpha invite** — 10-20 runners, mix of experience levels
11. **Sentry review** — check what errors are being captured
12. **Lighthouse audit** — target ≥80 performance on Home and Train

### Longer Term — Post Alpha
13. **Squad Trophy Room** — collective achievements
14. **Squad seasons** — monthly/annual leaderboard resets
15. **Coaching marketplace live** — need at least 2 verified coaches
16. **Strava OAuth live** — connect to live Strava app credentials
17. **Company formation** — Companies House £12
18. **ICO registration** — ico.org.uk £40

---

## UAT Assets

```bash
# 1. Create test user + verify DB integrity
SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/uat-db-verify.ts

# 2. Run Playwright E2E suite
BASE_URL=https://nextsplit.app \
UAT_EMAIL=uat@nextsplit.app \
UAT_PASSWORD=UATtest2026! \
npx playwright test src/test/e2e/uat-full.spec.ts

# 3. View HTML report
npx playwright show-report

# Manual: UAT-SCRIPT-V1.md — 105 test cases across 10 sections
```

---

## Commit History (Sessions 8–10, May 2026)

### Session 10 (6 May 2026) — Deploy unblocked + plan-activate hardening + AI plan normalize

| Commit | Description |
|--------|-------------|
| `8b84582` | fix: reduce smart-notify cron to once daily (`0 14 * * *`) — the actual fix that unblocked auto-deploy. Hobby tier rejects multi-fire crons |
| `3245781` | fix: surface Zod `details[]` in all 5 plan-activate callers (PlanBrowse, AI/Manual/Lifestyle onboarding, PlanGenerationScreen) + add `normalizeAIWeeks()` to remap AI plan output `{type,name,detail}` → canonical `{c,n,det,km}` so gym pills, pace personalisation and session styling work on AI-generated plans |

### Session 9 (May 2026) — Deploy diagnosis (red herring)
Six commits pushed during a wrong-track investigation into "broken webhook delivery." None of them deployed because the real issue (Hobby cron-tier validation) was unrelated. Safe to leave on `main`; the GitHub Actions deploy-hook workflow they introduced is now redundant.

| Commit | Description |
|--------|-------------|
| `1f2e448` | ci: GitHub Action triggers Vercel deploy hook on every push (redundant — auto-deploy works fine) |
| `0ee3757` | ci: deploy workflow + HANDOFF |
| `f4f6ff8` | chore: verify deploy pipeline |
| `7e65a4c` | chore: verify Vercel auto-deploy after Git reconnect |
| `8bcff06` | chore: webhook test after Vercel GitHub App reinstall |
| `e7a8bba` | chore: deploy test after OAuth refresh |

### Session 8 (April–May 2026) — Redesign + features (now deployed via Session 10 fix)

| Commit | Description |
|--------|-------------|
| `0ee3757` | ci: deploy workflow + HANDOFF updated (no secrets in files) |
| `1f2e448` | CI: GitHub Action triggers Vercel deploy hook on every push |
| `926e6f9` | Fix: CSS @import order, useMyCoach confirmed fixed |
| `d400703` | Fix: useMyCoach import path (was blocking all builds) |
| `a02083b` | Feat: Strava auto-import, injury flag, training diary, training zones chart |
| `b466b6f` | Feat: 20-feature build — share card, weekly summary, pre-run brief, milestones, ElitePreview |
| `3d5218c` | Feat: Option E redesign — ultra-dark navy, Splity animated shoe, 4-tab nav, Home rebuild |

### Earlier (currently the live build on nextsplit.app)

| Commit | Description |
|--------|-------------|
| `d9cff8c` | feat: plan completion ceremony wired, squad leaderboard, onboarding final dark fixes, HeroNewUser Splity + AI-first, week completion detection |
| `1822dfa` | Daily quests, streak emotional widget, nudge wired, plan activation fix, onboarding polish (101 files) |
| `4965291` | Bold & bright visual system, week tap session sheet, ai_usage fix, AI plan generation fix |
| `5c87fc1` | Session celebration — confetti, XP float, level up, Splity, sound, haptics |
| `3b51b60` | SVG illustrated plan path — 5 environments, animated runner |
| `810c44a` | Dark-only mode, squad API includes leader, orbit full circle, Explore squad inline |
| `3b9ab86` | Visual plan path — winding path, week nodes, phase milestones |
| `45b9d22` | Squad orbital UI — circular orbit, swipe, member stats, invite slots |
| `f4da333` | Dark mode hydration fix, DarkModeToggle, LogModal safe area |
| `b61dc1c` | Full UAT suite — Playwright, DB verify, 105 manual cases |
| `1e5cd85` | Re-onboarding skips to step 7, handle check fix, handle pre-fill |
| `e4f1620` | Dark mode script, Home toggle, log modal, back buttons, gym double sessions |

---

## Business Context

- **Product:** NextSplit v2 (v1 frozen at nextsplit.github.io/NextSplit-Training-Tracker)
- **Founder:** Ash
- **Stage:** Pre-alpha, approaching friend test
- **Stripe:** Signed up, keys need confirming in Vercel
- **Legal:** Not yet incorporated. ICO and Companies House pending.
- **Pricing:** Elite £7.99/mo founding (500 spots), standard £9.99/mo. Annual £59.99/yr.
- **Coach pricing:** £29/mo platform fee for Pro coaches. 15%→8% sliding commission.
