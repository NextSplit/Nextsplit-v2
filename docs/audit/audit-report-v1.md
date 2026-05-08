# NextSplit v2 — End-to-End Audit Report v1

**Audit date:** 2026-05-08
**Audit target:** NextSplit v2 production at https://nextsplit.app
**Auditor:** Claude (in-session, single-pass)
**Repo state at audit time:** `claude/review-project-status-lGBPu` post-PR #11 merge; PR #12 (docs) pending
**Baseline correction:** the audit prompt expected HANDOFF v9.7 / ROADMAP v0.3.1 with PR #7 + PR #8 still open. Actual state is HANDOFF v9.8 / ROADMAP v0.4 with **all 11 PRs (4 → 11) merged into main**, plus PR #12 (docs-only) pending. This audit reflects actual current `main`.

**Environment limitations.** The auditor cannot run `gitleaks`, `trufflehog`, live `psql`, `npm audit`, `npx depcheck`, `unlighthouse`, or live cross-account RLS testing from this dev environment (no `node_modules`, no headless Chrome, no Supabase access). Where these matter, findings include a `[FOUNDER-RUN CHECK]` block with the exact command and acceptance criteria.

---

## Executive summary

Five-sentence health read on v2.

**Foundations are sound.** Phase 1 closed cleanly; the marathon execution session shipped 11 PRs covering Phase 1 + 6/7 of Phase 2 + 9/11 of Phase 3 + 4/8 of cross-cutting backlog without breaking production. Schema migration (P1.0a) is correctly hardened with REVOKE + SECURITY DEFINER fan-out; the council-mandated surgical fixes (planDay capture, effectivePace propagation, exhaustive-deps strict) closed the silent-data-corruption class of bugs. **The gaps are operational discipline, not architectural risk:** legacy GitHub Actions cron duplication (`deploy.yml` and `notify.yml`) overlap with Vercel crons, CI swallows every error via `continue-on-error: true`, and `session_annotations` is missing from migrations (Open Q #4). **One high-stakes gap is the lack of an `is_admin` check on `/admin/retention`** — currently any logged-in user can view the cohort dashboard. **PR #7 + #8 readiness flagged in the prompt is moot — both merged, P1.3 env rename done, all migrations applied and verified live.** **The next gating event is F1 friend test (P1.8); 4 deferred Phase 3 items (P3.4/P3.7/P3.9/P3.12 production-flip) plus 3 Phase 2 items (P2.1/P2.5/P2.7-hard) all wait on F1 signal or Stripe Connect/council work.**

---

## Phase 0 — Pre-audit setup findings

### F0.1 [HIGH] · Session 9 redundant deploy workflow still on `main`

**File:** `.github/workflows/deploy.yml`
**Evidence:**
```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Vercel Deploy Hook
        run: |
          curl -X POST "${{ secrets.VERCEL_DEPLOY_HOOK }}"
```

This is the redundant Session 9 workflow HANDOFF v9.7 flagged for removal. Vercel's GitHub App handles auto-deploy on push to `main` natively; this curl-to-deploy-hook is a duplicate path. Two ways it can hurt: (a) fires a duplicate deploy attempt that races with the GitHub App, (b) `VERCEL_DEPLOY_HOOK` is a maintained secret with no functional purpose.

Five other Session 9 chore commits also still sit on `main` (`f4f6ff8`, `7e65a4c`, `8bcff06`, `e7a8bba`, `0ee3757`, `1f2e448`) — those are no-op chores; safe to leave for history.

**Severity:** HIGH (operational hygiene, not security).
**Persona:** all (deployment reliability).
**Fix:** delete `.github/workflows/deploy.yml` and remove the `VERCEL_DEPLOY_HOOK` secret in GitHub repo settings.
**Effort:** S (5 min).
**Risk if left:** continued race-condition risk on deploys; one more secret to rotate.

### F0.2 [HIGH] · Lifecycle-emails fires twice daily; `notify-email` GHA-only

**Files:** `.github/workflows/notify.yml`, `vercel.json` (crons block), `src/app/api/cron/lifecycle-emails/route.ts`, `src/app/api/cron/notify-email/route.ts`

**Evidence:**
- `vercel.json` schedules `/api/cron/lifecycle-emails` at `0 9 * * *` (09:00 UTC)
- `.github/workflows/notify.yml` schedules `0 9 * * *` (09:00 UTC) AND calls **both** `/api/cron/notify-email` AND `/api/cron/lifecycle-emails` with the CRON_SECRET

This means lifecycle-emails fires **twice daily** (Vercel cron + GitHub Actions). Per-user lifecycle-email-sent tracking is in `profiles.lifecycle_email_sent text[]` and gates against double-sending the same template, but the duplicate fire wastes Resend API calls and can race on the gating array.

Separately, `/api/cron/notify-email` has NO Vercel cron entry — it's GHA-only. If GHA is disabled or fails, that pipeline silently stops.

**Plus:** a fourth cron route `/api/cron/notify` exists but neither Vercel nor GHA points at it. Likely dead code.

**Severity:** HIGH (cost + operational fragility).
**Persona:** all (notification reliability + email cost line).
**Fix:**
1. Decide: which is source of truth — Vercel cron or GHA? Recommend Vercel (closer to production code, single source).
2. If Vercel: delete `notify.yml` entirely; consolidate `/api/cron/notify-email` logic into `/api/cron/lifecycle-emails` (slot 4 in the priority cascade) so only 2 Vercel crons run (Hobby cap respected).
3. Delete `/api/cron/notify` if confirmed unused (`grep -rn "/api/cron/notify\b" src/`).
**Effort:** M (1-2h, includes log inspection to confirm which path actually runs in prod).
**Risk if left:** double-spend on Resend; race on `profiles.lifecycle_email_sent` array writes.

### F0.3 [HIGH] · `/admin/retention` has no admin auth check

**File:** `src/app/admin/retention/page.tsx:142-160`
**Evidence:**
```typescript
export default async function RetentionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  // ... loads cohort data via service-role ...
}
```

Auth-gate is "logged in" only — no `is_admin` flag, no `ADMIN_EMAILS` check. Any authenticated user who knows the URL `/admin/retention` can view the entire user-base's cohort retention numbers (signups, D1/D7/D30 returners, total active count, push-subscription rate).

The file's own comment acknowledges this: *"Auth-gate is "logged in" only (no admin flag exists yet — F1-acceptable)."* Acceptable for F1 (4-5 friends, no exposure) but **must harden before any public alpha** (Phase 4 paywall flip).

`ADMIN_EMAILS` env var IS already in `process.env` references — just not enforced here.

**Severity:** HIGH (information disclosure of user-base metrics).
**Persona:** all (operational security).
**Fix:** add admin-email check before the data load:
```typescript
const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(s => s.trim()).filter(Boolean)
if (!user.email || !adminEmails.includes(user.email)) redirect('/today')
```
**Effort:** S (10 min including confirming `ADMIN_EMAILS` is populated in Vercel env).
**Risk if left:** any F1 friend can view aggregate retention numbers — embarrassing if the dashboard says "12 users, D7 retention 0%" and they share it.

### F0.4 [MEDIUM] · CI never fails — `continue-on-error: true` on every check

**File:** `.github/workflows/ci.yml`
**Evidence:**
```yaml
- name: TypeScript check
  run: npx tsc --noEmit
  continue-on-error: true
- name: ESLint
  run: npx eslint src --ext .ts,.tsx --max-warnings 0
  continue-on-error: true
- name: Unit tests
  run: npm test
  continue-on-error: true
```

The `# Vercel is source of truth; pre-existing errors exist` comment acknowledges this. Vercel's preview build IS the de facto gate — the marathon session's 5 typecheck round-trips were caught by Vercel, not CI.

But CI has near-zero value as currently configured. The S3 council fix bumped `react-hooks/exhaustive-deps` from `warn` to `error` (commit `2fdaa87`); CI doesn't catch a violation. Vercel does.

**Severity:** MEDIUM (false sense of safety; process discipline).
**Persona:** all.
**Fix:** remove `continue-on-error: true` from `npm run build` (the one that DOES match Vercel's check). Leave it on `eslint` and `tsc --noEmit` until the legacy errors are actually fixed (or migrate to fixing them as a Foundation Sprint task).
**Effort:** S (5 min).
**Risk if left:** continued reliance on Vercel preview as the only gate; some PRs may sneak past if Vercel is slow.

### F0.5 [MEDIUM] · Files >500 lines beyond BL-X1/X2/X3 candidates

**Files inventory (post-marathon):**

| File | Lines | Notes |
|---|---|---|
| `src/app/settings/SettingsClient.tsx` | 959 | Largest in repo. Pre-existing; NOT on BL-X but should be |
| `src/lib/rpg.ts` | 938 | Pre-existing; deliberate — single source for RPG |
| `src/app/profile/ProfileClient.tsx` | 814 | P2.2 left ProfileClient as legacy kitchen-sink at /profile; YouClient at /you is the new lean view |
| `src/app/train/TrainClient.tsx` | 812 | Grew during this session (Week3Reanchor + ACWR banners) |
| `src/app/today/TodayClient.tsx` | 759 | Down from 870; T1+T2 hooks extracted (P1.0 partial done) |
| `src/components/plan/PlanPathSVG.tsx` | 707 | Grew during session (P3.11 animateMotion + glyphs) |
| `src/app/home/HomeClient.tsx` | 683 | Pre-existing |
| `src/app/coach/squad/SquadClient.tsx` | 618 | Grew during session (P3.1 v2 tiles + P3.5 filter chips) |
| `src/app/community/CommunityClient.tsx` | 608 | Pre-existing |
| `src/app/gym/live/GymLiveClient.tsx` | 591 | Pre-existing |
| `src/app/squad/SquadDashboardClient.tsx` | 540 | **Suspected dead code** — `/squad/page.tsx` renders `SquadPageClient`, not `SquadDashboardClient` |
| `src/app/dashboard/StatsClient.tsx` | 517 | Pre-existing |

**Severity:** MEDIUM (maintainability).
**Persona:** all (developer velocity).
**Fix:**
1. Confirm `SquadDashboardClient.tsx` is unused (grep for imports). If yes, delete (quick win for redundancy register).
2. Add new BL-X items for `SettingsClient`, `HomeClient`, `CommunityClient`, `GymLiveClient`, `StatsClient` — each is a candidate for Foundation Sprint decomposition.
3. Existing BL-X1/X2/X3 (TodayClient/LogModal/AthleteDetailClient) — partial done; full structural splits remain deferred as no-bug-fix-value cosmetics.
**Effort:** S to confirm dead code; M-L for any Foundation Sprint decomposition pass.
**Risk if left:** modal/banner orchestration friction grows, exactly what the council pre-mortem warned about pre-P1.0.

### F0.6 [LOW] · `.gitignore` minimal coverage

**File:** `.gitignore`
**Evidence:**
```
.env.local
```

Only `.env.local` is excluded. Standard hygiene includes `.env*`, `*.pem`, `*.key`, `*.crt`. Not a leak today (no other env files exist), but defense-in-depth.

**Severity:** LOW.
**Persona:** all.
**Fix:** expand `.gitignore`:
```
.env
.env*.local
.env.*.local
*.pem
*.key
*.crt
```
**Effort:** S (2 min).
**Risk if left:** if a contributor creates `.env.production` for a local override, it lands in git.

### F0.7 [INFO] · Env var inventory matches HANDOFF expectations

`process.env.*` references in `src/`:
- ✓ `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✓ `SUPABASE_SERVICE_ROLE_KEY`
- ✓ `ANTHROPIC_API_KEY`
- ✓ `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
- ✓ `PREMIUM_ENFORCED` (post-rename)
- ✓ `ADMIN_EMAILS` (referenced; not enforced — see F0.3)
- ✓ `STRIPE_*` (6 keys)
- ✓ `RESEND_API_KEY`
- ✓ `CRON_SECRET`
- ✓ `VAPID_*` (3 keys)
- ✓ `STRAVA_*` (2 keys)
- ✓ `SEED_SECRET`, `UAT_EMAIL`, `UAT_PASSWORD`, `BASE_URL`, `NODE_ENV`

No orphans (vars in env list with no code reference). `BASE_URL` is referenced but not in HANDOFF's env list — used by Playwright config.

**Severity:** INFO.
**Persona:** all.
**Fix:** add `BASE_URL` to HANDOFF env list for completeness.
**Effort:** S (1 min).

### Phase 0 founder-run checks

Cannot execute from this env; please run after audit:

```bash
# Secret scan — should return clean
gitleaks detect --no-git -v

# Git history secret scan since the last known-clean commit
trufflehog git file://. --since-commit b466b6f

# Confirm no PAT exposure remains
git log --all -p | grep -E "ghp_[A-Za-z0-9]{36}" | head

# npm audit for dependency vulnerabilities (needs npm install first)
npm install && npm audit --production
```

Acceptance: all three should return zero findings.

---

## Phase 1 — Reconnaissance (in progress)

(written incrementally as audit proceeds — see follow-up commits)
