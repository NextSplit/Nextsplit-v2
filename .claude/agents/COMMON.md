# NextSplit — Common Briefing

Shared project context for every council agent. Read this first on any council pass. Update when reality changes.

## Founding thesis

The number-one predictor of long-term running consistency is social accountability — someone waiting for you, someone who notices when you don't show up. Every feature traces back to that.

## Stage (May 2026)

- Pre-alpha. F1 friend test pending (4-5 friends on real Android, multi-account, full flow).
- No paying users yet.
- Solo founder (Ash). Time and tokens are scarce.
- Live at https://nextsplit.app — auto-deploy working post-Session-10 cron fix.

## Pricing

- Elite £7.99/mo founding price (500 spots), standard £9.99/mo, annual £59.99/yr.
- Coach: £29/mo platform fee for Pro coaches; 15%→8% sliding commission.
- `NEXT_PUBLIC_PREMIUM_ENFORCED=false` until post-Stripe-test.

## Stack

- Next.js 15 App Router · TypeScript strict · Tailwind · CSS vars
- Supabase Postgres, RLS on every table, 17 plan templates seeded
- Anthropic SDK (Claude Sonnet 4 for plan generation, coach digest, suggestions)
- Stripe (checkout, webhook, connect, portal — keys present, untested at scale)
- Resend (email — domain verified)
- Strava (sandbox OAuth)
- Web Push via VAPID, single 14:00 UTC cron fire (`smart-notify`)
- Sentry, Posthog
- Vercel Hobby (cron limit: ≤1 fire per day per cron expression)

## Visual system — single mode, never change

```
--color-bg:            #0a0e1a   /* deep navy */
--color-surface:       #111827
--color-surface-2:     #1a2235
--ns-cyan:             #00d4ff   /* Home tab */
--ns-ember:            #ff3d6e   /* Train, CTA */
--ns-cobalt:           #4d8aff   /* plan/data */
--ns-lime:             #7fff4d   /* Squad */
--ns-amber:            #ffb800   /* You tab, XP */
--ns-violet:           #a855f7   /* Coach */
```

No light mode, no toggle. Bold and bright on dark navy. Mobile-first (Android Chrome primary).

## App surfaces

| Tab | Colour | Content |
|---|---|---|
| 🏠 Home | cyan | Dashboard, daily quests, streak |
| 📅 Train | ember | Plan path, today sessions, week sheet, fuel |
| 🔍 Explore | lime | Coaches / Squads / Plans / AI |
| ⭐ You | amber | Achievements / Character / Stats / Account |

## Database (Supabase project `wlrmeiczqgmharvfmalq`)

`profiles` · `user_plans` · `training_logs` · `plan_templates` · `squads` · `squad_members` · `squad_invites` · `squad_nudges` · `squad_feed` · `coach_profiles` · `coach_athletes` · `coach_messages` · `coaching_subscriptions` · `coach_earnings` · `ai_usage` · `notifications` · `push_subscriptions`

RLS on all. Key RPCs: `computeStreakForUser`, `getACWR`, `can_nudge`, `marketplace_coaches`, `squad_monthly_km`.

## Build preferences (founder principles)

- Fast iterative sprints. Big build sessions over incremental delivery.
- Bold Duolingo-style visuals on a dark athletic base. Never white backgrounds.
- Single source of truth: `HANDOFF.md`. Never create parallel HANDOFF-X.md.
- v1 is frozen at `nextsplit.github.io/NextSplit-Training-Tracker`. Don't touch.
- Tokens never in committed files. GitHub secret-scanning revokes them.
- Direct, honest communication. No hedging. Name a single recommended path.
- Escalate (Vercel/Supabase support, laptop) after multiple failed attempts.

## Outstanding pre-alpha gates

1. Verify redesign visible (post-Session-10 deploy)
2. Stripe keys functional in Vercel (test charge)
3. Resend key functional (test send)
4. Plan activation on real device (Zod fix in place)
5. AI plan double-session gym days (normaliser in place)
6. Smart-notify single-dispatch behaviour
7. F1 founder test
8. UAT script (`scripts/uat-db-verify.ts` + Playwright)

## What's deferred

- Strava production OAuth (live app credentials)
- Coaching marketplace launch (need ≥2 verified coaches)
- Squad Trophy Room, Squad seasons
- Companies House registration (£12)
- ICO registration (£40)

## Constraints to respect in any proposal

- Vercel Hobby: each cron ≤1 fire/day; 100GB bandwidth/mo; 100 build hours/mo
- Anthropic API quota: budget set, plan generation ~8000 tokens per call
- Supabase free tier: 500MB DB, 1GB storage, 2GB egress
- iOS Safari: PWA install limited; push notifications iOS 16.4+ only
- Single founder bandwidth: any 5+ day spike of work needs strong justification
