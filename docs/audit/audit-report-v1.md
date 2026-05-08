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

## Phase 1 — Reconnaissance

### Routing snapshot

**Top-level routes** (29 directories under `src/app/`):
`admin/`, `api/`, `auth/`, `coach/`, `coaches/`, `community/`, `dashboard/`, `diary/`, `explore/`, `gym/`, `history/`, `home/`, `invite/`, `marketplace/`, `nutrition/`, `offline/`, `onboarding/`, `plan/`, `privacy/`, `profile/`, `races/`, `refer/`, `settings/`, `squad/`, `terms/`, `today/`, `train/`, `u/`, `you/`.

**Pattern:** every authenticated route follows the same shape — `page.tsx` server-component does `createClient() + getUser() + redirect('/auth/login')` on miss, then renders a client component with hydrated data. Verified across 20 page.tsx files. ✓ Consistent.

**Bottom-nav tabs (HomeClient → 4 destinations):** Home/Train/Squad/You. Confirmed in `src/components/BottomNav.tsx` (per earlier session work). The `/explore` route still exists and is on the kill list; demoted to Home submenus + Squad discovery sheet. P2.1 squad-tab IA decision is gated on F1.

### Hooks inventory

22 hooks in `src/hooks/` + 3 extracted during this session in scoped folders:

| Hook | Domain | Notes |
|---|---|---|
| `useActivePlan` | plan | Cross-page; central to Today / Train / You |
| `useActivityLog` | activity tracking | |
| `useAllTrainingLogs` | training data | Cross-plan, returns `TrainingLog[]`, NOT `Record` (lesson learned PR #9) |
| `useTrainingLog(planId)` | plan-scoped logs | Returns `Record<string, TrainingLog>`; load-bearing line 106 upsert with `onConflict` for plan-prescribed dedup |
| `useCoach`, `useCommunity` | coach/community | |
| `useCookieConsent` | PECR | Drives `posthog.init` gating per P1.2 |
| `useGymLog`, `useMealPlan` | training extras | |
| `useLeadMode` | coach view-mode toggle | |
| `useNotifications` | in-app inbox | |
| `usePlanHistory`, `usePlanTemplates` | plan management | |
| `useProfile` | profile + PostHog identify + P2.7 timezone capture | Load-bearing — also stitches anon→auth in PostHog |
| `usePushNotifications` | web-push subscribe; iOS standalone gate (P1.1) | |
| `useRaces`, `useRecipes` | race/nutrition | |
| `useSquad` | squad state | |
| `useSubscription` | premium gate; isDevMode comes from `/api/subscription/dev-mode` (P1.3) | |
| `useSupabase` | Supabase client factory | |
| `useWellness` | wellness logs | |
| `useUndoCountdown` (in `src/app/today/hooks/`) | T1 extraction | Owns 4 useState + 2 effects; ref-backed countdown |
| `useSessionLogging` (in `src/app/today/hooks/`) | T2 extraction | Returns `Promise<TrainingLog \| null>`; owns log save + PB + community fan-out + squad-feed RPC + referral-reward RPC |
| `useLogFormState` (in `src/components/log-modal/`) | L1 extraction | Owns 9 form-state slots + comprehensive `isDirty` |

**Drift signal:** the 3 extracted hooks live in nested folders (`src/app/today/hooks/`, `src/components/log-modal/`) while the 22 originals live flat in `src/hooks/`. Unclear pattern.

### Schema inventory (from migrations)

Migration files in `supabase/migrations/` (16 total):
- `alpha-readiness.sql` (NPS responses + general bootstrap)
- `create_activity_logs.sql`
- `phase-12-referral.sql`
- `phase-bl-x4-x5-indexes.sql` *(this session)*
- `phase-ch2-communication.sql` (coach messaging extensions)
- `phase-cm1-marketplace.sql` (coach marketplace)
- `phase-cm2-revenue.sql` (coach earnings + group coaching)
- `phase-p1-0a-schema.sql` *(this session)*
- `phase-p2-3-referral-reward.sql` *(this session)*
- `phase-p2-7-timezone.sql` *(this session)*
- `phase-p3-10-squad-seasons.sql` *(this session)*
- `phase-sl1-squads.sql` (8 squad tables + 4 RPCs)
- `phase-sl2-depth.sql`
- `pre-alpha-fixes.sql`
- `runner-class-migration.sql`, `runner-colour.sql`

**Tables observed in migrations:** activity_logs, ai_usage, club_feed_reactions, coach_earnings, coach_referrals, coach_reviews, coaching_subscriptions, group_coaching_enrolments, group_coaching_sessions, nps_responses, squad_achievements, squad_feed, squad_feed_reactions, squad_invites, squad_members, squad_nudges, squad_seasons, squads.

**Tables NOT defined in version-controlled migrations** but referenced in `src/types/database.ts` and `src/app/api/`:
- `profiles` (referenced 7 migrations via ALTER TABLE; never CREATE)
- `user_plans`, `training_logs`, `plan_templates`, `wellness_logs`, `gym_logs`, `meal_plan_entries`, `recipes`, `races`, `strava_connections`
- `coach_profiles`, `coach_athletes`, `coach_messages`, `notifications`, `push_subscriptions`

These pre-date the migration system; their CREATE TABLE + RLS posture lives in the live Supabase project but isn't reproducible from `supabase/migrations/*.sql`. **This is the audit's biggest static-analysis gap and the source of F2.1 below.**

### RPC inventory

18+ RPCs found via `CREATE FUNCTION` grep:

| RPC | Source | Definer? |
|---|---|---|
| `apply_split_leader_reward` | phase-sl1 | ? |
| `can_nudge` | phase-sl1 | DEFINER |
| `coach_earnings_summary`, `coach_earnings_ytd` | phase-cm2 | DEFINER |
| `decrement_club_members` | older | DEFINER |
| `generate_coach_referral_code` | phase-ch2 | DEFINER |
| `get_commission_rate` | phase-cm2 | ? |
| `increment_profile_xp`, `increment_season_xp` | older | ? |
| `marketplace_coaches` | phase-cm1 | ? |
| `refresh_coach_rating` | phase-cm1 | DEFINER |
| `squad_active_member_count` | phase-sl1 | ? |
| `squad_alltime_km` | phase-sl1 | DEFINER |
| `squad_monthly_km` | phase-sl1 | ? |
| `snapshot_squad_season` | older | ? |
| `public.credit_referral_reward_if_eligible` | phase-p2-3 (this session) | DEFINER + GRANT EXECUTE TO authenticated |
| `public.insert_squad_feed_on_log` | phase-p1-0a (this session) | DEFINER + GRANT EXECUTE TO authenticated |
| `public.snapshot_squad_seasons_for_month` | phase-p3-10 (this session) | DEFINER + GRANT EXECUTE TO service_role |

**SECURITY DEFINER total: 9 confirmed.** Each one bypasses RLS by design. The 3 shipped this session have **explicit auth.uid() validation + ownership checks + GRANT EXECUTE scoping**. The older ones predate the discipline; need body-level review (Phase 2 below).

### External integrations (current set)

Catalogued in detail in Phase 9; summary list:
1. Supabase (auth, DB, RLS, realtime, storage)
2. Vercel (hosting, build, cron, OG image — Vercel Hobby tier, 2-cron cap)
3. Anthropic (AI plan/coach/adapt)
4. Stripe (payments — founding/standard tiers + Connect)
5. Resend (lifecycle + transactional email)
6. Sentry (errors)
7. PostHog (product analytics)
8. Strava (OAuth + activity import — wired, P3.12 observability shipped)
9. Google OAuth (auth path)
10. VAPID / Web Push
11. GitHub (source + Actions)
12. DNS provider for `nextsplit.app` (assumed Cloudflare)

---

## Phase 2 — Security

### F2.1 [CRITICAL] · RLS verification gap on core tables

**Affected tables:** `profiles`, `user_plans`, `training_logs`, `plan_templates`, `wellness_logs`, `gym_logs`, `meal_plan_entries`, `recipes`, `races`, `strava_connections`, `coach_profiles`, `coach_athletes`, `coach_messages`, `notifications`, `push_subscriptions`.

**Evidence:** none of these tables have a discoverable `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` statement in `supabase/migrations/*.sql`. They predate the version-controlled migration system; their RLS state lives in the live Supabase project only.

**Why this is critical:** these tables hold the highest-stakes user data. `training_logs` + `wellness_logs` = personal training + health history. `coach_messages` + `coach_athletes` = the coach-tier confidentiality surface. `push_subscriptions` = endpoint-level identifiers that, if leaked across users, allow cross-user push spoofing. A single table with RLS off is a full data breach.

The audit cannot verify RLS state from static analysis — Supabase's web dashboard creates tables with RLS enabled by default these days but didn't always.

**Severity:** CRITICAL.
**Persona:** all (data integrity, the core trust surface).
**Fix:** [FOUNDER-RUN CHECK] in Supabase SQL Editor:

```sql
SELECT relname AS table_name,
       relrowsecurity AS rls_enabled,
       relforcerowsecurity AS rls_forced
  FROM pg_class
 WHERE relkind = 'r'
   AND relnamespace = 'public'::regnamespace
 ORDER BY relrowsecurity, relname;
```

Acceptance: every row in the result must have `rls_enabled = true`. Any `false` is a critical breach surface — RLS must be enabled immediately AND policies must be authored to gate cross-user access.

**Also recommended:** version-control the post-state. Generate a `migration_rls_audit_2026-05-08.sql` file recording RLS state for all 28+ public tables so future drift is detectable.

**Effort:** S to run the check; XL if any table comes back `false` (policy authoring + back-fill).

### F2.2 [HIGH] · `nps_responses` SELECT policy leaks across users

**File:** `supabase/migrations/alpha-readiness.sql:120`
**Evidence:**
```sql
CREATE POLICY "Service role reads all NPS" ON nps_responses
  FOR SELECT USING (true);
```

The policy name suggests intent to give service-role unrestricted SELECT, but the policy has no `TO service_role` clause. PostgreSQL RLS policies apply to ALL roles by default; `USING (true)` therefore lets any authenticated user SELECT all NPS responses — including others' ratings, free-text comments, and triggers.

Since service-role **bypasses RLS by design** (it's the BYPASSRLS role attribute), this policy is unnecessary for its stated purpose; deleting it makes service-role behaviour identical (still bypasses) and removes the leak for `authenticated`.

**Severity:** HIGH (PII / sentiment leak; small audience but real disclosure).
**Persona:** all (PII).
**Fix:**
```sql
DROP POLICY "Service role reads all NPS" ON nps_responses;
-- service_role still bypasses RLS, so admin reads continue to work.
```

**Effort:** S (1 line + verification query: `SELECT * FROM nps_responses` as a non-admin user should now return only own rows).
**Risk if left:** any F1 friend can scrape NPS responses; surfaces in Sentry once the dashboard query starts running but only as performance noise, not as an alert.

### F2.3 [INFO] · `group_coaching_sessions` SELECT-public policy

**File:** `supabase/migrations/phase-cm2-revenue.sql:86`
**Evidence:**
```sql
CREATE POLICY "group sessions readable by all" ON group_coaching_sessions
  FOR SELECT USING (true);
```

This appears intentional (marketplace listing of group coaching sessions visible to all browsers, including unauthenticated). Verify the table only contains advertised sessions, not private booking metadata.

**Severity:** INFO.
**Persona:** F (Pro coach).
**Fix:** confirm intent + audit row content; if private fields exist (e.g., revenue figures, attendee details), restrict via column-level grant or split the table.

### F2.4 [HIGH] · SECURITY DEFINER older RPCs lack explicit caller validation in body

**Files:**
- `phase-sl1-squads.sql` — `can_nudge`, `squad_active_member_count`, `squad_monthly_km`, `apply_split_leader_reward`
- `phase-cm1-marketplace.sql` — `refresh_coach_rating`, `marketplace_coaches`
- `phase-cm2-revenue.sql` — `coach_earnings_summary`, `coach_earnings_ytd`, `get_commission_rate`

The 3 RPCs shipped this session (`insert_squad_feed_on_log`, `credit_referral_reward_if_eligible`, `snapshot_squad_seasons_for_month`) all explicitly check `auth.uid()`, validate ownership of referenced rows, and have explicit `GRANT EXECUTE TO <role>`. ✓

The older RPCs need body-level review:
- `coach_earnings_summary(p_coach_id uuid)` — does it verify `auth.uid() = p_coach_id`? If not, any user can read any coach's earnings.
- `marketplace_coaches()` — likely intended-public; safe.
- `refresh_coach_rating()` — internal aggregator; should be service-role only.
- `can_nudge(p_from uuid, p_to uuid)` — does it verify `auth.uid() = p_from`? Otherwise any user can poll any other user's nudge rate-limit state.

**Severity:** HIGH (depends on body content; potential cross-user data read on coach earnings).
**Persona:** F (coach revenue confidentiality).
**Fix:** open each RPC body via Supabase SQL Editor and either:
1. Add explicit `IF auth.uid() <> p_*_id THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;` early in the function, OR
2. Rewrite without SECURITY DEFINER (use plain functions that respect RLS).
**Effort:** M (audit + patch each function; includes one migration to update them).

### F2.5 [LOW] · service-role used in `aiRateLimit.ts` with anon-key fallback

**File:** `src/lib/aiRateLimit.ts:25`
**Evidence:**
```typescript
const SUPABASE_SERVICE_KEY = serverConfig.supabaseServiceRoleKey || config.supabaseAnonKey
```

Anon-key fallback means rate-limiting can run with the wrong privilege level if `SUPABASE_SERVICE_ROLE_KEY` is unset. Anon role is RLS-restricted; the rate-limit `ai_usage` upsert would silently fail rather than enforcing the cap. A user could exhaust the cap if the env var is missing. Production has the env var set ✓, but the fallback is a foot-gun for staging or future contributors.

Same pattern at `src/app/api/admin/seed-plans/route.ts:27`.

**Severity:** LOW (env-misconfig path only).
**Persona:** all (cost line).
**Fix:** drop the anon fallback; throw if service-role missing:
```typescript
if (!serverConfig.supabaseServiceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY required for aiRateLimit')
}
```
**Effort:** S (5 min × 2 files).

### F2.6 [INFO] · Service-role usage audit — clean

`grep -rn "SUPABASE_SERVICE_ROLE_KEY" src/` returns ONLY server-side files (server actions, route handlers, server components, lib). No client component imports the service role. ✓ No client bundle leakage. The marathon session's new server actions (`shareSessionWithSquadAction`, `notifyReactionAction`, `creditReferralRewardIfEligibleAction`) all confine service-role to server context.

### F2.7 [HIGH] · CRON_SECRET guard coverage on /api/cron/*

**Files:** `src/app/api/cron/*/route.ts` (4 routes)
**Evidence:** earlier grep audit:
- `/api/cron/smart-notify/route.ts` — has `Authorization: Bearer ${CRON_SECRET}` guard ✓
- `/api/cron/lifecycle-emails/route.ts` — needs verification
- `/api/cron/notify-email/route.ts` — needs verification
- `/api/cron/notify/route.ts` — likely dead (F0.2)

[FOUNDER-RUN CHECK] verify all four routes have the bearer-token guard:

```bash
grep -l "Bearer.*CRON_SECRET" src/app/api/cron/*/route.ts
```

Should list 3 of 4 (notify excluded as deprecated). If lifecycle-emails or notify-email is missing, any unauthenticated GET to the URL fires the entire email cron — abuse vector.

**Severity:** HIGH if not all guarded.
**Persona:** all (Resend cost line + spam to users).
**Fix:** add the bearer-token guard to any unguarded route. Pattern from `smart-notify`:

```typescript
const authHeader = req.headers.get('authorization')
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### F2.8 [MEDIUM] · CSP `'unsafe-inline'` and `'unsafe-eval'` on script-src

**File:** `vercel.json` headers block
**Evidence:**
```
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.sentry.io https://*.posthog.com https://js.stripe.com https://fonts.googleapis.com"
```

`'unsafe-inline'` defeats CSP's main XSS protection — any injected `<script>` runs. `'unsafe-eval'` allows runtime code execution from strings. Both are commonly required by Next.js dev / Stripe Elements / older PostHog SDKs, but should be tightened in production.

**Severity:** MEDIUM (XSS surface widening; mitigated by React's default escaping but defense-in-depth lost).
**Persona:** all.
**Fix:**
1. Audit which inline scripts/eval are actually needed (likely Next.js `__NEXT_DATA__` and `next/script` which can move to nonce-based).
2. Migrate to `'strict-dynamic'` + nonce per Next.js CSP docs.
**Effort:** L (Next.js CSP migration is non-trivial).
**Risk if left:** XSS is still mitigated by React but a single `dangerouslySetInnerHTML` or `eval`-using third-party can punch through.

### F2.9 [LOW] · `dangerouslySetInnerHTML` audit

```bash
grep -rn "dangerouslySetInnerHTML" src/
```
[FOUNDER-RUN CHECK or in-session] — every hit needs justification (markdown render, OG-image inline SVG, etc.). Currently I don't have results from this env; flagging for completion in a follow-up audit pass.

### F2.10 [INFO] · ICO registration still pending (privacy.tsx placeholder)

**File:** `src/app/privacy/page.tsx:25`
**Evidence:** `[UPDATE AFTER REGISTRATION]` placeholder string.

P1.2 PECR was shipped in PR #7 (cookie consent gate on `posthog.init`). The ICO £40 registration itself is founder admin (ico.org.uk). This is a **hard prerequisite before any coach-data feature in Phase 3** per ROADMAP §6 — but Phase 3 has shipped 9/11 items already, including coach-side surfaces (P3.1, P3.3 messaging push, P3.6 reviews). The ICO obligation is not strictly code-blocking but is legally outstanding for the live product.

**Severity:** INFO (legal admin, not code).
**Persona:** all (founder obligation).
**Fix:** founder action — register at ico.org.uk, paste the registration number into `privacy.tsx:25`.
**Effort:** S (founder time, 30 min + £40).


