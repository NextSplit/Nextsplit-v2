# NextSplit — Claude Entry Point
**READ THIS FIRST. Every session.**

## Step 1 — Read HANDOFF.md
`HANDOFF.md` is the single source of truth. It contains:
- Current app state (what's built, what's pending)
- Visual system (colours, CSS vars — do not deviate)
- Environment variables (what's confirmed, what's missing)
- Database tables and test account
- Key file locations
- What to build next

## Step 2 — Sync and type-check
```bash
cd /home/claude/nextsplit-v2
git pull origin main
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "Cannot find module\|jsx-runtime" | head -20
```

## Step 3 — Push changes
```bash
git add -A && git commit -m "type: description"
git remote set-url origin https://ghp_YOUR_PAT_TOKEN_HERE@github.com/NextSplit/Nextsplit-v2.git
git push origin main
git remote set-url origin https://github.com/NextSplit/Nextsplit-v2.git
```

## Core principles
- **Single visual mode** — deep navy `#0a0e1a` base, vivid accents. No light/dark toggle.
- **Dark mode via CSS vars** — `:root` and `.dark` are identical. The inline script in `layout.tsx` applies `dark` class before hydration.
- **Bold and bright** — avoid flat black, muted greys, or washed-out colours. High contrast, saturated.
- **Mobile-first** — everything built for Android Chrome first. Safe area insets on all bottom sheets.
- **Update HANDOFF.md** at the end of every significant session with new commits and state changes.

## Pre-merge hygiene (PR J8)

Run the appropriate skill before merging any non-trivial PR. Both are
zero-cost (in-session agents) and catch the kind of issues that
single-author commits routinely miss.

- **`/security-review`** — REQUIRED before merging a PR that touches:
  - Payments (`/api/stripe/*`, anything reading `subscriptions`)
  - Auth (`/auth/*`, anything calling `auth.getUser` / `auth.uid`)
  - DB schema (any new migration or RLS policy)
  - AI endpoints (`/api/ai/*`)
  - User-input handling (any new POST route that accepts a body)

- **`/review`** — RECOMMENDED for PRs at large scope:
  - >300 LOC changed
  - Cross-cutting refactors (e.g. PR B / PR C2 / PR H scale)
  - New surface area (admin pages, dashboards, integrations)

- **`/council`** — for proposals or design decisions before any code lands.
  Especially for trade-off questions (e.g. "should we use Supabase Realtime
  or GetStream?" — see PR J16 plan).

Skill outputs are advisory, not gating. Run them, read the findings,
fix the actionable ones, document any deliberate "won't fix" decisions
in the PR body.

Audit precedent: PR G3 found a P0 bug (missing `notifications` table
referenced by the cron) by accident during smoke-testing. A
`/security-review` pass on the relevant PR would have flagged the
missing-table reference in the diff.

## Live URL
https://nextsplit.app

## The founding thesis
> The number one predictor of long-term running consistency is social accountability — someone waiting for you, someone who notices when you don't show up. Everything in NextSplit traces back to that truth.
