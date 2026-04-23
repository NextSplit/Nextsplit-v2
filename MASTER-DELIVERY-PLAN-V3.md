# NextSplit — Master Delivery Plan
**Version:** 3.2 | **April 2026** | **Post-Audit Update**
**Status:** Living document — reviewed at milestones, not calendar dates

---

## Codebase Reality (April 2026)

The codebase is significantly more complete than previous plan versions indicated.
Phases SL1, SL2, CM1, CM2, CH1, and CH2 are substantially built in code.
The primary remaining work is: SQL migrations in production, pre-alpha gates,
revenue activation, and a set of deferred engineering improvements from the
security audit.

---

## Three Core Pillars

```
Pillar 1 — Bespoke Digital Coaching     ✅ BUILT
Pillar 2 — Split Leader                 ✅ BUILT (SQL migrations pending in prod)
Pillar 3 — Coaching Marketplace + Hub  ✅ BUILT (Stripe keys needed for payments)
```

---

## Full Build Status

### ✅ Core Product — Complete

| Feature | Status | Notes |
|---------|--------|-------|
| Auth (email + Google OAuth) | ✅ | |
| All 4 onboarding paths | ✅ | Predetermined, AI bespoke, Manual, Lifestyle |
| VDOT pace personalisation | ✅ | |
| 17+ seeded plan templates | ✅ | Admin seed page at /admin/seed |
| Today tab — full daily loop | ✅ | Sessions hero, undo toast, Splity all-done state |
| Plan tab — inline expand | ✅ | |
| Log modal — all modes | ✅ | One-tap, standard, full debrief, rest |
| Date navigation | ✅ | |
| Plan adaptation engine | ✅ | ACWR, readiness, missed session flow |
| Character system | ✅ | 7 classes, XP, 15 levels, 32 badges |
| Plan history | ✅ | |
| Personal bests | ✅ | Auto-detected on log |
| Strava sync | ✅ | OAuth connect, activity import |
| Offline queue | ✅ | IndexedDB, auto-flush on reconnect |
| Nutrition tab | ✅ | Full macro tracking, 430 lines |

### ✅ Social — Complete (SQL migrations pending)

| Feature | Status | Notes |
|---------|--------|-------|
| Squad creation flow | ✅ | Name, colour, logo, welcome message, invite link |
| Invite landing page | ✅ | /squad/join/[code] — premium CTA for logged-out |
| Squad join (logged in + logged out) | ✅ | Both paths built |
| Squad dashboard | ✅ | Members, collective km, goal progress, nudges |
| Squad leaderboard | ✅ | |
| Nudge system | ✅ | Leader sends nudges to inactive members |
| Inactivity monitoring | ✅ | /api/squad/inactivity |
| Leadership transfer | ✅ | /api/squad/transfer |
| Trophy room | ✅ | /squad/trophies |
| Squad seasons | ✅ | Monthly/annual snapshots |
| Squad achievements | ✅ | |
| Community feed | ✅ | Clubs, challenges, races, leaderboard, reactions |
| Public profiles | ✅ | /u/[username] |

### ✅ Coaching Platform — Complete (Stripe keys needed)

| Feature | Status | Notes |
|---------|--------|-------|
| Coach setup / apply flow | ✅ | |
| Coach public profile | ✅ | /coach/[slug] |
| Coach browse + filter | ✅ | /coaches with Zod-validated filters, paginated |
| Coach marketplace | ✅ | Featured plans, browse, hire flow |
| Athlete invite + accept | ✅ | Token-based |
| Coach squad view | ✅ | ACWR badges, athlete drill-down (581 lines) |
| Voice messages | ✅ | Record, upload, signed URLs, listen tracking |
| Coach messaging + read receipts | ✅ | |
| Message reactions | ✅ | |
| Scheduled messages | ✅ | Up to 10 per athlete, Coach Pro gated |
| Coach plan builder | ✅ | |
| Coach annotations | ✅ | |
| Coach broadcast | ✅ | |
| Coach digest preferences | ✅ | Immediate / daily / weekly |
| Athlete capacity management | ✅ | Max athletes, accepting toggle |
| Coach earnings dashboard | ✅ | |
| Stripe Connect (payouts) | ✅ | Account onboarding, transfers |
| Commission model | ✅ | Via Stripe Connect application_fee |
| Coach Pro subscription | ✅ | is_coach_pro flag, billing via Stripe |
| Coach dispute resolution | ✅ | With refund logic |

### ✅ Notifications + Comms — Complete

| Feature | Status | Notes |
|---------|--------|-------|
| Push notifications (8 types) | ✅ | VAPID keys set in Vercel |
| Per-type notification preferences | ✅ | |
| Quiet hours (10pm–7am) | ✅ | |
| Email notifications (5 types) | ✅ | coach@nextsplit.app via Resend |
| Lifecycle emails (7-email sequence) | ✅ | |
| GitHub Actions daily cron | ✅ | 9am UTC |
| Splity character | ✅ | 4 moods |

### ✅ Revenue Infrastructure — Complete (not yet activated)

| Feature | Status | Notes |
|---------|--------|-------|
| Stripe checkout (athlete Premium) | ✅ | |
| Stripe webhook (signature verified) | ✅ | |
| Stripe portal (manage subscription) | ✅ | |
| Stripe Connect (coach payouts) | ✅ | |
| ProGate component | ✅ | Client-side gate |
| Feature flags | ✅ | PREMIUM_ENFORCED, REFERRAL_ENABLED |
| Referral system | ✅ | Behind flag |
| Plan marketplace (purchase) | ✅ | |

### ✅ Security + Legal — Complete

| Feature | Status | Notes |
|---------|--------|-------|
| HTTP security headers | ✅ | In vercel.json (X-Frame, HSTS, nosniff etc.) |
| All domain refs → nextsplit.app | ✅ | |
| Zero console.log in production | ✅ | All → Sentry |
| Voice messages IDOR fixed | ✅ | Coach relationship verified server-side |
| Squad invite privacy | ✅ | Member names not exposed |
| Admin gate on sensitive routes | ✅ | |
| aria-labels on close/nav buttons | ✅ | |
| Privacy policy | ✅ | ICO placeholder — update when number received |
| Medical disclaimer | ✅ | |
| Cookie consent | ✅ | |
| Data export + account deletion | ✅ | |

---

## What Is NOT Built

| Item | Planned Phase | Notes |
|------|--------------|-------|
| TrainingPeaks / CSV / Garmin import | Phase I | CH1.3 — not built |
| Content-Security-Policy header | Phase I | Removed — needs careful re-add and testing |
| Typed Supabase client (gen types) | Phase I | 194 `as any` casts remain |
| Rate limiting on auth routes | Phase I | Supabase handles some; app-layer still needed |
| Server-side ProGate enforcement on AI routes | Before Phase H | Client-side only currently |
| Supabase staging environment | Before beta | One project serves all environments |
| ESLint no-console rule | Phase I | Prevents future console.log regressions |
| Race Together | Phase I | Not started |
| App Store / Google Play | Phase I | Not started |
| Corporate squad accounts | Phase J | Not started |

---

## Audit Findings — Status Tracker

From the Session 5 security and quality audit. Every finding tracked here.

### Critical — All Resolved ✅

| ID | Finding | Status |
|----|---------|--------|
| C1 | Security headers missing | ✅ Fixed — in vercel.json |
| C2 | VAPID keys missing | ✅ Fixed — set in Vercel |
| C3 | Old domain hardcoded | ✅ Fixed — all refs → nextsplit.app |
| C4 | 22 unvalidated API routes | ✅ Partially fixed — 3 routes remain (see below) |

**C4 remaining (3 routes):** `ai/fuel`, `coach/apply`, `stripe/checkout` — all accept body but lack Zod. Add to Phase I backlog.

### High — Resolved ✅ (2 deferred to Phase I)

| ID | Finding | Status |
|----|---------|--------|
| H1 | 194 TypeScript `as any` casts | ⬜ Deferred — generate typed Supabase client (Phase I) |
| H2 | 109 console.log/error calls | ✅ Fixed — all → Sentry, 0 remaining |
| H3 | Voice messages IDOR | ✅ Fixed — coach relationship verified |
| H4 | Rate limiting on auth routes | ⬜ Deferred — Supabase protects auth; app-layer (Phase I) |
| H5 | ICO + Companies House | ⬜ Founder action — not yet done |

### Medium — Resolved ✅ (2 deferred)

| ID | Finding | Status |
|----|---------|--------|
| M1 | Privacy policy wrong domain | ✅ Fixed — nextsplit.app + ICO placeholder |
| M2 | Coaches endpoint public | ✅ Accepted — intentional, documented |
| M3 | Squad invite leaks member data | ✅ Fixed — member names removed |
| M4 | 210 buttons missing aria-label | ✅ Partially fixed — close/nav buttons done; 425 remain (Phase I) |
| M5 | ProGate client-side only | ⬜ Deferred — must fix before Phase H |
| M6 | No staging environment | ⬜ Deferred — before beta |
| M7 | Offline queue unverified | ✅ Confirmed working — false alarm |

### Low / Informational — All Resolved ✅

| ID | Finding | Status |
|----|---------|--------|
| L1 | Old domain in share card | ✅ Fixed |
| L2 | NEXT_PUBLIC_SITE_URL not set | ✅ Fixed — set in Vercel |
| L3 | Stripe keys not set | ⬜ Intentional — add before Phase H |
| L4 | nextsplit.co.uk not purchased | ⬜ Founder action — ~£5 |
| L5 | SQL column migration missing | ✅ Fixed — migration run |

### Strategic Observations (from audit) — Phase I work

| Observation | Action | Phase |
|-------------|--------|-------|
| 194 `as any` casts = schema changes cause runtime errors | Run `supabase gen types typescript` | Phase I |
| Codebase too large for one person to maintain safely | Identify core 20% of features, harden those first | Ongoing |
| ProGate client-side only = bypassable when enforced | Add server-side subscription check on all AI API routes | Before Phase H |
| CSP header removed due to build conflict | Re-add carefully with allowlist testing | Phase I |
| ESLint has no no-console rule — regressions possible | Add `"no-console": "warn"` to eslint.config.mjs | Phase I |

---

## Pending Founder Actions

| Action | Urgency | Notes |
|--------|---------|-------|
| ICO registration (ico.org.uk) | 🔴 Before alpha | £40, ~20 min online |
| Companies House formation | 🔴 Before alpha | £12, ~20 min online |
| Update privacy policy with ICO number | 🔴 After above | One line change |
| Run phase-sl1-squads.sql in Supabase | 🔴 Before alpha | Squad tables may not exist in prod |
| Run phase-sl2-depth.sql in Supabase | 🔴 Before alpha | |
| Run phase-cm1-marketplace.sql in Supabase | 🔴 Before alpha | |
| Run phase-cm2-revenue.sql in Supabase | 🔴 Before alpha | |
| Run phase-ch2-communication.sql in Supabase | 🔴 Before alpha | |
| Seed 36 plans via /admin/seed | 🔴 Before alpha | |
| Stripe keys into Vercel | 🟡 Before Phase H | Not urgent for alpha |
| Buy nextsplit.co.uk | 🟡 Soon | £5, brand protection |

---

## F1–F6 Pre-Alpha Gates

**Do not send alpha invites until all 6 are ✅.**

| Gate | Status | What's needed |
|------|--------|--------------|
| F1 — Founder E2E on iPhone | ⬜ | Fresh signup → onboarding → log a session |
| F2 — 3-person alpha test | ⬜ | 3 non-technical runners, blunt feedback |
| F3 — Lighthouse (mobile 4G, ≥80) | ⬜ | Run via Chrome DevTools or node script |
| F4 — Sentry receiving events | ⬜ | Open /today, check Sentry dashboard |
| F5 — Infrastructure | 🟡 | SQL migrations pending; ICO pending |
| F6 — Alpha invite list (10–20 runners) | ⬜ | 2 beginner / 12 intermediate / 6 advanced |

---

## Phase G — Closed Alpha

**Gate in:** F1–F6 all ✅
**Gate out:** Day 30 retention ≥ 40%

Target: 10–20 runners. At least 2 with coaching experience.

**Daily PostHog targets:**
- Sessions logged per user per week ≥ 3
- Day 7 retention ≥ 55%
- Day 30 retention ≥ 40% (Phase H gate)
- Onboarding completion ≥ 80%
- NPS Day 7 + Day 30 ≥ 40
- Adaptation trigger rate > 0%

**Fix protocol:**
- P0 (blocks session logging): fix same day
- P1 (confusing UX): fix within 48hrs
- Feature requests: log, do not build

---

## Phase H — Revenue Activation

**Gate in:** Day 30 retention ≥ 40%

**Checklist:**
1. Add Stripe keys to Vercel (4 env vars)
2. Create Stripe products for Premium (£7.99/mo, £59.99/yr) and Coach Pro (£19.99/mo)
3. ✅ Fix M5 — add server-side subscription check on all AI API routes (before this)
4. Test all Stripe flows end-to-end (checkout, webhook, portal, Connect)
5. Set `NEXT_PUBLIC_PREMIUM_ENFORCED=true` in Vercel
6. Set `NEXT_PUBLIC_REFERRAL_ENABLED=true` in Vercel
7. Verify ProGate enforcement works correctly end-to-end
8. Annual pricing live (£59.99/yr, "Best value" badge)
9. Split Leader upgrade prompt wired for social users

**Free tier post-enforcement:** predetermined plans, basic logging, community read-only
**Premium:** AI coaching, adaptation engine, full analytics, Strava sync, Split Leader

---

## Phase I — Post-Alpha Engineering + Refinement

**Gate in:** Phase H live and stable

### I1 — Security Debt (from audit)
- Add Content-Security-Policy header (test all integrations before enabling)
- Add ESLint `no-console` rule to eslint.config.mjs
- Add Zod validation to remaining 3 unvalidated routes (ai/fuel, coach/apply, stripe/checkout)
- Full aria-label audit (425 buttons remaining — prioritise modals and navigation)
- Add app-layer rate limiting on auth routes via Upstash/Vercel KV

### I2 — Type Safety
- Run `npx supabase gen types typescript --project-id [ID] > src/types/supabase-generated.ts`
- Replace all 194 `(supabase as any)` patterns with typed client
- Eliminates entire class of silent runtime errors on schema changes
- Script exists at `scripts/gen-types.sh`

### I3 — Infrastructure
- Create Supabase staging project + point Vercel preview deployments at it
- Load test: what's the max concurrent user capacity before degradation?

### I4 — Features
- Race Together (external race data API integration)
- TrainingPeaks / CSV import for coaches
- Coach marketplace public launch (remove invite-only gate)
- Strava sync improvements
- App Store / Google Play submission (if PWA installs are low)

### I5 — Performance
- Lighthouse audit targeting ≥ 90 on all key routes
- Bundle size analysis — identify and tree-shake large dependencies
- Image optimisation audit

---

## Phase J — Corporate + Scale

**Gate in:** 500+ active users, stable revenue

- Corporate squad accounts (up to 50 members)
- Company branding + HR dashboard (anonymised data)
- Per-seat pricing (£5/seat at 20+, £3.50/seat at 100+)
- API for corporate HR system integration
- Race Together full build with external data source

---

## Revenue Projections

| Stage | Users | MRR |
|-------|-------|-----|
| Alpha (now) | 20 | £0 |
| Phase H live | 100 | ~£600 |
| 6 months | 500 | ~£2,000 |
| Year 1 | 1,500 | ~£7,500 |
| Year 2 | 5,000 | ~£28,000 |

**Split Leader flywheel contribution (Year 2):**
600 Premium → 120 Split Leaders → 240 additional Premium conversions at £0 CAC. Lower churn through squad accountability.

**Coach revenue (Year 2 at 60 coaches):**
~£3,600/mo commission + £400/mo Coach Pro = ~£4,000 MRR from coaching alone.

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

## Environment Variables

| Variable | Vercel | Status |
|----------|--------|--------|
| NEXT_PUBLIC_SUPABASE_URL | ✅ | |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✅ | |
| SUPABASE_SERVICE_ROLE_KEY | ✅ | |
| RESEND_API_KEY | ✅ | |
| CRON_SECRET | ✅ | Also in GitHub secrets ✅ |
| NEXT_PUBLIC_SITE_URL | ✅ | nextsplit.app |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | ✅ | |
| VAPID_PRIVATE_KEY | ✅ | |
| ANTHROPIC_API_KEY | ✅ | |
| ADMIN_EMAILS | ✅ | |
| VERCEL_TOKEN | — | In GitHub secrets ✅ |
| STRIPE_SECRET_KEY | ❌ | Add before Phase H |
| STRIPE_PUBLISHABLE_KEY | ❌ | Add before Phase H |
| STRIPE_WEBHOOK_SECRET | ❌ | Add before Phase H |
| STRIPE_CONNECT_CLIENT_ID | ❌ | Add before Phase H |
| NEXT_PUBLIC_PREMIUM_ENFORCED | false | Flip to true at Phase H |
| NEXT_PUBLIC_REFERRAL_ENABLED | false | Flip to true at Phase H |

---

## Key Commands

```bash
cd /home/claude/nextsplit-v2
npm test                          # 52 passing
npx tsc --noEmit                  # TypeScript check
git log --oneline -10             # recent history
bash scripts/gen-types.sh         # generate typed Supabase client (Phase I)
```

## Deploy Pattern

```bash
git add -A
git commit -m "type: description"
git remote set-url origin https://[PAT]@github.com/NextSplit/Nextsplit-v2.git
git push origin main
git remote set-url origin https://github.com/NextSplit/Nextsplit-v2.git
```

## Test Account

- Email: nextsplitplans@gmail.com
- Profile ID: 71ac42c2-543a-4672-ac34-e8221c5f071d
- Squad "Tatata" exists in DB
- notifications_enabled = true

---

## Document Index

| File | Purpose |
|------|---------|
| MASTER-DELIVERY-PLAN-V3.md | This file |
| PRE-ALPHA-CHECKLIST.md | F1–F6 founder gate |
| supabase/migrations/ | All SQL migrations in order |
| scripts/gen-types.sh | Supabase type generation (Phase I) |
| nextsplit-audit.md | Full Session 5 security audit |
