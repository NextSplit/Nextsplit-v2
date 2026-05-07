# NextSplit — Master Handoff
**Version:** 9.3 | **7 May 2026** | **Canonical — replaces all previous HANDOFF files**
<!-- 9.3: claude/new-session-2Ldeo merged to main as PR #2 (3326449). Council/forge systems and all Session 10 work now on main. Vercel preview-vs-production tagging gotcha documented. -->
<!-- 9.2: post-deploy-unblock — visual redesign of PlanPathSVG via inaugural council pass; council and /forge multi-agent systems shipped as standard tooling. Three live-app UI fixes (header/modal/fuel) ahead of F1. -->
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

**Branch tagging gotcha (Session 11, 7 May):** Vercel only tags a build "Production" if its commit is on the production branch (`main`). Builds from `claude/*` feature branches succeed but get tagged "Preview" — they don't go to nextsplit.app on their own. Two ways to ship feature-branch work live: (a) **merge to `main` via PR** — preferred, keeps source of truth and live site aligned, and Vercel auto-promotes the merge; (b) **manually promote a Preview** from the deployment's `⋯` menu in Vercel — fast, but leaves `main` behind reality, so the next push to `main` will revert the live site.

Claude Code sessions auto-create a `claude/<task>-<hash>` branch and develop there. They never push to `main` directly. To ship: open a PR from the Claude branch to `main` and merge — that's what produces a Production deploy.

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

## Council & Forge — multi-agent review and ideation

The repo now has two slash commands backed by 24 agent charters in `.claude/agents/`:

- **`/council <proposal>`** — multi-agent **review**. Auto-detects scope, runs Tier A always-on (9 roles) plus Tier B auto-included (6 roles) in a two-round protocol; `ns-synthesizer` produces a SHIP / SHIP-WITH-FOLLOWUP / HOLD / ESCALATE verdict with forced pre-mortem.
- **`/forge <topic>`** — multi-agent **ideation**. Right-sized roster (LEAD generates, CONSULT adds lens), preset table maps topics to rosters; `ns-shortlister` produces a 2-4 option shortlist with named recommendation and pre-filled `/council` handoff.

Both systems are opt-in and built to right-size by default. See `.claude/agents/README.md` for the full system docs (when to use what, antagonist pairs, founder-override, output contracts).

The **inaugural council pass** ran on the PlanPathSVG redesign in Session 10 (commit `562a384`) — produced SHIP-WITH-FOLLOWUP with three pre-ship blockers all addressed, plus follow-up tickets (below) logged for post-F1.

## What's Next (Priority Order)

### Pre-Alpha Prep
1. **Verify nextsplit.app shows the latest redesign** — deep navy, Splity in hero, 4-tab nav without labels, **single violet finish arch framing single ember finish flag** (no more "three gates"), refined water surface, refined tree density. Refresh and confirm.
2. **Confirm Stripe keys in Vercel** — already in env vars list, double-check working
3. **Confirm Resend key in Vercel** — already in env vars list, test send
4. **Test plan activation on device** — Session 10 added `details[]` surfacing in all 5 callers, so any future Zod failure now shows the failing field name in the error message
5. **Test AI plan generation** — confirm double-session gym days render correctly. Session 10 fixed the session-shape mismatch (AI was emitting `{type, name, detail}`, app reads `{c, n, det}`); plans now go through `normalizeAIWeeks()` before insert
6. **Smart-notify** — single 14:00 UTC fire. Sundays send "Weekly wrap"; other days send "Keep the streak" if user has an active plan and hasn't logged. One notification per user per day, max
7. **3-template regression spot-check** for PlanPathSVG — 8wk 5K, 16wk half, 24wk marathon. Council follow-up. Visual sanity: one arch + one flag at the end; no overlapping trees; coastal water reads as a surface.

### Short Term — Before Friend Test
8. **Founder F1 test** — 4-5 friends on real Android devices, multiple accounts, full flow
9. **Fix any blockers** found in F1 test
10. **Run UAT DB verify** — `SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/uat-db-verify.ts`

### Medium Term — After Friend Test
11. **Stripe payments live** — flip `NEXT_PUBLIC_PREMIUM_ENFORCED=true`, test checkout flow
12. **Wider alpha invite** — 10-20 runners, mix of experience levels
13. **Sentry review** — check what errors are being captured
14. **Lighthouse audit** — target ≥80 performance on Home and Train
15. **PlanPathSVG `<animateMotion>` runner** — council-deferred PR-B; runner moves between completed nodes when a week is logged. Native SVG, no bundle cost; gate behind feature flag and `prefers-reduced-motion`.
16. **PlanPathSVG periodisation glyphs** — council follow-up from coach-domain-expert. Per-week node size scaled to weekly km / ACWR band; deload + taper weeks marked with distinct glyph; stadium zone alignment to taper duration by race distance.

### Longer Term — Post Alpha
17. **Full a11y retrofit on PlanPathSVG** — pre-paid-users. Week-node `role="button"` + `tabIndex` + visible focus ring + keyboard handlers; 4.5:1 contrast on number-on-coloured fills; full `<animate>` reduced-motion coverage. (Baseline already in: `role="img"` + `<title>`, 44×44 hit-rect, reduced-motion gate on pulse animation.)
18. **Squad Trophy Room** — collective achievements
19. **Squad seasons** — monthly/annual leaderboard resets
20. **Coaching marketplace live** — need at least 2 verified coaches
21. **Strava OAuth live** — connect to live Strava app credentials
22. **Company formation** — Companies House £12
23. **ICO registration** — ico.org.uk £40
24. **Pre-paid-users third-party security audit** — £500-2000, before flipping `NEXT_PUBLIC_PREMIUM_ENFORCED=true` and onboarding paying users. The `ns-security-privacy` agent catches the common failures but is not a substitute for a real pentest.

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

## Commit History (Sessions 8–11, May 2026)

### Session 11 (7 May 2026) — Council/forge + Session 10 work merged to main

Session 10's work was confirmed live by manually promoting a Preview deployment to Production in Vercel (commit `a2d36e1`). After that, `claude/new-session-2Ldeo` was merged to `main` as PR #2, restoring source-of-truth alignment between `main`, the production branch, and nextsplit.app. The Vercel preview-vs-production tagging behaviour that caused the confusion is now documented in the Deploy section above.

| Commit | Description |
|--------|-------------|
| `3326449` | Merge pull request #2 from `NextSplit/claude/new-session-2Ldeo` — brings council, /forge, plan-path redesign, smart-notify cron fix, and HANDOFF v9.2 onto main |

### Session 10 (6 May 2026) — Deploy unblock + plan-activate hardening + visual redesign + council & forge multi-agent systems

The single most productive session of the project. Eight commits land together on merge.

| Commit | Description |
|--------|-------------|
| `3245781` | fix: surface Zod `details[]` in all 5 plan-activate callers (PlanBrowse, AI/Manual/Lifestyle onboarding, PlanGenerationScreen) + add `normalizeAIWeeks()` to remap AI plan output `{type,name,detail}` → canonical `{c,n,det,km}` so gym pills, pace personalisation and session styling work on AI-generated plans |
| `8b84582` | fix: reduce smart-notify cron to once daily (`0 14 * * *`) — the **actual** fix that unblocked auto-deploy. Hobby tier rejects multi-fire crons; Session 9's "webhook" diagnosis was wrong |
| `23a88ef` | docs: HANDOFF v9.1 — deploy unblocked, real root cause documented; ACTIVE BLOCKER section replaced with post-mortem |
| `1ebb0bf` | refactor: smart-notify dispatch consolidated for once-daily Hobby cron — Sundays send "Weekly wrap"; Mon-Sat with active plan and not-logged send "Keep the streak"; one notification per user per day max |
| `2942cda` | fix(train): solid sticky header (no more bleed-through), log modal clears bottom-nav (z-[60] + 60px+safe-area marginBottom on inner panels for all 4 mode branches), Fuel tab empty state (was rendering null when planDay.nut was empty) |
| `c786c5c` | feat: NextSplit council — 23 agent charters in `.claude/agents/` (Tier A always-on, Tier B auto-included by scope keyword/file matching, Knowledge-base dormant) + `/council` slash command running two-round protocol with `ns-synthesizer` producing SHIP/HOLD/ESCALATE verdict + forced pre-mortem |
| `562a384` | feat(plan-path): single composed finish moment (violet arch frames ember flag, deleted duplicate FINISH banner), water as `<pattern>` band (replaces N stacked Wave glyphs), forest density capped 6→4 trees per side, hex tokenised to `--ns-*` vars, role="img"+`<title>`, 44×44 hit-rect per week node, reduced-motion gate on pulse animation, 100dvh container + safe-area-inset-bottom — implements the inaugural council pass's SHIP-WITH-FOLLOWUP verdict |
| `e3d7408` | feat: NextSplit `/forge` ideation orchestrator (sibling to `/council`) — preset roster table maps topic-keyword sets to LEAD/CONSULT splits, two-round protocol with implicit cluster framing (STRATEGY/EXPERIENCE/ENGINEERING/DOMAIN/RISK), `ns-shortlister` produces 2-4 option shortlist with named recommendation and pre-filled `/council` handoff. Three modes: default, `--quick` (top 2 LEAD, single round), `--wide` (all 23, two rounds, auto-promoted by end-to-end keywords) |

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
