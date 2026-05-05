#  NextSplit

**Running training built around social accountability.**

> Train together. Adapt together. The running app built for how people actually stay consistent — with their friends.

**Live:** https://nextsplit.app  
**Stack:** Next.js 15 · TypeScript · Supabase · Tailwind · PWA · Anthropic Claude

---

## What it is

NextSplit is a running training app with three pillars:

1. **Bespoke plans** — 17 curated templates + AI-generated plans, VDOT pace-personalised to your recent race times. Plans adapt when life gets in the way.

2. **Squad system** — Private accountability squads of up to 5. Orbital UI showing each member's progress, weekly km, streak. Send nudges. Track collective goals. The Split Leader leads the crew.

3. **Coaching marketplace** — Find and hire verified running coaches. Coaches manage athletes, build plans, and communicate — all in the app.

---

## Current State (May 2026)

Pre-alpha. Feature-complete for the core loop. Approaching friend test.

**Working:** Auth · Onboarding (4 paths) · Plans · Session logging · Celebration · SVG plan path · Squad orbit · Daily quests · Streak widget · Nudges · XP/levelling · AI coach chat · PWA install

**Pending confirmation:** Stripe payments · Resend email · Strava OAuth

---

## Development

### Prerequisites
- Node 18+
- Supabase project
- Anthropic API key

### Setup
```bash
git clone https://github.com/NextSplit/Nextsplit-v2
cd Nextsplit-v2
npm install
cp .env.example .env.local
# Fill in env vars
npm run dev
```

### Environment Variables
See `.env.example` for required vars. See `HANDOFF.md` for which are confirmed in Vercel.

### Key commands
```bash
npm run dev          # Dev server
npm run build        # Production build
npx tsc --noEmit     # Type check
npx playwright test  # E2E tests
npx tsx scripts/uat-db-verify.ts  # DB integrity check
```

---

## Architecture

```
src/app/                  Next.js App Router pages
  home/                   Smart dashboard (6 hero states)
  train/                  Today + SVG plan path
  explore/                Coaches / Squads / Plans / AI
  you/ (profile/)         Achievements / Character / Stats / Account
  squad/                  Squad orbital UI + member pages
  onboarding/             4 onboarding paths
  api/                    API routes (plans, AI, squad, stripe, coach)
  auth/                   Login / signup
  coach/                  Coach platform

src/components/           Shared components
  SessionCelebration.tsx  Post-log full screen celebration
  DailyQuests.tsx         Daily quest strip
  plan/PlanPathSVG.tsx    SVG illustrated plan path
  LogModal.tsx            Session logging

src/hooks/                Data hooks (useActivePlan, useSquad, etc.)
src/lib/                  Utils (rpg, vdot, stripe, schemas)
```

---

## For Claude (AI assistant)
Read `CLAUDE.md` first, then `HANDOFF.md`. Both are in the repo root.
