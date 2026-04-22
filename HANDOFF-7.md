# NextSplit — HANDOFF-7
**Version:** 7.4 | **April 2026** | **Session: Three Pillars Build — Phase SL1 Complete**
**Live URL:** https://nextsplit-v2.vercel.app
**GitHub:** https://github.com/NextSplit/Nextsplit-v2
**Stack:** Next.js 15 App Router · TypeScript strict · Supabase · Tailwind · CSS vars · PWA · Anthropic SDK

---

## Current Phase: SL1 Complete → SL2 Next

Phase SL1 (Split Leader Foundation) is complete and deployed (commit `285afad`).
Phase SL2 (Split Leader Depth — Trophy Room, seasons, public pages, avatar crown) is next.

**Canonical strategy docs:**
- `THREE-PILLARS-STRATEGY.md` — full spec for all three pillars
- `MASTER-DELIVERY-PLAN-V2.md` — phase order, SQL, acceptance criteria

---

## Design Tokens (never deviate)

```css
--ns-forest:       #2b5c3f   (primary brand, Forest green)
--ns-ember:        #e85d26   (CTA, active states)
--ns-track:        #c49a3c   (Split Leader gold, achievements)
--ns-night:        #2c3e50   (dark backgrounds)
--ns-forest-light: #edf4f0   (light forest tint)

/* Dark theme (active globally) */
--color-bg:           #0f1a14   (deep forest night)
--color-surface:      #162a1e   (card surface)
--color-surface-2:    #1e3829   (elevated surface)
--color-surface-3:    #243f2f   (highest surface)
--color-text-primary: #e8f5ee   (warm light green-white)
--color-text-secondary: #8db89a (muted green)
--color-text-tertiary:  #5a8a6a (subtle)
--color-border:       #1e3829
--color-border-2:     #2b5c3f
```

**Fonts:** Outfit (body · `font-body`) · Cormorant Garamond (display · `font-display`) · JetBrains Mono (data · `font-data`)

**Pillar colour identity:**
- Solo/Bespoke → Forest green `#2b5c3f`
- Split Leader → Track gold `#c49a3c`
- Coaching → Deep navy `#1e3a5f`

---

## Three Pillars — Strategic Summary

### Pillar 1: Bespoke Digital Coaching
Predetermined plans (36 templates, VDOT-personalised) + AI-generated plans + coach-authored plans. Plans adapt to real life via the adaptation engine.

### Pillar 2: Split Leader (PRIMARY GROWTH ENGINE)
Premium unlock. Lead a private squad of up to 5 friends. Track gold colour. Crown avatar accessory. Squad goals, Trophy Room, seasons, nudges, milestone reactions. Referral reward: 1 free month per squad member who converts to Premium (max 5).

**Free vs Premium squad member:**
- Free: can join, see collective stats, receive nudges, react to milestones
- Premium: + individual member stats, Trophy Room, seasons, leaderboard, leadership claim

### Pillar 3: Coaching Marketplace + Hub
Athlete discovery: find/preview/hire verified coaches. Coach business tools: athlete management, plan builder (granular), templates, messaging, voice notes, earnings dashboard. Commission: 15%→8% sliding scale. Coach Pro: £19.99/mo (scheduled messages, bulk tools, advanced analytics).

---

## All Decisions Locked

| Decision | Answer |
|---|---|
| Split Leader unlock | Automatic with Premium |
| Squad cap | 5 members max |
| Leader squad limit | 1 squad only |
| Squad member limit | Multiple squads allowed |
| Free member features | Join + collective stats + nudges + reactions (NOT individual stats, Trophy Room, seasons) |
| Voice notes | Standard coach (not Pro-gated) |
| Referral credits | Extend subscription (Stripe trial extension) |
| Organic joins | No leader credit — invite link required |
| Commission | 15%→12%→10%→8% (9/24/49/50+ clients) |
| Coach prices | Self-set (NextSplit shows market avg) |
| Verification | Credential upload + UKA API. Non-UK: self-declared + 3 reviews |
| Review unlock | After 50% programme completion |
| Dispute window | 7 days from purchase |
| Inactivity | 30-day warning → 6-month disband |
| Leadership transfer | Any Premium member can claim after 30-day leader inactivity |
| Member removal | Leader prompted at 45-day member inactivity |
| Annual pricing | £59.99/yr (37.5% saving vs £7.99/mo) |
| Corporate | Phase J — on roadmap, no trigger required |

---

## Complete Build State

### ✅ Phases A–F + UI Overhaul (all committed)

| Phase | Key work | Latest commit |
|---|---|---|
| A1 | Zod on all 27 API routes | e7daf56 |
| A2 | Cookie consent + legal pages + medical disclaimer | 58a2d6b |
| A3+A4 | AI plan review, onboarding PostHog events | f41639e |
| A5+A7 | Adaptation E2E test, NPS prompt | 6f07125 |
| B1-B5 | Coach squad, athlete drill-down, comms, marketplace | 43088f2 |
| C | 36 plan templates, VDOT, plan browser | 339f0ca |
| D1-D5 | Typography, teal→Forest colour purge, character SVG avatars | 87cb5d8 |
| E | Community feed + reactions, race leaderboard, milestone detection | ab4f41a |
| F | Pre-alpha quality gates, E2E tests, Lighthouse script | c0a9e65 |
| UI | Forest-dark theme throughout (auth, onboarding, all tabs) | ced8f89 |
| UI | Character avatar 180×220px mid-stride SVG | bc750fb |
| UI | Profile sub-tabs distinct themes | cd2af67 |
| UI | VDOT bug fix (reads correct column) | 12eaa3f |
| UI | Fuel tab actual content | 3ffa892 |
| UI | Explore tab (Coaches/Plans/AI Coach) | 8efe231 |
| UI | Notification guardrails reordered | bc750fb |
| UI | Session card, settings, community dark theme | 01a4b7e |
| Docs | Three Pillars strategy + master plan v3 | 294efdc |
| SQL | Squad system migration (8 tables, RLS, RPCs) | f3b0e92 |
| **SL1** | **Full Split Leader foundation** | **285afad** |

### ✅ Phase SL1 — Split Leader Foundation (285afad)

**API routes:**
- `GET/POST/PATCH /api/squad` — create/read/update squad
- `POST/DELETE /api/squad/members` — join/leave/remove
- `POST /api/squad/nudge` — send curated nudge (rate-limited)
- `GET /api/squad/invite` — public invite preview
- `GET /api/squad/stats` — monthly km via RPC

**UI pages:**
- `/squad` — dashboard (leader or member view) or Split Leader explainer
- `/squad/create` — 3-step wizard (name+colour → welcome → review)
- `/squad/join/[code]` — viral invite landing page

**Components:**
- `SquadDashboardClient.tsx` — captain's command centre
- `CreateSquadClient.tsx` — 3-step creation wizard
- `useSquad.ts` — squad state hook

**Shared lib:**
- `src/lib/squad-nudges.ts` — 8 curated nudge messages

**BottomNav:** Squad tab (CrownSimple icon) replaces Explore for athletes

### 🔴 SL2 — Next to build
- Squad Trophy Room (collective achievements)
- Squad seasons (monthly/annual/lifetime snapshots)
- Public squad page (`/squad/[slug]`)
- Leader crown avatar accessory (RPG)
- Community leaderboard crown indicator
- Squad-to-coach pipeline prompt (at 30d + full squad)
- Inactivity warnings + disband logic
- Leadership transfer mechanism
- Squad goals (monthly) with leader-set targets

---

## Critical Bug Fixes Applied

| Bug | Fix | Commit |
|---|---|---|
| VDOT paces had no effect | activate route now reads `recent_race_times` JSON | 12eaa3f |
| Predetermined plan showed same AI plan | Seed API fixed (ADMIN_EMAILS auth) | 8efe231 |
| Fuel tab showed training content | Added real fuel guide content | 3ffa892 |
| Notification guardrails wrong order | Rate limit → at_risk → quiet_hours | bc750fb |
| GitHub webhook broken | GitHub Actions deploy pipeline added | 5d3d9ac |
| Hourly cron blocked deploy | Removed (Hobby plan limit) | 15fdf2e |

---

## Pending Founder Actions

1. **Seed 36 plans** — `nextsplit-v2.vercel.app/admin/seed` → "Seed Plans Now"
2. **Run SL1 SQL** — `supabase/migrations/phase-sl1-squads.sql` ✅ DONE
3. **ICO registration** — ico.org.uk — £40
4. **Company formation** — Companies House — £12
5. **RESEND_API_KEY** — add to Vercel env vars
6. **Promote latest Vercel deployment** after each GitHub Actions build

---

## Deploy Pipeline

GitHub Actions → Vercel (webhook was broken, pipeline added).

**Push → GitHub Actions builds (~2 min) → appears in Vercel Deployments → promote to production**

Workflow: `.github/workflows/vercel-deploy.yml`
Requires: `VERCEL_TOKEN` secret in GitHub repo settings ✅

**Environment Variables (Vercel Production):**
```
NEXT_PUBLIC_SUPABASE_URL          ✅
NEXT_PUBLIC_SUPABASE_ANON_KEY     ✅
SUPABASE_SERVICE_ROLE_KEY         ✅
ANTHROPIC_API_KEY                 ✅
ADMIN_EMAILS=nextsplitplans@gmail.com  ✅
NEXT_PUBLIC_PREMIUM_ENFORCED=false    ✅ (flip to true at Phase H)
NEXT_PUBLIC_REFERRAL_ENABLED=false    ✅ (flip to true at Phase H)
VERCEL_TOKEN                      ✅ (in GitHub secrets)
RESEND_API_KEY                    ❌ MISSING — add before email testing
STRIPE_SECRET_KEY                 ❌ MISSING — add at Phase H
```

---

## Key Files Reference

```
HANDOFF-7.md                              ← This file
THREE-PILLARS-STRATEGY.md                 ← Full product spec (canonical)
MASTER-DELIVERY-PLAN-V2.md               ← Phase order + SQL + economics
PRE-ALPHA-CHECKLIST.md                   ← F1-F6 founder gate
supabase/migrations/alpha-readiness.sql  ← Base migration (run ✅)
supabase/migrations/phase-sl1-squads.sql ← Squad tables (run ✅)

src/app/squad/                           ← All squad UI
src/app/api/squad/                       ← All squad API routes
src/hooks/useSquad.ts                    ← Squad state hook
src/lib/squad-nudges.ts                  ← Curated nudge messages
src/components/BottomNav.tsx             ← Squad tab added
src/app/globals.css                      ← Forest-dark theme vars
src/app/onboarding/                      ← All 4 onboarding paths
src/app/today/                           ← Today tab (core daily loop)
src/app/plan/                            ← Plan + Fuel tabs
src/app/profile/                         ← Character/Stats/Records
src/app/community/                       ← Community tabs
src/app/explore/                         ← Explore tab
src/app/coach/                           ← Coach platform
src/app/admin/                           ← Admin tools (seed, plan review, adapt test)
src/lib/vdot.ts                          ← VDOT pace calculator
src/lib/rpg.ts                           ← Runner class system
src/lib/schemas.ts                       ← All 28 Zod schemas
```

---

## Document Index

| # | Document | Purpose | Status |
|---|---|---|---|
| 1 | HANDOFF-7.md | Session state, all commits, pending actions | ✅ Current |
| 2 | THREE-PILLARS-STRATEGY.md | Full product spec — canonical | ✅ Current |
| 3 | MASTER-DELIVERY-PLAN-V2.md | Phase order, SQL, economics, env vars | ✅ Current |
| 4 | PRE-ALPHA-CHECKLIST.md | F1-F6 founder gate checklist | ✅ Current |
| 5 | supabase/migrations/alpha-readiness.sql | Base SQL migration | ✅ Run |
| 6 | supabase/migrations/phase-sl1-squads.sql | Squad system SQL | ✅ Run |
