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

These three findings are the only items where the audit recommends
**stop the line**: do not ship Phase 2/3/4 features past these
without fixing them.

| ID | Sev | Title | Effort | Owner |
|----|-----|-------|--------|-------|
| **F0.3** | HIGH | `/admin/retention` admin auth gate | S (10 min) | T6 sec / all |
| **F2.2** | HIGH | drop over-broad `nps_responses` SELECT policy | S (15 min, one SQL migration) | T6 sec / all |
| **F0.1** | HIGH | delete redundant `deploy.yml` workflow | S (5 min) | T9 SRE / all |

**Rationale.** F0.3 leaks aggregate user metrics to any logged-in
account. F2.2 leaks free-text NPS responses across users. F0.1
risks duplicate deploys racing the Vercel GitHub App. All three
are S-effort and reversible. Combine into a single PR
"audit/hotfix-track" titled `audit: hotfix track — admin gate +
NPS RLS + deploy.yml`.

**Acceptance:**
- F0.3: admin email check returns 403 / redirect for non-admin
- F2.2: cross-account SQL test (founder + a test user) confirms
  user A cannot SELECT user B's `nps_responses` row
- F0.1: `.github/workflows/deploy.yml` deleted; `VERCEL_DEPLOY_HOOK`
  secret removed from GitHub repo settings

---

## Track 2 — FOUNDATION SPRINT (2-3 days, post-F1, pre-Phase 4)

A dedicated sprint that closes the structural debt before any
revenue-flip work begins. Lives between F1 friend-test (Phase 1.6)
completion and Phase 4 entry.

| ID | Sev | Title | Effort | Owner |
|----|-----|-------|--------|-------|
| F2.1 | CRITICAL | RLS verification on 15+ core tables + cross-account test | M | T6 sec / T1 |
| F2.4 | HIGH | older SECURITY DEFINER RPCs body-level audit | M | T6 sec / T4 coach |
| F4.1 | HIGH | regenerate `src/types/database.ts` (drops `as never`) | S (15 min) | T1 / T4 |
| F0.4 | MEDIUM | flip CI tests-blocking; sequence tsc/eslint after F4.1 | S+M | T1 / T9 |
| F0.2 | HIGH | consolidate cron sources of truth + delete dead notify | M | T9 SRE / T3 |
| F6.1 | HIGH | unit tests on T7 domain libs (`acwr`, `vdot`, `referral`, `streak`) | M | T7 domain / T1 |
| F4.5 | (=F0.4) | cross-ref handled in F0.4 | — | — |

**Rationale.** These compound: F4.1 unblocks F0.4 (tsc-blocking).
F6.1 is non-controversial — the marathon session shipped enough
code that 4 more unit tests on the highest-risk libs is a 1-day
buy. F2.1 is the only one that's not S/M effort if RLS holes are
found; the audit work itself is M, the *fix* could escalate.

**Acceptance:**
- F2.1: SQL audit document signed off; cross-account test fails
  (good) on every public table
- F2.4: `coach_earnings_summary`, `can_nudge`, etc. either gain
  explicit `auth.uid()` checks or migrate off SECURITY DEFINER
- F4.1: zero `as never` in `src/`; `npx tsc --noEmit` exits 0
- F0.4: `npm test` is `continue-on-error: false` in `ci.yml`;
  follow-on PR flips `tsc` after F4.1
- F0.2: only one source of truth for each cron route; `notify`
  route deleted; per-route invocation logged
- F6.1: 4 new test files, each ≥5 cases, covering the listed libs

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

| ID | Sev | Title | Action |
|----|-----|-------|--------|
| F2.10 | INFO | ICO registration | ico.org.uk, £40, 30 min — paste registration number into `src/app/privacy/page.tsx:25` |
| Sentry alert rules | — | one rule per `tags.feature` (already noted) | Sentry UI, 10 min |
| Resend domain verification | — | confirm `nextsplit.app` domain status | Resend dashboard, 5 min |
| Stripe Connect onboarding test | — | end-to-end test with founder coach account | manual run before P3.7 |
| `VERCEL_DEPLOY_HOOK` secret deletion | — | post-F0.1 PR merge | GitHub repo settings |

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

## Summary — by the numbers

- **39 audit findings.** All assigned a track here.
- **Track 1 (HOTFIX):** 3 findings, single PR, 24-48h.
- **Track 2 (FOUNDATION SPRINT):** 7 findings, 2-3 days.
- **Track 3-4 (INLINE):** 6 findings, fold into existing PRs.
- **Track 5 (F1-GATED):** 3 findings, wait for signal.
- **Track 6 (P4.1 pentest):** 6 findings, brief the firm.
- **Track 7 (BACKLOG with trigger):** 8 findings, deferred with
  explicit trigger.
- **Track 8 (FOUNDER ADMIN):** 5 items, non-code.

The marathon-session work is **not at risk** from any audit finding.
Production is safe to keep running with the 3 hotfix items applied.
The foundation sprint can run in parallel with Phase 2/3 follow-up
work, not blocking it.
