# NextSplit — Master Delivery Plan
**Version:** 3.1 | **April 2026** | **Updated after Session 5 audit**
**Status:** Living document — reviewed at milestones, not calendar dates

---

## Codebase Reality Check (April 2026)

This document was significantly behind the actual codebase. The audit in Session 5
confirmed that Phases SL1, SL2, CM1, CM2, CH1, and CH2 are substantially built.
The focus now is alpha → revenue, not feature build.

---

## Three Core Pillars

```
Pillar 1 — Bespoke Digital Coaching     ✅ BUILT
Pillar 2 — Split Leader                 ✅ BUILT (SQL not yet run in prod)
Pillar 3 — Coaching Marketplace + Hub  ✅ BUILT (Stripe keys needed for payments)
```

---

## Full Build Status (April 2026)

### ✅ Core Product — Complete

| Feature | Status | Notes |
|---------|--------|-------|
| Auth (email + Google OAuth) | ✅ | |
| All 4 onboarding paths | ✅ | Predetermined, AI bespoke, Manual, Lifestyle |
| VDOT pace personalisation | ✅ | |
| 17+ seeded plan templates | ✅ | Admin seed page working |
| Today tab — full daily loop | ✅ | Sessions hero, undo toast, all-done Splity state |
| Plan tab — inline expand | ✅ | DayDrawer removed, inline week/day/session |
| Log modal — all modes | ✅ | One-tap, standard, full debrief, rest |
| Date navigation | ✅ | |
| Plan adaptation engine | ✅ | ACWR, readiness, missed session flow |
| Character system | ✅ | 7 classes, XP, 15 levels, 32 badges, SVG avatars |
| Character tab | ✅ | HeroCard, stat bars, weekly XP chart |
| Plan history | ✅ | |
| Personal bests | ✅ | Auto-detected on log |
| Strava sync | ✅ | OAuth connect, activity import |
| Offline queue | ✅ | IndexedDB, auto-flush on reconnect |

### ✅ Social — Complete

| Feature | Status | Notes |
|---------|--------|-------|
| Squad creation flow | ✅ | Name, colour, logo, welcome message, invite link |
| Invite landing page | ✅ | `/squad/join/[code]` — full design, premium CTA |
| Squad join (logged in) | ✅ | Member join flow implemented |
| Squad join (logged out) | ✅ | Premium offer + free join path |
| Squad dashboard | ✅ | Members, collective km, goal progress, nudges |
| Squad leaderboard | ✅ | |
| Nudge system | ✅ | Leader sends nudges to inactive members |
| Inactivity monitoring | ✅ | `/api/squad/inactivity` cron route |
| Leadership transfer | ✅ | `/api/squad/transfer` |
| Trophy room | ✅ | `/squad/trophies` — 301 lines |
| Squad seasons | ✅ | Monthly/annual snapshots via RPC |
| Squad achievements | ✅ | |
| Community feed | ✅ | Clubs, challenges, races, leaderboard, reactions |
| Public profiles | ✅ | `/u/[username]` |

### ✅ Coaching Platform — Complete

| Feature | Status | Notes |
|---------|--------|-------|
| Coach setup / apply flow | ✅ | |
| Coach public profile | ✅ | `/coach/[slug]` |
| Coach browse + filter | ✅ | `/coaches` with Zod-validated filters |
| Coach marketplace | ✅ | Featured plans, browse, hire flow |
| Athlete invite + accept | ✅ | Token-based invite, accept page |
| Coach squad view | ✅ | ACWR badges, athlete drill-down |
| Athlete detail (3-tab) | ✅ | Overview, Sessions, Comms — 581 lines |
| Voice messages | ✅ | Record, upload, signed URLs, listen tracking |
| Coach messaging thread | ✅ | Read receipts, listened_at tracking |
| Message reactions | ✅ | Emoji reactions on messages |
| Scheduled messages | ✅ | Up to 10 per athlete, Coach Pro gated |
| Coach plan builder | ✅ | 255 lines |
| Coach save/share plans | ✅ | `/api/coach/save-plan` |
| Coach annotations | ✅ | `/api/coach/annotate` |
| Coach broadcast | ✅ | Message all athletes at once |
| Coach digest preferences | ✅ | Immediate / daily / weekly, `/api/coach/digest` |
| Athlete capacity management | ✅ | Max athletes, capacity bar, accepting toggle |
| Coach earnings dashboard | ✅ | 275 lines, `/coach/earnings` |
| Stripe Connect (payouts) | ✅ | Account onboarding, transfers, payouts_enabled |
| Commission model | ✅ | application_fee_amount via Stripe Connect |
| Coach Pro subscription | ✅ | is_coach_pro flag, expires_at, gating on scheduled messages |
| Coach Pro billing | ✅ | `/api/coaching/subscribe` — Stripe Checkout |
| Coach dispute resolution | ✅ | `/api/coaching/dispute` with refund logic |
| Coach referral programme | ✅ | £100 bonus in referral system |

### ✅ Notifications + Comms — Complete

| Feature | Status | Notes |
|---------|--------|-------|
| Push notifications (8 types) | ✅ | VAPID keys now set in Vercel |
| Per-type notification preferences | ✅ | |
| Quiet hours (10pm–7am) | ✅ | |
| Email notifications (5 types) | ✅ | Splity voice, Resend, coach@nextsplit.app |
| Lifecycle emails (7-email sequence) | ✅ | |
| GitHub Actions daily cron | ✅ | 9am UTC, CRON_SECRET wired |
| Splity character | ✅ | SVG running shoe, 4 moods |

### ✅ Analytics + Instrumentation — Complete

| Feature | Status | Notes |
|---------|--------|-------|
| PostHog (25+ events) | ✅ | AARRR framework |
| Cookie consent | ✅ | Pre-analytics gate |
| Sentry error monitoring | ✅ | Client + server + edge |
| AI usage tracking | ✅ | ai_usage table, per-user daily limits |

### ✅ Revenue Infrastructure — Complete (not yet activated)

| Feature | Status | Notes |
|---------|--------|-------|
| Stripe checkout (athlete Premium) | ✅ | |
| Stripe webhook (signature verified) | ✅ | |
| Stripe portal (manage subscription) | ✅ | |
| Stripe Connect (coach payouts) | ✅ | |
| ProGate component | ✅ | Client-side gate |
| Feature flags | ✅ | NEXT_PUBLIC_PREMIUM_ENFORCED, NEXT_PUBLIC_REFERRAL_ENABLED |
| Referral system | ✅ | Built, behind flag |
| Plan marketplace (purchase) | ✅ | Athletes buy coach-authored plans |
| Nutrition tab | ✅ | 430 lines, full macro tracking |

### ✅ Legal + Security — Complete

| Feature | Status | Notes |
|---------|--------|-------|
| Privacy policy | ✅ | nextsplit.app, ICO placeholder |
| Terms of service | ✅ | AI disclaimer included |
| Medical disclaimer | ✅ | On ACWR and wellness |
| Cookie consent banner | ✅ | |
| Data export (GDPR) | ✅ | JSON download |
| Account deletion | ✅ | RPC, permanent |
| HTTP security headers | ✅ | In vercel.json |
| All domain refs → nextsplit.app | ✅ | 20+ files updated |
| Zero console.log in production | ✅ | All → Sentry |
| Voice messages IDOR fixed | ✅ | |
| Admin gate on sensitive routes | ✅ | |

### ✅ Design System — Complete

| Feature | Status | Notes |
|---------|--------|-------|
| Light mode (150+ files) | ✅ | Warm off-white base |
| Ember (#e85d26) = all CTAs | ✅ | |
| Forest (#2b5c3f) = brand only | ✅ | |
| Track gold (#c49a3c) = Splity/XP | ✅ | |
| Plus Jakarta Sans 800 display | ✅ | |
| Share cards (session + weekly) | ✅ | Light design, ember pill |

---

## What Is NOT Built

| Item | Notes |
|------|-------|
| TrainingPeaks / CSV / Garmin import | CH1.3 — not built, just mentioned on landing page |
| Coach Pro £19.99/mo Stripe product | Stripe product ID not created yet |
| Race Together feature | Phase I — not started |
| App Store / Google Play submission | Phase I — not started |
| Corporate squad accounts | Phase J — not started |
| CSP (Content-Security-Policy) header | Removed due to build conflict, needs careful re-add |

---

## What Needs Doing Before Alpha

### Founder actions (not code)
| Item | Status |
|------|--------|
| ICO registration (ico.org.uk, £40) | ⬜ |
| Companies House (£12) | ⬜ |
| Update privacy policy with ICO number | ⬜ after above |
| Buy nextsplit.co.uk (£5) | ⬜ |
| Stripe keys into Vercel | ⬜ (before Phase H only) |
| Run phase-sl1-squads.sql in Supabase | ⬜ Squad tables may not exist in prod |
| Run phase-sl2-depth.sql in Supabase | ⬜ |
| Run phase-cm1-marketplace.sql in Supabase | ⬜ |
| Run phase-cm2-revenue.sql in Supabase | ⬜ |
| Run phase-ch2-communication.sql in Supabase | ⬜ |
| Seed 36 plans via /admin/seed | ⬜ |

### F1–F6 Pre-Alpha Checklist Gates
| Gate | Status |
|------|--------|
| F1 — Founder E2E on iPhone (fresh signup → log session) | ⬜ |
| F2 — 3-person alpha test | ⬜ |
| F3 — Lighthouse performance (mobile 4G, ≥80) | ⬜ |
| F4 — Sentry receiving events | ⬜ |
| F5 — Infrastructure complete | 🟡 SQL migrations pending |
| F6 — Alpha invite list (10–20 runners) | ⬜ |

---

## Phase Priority Order (from April 2026)

```
NOW
  └── Complete F1–F6 gates → send alpha invites

DURING ALPHA (parallel)
  └── Phase G — monitor metrics, fix P0s/P1s same-day

WHEN Day 30 retention ≥ 40%
  └── Phase H — Revenue activation (flip two env vars + Stripe test)

POST-ALPHA
  └── Phase I — Race Together, marketplace public launch, Lighthouse ≥ 90
  └── Phase J — Corporate + Scale (500+ users)
```

---

## Phase G — Closed Alpha

**Gate in:** F1–F6 all ✅  
**Gate out:** Day 30 retention ≥ 40%

- Invite 10–20 runners: 2 beginner / 12 intermediate / 6 advanced. At least 2 with coaching experience.
- Watch daily in PostHog: sessions logged per user per week (target ≥ 3), Day 7 retention (target ≥ 55%), onboarding completion (target ≥ 80%)
- Fix protocol: P0 (blocks logging) = same day. P1 (confusing UX) = 48hrs. Feature requests = log, don't build.

---

## Phase H — Revenue Activation

**Gate in:** Day 30 retention ≥ 40%

1. Add Stripe keys to Vercel
2. Test all Stripe flows end-to-end
3. Set `NEXT_PUBLIC_PREMIUM_ENFORCED=true` in Vercel
4. Set `NEXT_PUBLIC_REFERRAL_ENABLED=true` in Vercel
5. Verify ProGate server-side enforcement on AI routes
6. Annual pricing live (£59.99/yr, "Best value" badge)
7. Split Leader upgrade prompt for users with friends on platform

Free tier post-enforcement: predetermined plans, basic logging, community read-only.
Premium: AI coaching, adaptation engine, full analytics, Strava sync, Split Leader.

---

## Phase I — Post-Alpha Refinement

**Gate in:** Phase H live and stable

- Race Together (external race data API)
- Coach marketplace public launch (remove invite-only)
- Strava sync improvements
- Lighthouse performance push (≥ 90)
- CSP header (Content-Security-Policy) — add carefully, test all integrations
- App Store / Google Play submission if PWA installs are low
- TrainingPeaks / CSV import for coaches

---

## Phase J — Corporate + Scale

**Gate in:** 500+ active users, stable revenue

- Corporate squad accounts (up to 50 members)
- Company branding + logo
- HR dashboard (anonymised aggregate data)
- Per-seat pricing (£5/seat at 20+, £3.50/seat at 100+)
- API for corporate HR system integration
- Race Together full build

---

## Revenue Projections

| Stage | Users | Monthly Revenue |
|-------|-------|-----------------|
| Alpha (now) | 20 | £0 (testing) |
| Phase H live | 100 | ~£600 |
| 6 months | 500 | ~£2,000 |
| Year 1 end | 1,500 | ~£7,500 |
| Year 2 | 5,000 | ~£28,000 |

### Split Leader Flywheel (Year 2 at 3,000 users)
- 600 Premium → 120 active Split Leaders (20%)
- Average 2 conversions per leader lifetime
- 240 additional Premium conversions at £0 CAC
- Churn reduction: squad accountability keeps users longer

### Coach Revenue (Year 2 at 60 coaches)
- Average coach revenue: £500/month
- Average commission: 12%
- Monthly commission income: £3,600
- Coach Pro subscribers (20 × £19.99): £400/month
- Total coach MRR: ~£4,000

---

## Tech Stack (Locked)

| Layer | Choice |
|-------|--------|
| Backend | Supabase (Postgres + Auth + Storage + Realtime) |
| Frontend | Next.js 15 App Router + TypeScript strict |
| Styling | Tailwind + CSS vars |
| Payments | Stripe (consumer) + Stripe Connect (coach payouts) |
| Email | Resend (coach@nextsplit.app) |
| Analytics | PostHog |
| Errors | Sentry (client + server + edge) |
| Deploy | Vercel (GitHub Actions pipeline) |
| AI | Anthropic Claude API |
| Push | Web Push API (VAPID keys set) |
| Storage | Supabase Storage |

---

## Environment Variables (April 2026)

| Variable | Vercel | GitHub Secrets |
|----------|--------|----------------|
| NEXT_PUBLIC_SUPABASE_URL | ✅ | — |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✅ | — |
| SUPABASE_SERVICE_ROLE_KEY | ✅ | — |
| RESEND_API_KEY | ✅ | — |
| CRON_SECRET | ✅ | ✅ |
| NEXT_PUBLIC_SITE_URL | ✅ | — |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | ✅ | — |
| VAPID_PRIVATE_KEY | ✅ | — |
| ANTHROPIC_API_KEY | ✅ | — |
| ADMIN_EMAILS | ✅ | — |
| VERCEL_TOKEN | — | ✅ |
| STRIPE_SECRET_KEY | ❌ add before Phase H | — |
| STRIPE_PUBLISHABLE_KEY | ❌ add before Phase H | — |
| STRIPE_WEBHOOK_SECRET | ❌ add before Phase H | — |
| STRIPE_CONNECT_CLIENT_ID | ❌ add before Phase H | — |
| NEXT_PUBLIC_PREMIUM_ENFORCED | false (flip at Phase H) | — |
| NEXT_PUBLIC_REFERRAL_ENABLED | false (flip at Phase H) | — |

---

## Key Commands

```bash
cd /home/claude/nextsplit-v2
npm test                    # 52 passing
npx tsc --noEmit            # TypeScript check
git log --oneline -10       # recent history
```

## GitHub Push Pattern

```bash
git add -A
git commit -m "type: description"
git remote set-url origin https://YOUR_GITHUB_PAT@github.com/NextSplit/Nextsplit-v2.git
git push origin main
git remote set-url origin https://github.com/NextSplit/Nextsplit-v2.git
```

## Test Account

- Email: nextsplitplans@gmail.com
- Profile ID: 71ac42c2-543a-4672-ac34-e8221c5f071d
- Squad "Tatata" exists
- notifications_enabled = true
