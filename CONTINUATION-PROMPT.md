# NextSplit v2 — Continuation Prompt

You are continuing development of **NextSplit v2**, a production Next.js + Supabase running coaching app. This is an active project with ~200 Vercel deployments. Read everything below carefully before touching any code.

**HANDOFF DOC:** Read `HANDOFF-4.md` in repo root — this is the canonical source of truth. It incorporates 14 strategy documents (Vision, Personas, Master Roadmap, 8 Pillar docs, Character System, Conflict Audit) resolved April 2026. Every build decision must trace to HANDOFF-4.

**STRATEGIC NORTH STAR:** Users become believers the first time the plan adapts around something that went wrong in their life. Everything traces back to that moment.

**THREE-TIER MODEL (resolved — do not reopen):**
- Athlete (Free / Pro £7.99/mo)
- Split Leader (included in Pro, hard cap 5 runners, cannot sell plans)
- Professional Coach (£29/mo, application required, marketplace access)

**BRAND (from Brand Pillar — not yet implemented in code):**
- Primary: Forest `#2b5c3f` (NOT current teal `#0D9488` — migration planned Phase 2)
- Accent: Ember `#e85d26` | Gold: Track `#c49a3c` | Slate: Night `#2c3e50`
- Fonts: Cormorant Garamond (display) + Outfit (body) + JetBrains Mono (data)
- Tagline: "The plan that keeps up with your life."

---

## YOUR FIRST ACTION

Before writing a single line of code, run these commands:

```bash
cd /home/claude/nextsplit-v2
git pull origin main
node_modules/.bin/tsc --noEmit 2>&1
```

If TypeScript is clean, proceed. If not, fix errors before anything else.

---

## The Project

**Live:** https://nextsplit-v2.vercel.app  
**GitHub:** https://github.com/NextSplit/Nextsplit-v2  
**Stack:** Next.js 16.2 (App Router) · Supabase · Tailwind · PWA · Anthropic Claude SDK  
**

The app is a training OS for serious runners: AI coaching, personalised plans, injury analytics, RPG progression, coach marketplace, community. Think Strava × TrainingPeaks × a personal coach.

---

## Context & Workflow Rules

You are working with the owner/developer in real-time. Follow these rules strictly:

1. **Always pull + TypeScript check before starting any work**
2. **Always run `node_modules/.bin/tsc --noEmit` before committing** — zero errors required
3. **Always run `node_modules/.bin/next build` before committing** — must compile successfully
4. **Commit after every meaningful unit of work** with a descriptive message
5. **Push to `origin main` after every commit** — Vercel auto-deploys
6. **Never scatter `process.env` calls** — all env vars go through `src/lib/config.ts`
7. **Never use raw `<img>` tags** — always `next/image`
8. **All Supabase queries must handle errors** — no silent failures
9. **Use `db(supabase).from(...)` pattern** not `supabase.from(...)` directly
10. **Service role key** is only used in `/api/stripe/webhook/route.ts` — keep it there

---

## Current State

The following is complete and deployed:

- Full onboarding flow (12 steps, 4 paths) — with 10 bugs fixed this session
- Today tab with session logging, undo, date nav, progress strip, adaptive plan card
- Plan tab with Plan|Fuel subtab switcher
- Character tab with 3 sub-tabs: Character | Stats (full analytics) | Records (race sim + PBs)
- Coach platform: Athletes tab, squad dashboard, athlete detail, messaging, plan builder, marketplace
- Community: clubs, challenges, virtual races, leaderboard
- Stripe payments, ProGate feature flags (currently NOT enforced — intentional)
- Landing page at root URL
- PostHog analytics, Sentry error tracking

**Navigation (FINAL — do not change without asking):**
- Athletes: Today | Plan | Community | Character (4 tabs)
- Coaches: Today | Plan | Athletes | Community | Character (5 tabs)

---

## Immediate Task

Continue **testing and refinement** of the core athlete experience. The onboarding flow has been audited. Now audit and fix the **core daily loop** — what a real user does every day:

### Test systematically in this order:

**1. Session logging flow**
- Go to `/today` with an active plan
- Tap a session card → log modal opens
- Fill in km, pace, effort → save
- Verify: training_log row created in Supabase, XP awarded, session card shows as done
- Tap the undo strip → verify undo works correctly
- Test ad-hoc session (+ button) → logs correctly

**2. Plan tab**
- Week rows expand/collapse correctly
- Day drawer opens with correct sessions
- Session detail shows coaching notes
- Week advance — tap "Mark week done" → current_week increments in DB
- Plan | Fuel tab switcher works

**3. Wellness check-in**
- Morning check-in card on Today → opens modal → saves to wellness_logs
- Values appear in Character → Stats → WellnessTrend

**4. Character XP system**
- Log a session → XP increases on Character tab
- Badge unlocks work (check BadgeGrid)
- Level-up screen fires when level increases
- Kit colour customiser saves to localStorage

**5. Character → Stats tab**
- Weekly volume chart renders with data
- ACWR chart renders (needs 4+ sessions)
- Pace trend (needs sessions with pace)
- WeeklyCoachingSummary → generate → AI response renders correctly
- PaceCalculator works

**6. Character → Records tab**
- RaceDaySimulation shows predictions (needs 3+ sessions with pace logged)
- PBCard shows personal bests
- TrainingSummary renders

**7. Stripe checkout (manual test — needs real browser)**
- Go to Character tab → Upgrade card → Upgrade to Elite
- Complete checkout with test card 4242 4242 4242 4242
- Verify: profiles.is_pro = true in Supabase after webhook fires
- Verify: Pro badge appears on Character tab

### For each issue found, fix it immediately using this pattern:
1. Read the relevant file fully before editing
2. Make the minimal targeted fix
3. Run `tsc --noEmit` → fix any type errors
4. Run `next build` → must succeed
5. Commit with descriptive message
6. Push

---

## Key File Locations

```
src/app/today/TodayClient.tsx          — main Today orchestrator
src/app/today/TodayBelowFold.tsx       — coach card, wellness, weather
src/app/today/TodayProgressStrip.tsx   — weekly stats strip
src/app/today/TodayModals.tsx          — log modal, undo strip
src/components/AdaptPlanCard.tsx       — missed sessions AI adaptation
src/app/plan/PlanClient.tsx            — Plan tab
src/app/profile/ProfileClient.tsx      — Character tab (3 sub-tabs)
src/components/charts/                  — all analytics charts
src/components/rpg/                     — RPG/character system
src/hooks/useActivePlan.ts             — current plan hook
src/hooks/useTrainingLog.ts            — session log hook
src/hooks/useAllTrainingLogs.ts        — cross-plan logs (for RPG)
src/lib/rpg.ts                         — XP/level/badge logic
src/lib/statsUtils.ts                  — ACWR, race predictions, pace utils
src/lib/features.ts                    — premium feature flags
src/lib/config.ts                      — ALL env vars
```

---

## Things NOT to Change Without Asking

1. **Navigation structure** — 4/5 tab layout is finalized
2. **`NEXT_PUBLIC_PREMIUM_ENFORCED`** — keep `false` until Stripe end-to-end tested
3. **Email confirmation** — keep OFF in Supabase until public launch
4. **DB schema** — don't add tables without running migrations via Supabase SQL editor
5. **The landing page** (`src/app/page.tsx`) — only update if asked

---

## How to Run Locally

```bash
cd /home/claude/nextsplit-v2
npm run dev
# App runs at http://localhost:3000
# Requires .env.local with Supabase + Stripe + Anthropic keys
```

---

## Important Patterns

### Supabase client
```typescript
// Server component / API route
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// Client component
import { useSupabase } from '@/hooks/useSupabase'
const supabase = useSupabase()

// Typed query
import { db } from '@/lib/supabase/db'
const { data, error } = await db(supabase).from('training_logs').select('*')
```

### Config
```typescript
import { config, serverConfig } from '@/lib/config'
// NEVER: process.env.NEXT_PUBLIC_SOMETHING (use config.something)
// NEVER: process.env.SECRET_KEY (use serverConfig.something)
```

### Feature gating
```typescript
import ProGate from '@/components/ProGate'
<ProGate feature="acwr_chart" preview>
  <ACWRChart logs={logs} weeks={weeks} />
</ProGate>
```

### AI calls
```typescript
// All AI routes use claude-sonnet-4-20250514
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const message = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1000,
  messages: [{ role: 'user', content: prompt }],
})
```

---

## After Testing — What Comes Next

Once core loop is solid:
1. **Phase 4: Capacitor** — wrap PWA as native iOS/Android app for App Store
2. **Phase 4: Garmin** — pull activities via Garmin Health API
3. **Privacy + Terms pages** — need real content (currently stubs)
4. **Stripe end-to-end test** → then flip `NEXT_PUBLIC_PREMIUM_ENFORCED=true`
5. **Custom domain** → update Stripe/Supabase/Strava redirect URLs

---

## Remember

- This is a real production app. Real users will use this.
- Every fix needs TypeScript clean + build clean before committing.
- When in doubt about a design decision, ask before building.
- The owner tests on mobile (Android, Chrome). Always think mobile-first.
- Commit messages should be specific — what changed and why.

Read `HANDOFF-4.md` now. Then start.
