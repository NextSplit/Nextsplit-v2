# NextSplit v2 — Handoff Document
**Last updated:** 23 April 2026 — Session 4  
**App URL:** nextsplit-v2.vercel.app (custom domain nextsplit.app in progress)  
**GitHub:** github.com/NextSplit/Nextsplit-v2  
**Latest commit:** 87e0c58  
**Tests:** 52 passing ✅ | TypeScript: clean ✅

---

## What Was Done This Session

### Design System v2 — Full Light Mode (150+ files)
Complete overhaul from dark forest theme to warm light base.

**Design tokens (src/app/globals.css):**
- `--color-bg: #f8f7f5` — warm off-white page background
- `--color-surface: #ffffff` — card surface
- `--ns-ember: #e85d26` — ALL CTAs, buttons, active states
- `--ns-forest: #2b5c3f` — brand wordmark, active nav dot, Split Leader ONLY
- `--ns-track: #c49a3c` — Splity, XP, achievements
- Plus Jakarta Sans 800 — display font throughout

**Rule:** Forest green is NEVER used as a UI action colour. Ember only.

### Splity — Coach Character (new)
- `src/components/Splity.tsx` — SVG running shoe with face, 4 moods
- Moods: default / happy / encouraging / celebrating
- Used in: TodayHeader coaching line, TodayBelowFold toggle
- Gold/amber colour matching `--ns-track`

### Today Tab
- Sessions are hero — nothing competes above fold
- Splity coaching line with mood-aware coaching text
- Week note / sleep → inline pills (not large cards)
- Fuel plan → collapsible FuelPlanCard
- Check-in + weather → behind Splity toggle

### Plan Tab
- DayDrawer REMOVED entirely
- WeekRow → tap expands inline showing session dots
- InlineDayRow → NEW: day expands sessions inline below
- Session tapped → Splity coach note + Log button

### Log Modal
- Full-screen overlay (92dvh), X close, tap backdrop dismisses
- Distance + time: type-in fields (not steppers)
- Quick-done button opens modal (not auto-complete)

### Character Tab (Profile)
- HeroCard rebuilt for light mode — gradient accent bar replaces dark bg
- StatBar: visible colours (blue/purple/green/amber) on light background
- WeeklyXPChart: ember bars
- Tab switcher: ember active state

### ShareSessionCard
- Preview card: white surface + forest→ember→gold gradient bar
- Canvas share image: light background, ember type pill, gold XP badge

### Squad Dashboard
- Fixed PGRST200 (nested profile joins fail with PostgREST)
- Solution: separate profile fetch after squad query, no nested joins

### Splity Email Notifications
- `src/lib/notificationEmails.ts` — 5 types with Splity voice + HTML templates
- `src/app/api/cron/notify-email/route.ts` — email dispatcher
- `.github/workflows/notify.yml` — GitHub Actions daily 9am UTC cron (free)
- `src/app/api/debug/notify-test/route.ts` — debug test endpoint
- Sender: `onboarding@resend.dev` (temporary — see pending below)
- Guardrails: 1/day per user, at-risk once only, priority ordering

### HTML Entity Fixes
- Fixed `&apos;` / `&amp;` raw text rendering across 34 files

---

## PENDING — Must Complete

### 🔴 Domain: nextsplit.app → Vercel (NOT DONE)
nextsplit.app registered on Cloudflare (23 Apr 2026).
Vercel shows "Invalid Configuration" for nextsplit.app.

**Next step:** In Vercel Domains page, tap `nextsplit.app` row → **DNS Records** tab → **Manual setup** → add the records it shows into Cloudflare DNS.

OR: Change Cloudflare nameservers to Vercel's:
- `ns1.vercel-dns.com`
- `ns2.vercel-dns.com`
Then re-add Resend DNS records in Vercel DNS panel.

### 🔴 Resend Domain: nextsplit.app (PENDING PROPAGATION)
DNS records added to Cloudflare but status shows "Pending".
Check resend.com/domains — when green, run:
```bash
sed -i 's/onboarding@resend.dev/coach@nextsplit.app/g' \
  src/app/api/cron/notify-email/route.ts \
  src/app/api/cron/lifecycle-emails/route.ts \
  src/app/api/debug/notify-test/route.ts
git add -A && git commit -m "feat: switch email sender to coach@nextsplit.app"
git push origin main
```

### 🟡 GitHub Secret: CRON_SECRET
Add to: github.com/NextSplit/Nextsplit-v2 → Settings → Secrets → Actions → New secret
- Name: `CRON_SECRET`
- Value: same as Vercel CRON_SECRET env var

### 🟡 Buy nextsplit.co.uk
Redirect to nextsplit.app. ~£5/year. Do before launch.

### 🟡 SQL: Add missing column if not present
```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS notif_at_risk_reengagement boolean DEFAULT true;
```

### 🟡 Stripe keys
Add to Vercel env vars before any paid features go live.

---

## Environment Variables

| Variable | Vercel | GitHub Secrets |
|---|---|---|
| SUPABASE_URL | ✅ | — |
| SUPABASE_ANON_KEY | ✅ | — |
| SUPABASE_SERVICE_ROLE_KEY | ✅ | — |
| RESEND_API_KEY | ✅ | — |
| CRON_SECRET | ✅ | ❌ MISSING |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | ❌ | — |
| VAPID_PRIVATE_KEY | ❌ | — |

---

## Key File Paths

```
Design:
src/app/globals.css                          ← design tokens
src/components/Splity.tsx                    ← Splity SVG character

Today:
src/app/today/TodayClient.tsx
src/app/today/TodayHeader.tsx                ← Splity coaching line
src/app/today/TodayBelowFold.tsx
src/components/FuelPlanCard.tsx
src/components/SessionCard.tsx
src/components/LogModal.tsx

Plan:
src/app/plan/PlanClient.tsx
src/components/plan/WeekRow.tsx
src/components/plan/InlineDayRow.tsx         ← NEW this session

Squad:
src/app/squad/SquadPageClient.tsx
src/app/api/squad/route.ts

Notifications:
src/lib/notificationEmails.ts               ← Splity email templates
src/lib/notifications.ts                    ← Push notification copy
src/app/api/cron/notify-email/route.ts      ← Email cron
src/app/api/debug/notify-test/route.ts      ← Debug test
.github/workflows/notify.yml                ← GitHub Actions cron
```

---

## Architecture

```
Next.js 15 + Supabase + Vercel (hobby)
├── Auth: email + Google OAuth
├── DB: 9-table Supabase schema with RLS
├── Plans: 17 seeded templates + AI bespoke
├── Notifications: Resend email via GitHub Actions (free cron)
├── Payments: Stripe (not yet wired)
└── Strava: OAuth connect (Settings page)
```

**Deploy:** GitHub push → CI (TS + tests) → Vercel auto-deploy  
**Never** manually promote in Vercel dashboard.

---

## Test Account
- Profile ID: `71ac42c2-543a-4672-ac34-e8221c5f071d`
- Email: `nextsplitplans@gmail.com`
- Squad "Tatata" exists in DB
- `notifications_enabled = true`

---

## What's Next (Priority Order)

1. Complete nextsplit.app → Vercel domain setup
2. Resend domain verification → switch sender to coach@nextsplit.app
3. Add CRON_SECRET to GitHub secrets
4. Test notification email: visit /api/debug/notify-test while logged in
5. Buy nextsplit.co.uk
6. Undo after logging (8-second undo toast — spec exists, not wired)
7. Today tab "all done" Splity celebration state
8. Settings page full light mode audit
9. Stripe keys + paywall
10. Alpha user invites
