# NextSplit v2 — Agent Rules

## Read before any action
1. Read `HANDOFF-7.md` — canonical build state and immediate next steps
2. Read `MASTER-DELIVERY-PLAN-V2.md` — full delivery plan (phases A→I)
3. Run `git pull origin main` and `tsc --noEmit` before any code changes

## Project identity
- **Live:** https://nextsplit-v2.vercel.app
- **Repo:** https://github.com/NextSplit/Nextsplit-v2
- **Stack:** Next.js 15 App Router + TypeScript strict + Supabase + Tailwind
- **Phase:** A (Foundation & Legal) — alpha-first, revenue features built but not enforced

## Strategic north star
Users become believers the first time the plan adapts around something that
went wrong in their life. Every build decision must serve this moment.

## Non-negotiable rules
- `tsc --noEmit` must be clean before committing
- Zero ESLint errors in new files
- No `any` types in new code (except where Supabase client requires cast)
- No `console.log` committed
- All async routes wrapped in try/catch
- Zod validation on every API route input (Phase A1 — add to all existing routes)
- HANDOFF-7 must be updated after every phase completes

## Design tokens (never deviate)
```
--ns-forest:       #2b5c3f
--ns-ember:        #e85d26
--ns-track:        #c49a3c
--ns-night:        #2c3e50
--ns-forest-light: #edf4f0
```
Fonts: Outfit (body) · Cormorant Garamond (display) · JetBrains Mono (data)

## Alpha philosophy
PREMIUM_ENFORCED=false — all features unlocked for alpha users.
NEXT_PUBLIC_REFERRAL_ENABLED=false — flip at Phase H (Day 30 retention ≥ 40%).
Do not enforce paywalls or gates during alpha.

## Current immediate task (Phase A)
See HANDOFF-7.md → "What Needs Building Next — Phase A"
Three parallel tracks: security (Zod), legal (non-code), quality verification.
