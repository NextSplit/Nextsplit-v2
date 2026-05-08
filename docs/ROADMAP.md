<!--
  v0.8 — 2026-05-08 — Late-evening sprint after v0.7. Five more PRs merged
                       (#22 future-date guard with DB CHECK + Zod; #23
                       gamification V2 spec + 19-lens /council HOLD verdict;
                       #24 council blocker close-out — RLS hardening on
                       challenge_entries + virtual_race_entries via
                       phase-rls-community-entries-hardening-v1.sql migration
                       (20260508231830) + 4 live bug fixes + Pro→Elite
                       pricing; #25 passive Race V0 — new /leaderboard route
                       hosting SquadLeaderboard with squadless empty state +
                       global rankings teaser; #26 spec edit deleting
                       rng_jitter from gamification V2 §3.3, race sim now
                       fully deterministic addressing UK Gambling Commission).
                       FOUNDER STRATEGIC PIVOT: F1 friend testing
                       BACKLOGGED — direction is "build app to fully usable
                       state before any test users". Track 5 items
                       collapse from F1-gated to Phase 4-gated or longer.
                       Founder overruled synthesizer's V0 sliver in favour
                       of "push richer" + Full Vision committed for
                       character gamification (Phase 3+ Race tab build).
                       Council pre-ship blockers: 3 closed in code/spec
                       (#2, #3, #4); 2 still founder admin (#1 ICO, #5
                       remaining pre-alpha gates excluding F1 which is
                       backlogged). All audit + council code-side work is
                       now CLOSED. NEXT WORK BLOCK: actual character system
                       build per docs/forge/character-gamification-v2-
                       proposal.md — schema (user_characters +
                       character_inventory + races/race_entries/race_results
                       + leagues), class picker UI extension to
                       CharacterCreationScreen, basic XP from training_logs,
                       eventually Aseprite art commission. Founder still
                       owes ICO + Companies House.
  v0.7 — 2026-05-08 — Track 2 partial + Track 3 partial + character-gamification
                       /forge close-out (same evening as v0.6). PRs 17-21 merged:
                       F2.5 anon-key fallback dropped, F0.6 .gitignore tighter,
                       F0.4 CI tests blocking, F0.2 cron consolidation +
                       zero-send Sentry alert, S9 planValidator.ts shipped,
                       F2.4 SECDEF body hardening on 8 RPCs (migration
                       20260508222328_phase_rpc_hardening_v1), F6.1 unit tests
                       across vdot/streak/referral (48 new cases, 100/100
                       passing). PR 18-attempt (F4.1 narrow as-never cleanup)
                       abandoned: supabase-js overload resolution overrides
                       the type widening; full F4.1 needs database.generated.ts
                       adoption with literal-union enum preservation pass —
                       tracked as dedicated future PR. Forge ran on character
                       gamification (docs/forge/character-gamification-v1.md):
                       devils-advocate raised thesis-level concern that
                       squad-as-safety-net and squad-as-arena are opposing
                       social contracts; SHORTLIST recommends Option A
                       (XP Ceremony + Token SVG) over Option B (Race Room).
                       Founder must resolve framing gate before V1 ships.
                       NEXT GATING EVENT: F1 friend test + framing-gate
                       decision. ICO registration still RED (founder admin).
                       Track 4 (F3.2a, F3.3) still trigger-gated to next
                       squad/P3.4 PR.
  v0.6 — 2026-05-08 — Audit Tracks 1 + 1.5 CLOSED on main (PR #13 + #14 +
                       v9.10 close-out PR). Track 1: F0.1 deploy.yml deleted,
                       F0.3 admin gate via ADMIN_EMAILS on /admin/retention,
                       F2.1 plan_templates RLS canonical record, F2.2
                       nps_responses leak fixed (TO service_role), S3
                       can_nudge guard verified live, S12 manifest bg
                       #0a0e1a. Migration applied as
                       20260508195726_phase_track1_hotfix_v1. Track 1.5:
                       S5 gen-types.sh path fixed, F4.1 partial
                       (database.generated.ts saved + retention/plan-review/
                       adapt-test admin gates rewritten to use user.email —
                       discovered the prior profiles.is_admin/email query
                       was a runtime dead-end), S6 checkAndIncrementAIUsage
                       on 5 AI routes, S10 onboarding events.ts wired across
                       main flow + 4 sub-route Client files. PR #15 (legacy
                       claude/review-project-status-lGBPu, opened in error)
                       closed as not_planned. Open: Track 2 foundation
                       sprint (~4 days post-F1), F4.1 full cast cleanup
                       (dedicated PR), Track 5 F1-gated items, Track 6
                       pentest brief, Track 8 founder-admin (ICO RED).
                       NEXT GATING EVENT: F1 friend test (P1.6/P1.8).
  v0.4 — 2026-05-07 — Marathon execution session: Phase 1 closed (with L2/A1
                       minimal splits; full structural splits deferred as
                       cosmetic). Phase 2 6/7 shipped (P2.1 + P2.5 gated on
                       F1; soft-deload shipped, hard-deload deferred to
                       council). Phase 3 9/11 shipped + P3.12 observability
                       polished (P3.4 + P3.7 stripe-blocked; P3.9 F1-gated).
                       Cross-cutting backlog: BL-X4, X5, X7, X8 done; X1/X2/X3
                       partial; X6 partial (timezone shipped, unit_pref +
                       week_start open). 11 PRs merged across the session
                       (#4-#11). Founder admin remaining: £40 ICO
                       registration; Sentry alert rule on feature tags. NEXT
                       GATING EVENT: F1 friend test (P1.8). Full §9 entry
                       below; HANDOFF v9.8 captures runtime state.
  v0.3.1 — 2026-05-07 — P1.0a schema PR landed (migration + RPC). One scope
                       correction logged: per-day UNIQUE on training_logs
                       (council prereq sub-item 1) descoped — would block
                       legitimate two-a-day runs and existing composite UNIQUE
                       (user_id, plan_id, week_n, day_i, session_i) already
                       handles plan-prescribed dedup (useTrainingLog.ts:106
                       upsert). Ad-hoc-session dedup moves to P1.1 server
                       action. Full §9 entry below.
  v0.3 — 2026-05-07 — /council pass on P1.1 Option A (16 reviewers, R1+R2+synth).
                       Verdict: HOLD pending P1.0a Prerequisites PR. 8 RED pre-ship
                       blockers (schema, motion, RLS, cron-cap, copy). 6 follow-ups
                       (Splity canonical, P1.6 simul, ICO £40, iOS gate, ACWR-band,
                       opaque UUID). 3 dissents overruled (Splity full-cut, ICO as
                       code-prereq, cron full-defer). Cron path: consolidate squad-
                       nudge dispatch into smart-notify (no Vercel Pro). P1.1
                       amended: ACWR-band gate, RPC insert, single Splity line,
                       leader-nudge → Home pill not celebration. P1.0a inserted.
                       Open Q #5 deferred to paywall flip.
  v0.2 — 2026-05-07 — Opening ideation /forge --wide complete (22 agents,
                       30 R1 options, 18 R2 syntheses, shortlister verdict).
                       Recommended Option A (Log-to-Squad Accountability Loop).
                       Phase 1 backlog crystallised (P1.0-P1.8). Six rave
                       moments locked. Kill list populated. Decision log + rolling
                       backlog seeded.
  v0.1 — 2026-05-07 — Initial commit. Operating manual + persona register +
                       10 threads + cadence + opening ideation framing.
-->
# NextSplit Roadmap & Operating Manual
**Status:** v0.8 | **Owner:** Ash | **Source of truth — all direction and delivery flows through this document**

> **2026-05-08 audit overlay:** All audit + council code-side work CLOSED
> across PRs 13-26. See `docs/audit/audit-report-v1.md` + `roadmap-
> integration-v1.md` (the original audit), `docs/forge/character-
> gamification-v1.md` + `v2-proposal.md` (gamification design pass), and
> `docs/council/character-gamification-v2-verdict.md` (HOLD verdict with
> 5 RED blockers — 3 now closed in code/spec). Remaining: F4.1 full cast
> cleanup (own PR), Track 6 pentest brief (when paid pentest scopes),
> Track 8 founder-admin (ICO RED + Companies House). Track 4 (F3.2a,
> F3.3) still trigger-gated.
>
> **FOUNDER STRATEGIC PIVOT (8 May 2026 evening):** F1 friend testing
> BACKLOGGED — direction is now "build app to fully usable state before
> any test users". Track 5 items (F4.2/F5.4/F6.3) collapse from F1-gated
> to Phase-4-gated. **Next dev block:** character system build per
> `docs/forge/character-gamification-v2-proposal.md` (Phase 3+ Race tab,
> Full Vision committed by founder). `/leaderboard` (PR #25) is the
> placeholder Race V0 surface until the full tab ships.

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

### Phase 1 · Ship Option A + foundation cleanup (week 1-3)
*Goal: friends touch the app, the founding thesis fires in one observable mechanic, and the foundation no paying user can survive without is in place. Headline feature is **Option A — Log-to-Squad Accountability Loop**, picked from /forge --wide opening ideation (v0.2).*

- **P1.0 [T1] all — PREREQUISITE** Decompose oversized clients before any new modal/banner orchestration lands. `TodayClient.tsx` (860 lines, 15+ `useState`), `LogModal.tsx` (534 lines), `AthleteDetailClient.tsx` (581 lines) must be split into focused sub-components. Specifically: extract `SessionCelebration` from `TodayClient.tsx` into its own client component; extract `handleLogSession` into a server action at `src/app/actions/logSession.ts` that returns the awaited squad-feed insert result. Without this, P1.1's celebration handoff piles onto an already-fragile component and the undo-countdown stale-closure risk grows.
- **P1.0a [T1, T2, T6, T8] all — P1.1 PREREQUISITES PR (HOLD GATE FROM /council 2026-05-07)** Council verdict on P1.1 was HOLD pending these 8 RED blockers and 6 follow-ups. Single PR (or tight sequence) before any P1.1 code lands:
  1. **Migration [T1]** ALTER `squad_feed.milestone_type` CHECK constraint to add `'session_logged'` value (current CHECK rejects it; every P1.1 insert would hard-fail). Add column `profiles.share_logs_with_squad boolean NOT NULL DEFAULT true`. Add UNIQUE constraint on `training_logs(user_id, (logged_at::date))` (double-tap dup-log prevention per qa-risk).
  2. **Migration [T6]** SECURITY DEFINER RPC `insert_squad_feed_on_log(p_log_id uuid)` that validates: caller owns the referenced `training_logs` row; `profiles.share_logs_with_squad = true`; caller is in `squad_members` for the target squad. Revoke direct INSERT on `squad_feed` from the `authenticated` role.
  3. **Code [T2]** Reduced-motion guards on existing `SessionCelebration.tsx`: wrap confetti `requestAnimationFrame` loop, all 5 keyframe animations (`xpFloat`, `splityBounce`, `levelBurst`, `slideUp`, `spin360`), and the `Splity` `setInterval` bob behind `window.matchMedia('(prefers-reduced-motion: reduce)').matches` (pattern at `src/components/plan/PlanPathSVG.tsx:22`). Add `@media (prefers-reduced-motion: reduce) { ... animation: none }` block to `globals.css` for those keyframes. Add `aria-live="polite"` to the feed-card insertion region (WCAG 4.1.3).
  4. **Code [T2]** Replace local Splity stub in `SessionCelebration.tsx` lines 111-133 (cyan circle + 🏃 emoji, hardcoded `#06b6d4` / `#0c0c0c`) with canonical import from `src/components/Splity.tsx` using `--ns-cyan` and `--color-bg` tokens.
  5. **Code [T2]** Purge guilt-copy from `src/lib/squad-nudges.ts` (3 confirmed strings: "Your squad ran without you today", "Don't break the streak now", and the third per visual-brand R1). Replace with forward-only message bank under the rule **"always forward, never backward"**. Cap: 1 nudge per 24h per sender-recipient pair.
  6. **Code [T1, T9]** Cron consolidation — squad-nudge dispatch is absorbed into existing `src/app/api/cron/smart-notify/route.ts`. Do **NOT** create a separate `/api/cron/squad-nudges` route (Vercel Hobby cap is at 2; founder decision 2026-05-07). Add `Authorization: Bearer ${CRON_SECRET}` guard to the consolidated handler — currently external-callable spam vector. Single 14:00 UTC dispatch is accepted for F1; per-timezone delivery deferred to paywall flip (Open Q #5).
  7. **Code [T8]** PostHog event taxonomy wired simultaneously with P1.1 build (not after). Minimum events: `log_completed` (props: `squad_count`, `share_logs_with_squad`, `week_number`), `squad_feed_card_shown` (props: `recipient_user_id` as **opaque UUID**, never email), `nudge_sent` (props: `template_id`, `is_leader_nudge`), `nudge_opened`. Anonymous→authenticated stitching at signup (BL-X7).
  8. **Code [T1] (depends on P1.0)** `TodayClient.tsx` decomposition completed in same PR. `handleLogSession` is a server action; `SessionCelebration` is a separate client component receiving feed-card data as props from the action's response.
- **P1.1 [T1, T2, T3] B,C — OPTION A CORE (AMENDED 2026-05-07 by /council)** Log-to-Squad accountability loop, post-P1.0a. Wire: log submit → server action calls `insert_squad_feed_on_log` RPC (awaited) → feed-card render on celebration → **single Splity reaction line** (not full frame; per ux-designer R2) → **leader-nudge moves to Home tab as a persistent "Nudge squad" pill** for 30 min post-log (per ux-designer R1; off the celebration screen). Splity copy is **ACWR-band gated** (per coach-domain-expert R2): inject ACWR mention only when `0.8 ≤ ACWR ≤ 1.3`; outside band, plain "great work" copy with no ACWR figure. Awaitable RPC; celebration UI conditionally hides feed card with **purposeful empty-state copy** ("Your run is logged. Share it when you're ready.") on failure — never silent contraction (per content-copy R1). iOS standalone gate on push subscribe (per mobile-pwa); `safe-area-inset-bottom` on celebration card. Sentry alert on RPC errors (qa-risk; pulled forward from BL-X8).
- **P1.2 [T6] all** PECR / GDPR consent audit. Confirm existing push-permission wording covers behavioural nudges (squad nudge, streak rescue, coach msg). Update wording if not — re-consent UX before P1.1 reaches paying users. T&Cs draft v1, privacy policy v1, cookie banner verified. Trigger ICO registration (£40, ico.org.uk) — hard gate before any coach-data feature in Phase 3.
- **P1.3 [T6] all** Server-side paywall enforcement. Rename `NEXT_PUBLIC_PREMIUM_ENFORCED` → `PREMIUM_ENFORCED` (drop the `NEXT_PUBLIC_` prefix); move all enforcement reads from client components into API routes / middleware. Current flag is client-bypassable — a hard prerequisite for the Phase 4 paywall flip and a recommended fix even pre-flip.
- **P1.4 [T2] all** Brand-consistency audit. Enumerate every surface drifting from the `--ns-*` token system, the deep-navy base, or the four-tab colour identity. Hard fixes: lime-on-white text combinations (WCAG 1.4.3 fail at ~1.3:1; lime must sit on navy at ~14:1), reduced-motion fallbacks for the Splity sequencer and any tab-bar pulse, no infinite CSS animations. Council T2 fix list.
- **P1.5 [T2] all** Character continuity audit. Where does the runner appear, disappear, or change voice? The Log celebration screen is the canonical character moment — align all other surfaces to it. Maintain a Splity message bank (variable-injected: pace, distance delta, ACWR trend) so reactions feel earned not generic.
- **P1.6 [T8] all** PostHog event taxonomy v1. Minimum events: `log_completed`, `squad_feed_card_shown`, `nudge_sent`, `nudge_opened`, `celebration_screen_shown`, `share_card_generated`, `share_card_shared`, `week3_reanchor_shown`. Add properties: `time_to_log_ms`, `week_start_preference`, `unit_preference`, `timezone`. Stitch anonymous → authenticated user IDs at signup or D7/D30 cohorts are uncountable.
- **P1.7 [T1, T9] all** Resume-state gates. Confirm Stripe + Resend keys live in Vercel; device-test plan activation; device-test AI plan generation (double-session gym days); spot-check 3 PlanPathSVG templates (8wk 5K, 16wk half, 24wk marathon). HANDOFF session-resume checklist items 2-5 + 7. Phase 1 cannot close with any of these red.
- **P1.8 [T1, T3, T2] all** Friend-test F1 with 4-5 runners on real Android devices, multiple accounts, full flow. Capture: did any squad nudge fire correctly? Did anyone share unprompted? Was the celebration handoff legible? What did week-3 (if reachable) feel like? UAT script: `SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/uat-db-verify.ts`. Findings feed Phase 2 backlog refinement.

### Phase 2 · IA restructure + retention wiring (week 3-7)
*Goal: fix the foundation. The squad-first thesis is reflected in the IA. Dormant retention loops are wired and observable.*

- **P2.1 [T2, T1] B,C** Promote Squad to first-class IA. Recommended shape: **Home / Train / Squad / You** (4 tabs; Explore demoted into Home submenus and a discovery sheet on Squad). Decision is council-gated and informed by F1 feedback.
- **P2.2 [T2, T1] all** Profile split: Character (gamified) on a dedicated You-tab surface; Account (settings, integrations, billing, data export) under settings.
- **P2.3 [T3] all** Referral loop: invite link with `?ref=<userId>`, reward = free month of Elite for both inviter + invitee when invitee logs 5 sessions. Pre-loads Elite signal before paywall.
- **P2.4 [T3, T10] all** Lifecycle email message bank verified and populated. Real cohort run end-to-end. Open/click rate baselined.
- **P2.5 [T2, T1] A,B** Daily-log friction audit. One-tap paths from Home hero. Real-device confirmation of undo, celebration, sound, haptic.
- **P2.6 [T2] all** Motion + animation system documented. Reduced-motion compliance audited. FPS budget set.
- **P2.7 [T3, T2, T7] all — OPTION B HEADLINE** Third-Week Hold-the-Line sequence. Days 14-21: full-screen re-anchor (progress + character voice), ACWR visible free on Train tab (downgrade `acwr_chart` from `pro` → `free` in `src/lib/features.ts`), ACWR-aware deload suppression so plans don't push above-baseline runners into injury, gap-recovery copy that doesn't shame interrupted streaks. ACWR threshold parameterised, not hard-coded. Per-user timezone shifts the day-17 fire so APAC runners don't get it at midnight. Picked from /forge v0.2 opening ideation; the Option B convergence (29/30 conviction across all 6 LEAD agents) and second only to Option A.

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

## 9. Open questions, decision log, kill list, rolling backlog

### Decision log (chronological)

- **2026-05-07 · v0.2 · Opening ideation /forge --wide** — Ran 22 active agents (6 LEAD, 16 CONSULT) over the seven §5 framing questions. R1 produced 30 options; R2 produced 18 cluster-syntheses; `ns-shortlister` recommended **Option A — Log-to-Squad Accountability Loop** for Phase 1, **Option B — Third-Week Hold-the-Line** as Phase 2 headline. Six rave moments locked (one per persona, embedded in §2). Nine items added to kill list. Phase 1 backlog crystallised P1.0-P1.8. Phase 2 P2.7 promoted to Option B headline.
- **2026-05-07 · v0.2 · Q3 resolved** — Explore tab is killed in current form; demoted to discovery-sheet on Squad surface and submenus on Home. Feeds P2.1.
- **2026-05-07 · v0.2 · Q1 partially resolved** — Squad-tab promotion (Home / Train / Squad / You) is the recommended IA; final lock awaits F1 feedback per P2.1, but kill of Explore-as-tab is committed.
- **2026-05-07 · v0.3 · /council on P1.1 Option A** — 16 reviewers (8 Tier A + 8 Tier B), R1 + R2 + synthesizer. Verdict: **HOLD** (confidence 5, low reversibility). R2 tally: 9 RED/HOLD, 7 YELLOW, 0 SHIP. Synthesizer pre-mortem item 1 (silent CHECK migration miss → F1 friends see celebrations with zero feed rows; non-reversible) confirmed HOLD independently of agent tally. **8 RED pre-ship blockers** captured in P1.0a. **6 follow-ups** captured in amended P1.1. **3 dissents overruled with reasons:** (a) product-strategist's full Splity removal — overruled in favour of ACWR-band gating + canonical render fix (coach-domain-expert + visual-brand convergence); (b) legal-compliance's ICO £40 reg as P1.1 code prerequisite — overruled, company-level obligation completes pre-F1 but does not block PR (pm-tech-lead); (c) devils-advocate's full-stop "build nothing, manual Slack" — overruled, schema fixes needed regardless and feed insert is core thesis at low marginal cost once schema lands. P1.1 cannot start until P1.0a merges.
- **2026-05-07 · v0.3 · Cron path resolved** — Founder decision: squad-nudge dispatch is absorbed into existing smart-notify cron; no new route, no Vercel Pro upgrade. Single 14:00 UTC dispatch accepted for F1. Per-timezone delivery deferred until paywall flip. HANDOFF Open Q #5 partially resolved.
- **2026-05-07 · v0.3.1 · P1.0a schema PR — scope correction** — Council prereq sub-item 1 listed `UNIQUE (user_id, (logged_at::date))` on `training_logs`. Descoped during implementation: the existing composite UNIQUE on `(user_id, plan_id, week_n, day_i, session_i)` (relied on by the `useTrainingLog.ts:106` upsert with `onConflict`) already handles plan-prescribed double-tap. A per-day UNIQUE would falsely reject legitimate two-a-day runs (AM run + PM gym, double-day plans). Ad-hoc-session dedup is moved to the P1.1 server action via an idempotency key. Migration `phase-p1-0a-schema.sql` ships the remaining 7 sub-items: CHECK update, `training_log_id` FK + partial UNIQUE on `(squad_id, training_log_id)`, `share_logs_with_squad` column, drop of overly-permissive `"System inserts feed posts"` policy, REVOKE direct INSERT, SECURITY DEFINER `insert_squad_feed_on_log` RPC fanning out to active squads, GRANT EXECUTE to `authenticated`.

- **2026-05-07 · v0.4 · Marathon execution session — Phase 1 closed, Phase 2 6/7, Phase 3 9/11+** — Eleven PRs merged in sequence (#4 P1.0a/P1.1 → #11 quick-wins). Cumulative state on nextsplit.app:
  - **Phase 1 — closed.** All 9 items shipped. P1.0 decomposition: useUndoCountdown + useSessionLogging + useLogFormState hooks landed; full BasicEntry/AdvancedEntry/SaveControls structural splits (L2) and AthleteDetailClient 4-section split (A1) deferred as pure JSX cosmetics with no bug-fix value. Council surgical fixes S1+S2+S3 shipped (planDay capture, effectivePace propagation, react-hooks/exhaustive-deps bumped warn→error). P1.1 social loop end-to-end live (squad-feed RPC + recipient view + reactions + reaction notifications). P1.2 PECR fix: posthog.init waits for cookie consent. P1.3 server-side paywall (PREMIUM_ENFORCED env-only). P1.4 6 missing CSS tokens. P1.5 Splity animation discipline. P1.6 PostHog taxonomy + timezone enrichment.
  - **Phase 2 — 6/7 shipped.** P2.2 lean YouClient. P2.3 referral 5-log reward RPC. P2.4 already-built. P2.6 motion audit + docs/motion.md. P2.7 in-app: Week3Reanchor + acwr_chart pro→free + per-user timezone gate on smart-notify. P2.7 soft-deload (AcwrAdvisoryBanner + GapRecoveryBanner) shipped instead of waiting for the hard-override council. **Deferred:** P2.1 (squad-tab IA decision — gated on F1 engagement signal); P2.5 (daily-log friction audit — gated on F1 friction reports); P2.7 hard-deload (gated on council pass on AI-prompt design).
  - **Phase 3 — 9/11 shipped.** P3.1 dashboard v2 (streak + days_since_message tiles + amber flags). P3.2 plan-assign API + bottom-sheet picker. P3.3 push on coach↔athlete message. P3.5 athlete filter chips with localStorage persistence. P3.6 review submission form. P3.8 /admin/retention dashboard with cohort math + funnel + daily table. P3.10 squad seasons snapshot RPC + smart-notify month-1 piggyback + SquadSeasonCard. P3.11 PlanPath animateMotion runner trace + race/deload glyphs. P3.12 OAuth scaffold polished with full Sentry observability on callback + sync. **Deferred:** P3.4 (Stripe Connect webhooks); P3.7 (Stripe Connect UX); P3.9 (F1 baseline).
  - **Cross-cutting backlog:** BL-X4 + BL-X5 indexes shipped (`squad_nudges_recipient_recent`, `training_logs_user_logged_at`). BL-X7 anonymous→authenticated PostHog stitching shipped (useProfile.ts:64). BL-X8 Sentry coverage gap audit complete; admin/retention + Strava OAuth/sync now feature-tagged. BL-X1/X2/X3 partial — minimal file splits done (log-modal/inputs.tsx, charts.tsx); full structural splits deferred. BL-X6 partial — `profiles.timezone` shipped (P2.7); `unit_preference` + `week_start` open.
  - **Migration log (apply-order):** phase-p1-0a-schema.sql → phase-p2-3-referral-reward.sql → phase-p2-7-timezone.sql → phase-p3-10-squad-seasons.sql → phase-bl-x4-x5-indexes.sql. All applied + verified live.
  - **Founder admin remaining:** £40 ICO registration (privacy.tsx:25 placeholder waiting); Sentry alert rule on `tags.feature` for cross-feature observability (BL-X8 follow-up).
  - **Lessons logged:** local typecheck blocked in this dev env (no node_modules), so prop-shape mismatches across multiple component boundaries take >1 Vercel-build round-trip per refactor. 5 typecheck round-trips in this session. Pattern adopted: cross-check every consumed component prop signature in the same file before pushing prop-heavy changes; copy patterns verbatim from neighbour routes rather than improvising.

### Open questions awaiting decision

1. **Retention bar values.** P3.8 / P4.0. D7 ≥ 30%, D30 ≥ 15% are illustrative. Final values need running-app benchmark research before Phase 3 close. **Status (v0.4):** /admin/retention dashboard live and ready to populate from F1 cohort data; bar values still pending council T5 + benchmark research.
2. **Coach-Pro tier feature split.** Phase 3 gates which features sit behind the £29/month platform fee vs free for Split Leaders. Council T5 needed.
3. **Pricing experiments.** Founding tier expires after 500 spots; what happens at 501? Council T5 needed pre-Phase 4.
4. **`session_annotations` migration timing.** Backend-data flagged the table is missing from `/supabase/migrations/*.sql`. The coach-react route at `/api/coach/annotate` will throw `relation does not exist` in prod the moment a coach annotates. Decide: ship migration in Phase 1 P1.0 cleanup, or defer until Phase 3 Coach Suite build? **Status (v0.4):** still open; not blocking any of the shipped Phase 3 items but will block first coach-reaction interaction in F1 if a coach uses /api/coach/annotate.
5. **Vercel Hobby → Pro upgrade timing.** ~~Decide: pre-F1, post-F1, or at paywall flip?~~ **Resolved 2026-05-07 (v0.3, /council):** deferred to paywall flip. Squad-nudge dispatch consolidated into smart-notify cron. Single 14:00 UTC dispatch accepted for F1; per-timezone delivery returns to the table at P4.0 retention-bar checkpoint, not before. **Followup shipped (v0.4):** per-user timezone gate on smart-notify (skip outside 09:00–21:00 local) so APAC users don't get pinged at midnight even on the single daily fire.
6. **Stripe verification gate.** HANDOFF resume-checklist #2-3 still open. Block Phase 1 close on a real test charge end-to-end? (Recommend yes.) **Status (v0.4):** still open. P3.4 + P3.7 + P4.x all blocked downstream until this clears.
7. **P2.7 hard-deload design.** *(New, v0.4)* Soft-deload (advisory banner) shipped. Hard-override (auto-replace prescribed tempo/interval/long when ACWR > 1.3) needs a council pass on what "downgrade" concretely means: hide the tempo, show both with recommendation, auto-re-plan via AI, or advisory-only? Each has UX + plan-trust tradeoffs. Council T7 + content-copy needed.

### Kill list (with reason and thread)

| Item | Reason | Thread |
|---|---|---|
| Explore tab as top-level navigation | Q3: no persona opens it unprompted; coaches/squads discoverable via Home submenus + Squad tab | T2, T1 |
| **Squad-Or-Nothing Gate** (R1 #1) | Coerces solo runners into a social structure they didn't ask for; alienates Persona A entirely; not validated by any data | T3 |
| **Hard Paywall ACWR-Only** (R1 #6) | Locks the primary safety feature behind money before trust is earned; ACWR should be a Phase 4 contextual conversion trigger, not a paywall | T5 |
| **Squad Collective-KM Unlock** (R1 #9) | Cold-start paradox: unlock requires collective km which requires active squad; circular, no bootstrapping path | T3 |
| `html2canvas` / `canvas-confetti` for share cards | Bundle / INP cost unjustified; `@vercel/og` server-side replaces html2canvas, CSS animations + dynamic import replace confetti | T1, T2 |
| Stats-strip duplication (Home + Train) | P1.4 dedup pass — two surfaces showing identical stats; canonical Train = plan stats, Home = streak/XP | T2 |
| Elite upsell duplication (Profile + Explore) | Same upsell card in two places dilutes both; canonical = contextual triggers in T5 / P4.3 | T5 |
| `NEXT_PUBLIC_PREMIUM_ENFORCED` client flag | Client-bypassable; rename + move enforcement server-side before paywall flip (P1.3) | T6 |
| **Ember-to-Cyan Handoff** (R1 #25) as standalone | Low conviction (3); high implementation risk (mid-gradient off-system colour); absorb into Option A celebration screen if earned, otherwise drop | T2 |

### Rolling backlog

Each item: ID — Title (R1 source) — Thread / Persona / Status / Target phase.

**OPTION A — Log-to-Squad Accountability Loop (committed P1.1)**
- BL-A1 — 2-tap log submission — T1, T2 / A,B,C / NEXT / P1
- BL-A2 — Squad-feed card on celebration — T1, T2 / B,C / NEXT / P1
- BL-A3 — Splity reaction frame on log — T2 / all / NEXT / P1
- BL-A4 — Leader nudge prompt on celebration — T1, T3 / C / NEXT / P1
- BL-A5 — Nudge dispatch cron + message bank ("Alex is waiting" copy shape) — T1, T3 / B,C / NEXT / P1

**OPTION B — Third-Week Hold-the-Line (Phase 2 headline, P2.7)**
- BL-B1 — Day 14-21 full-screen re-anchor — T2, T3 / all / TRIAGE / P2
- BL-B2 — ACWR visible free on Train tab (`acwr_chart`: pro → free in features.ts) — T1, T7 / A,D / TRIAGE / P2
- BL-B3 — ACWR-baseline-aware deload suppression — T7 / all / TRIAGE / P2
- BL-B4 — Per-user timezone for day-17 fire (requires `profiles.timezone` column) — T1, T3 / all / TRIAGE / P2
- BL-B5 — Gap-recovery copy that doesn't shame interrupted streaks — T2 / all / TRIAGE / P2

**OPTION C — Coach-React Loop + Delayed-Start Trial (Phase 3, BLOCKED on schema + ICO)**
- BL-C1 — `session_annotations` migration (RLS, FK to `training_logs`, indices) — T1 / D,F / NEXT / P1 cleanup or P3 prereq
- BL-C2 — Coach 2-tap reaction surface on athlete log — T4 / D,F / TRIAGE / P3
- BL-C3 — Athlete plan-change push with reason field (mandatory, not optional) — T4 / D / TRIAGE / P3
- BL-C4 — Coach-Pro Monday digest (cache layer + idempotency key + fan-out, not synchronous) — T4, T8 / F / TRIAGE / P3
- BL-C5 — Delayed-start 14-day trial (begins day 8, overlaps churn window) — T5 / all / TRIAGE / P3 or P4
- BL-C6 — Trial unlock on squad-join OR first coach msg (avoids hard Stripe dependency) — T5 / all / TRIAGE / P3

**OPTION D — Milestone Share Cards (plug into A's celebration)**
- BL-D1 — `@vercel/og` server-side card pipeline — T1, T2 / all / TRIAGE / P1 or P2
- BL-D2 — Persona/squad-aware card variants — T2 / B,C / TRIAGE / P2
- BL-D3 — In-app browser fallback (Instagram/Gmail WKWebView) — T1 / all / TRIAGE / P2
- BL-D4 — Lime-on-navy contrast + alt-text on card — T2 / all / TRIAGE / P2

**Cross-cutting backlog**
- BL-X1 — Decompose `TodayClient.tsx` (860 lines) — T1 / all / NEXT / P1.0
- BL-X2 — Decompose `LogModal.tsx` (534 lines) — T1 / all / NEXT / P1.0
- BL-X3 — Decompose `AthleteDetailClient.tsx` (581 lines) — T1 / D,F / NEXT / P1.0
- BL-X4 — `squad_nudges` index `(to_user, sent_at DESC)` — T1 / B,C / TRIAGE / P2
- BL-X5 — `training_logs(user_id, logged_at)` index — T1 / all / TRIAGE / P2
- BL-X6 — `profiles.timezone` + `profiles.unit_preference` + `profiles.week_start` columns — T1, T8 / all / TRIAGE / P2
- BL-X7 — Posthog cohort: anonymous → authenticated ID stitching — T8 / all / TRIAGE / P1.6
- BL-X8 — Sentry alerts on `/api/share-card`, `coach_messages`, `streak` RPC — T9 / all / TRIAGE / P2

**Killed (do not implement; see Kill list above for reasons)**
- BL-K1 — Squad-Or-Nothing Gate (R1 #1) — KILLED
- BL-K2 — Hard Paywall ACWR-Only (R1 #6) — KILLED
- BL-K3 — Squad Collective-KM Unlock (R1 #9) — KILLED
- BL-K4 — Tab-Anchored Streak Pulse (R1 #23) infinite-loop pattern — KILLED (the *idea* survives as one-shot 400ms spring on streak increment per animation-motion CONSULT; KILL applies to the looping anti-pattern)
- BL-K5 — Ember-to-Cyan Handoff (R1 #25) standalone — KILLED (absorb into A or drop)
