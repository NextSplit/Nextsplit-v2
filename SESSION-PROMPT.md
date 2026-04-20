# NextSplit — Continuing Development Session Prompt

Use this prompt at the start of every new chat session to restore full context.

---

## WHO YOU ARE WORKING WITH

You are the primary developer and product architect for **NextSplit v2**, a running training app. You are working solo. The codebase is live at https://nextsplit-v2.vercel.app and the GitHub repo is at https://github.com/NextSplit/Nextsplit-v2.

---

## WHAT NEXTSPLIT IS

NextSplit is a training OS for serious amateur runners. It combines:
- **AI coaching** — personalised, data-driven, uses the athlete's actual logged data
- **Gym integration** — strength sessions built into all 17 running plan templates
- **Human coach marketplace** — professional coaches manage athletes, sell plans, earn revenue
- **Community** — clubs, leaderboards, gamified XP/badges, social features
- **Multi-sport** — running-first but supports triathlon coaches, cyclists who run

The product is NOT just a tracker. It is coaching + training + community in one place. No competitor does all three seriously.

---

## TECH STACK

- **Next.js 16** (App Router) + **Supabase** (Postgres + Auth + RLS) + **PWA**
- **Anthropic Claude API** for all AI features (server-side only, rate-limited)
- **Vercel** for deployment
- **Stripe** for payments (Phase 1 — not yet built)
- All client components fetch data via custom hooks in `src/hooks/`
- All AI calls go through `src/app/api/ai/` routes — never client-side

### Before every session starts
```bash
cd /home/claude/nextsplit-v2
git pull origin main && npm install
node_modules/.bin/next build        # must pass clean
node_modules/.bin/tsc --noEmit      # must show zero errors
```

---

## MASTER DOCUMENT

The full living product + dev document lives at:
`/home/claude/nextsplit-v2/HANDOFF-2.md`

**Read this at the start of every session.** It contains:
- Immediate next actions
- Full Supabase schema (existing + planned)
- Complete codebase map
- QA standards and coding patterns
- Full product roadmap with phase tracking
- All locked product decisions

Also downloadable from the latest GitHub commit.

---

## CRITICAL CODING RULES — NEVER BREAK THESE

### 1. Null-safe session codes
Session `.c` fields can be null from the DB. This has crashed the app in production before.
```typescript
// ALWAYS
s?.c?.startsWith('gym')
s.c != null && s.c !== 'rest'

// NEVER — will crash in production
s.c.startsWith('gym')
s.c !== 'rest'
```

### 2. Supabase queries
```typescript
import { db } from '@/lib/supabase/db'
await db(supabase).from('training_logs').select('*')
// Never use (supabase as any) — zero remaining in codebase
```

### 3. Before every commit
```bash
node_modules/.bin/tsc --noEmit   # zero errors required
node_modules/.bin/next build     # clean compile required
```

### 4. File size limit
No file over 600 lines. All major tabs have already been split into sub-components. Follow the same pattern for any new large files.

### 5. getDayType is null-safe
`getDayType()` in `src/lib/nutrition.ts` filters null codes internally. Don't change this behaviour.

---

## PRODUCT VISION — NEVER LOSE SIGHT OF THIS

### The north star
NextSplit is the app a serious amateur runner uses every single day — not just to track runs, but to be coached, to improve, and to feel part of a community of people on the same journey.

### The three moats
1. **AI coaching depth** — uses ACWR, pace zones, wellness, gym data, race calendar to give coaching that feels genuinely expert and personal. Not generic. Not "good job this week."
2. **Gym + running integration** — every plan has strength sessions built in. Progressive overload. Coached rationale on every exercise. No other running app does this seriously.
3. **Coach + community ecosystem** — human coaches manage athletes inside the same app athletes use. Plans sell in a marketplace. Community forms around coaches and clubs.

### Design principles
- **Running-first identity** — everything defaults to running. Multi-sport is supported but never leads.
- **Athlete experience is paramount** — coaches are powerful users but athletes are the core. Every coach feature must also improve what the athlete experiences.
- **AI augments humans, not replaces them** — AI flags issues, drafts messages, generates plans. Humans (coaches) make the decisions and build the relationships.
- **Merit over money** — Featured Plans are earned by quality, not paid for. The platform must be trustworthy.
- **Community grows from coaches outward** — coaches bring their athletes. Athletes bring friends. Friends become Split Leaders. Split Leaders become coaches. The flywheel is people, not ads.

---

## THREE-TIER USER MODEL (FULLY LOCKED)

### Tier 1 — Athlete (everyone)
- Free (3 AI calls/day) or Pro (£7.99/mo)
- Logs sessions, follows plans, can be coached
- Standard running + gym experience

### Tier 2 — Split Leader (included with Pro, no extra cost)
- Informal coaching — friends, running clubs, social following
- No accreditation required, instant approval
- 5 runners maximum
- Gets: simplified squad view, session annotations, text messaging, squad leaderboard, free plan sharing within squad
- Does NOT get: plan builder, marketplace selling, voice messages, AI automation, verified badge, unlimited athletes
- **Their runners pay nothing** — free to follow
- **Plans are shared informally, never sold**
- Purpose: acquisition engine. Brings runners onto NextSplit, drives Pro conversions, feeds upgrade funnel to Professional Coach

### Tier 3 — Professional Coach (£29/mo platform fee)
- Accredited or demonstrably experienced coaches
- Apply via Settings → reviewed by NextSplit (48hr target for professionals)
- Two sub-tiers: Unverified (instant, no badge) and Verified ✅ (credentials reviewed, badge, priority placement)
- Gets everything: unlimited athletes, full squad dashboard, AI automation rules, voice messages, plan builder, marketplace selling, bespoke athlete plans, featured plans eligibility, public club + private squad
- **Athletes pay coach directly** — coach sets price, NextSplit takes 20% of ongoing subscriptions, 30% of plan sales
- **Recommended pricing bands** shown to coach (they set their own price): £40–£200/mo depending on athlete level

### Account flow
- Everyone signs up as an athlete
- Apply to become Split Leader anytime (instant)
- Apply to become Professional Coach anytime (reviewed) — professional coaches can apply immediately on signup, no minimum sessions required
- Split Leader → Professional Coach upgrade: existing runners migrate automatically, all features unlock

---

## COACH PLATFORM DESIGN (LOCKED DECISIONS)

### Squad tab
Appears in bottom nav when coach mode is enabled. Standard nav: Today / Plan / Fuel / Coach / Character. Coach nav: Today / Plan / Fuel / **Squad** / Coach / Character.

### Squad view — three layers
1. **Private athlete squad** — full data access, annotations, plan management, messaging
2. **Public club** — audience building, anyone can join, leaderboard + challenges
3. **Squad community** — athletes auto-form a mini-community with each other (private, opt-in kudos and leaderboard)

### Data access
Coaches get read-only access to athlete data via Supabase RLS when relationship is active:
- Training logs ✅ (default on)
- Gym logs ✅ (default on)
- Wellness/readiness ✅ (default on)
- Activity logs (swim/cycle/walk) ✅ (default on)
- Nutrition diary ❌ (athlete opt-in only)
- Body weight ❌ (athlete opt-in only)
Athlete can revoke any permission at any time.

### Messaging
Text + voice messages (60-second voice notes stored in Supabase Storage). Both directions. Voice is the differentiator — personal feel at scale.

### AI automation (coach sets rules, AI acts within them)
Coach writes message templates with variables ({athlete_name}, {session_name} etc.). Triggers: session_missed, pb_achieved, acwr_high, acwr_low, streak_achieved, plan_completed, inactive_3days, wellness_low. AI fills in specifics, sends in coach's name. Coach sees log of all auto-sent messages. Optional approval mode.

### Plan control
Coach manages athlete's primary plan (can modify directly with athlete notification). Athlete can run additional plans alongside. Coach sees all active plans.

### Multi-sport scope
Coach platform supports any endurance sport. Running is the default identity but triathlon coaches, cyclists, and multi-sport athletes are fully supported. `activity_logs` table already has the right types.

### Pricing and revenue
- Coach sets their own price within recommended bands
- NextSplit takes 20% of ongoing coaching subscriptions via Stripe Connect
- NextSplit takes 30% of plan purchases
- Coach platform fee: £29/mo (freemium: free up to 5 athletes)

### Verification
- Unverified: anyone can apply, gets profile and dashboard, no badge
- Verified ✅: credentials reviewed by NextSplit, green badge, priority marketplace placement, higher athlete limits
- Credentials: recognised coaching qualification OR demonstrable professional experience

### Reviews
- Triggered after plan completion or 3 months of coaching
- Visible publicly once coach has 5+ reviews
- Coach can reply to reviews
- Rating (1–5) + written review

### Refunds
- Plan purchases: 14-day window if not activated
- Ongoing subscriptions: no refunds, cancel anytime

### Cold outreach
- Athletes → coaches: yes (enquiry from marketplace profile)
- Coaches → athletes: no cold messaging. Growth via public club and marketplace profile only.

---

## FEATURED PLANS — THE FLYWHEEL

The mechanism connecting runners to coaches and making the marketplace feel alive.

### How it works
Weekly featuring of 3–5 plans across: Today tab card, marketplace homepage hero, Monday push notification.

### Selection (merit only, never paid)
- Algorithmic: starts this week, completion rate (>70% required), review score (>4.0, minimum 5 reviews), recency boost for new verified coaches
- Editorial: NextSplit curated picks, seasonal relevance, distance diversity, new coach spotlights

### The connection loop
Featured plan → runner buys → discovers coach's public club → joins → coach has warm lead → runner completes plan → leaves review → plan gets featured again → more runners → coach earns more → tells other coaches → more coaches join

### Coach implications
Being featured = major platform exposure, potentially 20–50 new purchases in one week. This is the business case for quality plans and verified status. Unverified coaches are ineligible.

---

## COMMUNITY VISION

### Gamification (what's built)
- RPG character with XP, levels, 30+ badges
- Session XP, streak bonuses, PB celebrations
- Cross-training and ad-hoc sessions earn XP

### Gamification (to build — Phase 3)
- Season system (monthly/quarterly leaderboard resets)
- Time-limited challenges
- XP leagues (Bronze/Silver/Gold/Platinum)
- Kit unlocks via achievements
- Title system ("The Consistent One", "Speed Demon", "Iron Athlete")

### Clubs
- Create/join via code or invite link
- Coach-led public clubs grow the coach's audience
- Private squad communities form automatically between a coach's athletes
- Club leaderboard, feed (opt-in), challenges

### Social
- Activity feed (follow friends, opt-in)
- Kudos on sessions
- Virtual races
- Public challenges

**Gate:** Don't launch community features until 300+ active users. Empty community kills the feature.

---

## REVENUE MODEL SUMMARY

| Source | Payer | Amount | NextSplit cut |
|---|---|---|---|
| Athlete Pro | Athlete | £7.99/mo or £59/yr | 100% |
| Split Leader | Included in Pro | — | Via Pro subscription |
| Pro Coach platform fee | Coach | £29/mo | 100% |
| Ongoing coaching | Athlete → Coach | Coach-set | 20% |
| Plan purchase | Athlete | Coach-set | 30% |

**One coach with 15 athletes at £80/mo = ~£389/mo to NextSplit recurring**

---

## ROADMAP PHASES

### Phase 0 — Stabilise (CURRENT)
- Deploy crash fixes (null-safe session codes — in GitHub, blocked on Vercel rate limit)
- GitHub Actions CI/CD to replace unreliable webhook
- Sentry error monitoring
- Manual test all onboarding flows

### Phase 1 — Monetise
- Stripe (Supabase columns already exist, env vars needed)
- ProGate enforced
- Race event API integration
- PostHog analytics

### Phase 2 — AI Depth + Coach Soft Launch
- Pace zones wired into AI coaching prompts
- ACWR and wellness in coaching
- Adaptive plan when sessions missed
- Weekly AI summary notification
- Coach platform soft launch (2–3 coaches, manual seeding)
- Split Leader feature launch

### Phase 3 — Full Coach Platform + Community
- Full squad dashboard with AI automation
- Voice messages
- Plan builder
- Marketplace + Featured Plans
- Reviews
- Clubs and community features
- Gamification depth (seasons, leagues, titles)

### Phase 4 — Wearables + Native
- Garmin Connect
- Apple Health
- Capacitor → App Store + Play Store
- Background GPS

### Phase 5 — Scale + Exit-Ready
- Full test suite
- Load testing
- GDPR audit
- Referral programme
- Acquisition readiness

---

## QA STANDARDS (EVERY SESSION)

### Engineering checklist
- Zero TypeScript errors before every commit
- Clean `next build` before every commit
- No file over 600 lines
- No `(supabase as any)` — use `db(supabase)` from `@/lib/supabase/db`
- Null-safe session code access everywhere

### Testing roadmap
- Phase 0–1: Manual test matrix
- Phase 2: Vitest unit tests for pure lib functions
- Phase 3: Playwright e2e for critical paths

### Monitoring
- Sentry: client errors with real stack traces
- PostHog: funnel analytics (signup → plan → log → Pro)
- Vercel Analytics: Core Web Vitals

---

## WHAT GOOD LOOKS LIKE

A session that ends well has:
- Zero TypeScript errors
- Clean build
- HANDOFF-2.md updated with completed tasks ticked off
- A new HANDOFF downloaded and shared
- Clear next actions documented

A session that drifts has:
- Features added without reading the HANDOFF first
- New patterns introduced that contradict existing ones (especially around null safety and supabase queries)
- Large files created without splitting into components
- Decisions made without checking what's already locked in the master document

**Always read HANDOFF-2.md before writing a single line of code.**

---

## ENVIRONMENT VARIABLES (all in Vercel)
```
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
ANTHROPIC_API_KEY
NEXT_PUBLIC_STRAVA_CLIENT_ID / STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET
NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_EMAIL
CRON_SECRET
NEXT_PUBLIC_PREMIUM_ENFORCED=false
# Phase 0: SENTRY_DSN, NEXT_PUBLIC_POSTHOG_KEY
# Phase 1: STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL, STRIPE_WEBHOOK_SECRET
# Phase 2: STRIPE_COACH_PLATFORM_FEE_PRICE_ID
```

---
_NextSplit Session Prompt — generated from HANDOFF-2.md at commit 0dfa96d_
_Always cross-reference with the latest HANDOFF-2.md in the repo for the most current state_
