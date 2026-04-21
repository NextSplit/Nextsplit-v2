# NextSplit v2 — Continuation Prompt

You are continuing development of **NextSplit v2**, a production running coaching
app. This is an active project with a closed alpha pending. Read everything below
before writing a single line of code.

---

## Step 1 — Orient

```bash
cd /home/claude/nextsplit-v2
git pull origin main
node_modules/.bin/tsc --noEmit 2>&1
npm test 2>&1 | tail -5
```

All must be clean before proceeding.

---

## Step 2 — Read the docs (in order)

1. **`HANDOFF-7.md`** — Current build state, environment variables, DB schema,
   known issues, legal checklist, what's immediately next. **This is the canonical
   source of truth.** If anything in this prompt conflicts with HANDOFF-7, HANDOFF-7 wins.

2. **`MASTER-DELIVERY-PLAN-V2.md`** — Full A→I phase plan. Alpha-first approach.
   Revenue features built but not enforced. Phases A–F are all pre-user.

---

## Step 3 — Understand where we are

**Current phase:** A (Foundation & Legal)
**Approach:** Alpha-first. Closed pool of trusted users for UAT. Premium features
visible and functional but NOT enforced (PREMIUM_ENFORCED=false).

**What's completely built (do not rebuild):**
- Core daily loop (Today, Plan, logging, undo, wellness, Strava)
- Character system (7 classes, XP, 15 levels, 32 badges, class reveal)
- Coach platform (squad, athlete detail, voice messages, plan builder, marketplace)
- Community (clubs, challenges, races, leaderboard)
- All 4 onboarding paths (with credibility layers and depth questions)
- Notifications (8 types, guardrails, lifecycle emails)
- Split Leader mode (LeadDashboard, toggle)
- Engineering foundation (52 unit tests, CI)
- Referral programme (behind NEXT_PUBLIC_REFERRAL_ENABLED flag)

**What's immediately next (Phase A — parallel tracks):**
- A1: Zod validation on 15 API routes + Supabase type regeneration
- A2: Cookie consent, privacy policy, terms, medical disclaimer, ICO registration
- A3: AI plan quality review admin tool
- A4: Onboarding funnel PostHog events
- A5: Adaptation E2E test matrix
- A6: Email sender domain DNS
- A7: In-app NPS prompt (Day 7 + Day 30)
- A8: Monday PostHog dashboard configuration

---

## The Flywheel (never lose sight of this)

```
Runner experiences adaptation →
Becomes a believer →
Refers a friend →
Friend joins squad →
Split Leader hits cap →
Upgrades to Pro Coach →
Coach publishes marketplace plan →
Plan sells globally →
```

Every feature must serve this flywheel. If it doesn't — deprioritise.

---

## Strategic north star

> Users become believers the first time the plan adapts around something that
> went wrong in their life. Everything traces back to that moment.

---

## Design tokens (non-negotiable)

```css
--ns-forest:       #2b5c3f
--ns-ember:        #e85d26
--ns-track:        #c49a3c
--ns-night:        #2c3e50
--ns-forest-light: #edf4f0
```

Fonts: Outfit (body) · Cormorant Garamond (display) · JetBrains Mono (data)
Icons: Migrate to Phosphor Icons (Phase D3 — not yet done)

---

## Rules every session

- `tsc --noEmit` clean before committing
- Zero ESLint errors in new files
- No bare `any` types
- No `console.log` committed
- Zod on every API route input
- HANDOFF-7 updated after every phase completes
- Push to GitHub after every session

---

## GitHub token

When pushing: set remote with token, push, then clear:
```bash
git remote set-url origin https://[TOKEN]@github.com/NextSplit/Nextsplit-v2.git
git push origin main
git remote set-url origin https://github.com/NextSplit/Nextsplit-v2.git
```
Token provided per-session by the founder. Do not store.

---

*Updated: April 2026 — HANDOFF-7 is current*
