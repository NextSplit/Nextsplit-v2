# NextSplit — Three Pillars Master Strategy
**Version:** 1.0 | **April 2026**
**Status:** Locked spec — drives all Phase G+ development

---

## The Core Positioning

Every other running app is built around the individual athlete. Strava is a feed. Garmin is hardware-first. Nike Run Club is brand. TrainingPeaks is professional tools. None of them have made **the group the primary unit of motivation**.

NextSplit's thesis: the number one predictor of long-term running consistency is social accountability — someone waiting for you, someone who notices when you don't show up. We build around that truth.

**Consumer pitch:**
> "Train together. Adapt together. The running app built for how people actually stay consistent — with their friends."

**The three pillars deliver this across every user type:**

| Pillar | User Type | Core Value |
|---|---|---|
| 1. Bespoke Digital Coaching | Solo athlete | Plans that adapt to real life |
| 2. Split Leader | Social athlete | Train with friends, lead a crew |
| 3. Coaching Marketplace + Hub | Athlete seeking coach / Professional coach | World-class coaching, accessible and manageable |

---

## Pillar 1 — Bespoke Digital Coaching

### What it is
Three plan types, each personalised to the athlete:
- **Predetermined** — 36 curated templates, VDOT pace-personalised on activation
- **AI Bespoke** — Claude-generated plan based on full athlete profile, lifestyle, goals
- **Coach-authored** — Professional plan from a verified coach (Pillar 3 feeds this)

### Differentiation
The plan adapts. A Garmin plan doesn't know you had a stressful week. NextSplit's adaptation engine detects missed sessions, lifestyle changes, and race proximity — then rebuilds the plan around the athlete's actual life, not their ideal life.

### Key metrics to track
- Plan activation rate (onboarding completion → plan start)
- Week 2 retention (proxy for plan quality)
- Adaptation trigger rate (must be > 0% — if nobody misses sessions, the feature is invisible)
- VDOT accuracy (do athletes feel their paces are right?)

---

## Pillar 2 — Split Leader

### Overview
The Split Leader is a **Premium athlete who leads a private accountability squad of up to 5 friends**. They are not coaches. They don't prescribe plans. They motivate, track, celebrate and nudge. They are the social glue that keeps their friends running.

This is NextSplit's primary **organic growth engine** and a key reason to upgrade to Premium.

---

### The Split Leader Journey

#### Becoming a Split Leader
- **Automatic unlock** when a user subscribes to Premium
- No application, no approval — it's a Premium benefit
- First time they open Premium features, they see: *"You're now a Split Leader. Invite up to 5 friends to your squad."*
- Prompt also appears at 30-day milestone and when they first complete their squad of 5

#### Creating a Squad
The Split Leader:
1. Names their squad (max 30 chars)
2. Optionally uploads a **squad logo** (photo or emoji-based)
3. Sets squad visibility: private (default) or public page
4. Writes a **welcome message** (max 200 chars) — shown to anyone who receives the invite link
5. Generates a unique **invite link** (shareable anywhere)

When a potential member opens the invite link, they see:
- Squad name + logo
- Leader's name and runner class avatar
- Welcome message from the leader
- Current squad members (names + runner class only)
- Collective km run this month
- CTA: **"Join [Squad Name]"** — if free user, triggers discounted Premium offer

#### The Squad Member Onboarding Offer
When a free user clicks an invite link:

> *"[Leader Name]'s squad has run 847km together.*
> *Join them on Premium — first month for £3.99.*
> *Then £7.99/month. Cancel anytime."*

Key principles:
- Social proof first (squad stats, not features)
- Names the leader — personal, not corporate
- Never forced — always dismissable
- Discount is real: 50% off first month
- If the free user already has Premium, they just join — no offer needed

#### The Squad Cap and Limits
- **Maximum 5 members** per squad (not including the leader)
- **Leaders can only lead one squad** — prevents dilution of accountability
- **Members can join multiple squads** — a user can be in a work squad and a weekend trail squad
- Referral bonuses only apply to members who **signed up or upgraded via that leader's link/prompt** — prevents gaming

#### Squad Identity
The leader controls:
- Squad name
- Squad logo (photo upload or from emoji picker)
- Squad colour (chosen from 8 Forest-themed options)
- Welcome message for new invitees
- Whether squad page is public or private
- Leaderboard opt-in (off by default)

Squad colour applies to: the squad card on the member's Today tab, the squad feed background tint, squad achievements.

#### What the Split Leader Sees (Dashboard)

**Daily view:**
- Grid of squad members (name + runner class avatar)
- ✅ or ⏳ for today's session
- Session type if logged (easy run, long run, intervals — not pace data)
- Member's current streak

**Weekly view:**
- Individual weekly km for each member
- Squad collective weekly km (with goal progress bar if set)
- Who's had their best week ever (auto-detected milestone)
- Who hasn't run in 7+ days (flagged for nudge)

**What the Split Leader does NOT see:**
- Pace data (coach only)
- Wellness check-in data (coach only)
- ACWR injury risk scores (coach only)
- Plan week-by-week detail (coach only)
- Heart rate / biometric data (coach only)

**The principle: outcomes visible, health data private.**

#### What Squad Members See
Each squad member can see other members':
- Runner class avatar + name
- Today's session status (✅ / ⏳)
- Weekly km total
- Current streak
- Milestones and achievements (when shared)
- Collective squad stats and goal progress

Members cannot see each other's pace, wellness, or plan detail.

#### The Nudge System
- Split Leader has a **Nudge button** per member on their dashboard
- Max 1 nudge per member per day
- Nudge sends: push notification (if enabled) + in-app notification
- Nudge message is selected from a **curated list** (no free text, prevents issues):
  - "Your squad misses you — time to lace up! 👟"
  - "One run can change your whole week. Let's go 🔥"
  - "Your squad ran without you today. Tomorrow's yours 💪"
  - "Quick check-in — you good? Squad's thinking of you 🙌"
  - "Don't break the streak now, you're so close ⚡"
  - "Rain or shine, champions run. See you out there 🏃"
  - "[Leader Name] thinks today's your day. Prove them right."

#### Squad Reactions and Milestones
Squad members can react to **major milestones** (not individual sessions):
- Completing a plan ✅
- Logging a race result 🏁
- Running a distance PB 📏
- Hitting a streak milestone (30 days, 100 days) 🔥
- Squad collective goal reached 🏆

Reactions available: 🔥 👏 💪 🎉 ❤️

No free-text comments. No individual session reactions. Structured only.

#### Squad Goals
The Split Leader can set a **monthly squad goal**:
- Type: collective distance (km) or collective sessions
- Target: set by leader
- Progress: visible to all members on squad dashboard
- Completion: triggers squad achievement badge for all members

Example: "October goal: 300km as a squad" — progress bar fills as members log runs.

#### Squad Seasons and Stats
- **Monthly season** — resets on 1st of each month, archived at end
- **Annual season** — calendar year, archived December 31st
- **Lifetime stats** — never resets
Each season: squad km, sessions, members, goal completion rate, biggest week.
Viewable in the **Squad Trophy Room**.

#### Individual vs Squad Achievements
- Individual achievements go to the athlete's personal records
- Squad achievements go to the **Squad Trophy Room** (visible to all members)
- Both show in the athlete's profile — they have a "Squad Trophies" section

#### The Leader's RPG Identity
- Split Leaders show a **crown or stopwatch accessory** on their runner class avatar (visible to all users on their profile and in the community)
- In the community leaderboard, a crown icon appears next to their name
- Their profile shows: "Split Leader — leading [squad name], [N] runners"
- The squad size and collective km are public on their profile (squad member identities remain private)

#### Inactivity Policy
- Leader inactive (no session logged) for **5 months** → warning notification: *"Your squad will dissolve in 30 days if you don't log a session"*
- Leader inactive for **6 months** → squad disbands, all members notified
- Squad members inactive (no session logged) for **45 days** → Split Leader is prompted to remove them and invite someone new
- **Leadership transfer**: if leader is inactive 30+ days, any squad member can claim leadership (they must be Premium)

#### The Referral Reward
- Squad member upgrades to Premium (having joined via leader's invite or squad prompt) → **leader gets 1 month free** added to subscription
- Maximum 5 free months (one per squad member slot)
- Only counts if member is still in the squad at time of conversion
- Member upgrading gets **14 days extra on their first month** (50% off first month + 14 days)
- **Second generation**: if a converted member becomes a Split Leader and one of their squad converts → original leader gets 1 additional week free (capped, 2 levels only)

---

### The Squad-to-Coach Pipeline
Every 30 days, and when squad first reaches 5 members, leader sees:
> *"You've led your squad to [X] collective km. Some coaches started just like you. Want to explore becoming a NextSplit coach?"*

If they tap "Tell me more" → coach onboarding funnel begins.

---

### Coach Adopts a Squad (B2C2B Feature)
Coaches can **advertise group availability** on their marketplace profile:
> *"Available for squad coaching — up to 5 athletes, £15/person/month"*

Squads are shown coach recommendations based on:
- Squad's collective experience level
- Leader's stated goals
- Coach's specialty

The squad leader is shown the recommendation, **not cold-approached by coaches**. It feels like discovery, not sales. If the leader engages a coach, they receive a **Split Leader discount** on their own coaching subscription (e.g. 20% off) as a loyalty benefit for already being Premium.

---

### Squad Public Pages (Opt-In)
Leaders can enable a public squad page showing:
- Squad name + logo
- Collective km (all-time)
- Current challenge/goal progress
- Number of members (not names)
- CTA: "Join this squad on NextSplit"

Shareable on social media. Drives organic installs. The page URL: `nextsplit.app/squad/[slug]`

---

### Corporate Squads (Phase J)
For companies with 20+ employees on NextSplit:
- Squad size up to 50 (vs 5 for standard)
- Company logo + branding
- Company-wide leaderboard (opt-in per employee)
- HR dashboard: aggregate activity data (anonymised)
- Revenue model: per-seat pricing (£5/person/month at 20+, £3.50/person at 100+)
- Build proper corporate tier when capacity allows — on the roadmap, not gated on enquiry count

---

### Race Together (Future Feature — Phase I+)
- Squad or coach sets a shared race goal (real event)
- Plans for all members align to same race date
- External race data pulled from validated source (OpenStreetMap events, Racelist API, RunBritain)
- Athletes can search for races in their area and link to plan
- Post-race: squad gets collective achievement, all finish times shown in squad trophy room

---

### Split Leader Revenue Model Summary

| Source | Amount | Conditions |
|---|---|---|
| Leader Premium sub | £7.99/mo | Always — leader must be Premium |
| Member conversion bonus | 1 month free per conversion | Member joins via leader's link, still in squad at conversion |
| Maximum bonus | 5 months free | One per squad slot |
| Second-gen bonus | 1 week free per conversion | Capped at 2 levels, 1 generation only |
| Member discount | 50% off first month | One-time, member only |

---

## Pillar 3 — Coaching Marketplace & Hub

### Overview
Two distinct products that share infrastructure:

1. **Coaching Marketplace** — where athletes find and hire coaches
2. **Coaching Hub** — where coaches manage their business on NextSplit

These have separate pricing pages, separate onboarding flows, and in some areas separate visual identity — but they interconnect completely.

---

### 3A — The Coaching Marketplace (Athlete-Facing)

#### Discovery
Athlete entry points:
- Explore tab → "Find a Coach" (already partially built)
- AI recommendation: *"Based on your goals and training history, these 3 coaches might suit you"* — shown as a suggestion, not a gate
- Post-adaptation: *"Your plan has adapted 3 times this month. A coach could help you beyond what AI adaptation provides."*
- Split Leader squad adoption prompt (see Pillar 2)

#### Coach Profile — What Athletes See
- **Photo** (mandatory for verified status)
- **Video intro** (optional, 60-second max — coach chooses)
- **Bio** (max 500 chars)
- **Credentials** — uploaded qualification, verified badge once confirmed
- **Specialty** — distance focus, coaching style, athlete types
- **Location context** — timezone, language, cultural background (remote-first but relevant)
- **Pricing** — monthly subscription and/or one-off plan prices
- **Coach PBs** — optional, coach decides what to share
- **Social links** — Strava, Instagram, coaching website
- **Rating** — aggregate star rating (1-5) + number of reviews
- **Completion rate** — % of athletes who completed their programme (displayed as: "87% of athletes complete their programme with [Coach Name]")
- **Athletes coached** — total number (not names unless testimonial given)
- **Sample plans** — coach publishes 1-3 sample weeks (no full plans free)
- **Group availability** — if coach offers squad/group coaching, shown here

#### Verification Tiers

| Tier | Badge | Requirements |
|---|---|---|
| Listed | No badge | Account created, basic profile complete |
| Credential Verified | ✅ Blue tick | Qualification uploaded + auto-checked against UKA/England Athletics DB. Non-UK: self-declared + 3 completed client reviews |
| NextSplit Featured | ⭐ Gold feature | High traffic, strong completion rates, consistent ratings — NextSplit editorial selection weekly |

Featured coaches: showcased on Explore tab, homepage (logged-in), and in AI recommendations with higher weighting. This is NextSplit's mechanism to reward and retain top coaches.

#### Pricing Model (Athlete Side)
- **One-off plan purchase** — athlete buys a plan, no ongoing coach relationship, no squad access
- **Monthly subscription coaching** — athlete is added to coach's athlete list, receives ongoing management, plan adaptation, and coaching communication
- **Group plan** — lower per-person price, shared programme, coach manages as a cohort

Prices set by coach. NextSplit shows **average market rates** as guidance during coach setup (not enforcement).

#### The "Try Before You Buy" Option
Coach can optionally offer:
- Free consultation slot (15 min call or async message)
- Free first week of plan
- Sample plan PDF

This is coach-controlled. Not mandated. Shown on profile if offered.

#### Reviews
- Review unlocked after completing **50% of programme** (not before)
- Review includes: star rating (1-5), text (optional), would-recommend (yes/no)
- Used in: profile rating, completion rate metric, featured coach selection
- Coach rating on profile: aggregate stars + "X athletes reviewed"
- Testimonials: athlete can opt-in to have their review shown publicly with name. Default: anonymous ("A NextSplit athlete")

#### Dispute Resolution
- **7-day satisfaction window** after plan purchase or subscription start
- Athlete raises dispute → full refund, coach notified
- After 7 days: no refund, review can be left
- Subscription: cancel anytime, no refund for current month paid
- Repeat disputes by same coach → NextSplit review, potential suspension
- Repeated abuse of dispute system by athletes → warning, then restriction

---

### 3B — The Coaching Hub (Coach-Facing)

#### Coach Onboarding
1. Apply → upload credentials → profile setup
2. Set pricing and availability
3. Set max athlete capacity (e.g. "taking max 12 athletes")
4. Publish profile → appears as "Listed"
5. Credential confirmed → "Credential Verified" badge appears

#### Revenue Model (Coach Side)

| Clients | NextSplit Commission |
|---|---|
| 1-9 | 15% |
| 10-24 | 12% |
| 25-49 | 10% |
| 50+ | 8% |

Commission applies to all subscription revenue and one-off plan sales.
**Coach Pro Tools** (optional add-on): £19.99/month — advanced analytics, scheduled messaging, bulk plan management, priority support, coach referral programme access.

#### Coach Earnings Dashboard
- Monthly earnings summary (downloadable PDF, tax-ready)
- Per-athlete revenue breakdown (name + amount, private)
- Commission deducted clearly shown
- Stripe integration — payouts on monthly cycle
- Annual earnings summary for self-assessment

#### Athlete Management (Coach's Squad View)
Coaches see far more than Split Leaders:

| Data Point | Split Leader | Coach |
|---|---|---|
| Session status (today) | ✅ | ✅ |
| Distance + duration | ✅ | ✅ |
| Session type | ✅ | ✅ |
| Effort score | ✅ | ✅ |
| Weekly km | ✅ | ✅ |
| Pace data | ❌ | ✅ |
| ACWR (injury risk) | ❌ | ✅ |
| Wellness check-in | ❌ | ✅ (if athlete shares) |
| Heart rate zones | ❌ | ✅ (if athlete shares) |
| Plan week detail | ❌ | ✅ |
| Plan modification | ❌ | ✅ |
| Voice message | ❌ | ✅ |
| Scheduled messages | ❌ | ✅ (Coach Pro) |

Athlete controls what biometric data coaches see (opt-in per data type in settings).

#### Plan Builder
Coaches can:
- **Build from scratch** — week by week, day by day, session by session
- **Import** from TrainingPeaks (XML), Garmin Connect (pending API), or CSV
- **Clone and modify** existing plan (their own or a NextSplit template)
- **Template library** — save a plan as a reusable template, apply to multiple athletes
- **Group plan** — one plan assigned to multiple athletes simultaneously

Session granularity available:
- Session type (easy, tempo, long, intervals, gym, race, rest)
- Distance target
- Pace target (with VDOT personalisation per athlete)
- Duration target
- Sets and reps (e.g. 8×400m with 90sec recovery)
- Heart rate zone target
- Effort/RPE target
- Training zone (Z1-Z5)
- Coach notes (shown to athlete on session card)
- Mandatory vs optional sessions

#### Communication System
**Message types:**
- Text message (in-app, primary channel)
- Pre-written reaction templates ("Great session", "Keep it up", "Let's discuss this one")
- Voice note (Coach Pro feature or standard coach — needs decision: recommend standard coach)
- Scheduled message (Coach Pro only) — write now, send at specified time
- Read receipts: coach sees when athlete read the message
- Athlete can react to messages with emoji

**Notification model:**
- In-app: always
- Push notification: user-controlled preference
- Email digest: coach chooses frequency (immediate / daily digest / weekly digest)

**One limit:** Coaches cannot send unsolicited bulk messages to all athletes at once without opt-in (anti-spam). Group messages only to cohort/group plan members.

#### Athlete Capacity and Tiers
Coaches set maximum athlete count. Recommended tiers for progression:
- Starter: up to 10 athletes
- Growing: up to 25 athletes  
- Established: up to 50 athletes
- Elite: 50+ (NextSplit review required before unlocking)

This progression:
- Prevents coaches taking on more than they can manage
- Creates a natural quality filter (coaches who grow do so because they're good)
- Gives NextSplit a lever to ensure coaching quality

#### Coach Referral Programme (Coach Pro)
Available to Coach Pro subscribers only:
- Refer another coach to NextSplit
- Receive **£100 bonus** once referred coach secures 5 paying clients
- One-time payment, not ongoing commission (protects NextSplit's revenue model)
- Economics check: referred coach generates ~£X in commission. £100 bonus represents ~Y months of payback. (To be modelled at launch based on average ARPC.)

#### Availability Management
- Coach sets "Currently accepting: X new athletes"
- When capacity reached: profile shows "Currently full — join waitlist"
- Waitlist: athlete submits interest, coach notified when they free up a slot
- Prevents athlete frustration of engaging coach who then can't take them on

---

## Revenue Model — Full Picture

### Consumer Tiers

| Tier | Price | What You Get |
|---|---|---|
| Free | £0 | Predetermined plans, basic logging, community (read), character system |
| Premium Monthly | £7.99/mo | Everything + AI coaching, Split Leader unlock, full community, adaptation engine, analytics |
| Premium Annual | £59.99/yr (~£5/mo) | All Premium + 25% saving, priority support |

### Coach Tiers

| Tier | Price | Commission |
|---|---|---|
| Listed (free) | £0 | 15% on revenue earned |
| Coach Pro | £19.99/mo | 15% → 8% sliding scale, advanced tools |

### ARPU Modelling (Projections)

**Conservative case (Year 1, 500 users):**
- 60% free (300 users): £0 ARPU
- 35% Premium Monthly (175 users): £7.99 ARPU
- 5% Premium Annual (25 users): £5.00 ARPU
- Monthly consumer revenue: 175×£7.99 + 25×£5.00 = £1,523/mo
- 10 active coaches, avg £300/mo revenue each, 15% commission: £450/mo
- Total MRR: ~£1,973

**Growth case (Year 2, 3,000 users):**
- 50% free (1,500): £0
- 40% Premium Monthly (1,200): £7.99 ARPU
- 10% Premium Annual (300): £5.00 ARPU
- Monthly consumer: 1,200×£7.99 + 300×£5.00 = £11,088/mo
- 60 active coaches, avg £500/mo revenue, sliding commission avg 12%: £3,600/mo
- Coach Pro subscribers 20 coaches × £19.99: £399/mo
- Total MRR: ~£15,087

**Split Leader flywheel contribution (Year 2):**
- 240 active Split Leaders (20% of Premium)
- Average 2 squad member conversions per leader lifetime
- 480 additional Premium conversions at £7.99/mo
- Incremental MRR: £3,835/mo
- CAC for these users: ~£0 (organic)

### Annual Pricing Incentive
- Monthly: £7.99/mo = £95.88/yr
- Annual: £59.99/yr = £5.00/mo effective
- Saving: 37.5%
- Cash flow benefit: full year paid upfront
- Churn reduction: annual subscribers churn at ~25% of monthly rate

---

## Visual Identity by Pillar

### Colour Coding

| Pillar | Primary Colour | Accent | Usage |
|---|---|---|---|
| Solo / Bespoke | Forest Green `#2b5c3f` | Ember `#e85d26` | Today, Plan tabs, session cards |
| Split Leader | Gold/Crown `#c49a3c` (Track) | Forest | Squad dashboard, squad feed, leader badge |
| Coaching | Deep Navy `#1e3a5f` | Track gold | Coach views, marketplace, coach profiles |

The Track gold (`#c49a3c`) becomes the Split Leader colour — it reads as premium, social, warm. The coach navy is authoritative, professional, trustworthy.

### Iconography
- Standard athlete: runner avatar
- Split Leader: runner avatar + crown accessory
- Coach: verified badge (blue tick) + separate coach profile card
- Featured coach: gold star indicator

### UI Treatment
- **Solo experience**: Forest dark theme (current)
- **Squad experience**: Squad colour tint on Today tab header when in squad context, squad card strip below session cards
- **Coach experience**: Navy accent replaces Forest in coach views (for coaches using the Hub)

---

## Build Phases — Three Pillars Priority Order

All existing open tasks shift behind this. Current alpha UI work (SessionCard dark theme etc.) continues in parallel as it doesn't require planning.

### Phase SL1 — Split Leader Foundation (4-5 sessions)
**Database:**
- Add `squads` table
- Add `squad_members` table
- Add `is_split_leader`, `split_leader_squad_id` to profiles
- Add `squad_invites` table
- Add `split_leader_reward_months` counter to profiles

**Features:**
- Squad creation flow (name, logo, colour, welcome message)
- Invite link generation + landing page
- Squad member join flow (with Premium offer for free users)
- Basic squad dashboard (session status grid, weekly km)
- Nudge system (button → curated message → push notification)
- Squad feed (milestone reactions only)

### Phase SL2 — Split Leader Depth (3-4 sessions)
- Squad goals (monthly, progress bar)
- Squad Trophy Room (collective achievements)
- Squad seasons (monthly + annual + lifetime)
- Public squad page (opt-in)
- Leader RPG avatar update (crown/stopwatch accessory)
- Community leaderboard crown indicator
- Inactivity warnings + squad disbanding logic
- Leadership transfer mechanism
- Squad-to-coach pipeline prompt

### Phase CM1 — Coaching Marketplace (4-5 sessions)
- Coach profile redesign (photo, video intro, credentials, specialty)
- Verification flow (credential upload + UKA API check)
- Athlete-facing marketplace browse + filters
- Coach profile public page
- Plan preview / sample week
- Review system (unlock at 50% completion)
- Featured coaches editorial selection (admin tool)

### Phase CM2 — Coaching Revenue (3-4 sessions)
- Stripe Connect for coach payouts
- Subscription coaching sign-up flow
- One-off plan purchase flow
- Commission calculation + sliding scale
- Coach earnings dashboard
- 7-day satisfaction window + dispute flow
- Group coaching enrolment

### Phase CH1 — Coach Hub Tools (4-5 sessions)
- Advanced plan builder (granular session editor)
- Plan template library (save, reuse, sell)
- Import from TrainingPeaks / CSV
- Clone and modify existing plans
- Athlete capacity management
- Availability management (max athletes, waitlist)

### Phase CH2 — Coach Hub Communication (2-3 sessions)
- Scheduled message composer
- Voice note (if not already coach-standard)
- Email digest preferences
- Read receipts
- Coach Pro tools subscription

### Phase CO — Corporate (Phase J, Year 2)
- Corporate account type
- Squad size up to 50
- Company branding
- HR dashboard (anonymised aggregate data)
- Per-seat pricing model
- Manual handling until 5+ enquiries

---

## Key Decisions Locked

| Decision | Answer |
|---|---|
| Split Leader unlock | Automatic with Premium |
| Squad cap (standard) | 5 members |
| Leader squad limit | 1 squad only |
| Member squad limit | Multiple squads allowed |
| Squad member visibility | Basic: status, distance, streak, milestones |
| Squad feed type | Structured only (milestones + reactions) |
| Nudge messages | Curated list (no free text) |
| Squad goals | Collective, set by leader, monthly |
| Seasons | Monthly + Annual + Lifetime |
| Leader identity | Crown/stopwatch accessory on avatar |
| Member discount | 50% off first month for squad invite converts |
| Leader referral reward | 1 month free per converted squad member (max 5) |
| 2nd gen referral | 1 week free, capped at 2 levels |
| Inactivity disbanding | 30-day warning → 6-month disband |
| Leadership transfer | Member can claim after 30-day leader inactivity |
| Member removal prompt | 45-day member inactivity → leader prompted |
| Coach commission | 15% → 8% sliding scale (by client count) |
| Coach prices | Set by coach (NextSplit shows market averages) |
| Verification | Credential upload + UKA check. Non-UK: self-declared + 3 reviews |
| Featured coaches | Weekly editorial selection (high traffic + quality) |
| Review unlock | After 50% of programme completion |
| Dispute window | 7 days from purchase |
| Plan granularity | Full: sets, reps, zones, effort, pace, notes |
| Async comms | In-app primary, email digest, push notifications |
| Coach referral bonus | £100 one-off when referred coach hits 5 clients |
| Coach capacity tiers | 10 → 25 → 50 → 50+ (gated progression) |
| Annual discount | 37.5% (£59.99/yr vs £7.99/mo) |
| Corporate | Phase J — build when capacity allows, on roadmap |
| Race Together | Phase I+ with external race data API |
| Public squad pages | Opt-in, URL: nextsplit.app/squad/[slug] |

---

## Open Questions (Decide Before Phase SL1 Build)

1. **Squad member Premium requirement**: Members can be free, but do they get a reduced feature set within the squad (e.g. can't see collective stats unless they're Premium)? Or do all squad features work for free members?
   - Recommendation: free members can participate fully in squad. The offer to upgrade is contextual, never a gate to squad features.

2. **Coach voice notes**: Standard coach feature or Coach Pro only?
   - Recommendation: standard coach feature. It's a core communication tool, not a luxury. Coach Pro differentiates on analytics, bulk tools, scheduled messages.

3. **Split Leader on annual plan**: Do they still earn free months (which would extend past their annual renewal), or do they earn credit toward next renewal?
   - Recommendation: credit toward next renewal. 1 month free = £7.99 credit applied at renewal.

4. **Multi-squad member priority**: If a user is in 3 squads, which squad's leader gets credit if they upgrade?
   - Recommendation: the leader whose invite link they used to join. If they joined organically (not via invite), no leader gets credit.

---

*This document is the canonical spec for Three Pillars development. All build sessions reference it. All decisions recorded here supersede earlier strategy docs.*
