# Audit → Roadmap Integration v1

**Companion to:** `docs/audit/audit-report-v1.md`
**Date:** 2026-05-08
**Owner:** Ash + Claude
**Purpose:** every audit finding mapped to a roadmap track with an
explicit trigger ("ship inline with phase X", "F1-gated",
"foundation sprint", "P4.1 pentest scope", or "backlog with trigger
T"). No finding sits homeless.

---

## How to read this doc

Each row carries:

- **Finding ID** → links to `audit-report-v1.md`
- **Severity** → from the audit
- **Track** → one of:
  - `HOTFIX` — ship in next 24-48h, before any further feature
    work; one PR per track or a single rollup PR
  - `FOUNDATION-SPRINT` — 2-3 day dedicated sprint between F1
    friend-test and Phase 4 paywall flip
  - `INLINE/PHASE-N` — bundle into the next PR touching Phase N
  - `F1-GATED` — wait on F1 friend-test signal (don't pre-empt the
    real users)
  - `P4.1-PENTEST` — fold into the £500-£2000 paid pentest scope
  - `BACKLOG/<trigger>` — defer; trigger condition spelled out
  - `FOUNDER-ADMIN` — non-code; legal / billing / vendor action
- **Owner** → which thread (T1-T10) and primary persona

---

## Track 1 — HOTFIX (next PR, before any new feature)

**Council expanded this track** from 3 → 5 items. Findings here
are stop-the-line: do not ship any Phase 2/3/4 feature past these.

| ID | Sev | Title | Effort | Owner |
|----|-----|-------|--------|-------|
| **F0.3** | HIGH | `/admin/retention` admin auth gate | S (10 min) | T6 sec / all |
| **F2.2** | HIGH | drop over-broad `nps_responses` SELECT policy | S (15 min) | T6 sec / all |
| **F0.1** | HIGH | delete redundant `deploy.yml` workflow | S (5 min) | T9 SRE / all |
| **S3** | HIGH (council-added) | `can_nudge` SECURITY DEFINER `auth.uid()` guard | S (10 min, one migration) | T6 sec / B,C |
| **S12** | LOW (council-added) | `manifest.json` `background_color` → `#0a0e1a` | S (2 min) | T2 mobile-pwa |

**Rationale.** F0.3 + F2.2 + F0.1 unchanged. **S3 (`can_nudge`)
escalated** because the cross-user nudge oracle is a timing
side-channel on the squad-accountability core (product-strategist
+ security-privacy independent flag). **S12** is cosmetic but
prevents the white splash flash on iOS standalone cold launch and
costs 2 minutes — fold in.

**Pre-flight before this PR opens:** founder runs F2.1 RLS SQL
check (single query, 5 minutes — see audit Phase 2 §F2.1). If
any core table returns `rls_enabled = false`, **ESCALATE**: pause
this PR and treat as full incident.

**Acceptance:**
- F0.3: admin email check returns 403 / redirect for non-admin
- F2.2: cross-account SQL test (founder + a test user) confirms
  user A cannot SELECT user B's `nps_responses` row
- F0.1: `.github/workflows/deploy.yml` deleted; `VERCEL_DEPLOY_HOOK`
  secret removed from GitHub repo settings
- S3: `SELECT can_nudge('any-uuid', 'any-uuid')` from a non-owner
  session raises `42501`
- S12: `manifest.json` `background_color: "#0a0e1a"`

---

## Track 1.5 — NEW (council-introduced, post-hotfix, ~2h)

Tight follow-on PR after Track 1 lands. Items either depend on the
Track 1 SQL run or are exploit vectors live today that don't fit
the foundation-sprint cadence.

| ID | Sev | Title | Effort | Owner |
|----|-----|-------|--------|-------|
| **S6** | HIGH (council-added) | add `aiRateLimit()` to 5 unguarded AI routes | S (30 min) | T1 / A,D,F |
| **S5** | HIGH (council-added) | fix `scripts/gen-types.sh` output path | S (2 min) | T1 |
| **F4.1** | HIGH | regenerate `src/types/database.ts`; drop `as never` casts | S (15 min, depends on S5) | T1 |
| **S10** | MEDIUM (council-added) | unified onboarding event taxonomy across 3 flows | S (1h) | T8 / T2 |

**Rationale.** S6 is exploitable today: `/api/ai/generate-plan`,
`/api/ai/adapt-plan`, `/api/ai/coach-digest`, `/api/ai/recommend`,
`/api/ai/weekly-summary` all hit Anthropic with no rate cap. Any
authenticated user can drain quota. S5 is a precondition for F4.1.
S10 must precede F1 friend-test or funnel data is unreadable
(UX lens).

**Acceptance:**
- S6: each of the 5 routes has `await checkAiRateLimit(...)` near
  the top of the handler; over-limit returns 429
- S5: `gen-types.sh` writes to `src/types/database.ts` directly
- F4.1: `npx tsc --noEmit` exits 0; zero `as never` cast in `src/`
  (audit Phase 4 lists call sites)
- S10: `src/app/onboarding/events.ts` exports
  `ONBOARDING_STARTED`, `ONBOARDING_COMPLETED`, `ONBOARDING_PATH`
  constants; all 3 flows import from it

---

## Track 2 — FOUNDATION SPRINT (4 days realistic, post-F1, pre-Phase 4)

**Council resized** from 2-3 days → 4 days. F4.1 lifted to Track
1.5; F2.4 expanded by 4 RPCs; new sport-science validator added;
F6.1 paths corrected; F0.2 gains zero-send alert prerequisite.

| ID | Sev | Title | Effort | Owner |
|----|-----|-------|--------|-------|
| F2.1 | CRITICAL | RLS verification on 15+ core tables + cross-account test (run pre-Track-1) | L (could be XL) | T6 sec / T1 |
| F2.4 | HIGH | SECURITY DEFINER body audit — **expanded scope per S4** | M-L | T6 sec / T4 coach |
| F0.4 | HIGH (was MED) | staged CI unblock — tests now, tsc post-F4.1, eslint last | S+M | T1 / T9 |
| F0.2 | HIGH | cron consolidation + dead-route delete + zero-send Sentry alert | M | T9 SRE / T3 |
| F6.1 | HIGH | unit tests on `statsUtils/calcACWR`, `vdot`, `streak`, `referral` (zero-input + boundary cases per QA) | M | T7 / T1 |
| **S9** | MEDIUM (council-added) | post-generation plan validator — distance-specific taper + long-run ≤ 30% weekly | M (1 day) | T7 / A,D |

### F2.4 expanded scope (per S4, ns-backend-data-engineer)

The original audit listed `coach_earnings_summary`,
`coach_earnings_ytd`, `can_nudge`, `get_commission_rate`,
`refresh_coach_rating`. Backend lens added:

- `increment_season_xp(p_user_id)` — `alpha-readiness.sql:125-142`
- `increment_profile_xp(p_user_id)` — `alpha-readiness.sql:125-142`
- `decrement_club_members(p_club_id)` — `alpha-readiness.sql:145`
- `apply_split_leader_reward(p_leader_id)` — `phase-sl1-squads.sql:344`

All four lack `auth.uid()` checks and `GRANT EXECUTE` scoping. Any
authenticated user can call them with arbitrary IDs. Track 2
must produce one consolidated migration `phase-rpc-hardening-v1.sql`
that gates each function or moves it to service-role-only.

**Rationale.** F2.1 is the long pole — backend lens reclassifies
to L (could be XL if any table returns `false`, requires authoring
policies on a live production table with real user rows). F6.1
bar raised by QA: each test file must include at least one
zero-input case and one boundary case (e.g., zero-mileage week →
divide-by-zero in ACWR; new user with <4 weeks of history → negative
chronic load). S9 plan validator is pure TS, deterministic — closes
the biggest sport-science liability before AI prompt churn touches
it again.

**Acceptance:**
- F2.1: SQL audit doc signed off; cross-account test fails (good)
  on every public table; any failed table generates a remediation
  migration
- F2.4: 9 RPCs (5 original + 4 council-added) either gain
  `auth.uid()` checks or migrate off `SECURITY DEFINER`; one
  consolidated migration committed
- F0.4: `npm test` blocking; `tsc` blocking after F4.1 lands;
  eslint-warning ceiling agreed
- F0.2: single source of truth per cron route; dead `notify`
  route deleted; Sentry alert fires when `eligible_users > 0
  AND emails_sent = 0`
- F6.1: 4 test files, each ≥5 cases including zero-input +
  boundary; vitest infra issues fixed first (per QA)
- S9: `src/lib/planValidator.ts` exports
  `validateGeneratedPlan(plan, distance)`; flags taper-missing
  for marathon/half plans; flags long-run > 30% weekly

---

## Track 3 — INLINE WITH PHASE 2

Ship as part of the next Phase 2 PR that touches the relevant
surface. No dedicated work item.

| ID | Sev | Title | Trigger PR |
|----|-----|-------|------------|
| F2.5 | LOW | drop anon-key fallback in `aiRateLimit.ts` | next AI-route touch |
| F0.6 | LOW | tighten `.gitignore` (`.env*`, `*.log`, `coverage/`) | any infra PR |
| F0.5 | MEDIUM | rotate >500-line files into BL-X1/X2/X3 candidates | next BL-X refactor |
| F3.6 | LOW | unify onboarding event names across 3 flows | P2.1 IA work |

---

## Track 4 — INLINE WITH PHASE 3 (Coach Suite)

| ID | Sev | Title | Trigger PR |
|----|-----|-------|------------|
| F3.2a | LOW | trophy-room / squad-members ad-hoc tier check → `canAccess()` | next squad PR |
| F3.3 | MEDIUM | central AI client wrapper + cost dashboard | post-foundation, pre-P3.4 (coach revenue v2) |

F3.3 specifically: the ROADMAP's P3.4 (Revenue v2) is the natural
place to land the wrapper, because the founder will want
£/coach/month math at the same time. Forge a 2-option proposal
inside the P3.4 PR.

---

## Track 5 — F1-GATED (don't pre-empt the real users)

These items wait on F1 friend-test feedback. Pre-empting risks
solving a problem that the friend-test reveals as different.

| ID | Sev | Title | What F1 tells us |
|----|-----|-------|-------------------|
| F4.2 | LOW | `: any` count = 120 hotspots | not user-facing — don't churn pre-F1 |
| F5.4 | LOW | Lighthouse cadence | F1 device experience tells us if perf is the issue |
| F6.3 | MEDIUM | staging env | F1 cohort size determines whether staging is needed yet |

---

## Track 6 — P4.1 PENTEST SCOPE

Pre-paid security audit (P4.1, £500-£2000) covers these as part of
its scope. Listing them ensures the founder briefs the firm on
what's already known so they don't bill for re-discovery.

| ID | Sev | Title |
|----|-----|-------|
| F2.1 | CRITICAL | RLS verification (already done in foundation sprint, but pentester re-tests) |
| F2.4 | HIGH | SECURITY DEFINER RPCs (re-verify our own audit) |
| F2.8 | MEDIUM | CSP `unsafe-inline` + `unsafe-eval` migration |
| F2.10 | INFO | ICO registration confirmed before pentest starts |
| F0.3 | HIGH | admin gate confirmed enforced |
| F2.2 | HIGH | NPS RLS confirmed closed |

**Action:** create `docs/audit/pentest-brief-v1.md` at sprint
start of P4.1, listing what we already audited and what we want
the firm to focus on (likely: payment flow, OAuth flows, OWASP
top-10 against our specific stack).

---

## Track 7 — BACKLOG (with explicit trigger)

Defer until the trigger condition fires. Don't pre-empt; the
trigger ensures we don't forget.

| ID | Sev | Title | Trigger |
|----|-----|-------|---------|
| F2.8 | MEDIUM | CSP migrate to nonce-based `strict-dynamic` | first pentest finding referencing CSP, OR first new third-party widget that breaks CSP |
| F5.4 | LOW | Lighthouse CI integration | first user feedback referencing slowness, OR Phase 4 entry |
| F6.3 | MEDIUM | staging env | F1 cohort > 50 active users, OR coach onboarding > 5 paying coaches |
| Garmin / Apple Health integration | — | reduce manual-log friction | manual-log abandonment > 30%, persona A signal |
| Whoop / Oura integration | — | richer recovery signal | T7 domain team requests it post-Phase-3 |
| Stripe Tax | — | VAT for non-UK coaches | first non-UK paying coach |
| Discord / Slack export webhook | — | squad chat off-platform bridge | post-launch, Phase 4+ |
| Mux / Cloudflare Stream | — | coach video plans | first coach asks for video plan support |

---

## Track 8 — FOUNDER ADMIN (non-code)

**Council promoted F2.10 from INFO to RED via the legal lens.**
Operating an unregistered data controller while commercially
processing personal data is a criminal offence under DPA 2018
s.17 + Schedule 1. The obligation already arose when Phase 3
shipped — this is overdue, not pending.

| ID | Sev | Title | Action |
|----|-----|-------|--------|
| **S1 / F2.10** | **RED (legal)** | ICO registration before any new user acquisition | ico.org.uk, £40, 30 min — paste registration number into `src/app/privacy/page.tsx:25` |
| **S2 verify** | (post-F2.2) | confirm no PostHog / Sentry breadcrumb captured NPS free-text comments | 5-min check pre-Track-1 |
| **S14** | TRACK-6 | pentest brief additions: Stripe webhook replay, OAuth state entropy, push endpoint origin whitelist | fold into `pentest-brief-v1.md` when Track 6 scopes |
| Sentry alert rules | — | one rule per `tags.feature` | Sentry UI, 10 min |
| Resend domain verification | — | confirm `nextsplit.app` domain status | Resend dashboard, 5 min |
| Stripe Connect onboarding test | — | end-to-end test with founder coach account | manual run before P3.7 |
| `VERCEL_DEPLOY_HOOK` secret deletion | — | post-F0.1 PR merge | GitHub repo settings |
| Solicitor review of T&Cs / Privacy Policy | — | per legal lens; engage before paid launch | external |

**Why ICO is RED.** Under DPA 2018 / UK GDPR Art 13, processing
personal data commercially without registration creates exposure
on three fronts: (a) £400-£4,000 fixed-penalty notice; (b)
non-compliant privacy notice (placeholder `[UPDATE AFTER
REGISTRATION]` in `src/app/privacy/page.tsx:25` undermines lawful-
basis transparency); (c) personal-data breach reportability path
(F2.2 NPS leak is plausibly Art 33 reportable within 72h —
unregistered controller compounds the problem if a complaint hits
ICO).

---

## Roadmap delta — what changes in `docs/ROADMAP.md`

After this audit lands, the following ROADMAP edits are recommended.
Each is a one-line addition to an existing section.

### `§6 Phase 0` — add as OP5

> **OP5 [audit] Hotfix track + foundation sprint planning.** Apply
> `docs/audit/roadmap-integration-v1.md` Track 1 (hotfix) as the
> next PR. Schedule Track 2 (foundation sprint) for the slot
> immediately after F1 friend-test.

### `§6 Phase 1` — add as P1.7

> **P1.7 [T6,T9] all** **Audit hotfix track.** Land F0.1 + F0.3 +
> F2.2 fixes per `docs/audit/roadmap-integration-v1.md` Track 1.
> Required before any further Phase 2/3 feature work.

### `§6 Phase 3` — append to P3.4

> P3.4 includes: ship F3.3 central AI wrapper + cost dashboard
> (see `docs/audit/audit-report-v1.md` F3.3) at the same time as
> Coach Revenue v2.

### `§6 Phase 4` — add P4.1.5

> **P4.1.5 [T6] all** **Pentest brief preparation.** Build
> `docs/audit/pentest-brief-v1.md` listing what we already audited
> (audit-report-v1.md). Brief the firm so they don't re-discover
> known findings on the clock.

### `§9 Open questions` — add OQ6

> 6. **Foundation sprint scope.** Track 2 of the audit-integration
>    doc lists 6 items. Do all 6 ship as one sprint (3 days) or
>    do F4.1 + F0.4 ship inline with F0.x hotfix (1 PR), leaving
>    the test/RPC work as a smaller sprint? Council /forge
>    decision before sprint kickoff.

---

## Summary — by the numbers (post-council)

- **39 audit findings + 14 council additions** (S1-S14). All
  assigned to a track.
- **Track 1 (HOTFIX):** 5 findings, single PR, 24-48h.
- **Track 1.5 (NEW, council-introduced):** 4 findings, follow-on
  PR ~2h.
- **Track 2 (FOUNDATION SPRINT):** 6 findings (was 7), 4 days
  realistic.
- **Track 3-4 (INLINE):** 6 findings, fold into existing PRs.
- **Track 5 (F1-GATED):** 3 findings, wait for signal.
- **Track 6 (P4.1 pentest):** 6 findings + S14 additions.
- **Track 7 (BACKLOG with trigger):** 8 findings + S13 (SW update
  notification).
- **Track 8 (FOUNDER ADMIN):** 6 items, non-code, **S1 ICO is
  RED priority** before any new user acquisition.

### Sequence (canonical)

1. **Pre-flight** — founder runs F2.1 RLS audit SQL (5 min).
   ESCALATE if any table returns `false`.
2. **Track 1 hotfix PR** (24-48h). 5 items, all S effort.
3. **Track 1.5 follow-on PR** (~2h). 4 items, mostly S effort.
4. **F1 friend-test (P1.6)** — non-code, founder-led.
5. **ICO registration** in parallel with F1 (founder admin, 30 min).
6. **Track 2 foundation sprint** (4 days, post-F1).
7. Phase 4 entry only after retention-bar pass + pentest +
   foundation-sprint + ICO complete.

### What is NOT at risk

The marathon-session feature work (PRs #1-12) is sound. The audit
+ council pass found no defects in the shipped feature code itself
— all critical / high findings are in:
- pre-existing schema policies (alpha-readiness, phase-sl1 era)
- workflow / CI configuration
- legal admin (ICO)
- new-feature-test coverage (sport-science libs)

Production is safe to keep running **while** Track 1 lands. It is
**not** safe to publicise admin URLs, accept new paying coaches,
or run external marketing until S1 (ICO) and Track 1 close.
