# Character Gamification V2 — /council Verdict

**Proposal under review:** `docs/forge/character-gamification-v2-proposal.md`
**Date:** 2026-05-08
**Roster:** 19 active lenses (8 Tier A + 11 Tier B/manual) + ns-synthesizer
**Verdict:** **HOLD** (Confidence 5)

---

## COUNCIL DECISION

**PROPOSAL:** Character Gamification V2 — Full Vision (4-8 weeks, all 5 race formats, pixel art, class system, ekiden, coach avatars, engagement-pro-rata XP)
**VERDICT: HOLD**
**CONFIDENCE: 5**
**REVERSIBILITY: low** (schema migrations, public art commission, RLS policy changes, cron additions all compound pre-alpha instability)

### PRE-SHIP BLOCKERS (RED items requiring fix before any gamification lands)

- **[Legal]** ICO registration is unregistered live criminal liability under DPA 2018 s.61(4). Cost: £40. **Must close before any paid mechanics ship. No exceptions.**
- **[Security]** LIVE: `community-migration.sql` lines 126/162 have `SELECT USING (true)` on `challenge_entries` and `virtual_race_entries`. **Fix RLS before character_snapshot adds paid-tier data to the same tables.**
- **[Legal/Security]** `rng_jitter` as written moves the product toward Gambling Act 2005 ss.6-9 "gaming" construct. **Delete `rng_jitter` from every schema file and any proposal doc before any race mechanic ships.**
- **[Legal]** `MissedSessionFlow.tsx:188` advertises "NextSplit Pro" at "£4.99/month" — tier does not exist, price is wrong. **Fix before F1.**
- **[PM]** 8 pre-alpha gates in COMMON.md are open (Stripe untested, Resend untested, UAT script incomplete, F1 not run). **Gamification on broken infrastructure = compounding failure surface.**

### SHIP-WITH-FOLLOWUP (YELLOW items, do after blockers clear and V0 ships)

- **[Backend]** Cap `result_timeline` at schema level (DB CHECK or trigger); no unbounded JSONB growth. *(pre-F1)*
- **[Coach]** Wire `ACWR > 1.3` 7-day deferral gate before any XP boost mechanic goes live. *(pre-XP-ship)*
- **[Finance]** Hard-code founding cap as DB CHECK + Stripe coupon `redemption_limit=500`. *(pre-paying-users)*
- **[Analytics]** Set concrete gate trigger: **3 of 5 F1 users fire `training_log_created` week 2 AND ≥2 fire `squad_feed_viewed` same week** before art commission unlocks. *(post-F1)*
- **[Mobile/PWA]** Add `platform` + `pwa_installed_at` to `push_subscriptions` before VAPID retry logic ships. *(pre-push-v2)*

### DISSENTS OVERRULED

- **[Marketing]** Preferred passive Race V0 leaderboard inside F1 as zero-engineering signal. **Overruled:** open RLS vulnerabilities make any new race surface a security liability until the `SELECT USING (true)` policies are patched.
- **[Animation-Motion]** Preferred 800ms cap as sufficient gate for auto-play. **Overruled:** `[Accessibility]` preference check is the correct mechanic; duration cap does not satisfy WCAG 2.4.11.

### PRE-MORTEM (top 3 plausible regrets, two weeks out)

1. **ICO-unregistered product adds paid character tier and Gambling Commission flags `rng_jitter`.** Founder faces personal liability before Companies House registration completes. *Likelihood: med. Severity: high. Reversible: no.*
2. **Full Vision ships pre-F1**, 4-5 friends-of-founder produce enthusiastic signal, Ash commissions pixel art at ~£800-2000, real cohort shows zero retention lift. *Likelihood: high. Severity: med. Reversible: no (sunk cost).*
3. **`character_snapshot` lands in tables with `USING (true)` RLS**; any authenticated user reads every member's paid-tier status; GDPR breach notification required. *Likelihood: high (policy already exists). Severity: high. Reversible: no (breach notification is permanent record).*

### CONCURRENT LIVE BUGS (not blocking gamification verdict — fix this week regardless)

1. **`PlanPathSVG.tsx:18-28`** — `useReducedMotion` hydration flash; needs lazy initialiser.
2. **`community-migration.sql:126/162`** — `SELECT USING (true)` on `challenge_entries` + `virtual_race_entries` exposes row data world-readable.
3. **`BottomNav.tsx:144`** — `focus-visible:outline-none` with no replacement; WCAG 2.4.11 violation.
4. **`MissedSessionFlow.tsx:188`** — "NextSplit Pro" at "£4.99/month" does not exist; correct tier is Elite at £7.99/£9.99.

### RECOMMENDED V0 SLICE (ship this, nothing more, after blockers clear)

Character select screen + class display name (no mechanics) + daily 5K race (solo, flat XP, no multiplier, no `rng_jitter`). One table: `user_characters`. Zero new cron expressions. Gate art commission on analytics trigger above.

### AFTER-SHIP SIGNS TO WATCH

- **Retention signal:** 3+ of 5 F1 users log a training session in week 2 via `training_log_created` PostHog event.
- **Character engagement:** `character_selected` fires for 80%+ of F1 users within session 1.
- **Overtraining flag:** zero ACWR breach events (`acwr_warning_shown`) in first two weeks. If any appear before ACWR gate is wired, pause XP boosts immediately.

### FOUNDER DECISION REQUIRED: yes

Complete ICO registration (£40) and patch the two `USING (true)` RLS policies before any gamification code merges. Then confirm: is V0 (character select + daily 5K, no XP multipliers, no art) acceptable as the F1 deliverable, or does F1 need to test richer mechanics — because if the latter, legal risk is on you personally before Companies House registration closes.

---

## Roster — Round 1 + Round 2 verdicts

| Lens | R1 | R2 | Notable shift |
|---|---|---|---|
| product-strategist | HOLD (4) | HOLD (5) | Confidence ↑; "delete `rng_jitter` from V0 entirely" |
| ux-designer | HOLD (4) | HOLD (4) | Pin "Join Today's Race" pill; gate Race tab from nav until first race exists |
| frontend-engineer | SHIP-WITH-FOLLOWUP (4) | YELLOW (4) | LIVE BUG found: `PlanPathSVG.tsx` hydration flash |
| backend-data-engineer | SHIP-WITH-FOLLOWUP (4) | YELLOW (4) | LIVE BUGS found: `community-migration.sql` USING(true); virtual_races.entry_count race condition |
| qa-risk | HOLD (4) | RED (4) | Ekiden roster orphaning = first-test-session failure |
| devils-advocate | HOLD (5) | RED (5) | F1 = statistical theatre; defer until 20+ unacquainted-user cohort |
| security-privacy | SHIP-WITH-FOLLOWUP (4) | RED (4) | LIVE VULNERABILITIES confirmed on virtual_race_entries + challenge_entries |
| coach-domain-expert | SHIP-WITH-FOLLOWUP (4) | YELLOW (4) | 1.8× multiplier directly competes with ACWR gate; needs hard physiological ceiling |
| visual-brand | SHIP-WITH-FOLLOWUP (4) | SHIP-WITH-FOLLOWUP (4) | Register `--ns-magenta` in `:root` before any sprite code |
| accessibility | SHIP-WITH-FOLLOWUP (4) | RED (4) | LIVE BUG: `BottomNav.tsx:144` WCAG 2.4.11 violation |
| performance | SHIP-WITH-FOLLOWUP (4) | YELLOW (4) | Disagreed with mobile-pwa lazy-load; prefetch atlases at race-join |
| mobile-pwa | HOLD (4) | HOLD (4) | `push_subscriptions` lacks `is_installed_pwa` column |
| legal-compliance | HOLD (4) | RED (4) | ICO is criminal liability under DPA 2018 s.61(4); PECR reg.22 also missed |
| pm-tech-lead | HOLD (5) | RED (5) | V1 slice = char-select + class + daily-5K only; gate on F1 + ICO confirmed |
| finance-pricing | SHIP-WITH-FOLLOWUP (4) | SHIP-WITH-FOLLOWUP (4) | Founding cap as DB CHECK + Stripe coupon; refund vs cap interaction |
| marketing-growth | SHIP-WITH-FOLLOWUP (4) | SHIP-WITH-FOLLOWUP (4) | Disagreed with HOLD on Race V0 — passive leaderboard is observation window |
| analytics-data | SHIP-WITH-FOLLOWUP (4) | SHIP-WITH-FOLLOWUP (4) | Concrete trigger: 3-of-5 + ≥2 squad-engaged in week 2 |
| animation-motion | SHIP-WITH-FOLLOWUP (4) | SHIP-WITH-FOLLOWUP (4) | LIVE BUG: `LevelUpScreen.tsx:28` 6000ms auto-dismiss; `globals.css:302` shimmer-gold infinite loop |
| content-copy | SHIP-WITH-FOLLOWUP (4) | SHIP-WITH-FOLLOWUP (4) | LIVE BUG: `MissedSessionFlow.tsx:188` stale "Pro" pricing |

**R2 tally:** 4 HOLD + 5 RED = 9 HOLD-leaning vs 6 YELLOW + 4 SWF = 10 ship-leaning. **Synthesizer pulled the verdict to HOLD** because the live security vulnerabilities + ICO criminal liability + Gambling Commission scrutiny on `rng_jitter` are blockers, not followups.

---

## Convergent themes across all 19 lenses

1. **ICO registration is RED** (legal, pm) — criminal liability under DPA 2018 s.61(4)
2. **`rng_jitter` triggers Gambling Commission scrutiny** (legal, product, devils, security) — must be deleted before any race ships
3. **Vercel Hobby cron cap blocks 5 race formats** (qa-risk, mobile-pwa, performance) — pg_cron OR lazy-resolution required
4. **Engagement-pro-rata XP rate IS pay-to-win in plain language** (devils, finance, legal, coach) — modest 1.0/1.3/1.6/1.8× picked, but legal disputes magnitude reduces obligation
5. **Art commission must gate on F1 retention metric** (product, devils, pm, marketing, analytics, visual-brand) — concrete trigger: 3-of-5 + ≥2 squad-engaged in week 2
6. **JSONB unbounded growth on Hobby 500MB** (backend, performance, qa-risk, frontend) — DB CHECK at schema level, per-500m granularity OR seed-recompute
7. **`character_snapshot` bulk-readable tier-leak** (security, legal, backend) — restrict SELECT to own row, create `race_results_public` view
8. **ACWR overtraining incentive on boost-from-training** (coach, qa-risk) — wire `getACWR()` > 1.3 7-day deferral on `grant_milestone_boost`

## What's NOT in scope of this verdict

The /council reviewed the proposal as a Phase 3+ Full Vision spec. It did NOT review:
- The exact pixel-art commissioning brief (when triggered post-F1, run a separate visual-brand pass)
- The detailed UX prototyping of the Race tab (post-blocker-clear, run a /forge or design pass)
- The pentest brief (Track 6, separate workstream)

---

_Generated by /council — full transcript reflects 19 R1 outputs + 19 R2 outputs + ns-synthesizer verdict._
