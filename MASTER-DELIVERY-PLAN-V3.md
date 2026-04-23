# NextSplit — Master Delivery Plan
**Version:** 3.3 | **23 April 2026** | **End of Session 5**
**Status:** Living document — reviewed at milestones, not calendar dates

---

## Current Position

**All code complete. All SQL migrations confirmed in production. Build green.**
The only items standing between now and alpha invites are two founder admin
actions (ICO + Companies House) and the F1 E2E test on iPhone.

---

## Three Core Pillars

```
Pillar 1 — Bespoke Digital Coaching     ✅ BUILT + DEPLOYED
Pillar 2 — Split Leader                 ✅ BUILT + DEPLOYED + SQL IN PROD
Pillar 3 — Coaching Marketplace + Hub  ✅ BUILT + DEPLOYED + SQL IN PROD
```

---

## Full Build Status

### ✅ Core Product

| Feature | Status |
|---------|--------|
| Auth (email + Google OAuth) | ✅ |
| All 4 onboarding paths | ✅ |
| VDOT pace personalisation | ✅ |
| 17+ seeded plan templates | ✅ |
| Today tab — full daily loop | ✅ |
| Plan tab — inline expand | ✅ |
| Log modal — all modes | ✅ |
| Date navigation | ✅ |
| Plan adaptation engine | ✅ |
| Character system | ✅ |
| Plan history | ✅ |
| Personal bests | ✅ |
| Strava sync | ✅ |
| Offline queue | ✅ |
| Nutrition tab | ✅ |

### ✅ Social / Split Leader

| Feature | Status |
|---------|--------|
| Squad creation flow | ✅ |
| Invite landing page (/squad/join/[code]) | ✅ |
| Squad join (logged in + logged out) | ✅ |
| Squad dashboard | ✅ |
| Squad leaderboard | ✅ |
| Nudge system | ✅ |
| Inactivity monitoring | ✅ |
| Leadership transfer | ✅ |
| Trophy room | ✅ |
| Squad seasons | ✅ |
| Squad achievements | ✅ |
| Community feed | ✅ |
| Public profiles | ✅ |
| **SQL in production** | ✅ All 8 squad tables confirmed |

### ✅ Coaching Platform

| Feature | Status |
|---------|--------|
| Coach setup / apply | ✅ |
| Coach public profile | ✅ |
| Coach browse + filter | ✅ |
| Hire flow | ✅ |
| Athlete invite + accept | ✅ |
| Coach squad view | ✅ |
| Voice messages | ✅ |
| Coach messaging + read receipts | ✅ |
| Message reactions | ✅ |
| Scheduled messages (Coach Pro gated) | ✅ |
| Plan builder | ✅ |
| Coach annotations + broadcast | ✅ |
| Coach digest preferences | ✅ |
| Athlete capacity management | ✅ |
| Coach earnings dashboard | ✅ |
| Stripe Connect (payouts) | ✅ |
| Commission model | ✅ |
| Coach Pro subscription | ✅ |
| Coach dispute resolution | ✅ |
| **SQL in production** | ✅ All coaching tables confirmed |

### ✅ Notifications + Comms

| Feature | Status |
|---------|--------|
| Push notifications (8 types) | ✅ VAPID keys set |
| Per-type preferences + quiet hours | ✅ |
| Email notifications (5 types) | ✅ coach@nextsplit.app |
| Lifecycle emails (7-email sequence) | ✅ |
| GitHub Actions daily cron | ✅ 9am UTC |
| Splity character (4 moods) | ✅ |

### ✅ Revenue Infrastructure (not yet activated)

| Feature | Status |
|---------|--------|
| Stripe checkout + webhook + portal | ✅ |
| Stripe Connect (coach payouts) | ✅ |
| ProGate component | ✅ |
| Feature flags (PREMIUM_ENFORCED, REFERRAL_ENABLED) | ✅ Both false |
| Referral system | ✅ Behind flag |
| Plan marketplace | ✅ |

### ✅ Security + Legal

| Feature | Status |
|---------|--------|
| HTTP security headers | ✅ vercel.json |
| All domain refs → nextsplit.app | ✅ |
| Zero console.log in production | ✅ All → Sentry |
| Voice messages IDOR fixed | ✅ |
| Squad invite privacy | ✅ |
| Admin gate on sensitive routes | ✅ |
| aria-labels on close/nav buttons | ✅ |
| Privacy policy (ICO placeholder) | ✅ |
| Medical disclaimer | ✅ |
| Cookie consent | ✅ |
| Data export + account deletion | ✅ |

### ✅ Infrastructure

| Item | Status |
|------|--------|
| nextsplit.app → Vercel | ✅ |
| www.nextsplit.app → Vercel | ✅ |
| Resend verified (coach@nextsplit.app) | ✅ |
| CRON_SECRET in Vercel + GitHub | ✅ |
| NEXT_PUBLIC_SITE_URL set | ✅ |
| VAPID keys set | ✅ |
| SQL migrations (all 5 phases) | ✅ Confirmed in prod |
| pre-alpha-fixes.sql (ai_usage, notif columns) | ✅ |
| Build green (commit 3a03f60+) | ✅ |
| 52 tests passing | ✅ |

---

## What Is NOT Built

| Item | Phase | Notes |
|------|-------|-------|
| TrainingPeaks / CSV / Garmin import | Phase I | Not started |
| Content-Security-Policy header | Phase I | Removed — needs careful re-add |
| Typed Supabase client | Phase I | 194 `as any` casts remain |
| Rate limiting on auth routes | Phase I | Supabase handles some |
| Server-side ProGate enforcement | Before Phase H | Client-side only |
| Supabase staging environment | Before beta | One project for all envs |
| ESLint no-console rule | Phase I | Prevents future regressions |
| Race Together | Phase I | Not started |
| App Store / Google Play | Phase I | Not started |
| Corporate squad accounts | Phase J | Not started |

---

## Audit Findings Tracker

### Critical — All Resolved ✅
| ID | Finding | Status |
|----|---------|--------|
| C1 | Security headers missing | ✅ vercel.json |
| C2 | VAPID keys missing | ✅ Set in Vercel |
| C3 | Old domain hardcoded | ✅ All → nextsplit.app |
| C4 | Unvalidated API routes | ✅ Mostly fixed (3 remain: ai/fuel, coach/apply, stripe/checkout → Phase I) |

### High
| ID | Finding | Status |
|----|---------|--------|
| H1 | 194 TypeScript `as any` casts | ⬜ Phase I — generate typed Supabase client |
| H2 | console.log/error in production | ✅ Zero remaining |
| H3 | Voice messages IDOR | ✅ Fixed |
| H4 | Rate limiting on auth routes | ⬜ Phase I |
| H5 | ICO + Companies House | ⬜ Founder action — do tonight |

### Medium
| ID | Finding | Status |
|----|---------|--------|
| M1 | Privacy policy wrong domain | ✅ Fixed + ICO placeholder |
| M2 | Coaches endpoint public | ✅ Accepted — intentional |
| M3 | Squad invite leaks member data | ✅ Fixed |
| M4 | Buttons missing aria-label | ✅ Critical ones fixed; full audit Phase I |
| M5 | ProGate client-side only | ⬜ Fix before Phase H |
| M6 | No staging environment | ⬜ Before beta |
| M7 | Offline queue unverified | ✅ Confirmed working |

### Low
| ID | Finding | Status |
|----|---------|--------|
| L1 | Old domain in share card | ✅ Fixed |
| L2 | NEXT_PUBLIC_SITE_URL not set | ✅ Fixed |
| L3 | Stripe keys not set | ⬜ Before Phase H |
| L4 | nextsplit.co.uk not purchased | ⬜ ~£5, do soon |
| L5 | SQL column migration missing | ✅ Fixed |

---

## Immediate Actions (Founder — do tonight)

| Action | Where | Cost | Time |
|--------|-------|------|------|
| ICO registration | ico.org.uk | £40 | 20 min |
| Companies House | companieshouse.gov.uk | £12 | 20 min |
| Update privacy policy with ICO number | After above | — | 2 min |
| Buy nextsplit.co.uk | Any registrar | ~£5 | 5 min |

---

## F1–F6 Pre-Alpha Gates

**Do not send alpha invites until all 6 are ✅.**

| Gate | Status | Blocker |
|------|--------|---------|
| F1 — Founder E2E on iPhone | ⬜ | Do next session |
| F2 — 3-person alpha test | ⬜ | After F1 |
| F3 — Lighthouse (mobile 4G, ≥80) | ⬜ | After F1 |
| F4 — Sentry receiving events | ⬜ | Quick check |
| F5 — Infrastructure | 🟡 | ICO pending only |
| F6 — Alpha invite list (10–20 runners) | ⬜ | Prepare names |

---

## Phase G — Closed Alpha

**Gate in:** F1–F6 all ✅
**Gate out:** Day 30 retention ≥ 40%

- 10–20 runners: 2 beginner / 12 intermediate / 6 advanced. At least 2 with coaching experience.
- Daily PostHog targets: sessions/user/week ≥ 3, Day 7 retention ≥ 55%, onboarding completion ≥ 80%, NPS ≥ 40
- Fix protocol: P0 = same day, P1 = 48hrs, feature requests = log only

---

## Phase H — Revenue Activation

**Gate in:** Day 30 retention ≥ 40%

**Before flipping the switch:**
- ✅ Fix M5 — add server-side subscription check on all AI API routes
- Add Stripe keys to Vercel (4 env vars)
- Create Stripe products: Premium £7.99/mo, £59.99/yr; Coach Pro £19.99/mo
- Test all Stripe flows end-to-end

**The switch:**
- Set `NEXT_PUBLIC_PREMIUM_ENFORCED=true`
- Set `NEXT_PUBLIC_REFERRAL_ENABLED=true`

**Free tier:** predetermined plans, basic logging, community read-only
**Premium:** AI coaching, adaptation, full analytics, Strava sync, Split Leader

---

## Phase I — Post-Alpha Engineering

**Gate in:** Phase H live and stable

### I1 — Security Debt
- CSP header (Content-Security-Policy) — add carefully, test all integrations
- ESLint `no-console` rule in eslint.config.mjs
- Zod validation on 3 remaining routes (ai/fuel, coach/apply, stripe/checkout)
- Full aria-label audit (425 buttons remaining)
- App-layer rate limiting on auth routes (Upstash / Vercel KV)

### I2 — Type Safety
- Run `bash scripts/gen-types.sh` → generates `src/types/supabase-generated.ts`
- Replace all 194 `(supabase as any)` patterns with typed client
- Eliminates entire class of silent runtime errors on schema changes

### I3 — Infrastructure
- Supabase staging project + Vercel preview environments pointing at it
- Load test: max concurrent users before degradation

### I4 — Features
- Race Together (external race data API)
- TrainingPeaks / CSV import for coaches
- Coach marketplace public launch (remove invite-only gate)
- Strava sync improvements
- App Store / Google Play (if PWA installs are low)

### I5 — Performance
- Lighthouse ≥ 90 on all key routes
- Bundle size analysis + tree-shaking
- Image optimisation audit

---

## Phase J — Corporate + Scale

**Gate in:** 500+ active users, stable revenue

- Corporate squad accounts (up to 50 members)
- Company branding + HR dashboard
- Per-seat pricing (£5/seat at 20+, £3.50/seat at 100+)
- API for HR system integration
- Race Together full build

---

## Revenue Projections

| Stage | Users | MRR |
|-------|-------|-----|
| Alpha (now) | 20 | £0 |
| Phase H live | 100 | ~£600 |
| 6 months | 500 | ~£2,000 |
| Year 1 | 1,500 | ~£7,500 |
| Year 2 | 5,000 | ~£28,000 |

**Split Leader flywheel (Year 2):** 120 active leaders → 240 Premium conversions at £0 CAC. Lower churn through squad accountability.

**Coach revenue (Year 2):** ~£3,600/mo commission + £400/mo Coach Pro = ~£4,000 additional MRR.

---

## Environment Variables

| Variable | Status |
|----------|--------|
| NEXT_PUBLIC_SUPABASE_URL | ✅ |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✅ |
| SUPABASE_SERVICE_ROLE_KEY | ✅ |
| RESEND_API_KEY | ✅ |
| CRON_SECRET | ✅ Vercel + GitHub |
| NEXT_PUBLIC_SITE_URL | ✅ nextsplit.app |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | ✅ |
| VAPID_PRIVATE_KEY | ✅ |
| ANTHROPIC_API_KEY | ✅ |
| ADMIN_EMAILS | ✅ |
| VERCEL_TOKEN | ✅ GitHub secrets |
| STRIPE_SECRET_KEY | ❌ Before Phase H |
| STRIPE_PUBLISHABLE_KEY | ❌ Before Phase H |
| STRIPE_WEBHOOK_SECRET | ❌ Before Phase H |
| STRIPE_CONNECT_CLIENT_ID | ❌ Before Phase H |
| NEXT_PUBLIC_PREMIUM_ENFORCED | false → true at Phase H |
| NEXT_PUBLIC_REFERRAL_ENABLED | false → true at Phase H |

---

## Tech Stack (Locked)

| Layer | Choice |
|-------|--------|
| Backend | Supabase (Postgres + Auth + Storage + Realtime) |
| Frontend | Next.js 15 App Router + TypeScript |
| Styling | Tailwind + CSS vars |
| Payments | Stripe + Stripe Connect |
| Email | Resend (coach@nextsplit.app) |
| Analytics | PostHog |
| Errors | Sentry (client + server + edge) |
| Deploy | Vercel + GitHub Actions |
| AI | Anthropic Claude API |
| Push | Web Push API (VAPID) |
| Storage | Supabase Storage |

---

## Key Commands

```bash
cd /home/claude/nextsplit-v2
npm test                      # 52 passing
npx tsc --noEmit              # TypeScript check
bash scripts/gen-types.sh     # Generate typed Supabase client (Phase I)
```

## Test Account
- Email: nextsplitplans@gmail.com
- Profile ID: 71ac42c2-543a-4672-ac34-e8221c5f071d
- Squad "Tatata" exists
- notifications_enabled = true

## Document Index
| File | Purpose |
|------|---------|
| MASTER-DELIVERY-PLAN-V3.md | This file |
| PRE-ALPHA-CHECKLIST.md | F1–F6 founder gate |
| supabase/migrations/ | All SQL migrations |
| scripts/gen-types.sh | Supabase type generation (Phase I) |
| nextsplit-audit.md | Session 5 security audit |
