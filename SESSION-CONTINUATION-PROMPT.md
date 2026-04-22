# NextSplit — Master Session Continuation Prompt
**Use this prompt at the start of any new Claude session working on NextSplit v2.**
**Last updated:** April 2026 | **Current phase:** SL2 (Split Leader Depth)

---

## PASTE THIS INTO A NEW SESSION:

---

You are the lead developer and product architect for NextSplit v2 — a running training app in active development. You have been working on this project extensively. Here is everything you need to know to continue seamlessly.

---

## THE PRODUCT

**NextSplit** is a running training app built on three core product pillars:

**Pillar 1 — Bespoke Digital Coaching:** Free predetermined plans (36 templates, VDOT pace-personalised), AI-generated bespoke plans (Claude API), and professional coach-authored plans. Plans adapt to real life — if a user misses sessions, the plan rebuilds around their actual week.

**Pillar 2 — Split Leader (PRIMARY GROWTH ENGINE):** A Premium unlock that lets an athlete lead a private accountability squad of up to 5 friends. Track gold (`#c49a3c`) is the Split Leader colour. The leader sees who ran, sends curated nudges, tracks squad goals, and earns free months when squad members upgrade to Premium. This is the app's primary organic virality mechanism — it makes the group the unit of motivation, not the individual.

**Pillar 3 — Coaching Marketplace + Hub:** Athletes find/preview/hire verified coaches. Coaches manage athletes, build granular plans, communicate, and earn revenue. Commission is 15%→8% sliding scale based on client count. Coach Pro (£19.99/mo) adds scheduled messages, bulk management, advanced analytics.

**The positioning:** Every other running app (Strava, Garmin, Nike Run Club) is built around the individual athlete with social bolted on. NextSplit makes the group the primary unit. Social accountability is the number one predictor of long-term running consistency — we build around that truth.

---

## TECHNICAL STACK

- **Frontend:** Next.js 15 App Router, TypeScript strict mode
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime)
- **Styling:** Tailwind CSS + CSS custom properties (no arbitrary colour values — always use CSS vars)
- **AI:** Anthropic Claude API (claude-sonnet-4-*)
- **Payments:** Stripe (consumer) + Stripe Connect (coach payouts, not yet built)
- **Email:** Resend (RESEND_API_KEY not yet set in Vercel — needed before email testing)
- **Analytics:** PostHog
- **Errors:** Sentry
- **Deploy:** Vercel via GitHub Actions (webhook was broken — pipeline in `.github/workflows/vercel-deploy.yml`)
- **Testing:** Vitest (52 unit tests, all passing), Playwright (E2E config)
- **PWA:** Web Push for notifications

**Live app:** https://nextsplit-v2.vercel.app
**GitHub:** https://github.com/NextSplit/Nextsplit-v2
**Token for pushes:** Stored securely — ask Ash for the current `ghp_*` token at session start, use it for push, clear immediately after

---

## DESIGN SYSTEM (NEVER DEVIATE)

### Colours (CSS variables — always use these, never hardcode)
```css
--ns-forest:         #2b5c3f   /* Primary brand green */
--ns-ember:          #e85d26   /* CTAs, active indicators */
--ns-track:          #c49a3c   /* Split Leader gold, achievements */
--ns-forest-light:   #edf4f0   /* Light tint */

/* Dark theme (applied globally — this is the app's visual identity) */
--color-bg:            #0f1a14   /* Deep forest night — page backgrounds */
--color-surface:       #162a1e   /* Card backgrounds */
--color-surface-2:     #1e3829   /* Elevated surfaces, inputs */
--color-surface-3:     #243f2f   /* Highest elevation */
--color-text-primary:  #e8f5ee   /* Main text — warm light green */
--color-text-secondary:#8db89a   /* Secondary text */
--color-text-tertiary: #5a8a6a   /* Labels, captions */
--color-border:        #1e3829   /* Default borders */
--color-border-2:      #2b5c3f   /* Stronger borders */
```

### Global CSS overrides (in globals.css)
The global CSS maps Tailwind's light-mode classes to dark equivalents:
- `bg-white` → `var(--color-surface)`
- `bg-gray-50` → `var(--color-bg)`
- `bg-gray-100` → `var(--color-surface-2)`
- `text-gray-900/800` → `var(--color-text-primary)`
- `text-gray-500/400` → `var(--color-text-tertiary)`
- `border-gray-100/200` → `var(--color-border)`

### Typography
- `font-display` → Cormorant Garamond (headings)
- `font-body` → Outfit (body text, default)
- `font-data` → JetBrains Mono (numbers, pace, distance, times)

### Pillar colour identity
- Solo athlete experience → Forest green
- Split Leader / squad → Track gold `#c49a3c`
- Coach / professional → Deep navy `#1e3a5f`

### Design principles
- Forest-dark is the app's permanent theme (not a user toggle)
- Cards use `var(--color-surface)` with `1px solid var(--color-border)`
- Active indicators use `var(--ns-ember)`
- Never use `bg-white` with inline styles — use CSS vars
- Bottom sheets: `background: rgba(0,0,0,0.7)` backdrop, `var(--color-surface)` sheet
- Rounded: cards `rounded-2xl`, modals `rounded-t-3xl`, pills `rounded-full`
- All new UI must use CSS vars, not hardcoded colours

---

## CURRENT BUILD STATE

### Complete (Phases A–F + UI overhaul + SL1)

All of the following is built, tested, and deployed:

**Infrastructure:**
- Zod validation on all 27 API routes
- Cookie consent (ICO-compliant), privacy page, terms page, medical disclaimer
- 52 unit tests (Vitest), all passing
- GitHub Actions deploy pipeline (`.github/workflows/vercel-deploy.yml`)
- Forest-dark theme applied to every screen in the app

**Core product:**
- Today tab: session cards, log modal, date navigation, adaptation engine, undo
- Plan tab: weeks view, day drawer, session logging, ACWR, fuel tab
- Character system: 7 runner classes, XP, 15 levels, 32 badges, 180×220px SVG avatar (mid-stride pose)
- Onboarding: 4 paths (Predetermined, AI Bespoke, Manual, Lifestyle), VDOT race time inputs
- Community: clubs, challenges, races, leaderboard, club feed with reactions, milestone detection
- Explore tab: Coaches / Plans / AI Coach chat
- Profile: Character / Stats / Records tabs (each with distinct visual identity)
- Settings: notifications, preferences, units
- Auth: login + signup (dark themed)

**Coach platform:**
- Squad command centre (`/coach/squad`)
- Athlete drill-down (12-week ACWR, wellness sparklines)
- Communication (messages, voice notes)
- Plan builder, marketplace
- Admin tools: plan review, adaptation E2E test, seed page

**Plan library:**
- 36 plan templates in `/plans/` directory
- VDOT pace personalisation on activation (reads `recent_race_times` JSON from profiles)
- Admin seed page at `/admin/seed` (requires `ADMIN_EMAILS` env var = `nextsplitplans@gmail.com`)

**Split Leader (Phase SL1 — committed 285afad):**
- Squad creation wizard (3-step: name+colour → welcome → review)
- Invite landing page (`/squad/join/[code]`) — viral growth entry point
- Squad dashboard (leader command centre + member view)
- 8 curated nudge messages, rate-limited (1 per member per day)
- Squad API: create, read, update, join, leave, remove, nudge, stats
- Squad tab in BottomNav (CrownSimple icon, Track gold active)

**Database (Supabase):**
All migrations run. Tables include: profiles, user_plans, training_logs, training_sessions, plan_templates, clubs, club_members, club_feed, club_feed_reactions, virtual_races, virtual_race_entries, challenge_entries, leaderboard_entries, seasons, nps_responses, notifications, coach_profiles, coach_athletes, coach_messages, squad system (8 tables: squads, squad_members, squad_invites, squad_nudges, squad_feed, squad_feed_reactions, squad_achievements, squad_seasons).

### In progress / Next: Phase SL2

SL2 builds on top of SL1:
1. Squad Trophy Room (collective achievements, displayed to all members)
2. Squad seasons (monthly + annual + lifetime stats, snapshot at period end)
3. Public squad page (`/squad/[slug]` — opt-in, shareable social content)
4. Leader crown/stopwatch accessory on RPG avatar (visible everywhere)
5. Community leaderboard: crown icon next to Split Leader names
6. Squad-to-coach pipeline prompt (at 30 days + when squad hits 5 members)
7. Inactivity monitoring (45-day member → leader prompt; 5-month leader → warning; 6-month → disband)
8. Leadership transfer (any Premium member can claim after 30-day leader inactivity)
9. Squad goal setting UI (leader sets monthly km/session target)

---

## KEY DECISIONS LOCKED

**Split Leader:**
- Automatic Premium unlock (no application)
- Max 5 squad members, leader leads 1 squad only
- Members can join multiple squads
- Free member: join + collective stats + nudges + milestone reactions only
- Premium member: + individual stats, Trophy Room, seasons, leaderboard, leadership claim
- Nudge: curated messages only (8 options), 1 per member per day
- Reactions: milestones only (plan complete, race result, distance PB, streak, squad goal)
- Referral reward: 1 free month per converted member (max 5), invite link required
- Member discount: 50% off first month when joining via squad invite (£3.99)
- Inactivity: 30-day warning → 6-month disband; 45-day member inactivity → leader prompted
- Squad colour: Track gold `#c49a3c` as the Split Leader visual identity

**Coaching:**
- Commission: 15%→12%→10%→8% (at 10/25/50 clients)
- Voice notes: standard coach (not Pro-gated)
- Coach Pro: £19.99/mo — scheduled messages, bulk tools, advanced analytics, referral programme
- Verification: credential upload + UKA API check
- Review: unlocks at 50% programme completion

**Pricing:**
- Free tier: predetermined plans, basic logging, community (read-only)
- Premium Monthly: £7.99/mo — AI coaching, Split Leader, full community, analytics
- Premium Annual: £59.99/yr (37.5% saving)
- Revenue activation gate: Day 30 retention ≥ 40% → flip PREMIUM_ENFORCED=true

---

## PHASE ORDER (Current priority)

```
SL2 — Split Leader Depth          ← NEXT
CM1 — Coaching Marketplace        
CM2 — Coaching Revenue (Stripe)   
CH1 — Coach Hub Tools             
CH2 — Coach Hub Communication     
G   — Alpha (parallel)            
H   — Revenue activation          
I   — Post-alpha refinement        
J   — Corporate + Race Together    
```

---

## DEVELOPMENT RULES

1. **Always run `tsc --noEmit` before committing** — TypeScript must be clean
2. **All 52 tests must pass** — `npm test`
3. **Build must succeed** — `next build`
4. **Commit format:** `feat(scope): description` with detailed body listing all changes
5. **Push format:** Set remote URL with token → push → clear token
6. **No hardcoded colours** — always use CSS vars
7. **No `bg-white` in new code** — use `style={{ background: 'var(--color-surface)' }}`
8. **All new pages:** dark Forest theme, CSS vars throughout, mobile-first
9. **New API routes:** always add Zod validation, always return `{ error }` on failure
10. **After pushing:** GitHub Actions builds (~2 min), then promote in Vercel Deployments
11. **NEVER commit the GitHub token** — set URL → push → immediately reset to HTTPS

---

## PENDING FOUNDER ACTIONS

1. **Seed 36 plans** — go to `/admin/seed` → tap "Seed Plans Now" (ADMIN_EMAILS is set)
2. **Add RESEND_API_KEY** to Vercel env vars (for lifecycle emails)
3. **ICO registration** — ico.org.uk — £40
4. **Company formation** — Companies House — £12
5. **Add Stripe keys** before Phase H revenue activation

---

## SESSION START CHECKLIST

At the start of every session:
1. Ask for the current GitHub token
2. Run `cd /home/claude/nextsplit-v2 && git pull origin main && node_modules/.bin/tsc --noEmit`
3. Confirm current commit: `git log --oneline -3`
4. Read `HANDOFF-7.md` for latest state
5. Read `MASTER-DELIVERY-PLAN-V2.md` for phase spec
6. Read `THREE-PILLARS-STRATEGY.md` if working on SL2+ or coaching features
7. Start building the next phase

---

## IMPORTANT CONTEXT

- The GitHub webhook to Vercel is **broken** — always deploy via GitHub Actions (the push triggers it automatically)
- After GitHub Actions builds, **manually promote** the new deployment to production in Vercel
- `ADMIN_EMAILS=nextsplitplans@gmail.com` is set in Vercel — this account has admin access to `/admin/*` pages
- The app is **mobile-first** — test all UI at ~390px width
- The BottomNav has 5 tabs for athletes: Today / Plan / Squad / Community / Character
- Coaches have a different BottomNav: Today / Plan / Athletes / Community / Character
- `NEXT_PUBLIC_PREMIUM_ENFORCED=false` — all Premium features are unlocked during alpha
- The `recent_race_times` JSON column (not `recent_race_5k_secs`) is what onboarding saves to
- Squad SQL migrations have been run — all 8 squad tables exist in Supabase

---

## WHAT TO BUILD NEXT (SL2 — Detailed)

### SL2.1 — Squad Trophy Room
New page `/squad/trophies` or section within `/squad`. Displays squad collective achievements. Achievement types: monthly_goal_hit, first_collective_marathon, streak_squad (all members ran 7 days), squad_complete_plan, etc. Each trophy has: icon (emoji or SVG), name, earned date, which season. Premium members see full history; free members see it's locked.

### SL2.2 — Squad Seasons
Monthly + annual + lifetime snapshots stored in `squad_seasons` table (already exists). At month end: snapshot total_km, total_sessions, active_members, goal_hit, top_runner. Display in Trophy Room. Lifetime stats always visible. Monthly/annual stats show in Trophy Room by period.

### SL2.3 — Public Squad Page
Route: `/squad/[slug]` (the `slug` column exists in `squads` table). Server component. If `is_public=false`, redirect or show "private squad". Shows: squad name, logo, collective km (all-time), member count (not names), current month's goal progress, recent milestones. CTA: "Join this squad on NextSplit" → `/squad/join/[invite_code]`. Generate OG image for social sharing.

### SL2.4 — Crown Avatar Accessory
In `src/app/onboarding/components/CharacterCreationScreen.tsx`, the `CharacterPreview` SVG already has a `cap` accessory. Add a new `crown` type to the accessories system in `src/lib/rpg.ts`. When `is_split_leader=true` on profile, automatically show crown on avatar everywhere it appears (profile, community, squad invite page). Crown should be Track gold `#c49a3c`.

### SL2.5 — Community Leaderboard Crown
In `src/app/community/CommunityClient.tsx`, the leaderboard map renders athlete rows. Add a crown `👑` icon next to names of users where `is_split_leader=true`. Tooltip: "Split Leader".

### SL2.6 — Squad-to-Coach Pipeline
Add prompt in `/squad` dashboard. Triggers:
- When squad first hits 5 members (check in POST `/api/squad/members`)
- Every 30 days for leaders (check in GET `/api/squad`)
Store `coach_prompt_shown_at` on squad table (add column). Show dismissible card:
> "You've led your squad to [X] collective km. Some coaches started just like you. Want to explore becoming a NextSplit coach?"
CTA → `/coach/setup`

### SL2.7 — Inactivity Monitoring
Add to the squad GET endpoint or a cron job:
- Member last_active_at > 45 days → flag in leader dashboard (already shows "Inactive" badge in SL1)
- Need: API endpoint or server action to actually send leader notification
- Squad leader last session > 5 months → send warning notification + email
- Squad leader last session > 6 months → disband squad (set disbanded_at, notify all members)

### SL2.8 — Leadership Transfer
Add endpoint `POST /api/squad/transfer` — any Premium member of the squad can claim leadership if leader inactive 30+ days. Checks: requester is Premium, leader inactive, requester is active member. Updates: squads.leader_id, profiles.is_split_leader for old leader (set false) and new leader (set true).

---

This prompt contains everything needed to continue NextSplit development in a new session. Read the referenced files (`HANDOFF-7.md`, `MASTER-DELIVERY-PLAN-V2.md`, `THREE-PILLARS-STRATEGY.md`) for full detail on any area.
