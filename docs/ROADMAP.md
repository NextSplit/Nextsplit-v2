<!--
  v0.1 — 2026-05-07 — Initial commit. Operating manual + persona register +
                       10 threads + cadence + opening ideation framing.
-->
# NextSplit Roadmap & Operating Manual
**Status:** v0.1 draft | **Owner:** Ash | **Source of truth — all direction and delivery flows through this document**

> **READ ORDER for every session:** `CLAUDE.md` → `HANDOFF.md` (state) → **this doc (direction)**.
> If a piece of work is not in here with a thread and a phase, it is **not a commitment**.

---

## 1. Purpose & operating principles

This document is **the** roadmap. It is updated continuously and is the only artifact where direction is committed. `HANDOFF.md` describes _state_ (what's running, what's broken, how to resume); this file describes _direction_ (what we're building, why, in what order).

**Operating principles:**

- **Honest by default.** Every council and forge pass runs under the rule "options and solutions, never point-blank refusals." Reviewers who only object without proposing an alternative get scored low.
- **Multi-persona before single feature.** No feature ships without being walked through every relevant persona (§2). If a feature only serves one persona, that's a flag — not necessarily wrong, but needs justification.
- **Co-existence over standalone.** Features must enhance each other. New features earn their slot by making an existing feature more valuable, not by occupying empty space.
- **Ruthless on low-value.** Anything not earning daily or weekly attention from at least one persona is on the chopping block. We cut faster than we add.
- **Brand & character continuity.** The user's runner-character is the through-line across surfaces. Visual, motion, copy, sound — all ladder back to the deep-navy / vivid-accent system and the character's voice.
- **Council & forge are not optional.** They are how programmes of work move forward. Skipping them is a process failure, not a shortcut.
- **Strava-/Duolingo-grade execution as the benchmark.** We won't match their headcount. We can match their craft. No excuses on polish, motion, copy, or consistency.

---

## 2. Personas — the six users we serve

Every feature is reviewed against the relevant subset of these personas. A feature is described as "Solo+Squad-Member" or "all athletes" or "Coach-Pro only" — never "the user" generically.

### A. Solo Runner
- **Need:** a good plan, low-friction logging, gradual feedback that they're improving. Doesn't want social pressure.
- **Daily touch:** Train tab → today session → log.
- **Weekly touch:** plan progression, ACWR (when unlocked), streak.
- **Churn signal:** loneliness; plan feels mechanical; no sense of identity in the app.
- **Rave signal:** "It just understood what I needed this week."

### B. Squad Member
- **Need:** to run with mates, to be seen running, to know they're not slacking alone.
- **Daily touch:** Squad surface → who logged today, who didn't. Train → log → squad sees.
- **Weekly touch:** leaderboard, collective km, nudges sent/received.
- **Churn signal:** the squad goes quiet; nudges feel one-directional.
- **Rave signal:** "My mate poked me and I went out — wouldn't have otherwise."

### C. Squad Leader / Split Leader
- **Need:** to keep their squad active without nagging. Tools that make leadership easy.
- **Daily touch:** squad health glance, send nudge in one tap.
- **Weekly touch:** leaderboard publish, squad chat, set a collective goal.
- **Churn signal:** admin overhead; no one engages back; no upside for being the leader.
- **Rave signal:** "My squad finished the month with 100% logging rate — that was on me."

### D. Athlete with Coach
- **Need:** a human in the loop; plan adjustments; accountability with expertise behind it.
- **Daily touch:** log → see coach reaction. Maybe a coach message.
- **Weekly touch:** plan reviewed/adjusted by coach, training notes.
- **Churn signal:** coach silent; plan stale; feels like paying for a static document.
- **Rave signal:** "My coach changed my Tuesday because of how Saturday went. Felt like Premier League stuff."

### E. Coach (Split Leader tier)
- **Need:** lead a casual squad, have light tools, not be expected to act professionally.
- **Daily touch:** squad health glance.
- **Weekly touch:** review who needs a nudge, send group encouragement.
- **Churn signal:** complexity creeps in; expected to coach when they signed up to lead.
- **Rave signal:** "I've kept five mates running for six months."

### F. Coach (Professional)
- **Need:** this is income. Tools that handle plan creation, athlete management, payments, marketplace presence, growth.
- **Daily touch:** athlete dashboard, message inbox.
- **Weekly touch:** plan adjustments per athlete, revenue screen.
- **Monthly touch:** payouts, marketplace performance, athlete acquisition.
- **Churn signal:** can't grow roster; payouts opaque; tools weaker than what they had on email + spreadsheet.
- **Rave signal:** "I went full-time on NextSplit."

**Persona-coverage rule:** any feature shipped under the Coach Suite or Squad threads must pass a "walk-through" for **every** persona it touches before merge. The walk-through is recorded in the PR description.

---

## 3. Threads (parallel workstreams)

Each thread has a charter, a default council pool, a backlog, and a nominal cadence. Threads run in parallel; phases (§6) sequence which items from each thread ship together.

### T1 · Engineering
- **Scope:** code delivery, performance, refactor, tests, deploy.
- **Council pool:** `ns-frontend-engineer`, `ns-backend-data-engineer`, `ns-qa-risk`, `ns-performance`, `ns-mobile-pwa`.
- **Standing concerns:** type safety, bundle size, Core Web Vitals, iOS-Safari quirks, regression surface, hydration.

### T2 · Brand & UX
- **Scope:** visual system, motion, copy, character voice, illustration, IA. Owns the "no excuses" bar on craft.
- **Council pool:** `ns-ux-designer`, `ns-visual-brand`, `ns-animation-motion`, `ns-content-copy`, `ns-accessibility`.
- **Standing concerns:** consistency across surfaces, character continuity, motion budget, WCAG 2.2 AA, copy tone.

### T3 · Retention & Growth
- **Scope:** loops, lifecycle, push, share, referral, seasons, onboarding optimisation.
- **Council pool:** `ns-product-strategist`, `ns-marketing-growth`, `ns-analytics-data`, `ns-content-copy`.
- **Standing concerns:** D1 / D7 / D30 retention, onboarding funnel, share rate, push open rate, replayability.

### T4 · Coach Suite
- **Scope:** the full coach product — Split Leader and Professional. Dashboards, plan authoring, athlete management, revenue, marketplace surface, payouts.
- **Council pool:** `ns-product-strategist`, `ns-coach-domain-expert`, `ns-ux-designer`, `ns-finance-pricing`, `ns-backend-data-engineer`.
- **Standing concerns:** does this make a coach more effective with their athletes; does it justify the £29 platform fee for Pro; is the experience on par with what professional coaches use today.

### T5 · Revenue & Pricing
- **Scope:** founding tier, paywall design, contextual upsells, pricing experiments, coach commission curve.
- **Council pool:** `ns-finance-pricing`, `ns-product-strategist`, `ns-marketing-growth`, `ns-devils-advocate`.
- **Standing concerns:** discreet over loud; conversion at moments of demonstrated need; founding-tier urgency without sleaze.

### T6 · Security, Risk & Legal
- **Scope:** auth, RLS, OWASP, GDPR / UK ICO, T&Cs, payment compliance, third-party data terms, age, cookies, consent.
- **Council pool:** `ns-security-privacy`, `ns-legal-compliance`, `ns-qa-risk`, `ns-devils-advocate`.
- **Standing concerns:** any change touching PII, auth, payments, or third-party data triggers this thread automatically.

### T7 · Domain Correctness
- **Scope:** VDOT, ACWR, periodisation, gym integration, recovery, taper, deload — the sport-science integrity of every plan and recommendation.
- **Council pool:** `ns-coach-domain-expert`, `ns-qa-risk`.
- **Standing concerns:** anything labelled "AI plan" must pass domain review; ACWR thresholds must match research; race-distance taper logic must be defensible.

### T8 · Analytics & Data
- **Scope:** KPI definitions, funnel design, cohort retention, experimentation framework, PostHog event taxonomy.
- **Council pool:** `ns-analytics-data`, `ns-product-strategist`, `ns-pm-tech-lead`.
- **Standing concerns:** every shipped feature has at least one measured outcome; experiments are designed before features ship, not after.

### T9 · DevOps & SRE
- **Scope:** deploy, monitoring, alerting, on-call, incident response, vercel/supabase/sentry health.
- **Council pool:** `ns-devops-sre`, `ns-backend-data-engineer`, `ns-qa-risk`.
- **Standing concerns:** observability, deploy reliability (the Hobby cron lesson), failure modes, rollback plan.

### T10 · Customer Support & Community
- **Scope:** support intake, response, FAQ, community comms, feedback loop into the roadmap.
- **Council pool:** `ns-customer-support`, `ns-content-copy`, `ns-product-strategist`.
- **Standing concerns:** how do users tell us things; how fast do we close the loop; community moderation.

---

## 4. Cadence — how council & forge run the programme

We run NextSplit as a programme of work, not as a stream of ad-hoc PRs. This is the rhythm:

### Daily (developer-led, autonomous)
Engineering work proceeds without forced ceremonies. Council fires on-demand for non-trivial decisions. PRs gate on at least one relevant thread's council pool.

### Pre-feature (every non-trivial proposal)
1. **`/forge <topic>`** — ideation. Default mode for unknowns; LEAD roles generate options, CONSULT roles add lenses. Output: 2-4 shortlisted options with named recommendation.
2. **`/council <recommendation>`** — review. Tier A always-on plus Tier B auto-included by scope keywords. Output: SHIP / SHIP-WITH-FOLLOWUP / HOLD / ESCALATE with forced pre-mortem.
3. **Build → PR → council on diff** for the highest-risk PRs. Lower-risk PRs ship on the pre-feature council alone.

### Per phase (every 4-6 weeks)
- **Kickoff:** `/forge --wide` over the phase's high-level goals. Produces the working backlog for the phase across threads.
- **Mid-phase check-in:** `ns-devils-advocate` + `ns-pm-tech-lead` review of progress vs plan; surface scope creep, dependency risks.
- **Phase-end retro:** `ns-synthesizer` runs over shipped vs planned + retention/data signals from T8. Roadmap updated. Backlog re-prioritised.

### Continuous (background)
- **`ns-devils-advocate` standing review** — any feature in flight for >5 days gets a hostile-read pass. Catches drift early.
- **Top-opportunities review** — first 30 minutes of every Monday session: re-rank top 10 opportunities across threads, note what changed, what got bigger, what got smaller. Feeds into the Open Questions register (§9).

### Quality gates (non-negotiable)
- **Brand consistency review** (T2) on every UI change.
- **Coach-domain review** (T7) on every plan/AI/training-logic change.
- **Security review** (T6) on every PII/auth/payment change.
- **Accessibility review** (T2) on every user-facing change.

---

## 5. The opening ideation session (before Phase 1)

Before any roadmap delivery starts, we run a **`/forge --wide`** over seven framing questions. This is the inaugural session — it shapes Phase 1 and seeds the backlog for Phase 2-4.

### Framing questions
1. **Per persona, what is the absolute minimum that makes this app indispensable to them?** (Six runs, one per persona.)
2. **Where is a current feature delivering 20% of its potential value and why?** (Worst-leverage features get cut or rebuilt.)
3. **What are we building because we always have, that no persona would actually miss?**
4. **What would Strava do if they were trying to win runners?** What would Runna do? Duolingo? What would Garmin do? Where do they get craft right that we don't?
5. **What is the single moment that, if perfected, makes a runner tell a friend?** (The "rave moment.") We optimise around it.
6. **Where are the seams between features painful?** (Squad ↔ plan, coach ↔ athlete, log ↔ celebration, character ↔ everything.)
7. **What does a runner's third week feel like?** (Past honeymoon, pre-habit. The hardest moment. We design for it specifically.)

### Output of the opening session
- A re-ranked top-15 opportunities list, fed into §9
- A persona "rave moment" register — six moments, one per persona, designed in detail
- A "kill list" — features we are removing or merging
- Phase 1 backlog crystallised
- Phase 2-4 strategic shape sketched
- This document updated to v0.2 with the deltas

The opening session is not optional. **Phase 1 does not start until this is run and the roadmap reflects its outputs.**

---

## 6. Phases (delivery rhythm — 3-6 months)

Phases sequence threads. Items inside each phase are tagged with their thread (T1-T10) and primary personas (A-F).

### Phase 0 · Opening ideation + foundation cleanup (week 0-1)
*Before Phase 1 starts.*

- **OP1 [forge]** Run opening ideation session (§5).
- **OP2 [T1, T9]** Confirm Stripe + Resend keys live (HANDOFF #2-3).
- **OP3 [T1]** Device-test plan activation + AI plan generation.
- **OP4 [T8]** PostHog event taxonomy v1 — agree what we measure before we measure anything else.

### Phase 1 · Sharpen the device experience (week 1-3)
*Goal: friends touch the app and get a clean first 7 days.*

- **P1.1 [T1, T3] B,C** Wire squad nudge dispatch (cron + push). Code is 80% there; missing the dispatch route. Files: new `src/app/api/cron/squad-nudges/route.ts`, message bank at `src/lib/squad-nudges.ts`.
- **P1.2 [T2] all** Brand-consistency audit: enumerate every surface that drifts from the deep-navy / vivid-accent system, the character voice, or the four-tab colour identity. Council T2 fix list.
- **P1.3 [T2] all** Character continuity audit: where does the runner appear, where doesn't it, where does its tone shift unexpectedly.
- **P1.4 [T1, T2] all** De-duplication pass: stats strip on Home/Train, Elite upsell on Profile/Explore, squad cards across three tabs. Decide canonical home for each.
- **P1.5 [T6] all** GDPR/ICO baseline: confirm consent capture, cookie banner, T&Cs draft v1, privacy policy v1. We don't ship a paying user before this.
- **P1.6 [T1, T3] all** Friend-test (F1) with 4-5 runners on real Android devices.

### Phase 2 · IA restructure + retention wiring (week 3-7)
*Goal: fix the foundation. The squad-first thesis is reflected in the IA. Dormant retention loops are wired and observable.*

- **P2.1 [T2, T1] B,C** Promote Squad to first-class IA. Recommended shape: **Home / Train / Squad / You** (4 tabs; Explore demoted into Home submenus and a discovery sheet on Squad). Decision is council-gated and informed by F1 feedback.
- **P2.2 [T2, T1] all** Profile split: Character (gamified) on a dedicated You-tab surface; Account (settings, integrations, billing, data export) under settings.
- **P2.3 [T3] all** Referral loop: invite link with `?ref=<userId>`, reward = free month of Elite for both inviter + invitee when invitee logs 5 sessions. Pre-loads Elite signal before paywall.
- **P2.4 [T3, T10] all** Lifecycle email message bank verified and populated. Real cohort run end-to-end. Open/click rate baselined.
- **P2.5 [T2, T1] A,B** Daily-log friction audit. One-tap paths from Home hero. Real-device confirmation of undo, celebration, sound, haptic.
- **P2.6 [T2] all** Motion + animation system documented. Reduced-motion compliance audited. FPS budget set.
- **P2.7 [T3] all** "Third-week" experience design (from §5 question 7). Specific surfaces fire at days 14-21.

### Phase 3 · Coach Suite full build + retention proof (week 7-14)
*Goal: coaches have a product worth £29/month. Athletes with coaches get the rave moment. Retention is measured and meets bar before Phase 4 considers the paywall.*

#### Coach Suite (T4)
- **P3.1 [T4] E,F** **Coach dashboard v2.** Athlete-roster overview with at-a-glance health (last log, streak, ACWR band, days-since-message). One-tap into any athlete's plan + comms.
- **P3.2 [T4, T7] F** **Plan authoring tool.** Coach-built plans with the same template structure as predetermined + AI plans. Reuses `plan_templates` schema. Save / publish / assign-to-athlete.
- **P3.3 [T4] D,F** **Coach ↔ athlete messaging.** Threaded comms surfaced in athlete Train tab and coach inbox. Push notifications on both sides.
- **P3.4 [T4, T5] F** **Revenue screen v2.** Earnings dashboard upgrade — gross / net / commission band / next payout / YTD; per-athlete revenue contribution; refund and churn surfaced.
- **P3.5 [T4] F** **Athlete management screens.** Bulk actions, filters (by plan stage, by activity, by tier), notes per athlete.
- **P3.6 [T4, T3] F** **Marketplace presence.** Coach profile page, reviews, sample plans, conversion CTA. Public profile route.
- **P3.7 [T4, T5] F** **Coach onboarding overhaul.** Stripe Connect flow polished, plan-authoring walkthrough, first-athlete-by-day-7 goal.

#### Retention proof (T3, T8)
- **P3.8 [T8] all** Retention dashboards live. D1 / D7 / D30 cohort curves. Funnel: signup → onboarding → first log → D7 return → D30 return.
- **P3.9 [T3, T8] B,C** Squad nudge effectiveness measurement. Tag per template; drop dead messages; A/B over alternates.
- **P3.10 [T3] B,C** Squad seasons (light): monthly leaderboard reset, per-season trophy.
- **P3.11 [T1, T2] all** Plan-path animateMotion runner + periodisation glyphs (Session 10 council follow-ups).
- **P3.12 [T1] A** Strava OAuth live (HANDOFF #21). Power-user feature; gated to Elite at paywall flip.

### Phase 4 · Revenue switch + scale (week 14-24)
*Goal: flip the paywall **only if** retention cleared the bar. Discreet revenue triggers ship. Pre-paid users get a hardened app.*

#### Pre-flip gate
- **P4.0 [T6, T5] all** Retention bar must be hit (P3.8). If not, Phase 4 holds. Bar values calibrated against running-app benchmarks.
- **P4.1 [T6] all** Pre-paid security audit (£500-2000). Real pentest before any user pays.

#### Discreet revenue
- **P4.2 [T5] all** Flip `NEXT_PUBLIC_PREMIUM_ENFORCED=true`.
- **P4.3 [T5, T2] all** Contextual Elite triggers wired:
  - 4+ weeks logged → "Unlock your ACWR" banner on Train
  - Plan completion → Elite preview on next plan
  - 7-day streak → "Get adaptive plans" offer
- **P4.4 [T5, T4] D** Coach upsell at motivation dip. 3-day no-log → soft "Talk to a coach" banner on Home.
- **P4.5 [T5, T2] all** Founding-tier urgency widget. Countdown while spots remain; social proof after.
- **P4.6 [T3] B** Squad Trophy Room (HANDOFF #18). Collective-achievement compounding.
- **P4.7 [T4, T3] F** Plan-marketplace fill with coach-authored plans.

---

## 7. Quality bars — non-negotiable

These run on every PR. A red bar holds the merge.

| Bar | Owned by | What it means |
|-----|----------|---------------|
| **Brand consistency** | T2 `ns-visual-brand` | Surface uses `--ns-*` tokens, deep-navy base, tab-correct accent. No drift. |
| **Character continuity** | T2 `ns-visual-brand` + `ns-content-copy` | If character appears, voice and visual are constant with `src/lib/rpg.ts` definitions. |
| **Sport-science correctness** | T7 `ns-coach-domain-expert` | Plans/AI/recommendations defensible against running-coach review. |
| **Accessibility** | T2 `ns-accessibility` | WCAG 2.2 AA on user-facing UI. Reduced-motion respected. |
| **Performance** | T1 `ns-performance` | Lighthouse ≥80 on Home/Train. Bundle delta justified. |
| **Security posture** | T6 `ns-security-privacy` | RLS holds. PII boundaries respected. OWASP top-10 clean. |
| **Persona walk-through** | T-relevant | Every relevant persona has been considered in the PR description. |
| **Honest review** | `ns-devils-advocate` | At least one explicit "what could break" entry, with mitigation. |

---

## 8. Roadmap update protocol

This is the source of truth. It changes via PR like any code.

- **Versioning:** semantic-ish. `v0.x` until first public alpha; `v1.0` at paywall-flip + alpha launch; `vN.x` after.
- **Cadence of updates:** at minimum after every phase-end retro, every council/forge synthesis, and every Monday top-opportunities review.
- **Edit ownership:** Ash + Claude jointly. Other contributors propose via PR.
- **Change log:** every revision adds an HTML-comment header line at the top of this file with version, date, and short note (mirrors HANDOFF.md style).
- **Rule:** if a piece of work is in flight without a roadmap entry, the first action is to add it to the backlog (§9) — not to keep building.

---

## 9. Open questions, decision log, and rolling backlog

### Decision log (chronological)
- *(Empty until v0.2 — populated after opening ideation session.)*

### Open questions awaiting decision
1. **Squad-tab vs Squad-as-Home.** P2.1. Decide after F1 feedback. Recommend Squad-tab.
2. **Retention bar values.** P3.8 / P4.0. D7 ≥ 30%, D30 ≥ 15% are illustrative. Final values need running-app benchmark research.
3. **Explore tab fate.** Demoted into submenus or kept as a 5th tab? Decision feeds P2.1.
4. **Coach-Pro tier feature split.** P3 gates which features sit behind the £29/month platform fee vs free for Split Leaders.
5. **Pricing experiments.** Founding tier expires after 500 spots; what happens at 501? Council T5 needed pre-P4.

### Rolling backlog
This section grows. Each item: ID, title, thread tag, persona tag, status (TRIAGE / NEXT / IN-FLIGHT / DONE / KILLED), phase target.

- *(Populated by opening ideation session and ongoing intake.)*
