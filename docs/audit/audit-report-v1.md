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

### F2.7 [INFO] · CRON_SECRET guard coverage — clean

**Files:** `src/app/api/cron/*/route.ts` (4 routes)
**Evidence:** all four routes verify `req.headers.get('authorization') === \`Bearer ${serverConfig.cronSecret}\`` at the top of the handler:
- `smart-notify/route.ts` ✓ (active cron)
- `lifecycle-emails/route.ts:16` ✓ (active cron)
- `notify-email/route.ts:21` ✓ (manual / deprecated path)
- `notify/route.ts:19` ✓ (dead code per F0.2 — still guarded as belt-and-braces)

**Severity:** CLEAN. No abuse vector on cron URLs.
**Persona:** all.
**Action:** none on the security side. Dead `notify` route should still be deleted per F0.2.

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



---

## Phase 3 — Architecture audit

Scope: code patterns, premium-gating cleanliness, AI surface
sprawl, mascot continuity, council/forge tooling.

### F3.1 [INFO] · Server-action / route-handler pattern is consistent

The marathon session locked in a clean server-action pattern: `'use
server'` directive at top, explicit `auth.getUser()` guard, validated
inputs, service-role only when crossing user boundaries. New files
(`src/app/today/actions.ts`, `src/app/today/referral.ts`,
`src/app/squad/actions.ts`, `src/app/api/coach/plans/assign/route.ts`)
all follow it.

**Severity:** CLEAN. **Action:** keep this pattern documented in
`CLAUDE.md` so future PRs don't drift.

### F3.2 [INFO] · Premium gating refactor is clean

PR #6 moved `PREMIUM_ENFORCED` server-side. Surface today:

- `src/lib/config.ts:45` — `serverConfig.premiumEnforced` reads
  `process.env.PREMIUM_ENFORCED` (no `NEXT_PUBLIC_*`).
- `src/lib/features.ts:111` — `canAccess(userTier, feature, enforced)`
  takes `enforced` as a parameter (no module-level constant).
- `src/app/api/subscription/dev-mode/route.ts` — public GET
  returns `{ isDevMode: !premiumEnforced }` with 60s cache.
- `src/hooks/useSubscription.ts:121` — client uses the dev-mode
  endpoint; falls back to enforcement on fetch failure.
- `src/lib/aiRateLimit.ts:52` — server-only, reads
  `serverConfig.premiumEnforced` directly.

**Severity:** CLEAN. The flag can be flipped server-side without a
client redeploy, and there is no client bundle leak.

**Sub-finding F3.2a [LOW]:** `src/app/squad/trophies/TrophyRoomClient.tsx`
and `src/app/api/squad/members/route.ts` still derive premium-ness
ad-hoc from `subscription_tier`. They should call `canAccess(...)`
or a typed helper for consistency. Effort: S.

### F3.3 [MEDIUM] · AI surface is broad — 9 routes, no central registry

```
src/app/api/ai/generate-plan/route.ts       — AI onboarding plan
src/app/api/ai/adapt-plan/route.ts          — week-by-week adapt
src/app/api/ai/coach-digest/route.ts        — coach summary
src/app/api/ai/coach/route.ts               — coach Q&A
src/app/api/ai/fuel/route.ts                — fuelling
src/app/api/ai/pre-race-brief/route.ts      — race-eve briefing
src/app/api/ai/recommend/route.ts           — recommendations
src/app/api/ai/suggestions/route.ts         — suggestion engine
src/app/api/ai/weekly-summary/route.ts      — weekly digest
```

All hit `@anthropic-ai/sdk` directly (each file constructs its own
`new Anthropic({...})`). No central wrapper for: model selection,
prompt versioning, token-budget logging, rate-limit enforcement
beyond `aiRateLimit.ts` (only the routes that opt in are gated).

**Severity:** MEDIUM (cost / observability risk; minor architecture).
**Persona:** A,D,F primarily (paying users hit AI hard).
**Risks:**
- Model upgrades require touching 9 files.
- One forgotten `aiRateLimit` call → free unlimited Anthropic
  calls for the user.
- No PostHog event captures `(prompt_id, model, input_tokens,
  output_tokens, latency_ms, user_tier)` consistently.
- No cost dashboard; founder won't know the £/MAU until invoice arrives.

**Fix:**
1. Build `src/lib/ai/client.ts` — `aiCall({ feature, prompt,
   maxTokens, userId, tier })` central wrapper that injects rate-
   limit, captures PostHog `ai_invoke` event, applies model
   default, surfaces Sentry on error.
2. Migrate the 9 routes to it (mechanical change).
3. Add a "AI cost / tier" dashboard query to retention page.

**Effort:** M (1-2 days; mechanical migration plus wrapper design).

### F3.4 [INFO] · Mascot / character continuity holds at the data layer

`src/lib/rpg.ts` is the single source for the 6 character classes,
4-stat schema, 15-level table, and 32 badges. SVG primitives in
`src/lib/charSvg.ts` (and the `dangerouslySetInnerHTML` audit, F4.4
below) confirm only that file emits character SVG. New surfaces
(`SquadFeed`, `Week3Reanchor`, `NudgeSquadPill`, `SquadSeasonCard`,
`AcwrAdvisoryBanner`, `GapRecoveryBanner`) do **not** introduce a
mascot — they are functional UI only. The character lives
exclusively where it's earned (Train, You).

**Severity:** CLEAN. **Action:** the 8 new components shipped this
session do not threaten character continuity. The audit task
flagged in P1.3 (character continuity audit, ROADMAP §6) can be
shortened to: "confirm no surface introduces a non-canonical
character expression". Likely 30-min walkthrough.

### F3.5 [INFO] · Council / forge tooling is intact

`.claude/agents/` lists 23 personas (16 council pool + 7 specialists),
each with a documented charter (`COMMON.md`, `README.md`). The
ns-shortlister, ns-synthesizer, ns-devils-advocate, ns-pm-tech-lead
roles are present and align with ROADMAP §3 / §4.

**Severity:** CLEAN. The marathon session's claim "council/forge are
not optional" is enforceable — the agents exist on disk.

### F3.6 [LOW] · Onboarding path bifurcation — manual / predetermined / AI

Three onboarding paths under `src/app/onboarding/`:

- `manual/` — user picks their own paces / structure
- `predetermined/` — pick from `plan_templates` (F1 friend-test path)
- `ai/` — AI plan generator (P3.12 / coach-style)

Each carries its own state machine, screen sequence, and analytics
event surface. Code reuse is thin — `OnboardingEntry.tsx` only
funnels into one of three sub-trees. Minor: when the founder runs an
A/B over onboarding flow (likely Phase 2-3), the three branches will
need a shared event taxonomy. Currently they don't share one.

**Severity:** LOW. **Fix:** unify analytics event names across the
three flows before the first onboarding A/B. **Effort:** S.

---

## Phase 4 — Quality + sprint-debt audit

### F4.1 [HIGH] · `src/types/database.ts` is stale by 5 migrations

**File:** `src/types/database.ts` (last modified 2026-04-24)
**Evidence:** grep for column / RPC names from the 5 marathon
migrations against the type file:

```
grep -c "referral_reward_months|timezone|training_log_id|
        insert_squad_feed_on_log|consume_squad_season|
        increment_squad_kms" src/types/database.ts
→ 1
```

Only one of those identifiers is present. The 5 applied migrations
(`phase-p1-0a-schema`, `phase-p2-3-referral-reward`, `phase-p2-7-
timezone`, `phase-p3-10-squad-seasons`, `phase-bl-x4-x5-indexes`)
all introduced new columns or RPCs whose types are not in the
generated file.

**Why this is HIGH, not LOW:** the workaround pattern in shipped
code is `as never` casts (see `src/app/api/coach/plans/assign/
route.ts:65`, `src/app/today/hooks/useSessionLogging.ts`, etc.).
That cast disables the compiler's safety net. If a future migration
renames `training_log_id`, no typecheck will catch the drift — only
runtime errors / Sentry alerts will.

**Severity:** HIGH (compounds with every migration; the longer it
stays stale, the more `as never` casts accrue).
**Persona:** all (production reliability).
**Fix:**
1. Run `npx supabase gen types typescript --project-id <id> >
   src/types/database.ts`.
2. Remove every `as never` cast that becomes unnecessary post-
   regeneration.
3. Add `scripts/gen-types.sh` (already exists, line 1 of the
   `find` output above) to a post-migration checklist in
   `CLAUDE.md`.

**Effort:** S (15 min when DB is reachable).

### F4.2 [LOW] · `: any` count = 120; hotspots = squad/route.ts (9), PlanBrowserClient (8), notify dead route (5)

**Counts:**

| File | `any` uses |
|------|-----------|
| `src/app/api/squad/route.ts` | 9 |
| `src/app/onboarding/predetermined/PlanBrowserClient.tsx` | 8 |
| `src/app/api/cron/notify/route.ts` | 5 (dead — F0.2) |
| `src/app/squad/SquadFeed.tsx` | 4 |
| `src/app/onboarding/components/PlanPreviewScreen.tsx` | 4 |

Total in `src/`: 120.

**Severity:** LOW (style / type-safety debt; not a defect).
**Persona:** dev-only. **Fix:** opportunistic — address `any` when
the file is otherwise touched. Don't open a "fix all `any`" PR;
those churn for no user value. Foundation-sprint candidate
alongside F4.1.

### F4.3 [INFO] · TODO / FIXME / HACK / XXX scan

Total: **4** TODOs, all in `src/app/api/cron/smart-notify/route.ts`
lines 14-15 / 119 / 124 — all marked `TODO(P1.x)` for known backlog
items (leader-queued nudge, at-risk detection). Intentional
backlog markers, not abandoned code.

`@ts-ignore` / `@ts-expect-error`: **0**.
`console.*`: **1** (single use; not a leak).

**Severity:** CLEAN (lowest sprint debt I've seen at this stage of
a product).

### F4.4 [INFO] · `dangerouslySetInnerHTML` audit — 6 sites, all safe

```
src/lib/charSvg.ts (renderCharSVG primitives)        — server-built SVG strings; no user input
src/components/character/* (rpg avatar render)        — same primitives
src/app/layout.tsx inline-script for dark-mode bootstrap — string literal; no template
```

No site interpolates user input. All strings are either:
- compile-time constants;
- the dark-mode bootstrap script (literal, no `${...}` from any
  user-controlled source).

**Severity:** CLEAN. (Matches F2.9 follow-up.)

### F4.5 [→ F0.4] · CI continue-on-error — see Phase 0

Already documented as **F0.4 [MEDIUM]**. The Phase 0 finding owns
the fix; this entry retained as a Phase-4 cross-reference because
the fix sequence (1. flip tests-blocking, 2. after F4.1 flip
tsc-blocking, 3. flip eslint-blocking) is naturally a quality-gate
foundation-sprint item. **Severity here:** I'd argue HIGH not
MEDIUM — silent regression risk compounds with every PR. Either
way the fix is the same. Cross-track with F4.1 in the foundation
sprint.

### F4.6 [INFO] · Deploy workflow is single-line and stable

**File:** `.github/workflows/deploy.yml` — fires the Vercel deploy
hook on `push` to `main`. No secrets in the workflow file beyond
`VERCEL_DEPLOY_HOOK`. **Severity:** CLEAN.

---

## Phase 5 — Performance audit

### F5.1 [INFO] · Kill-list dependencies are confirmed absent

`package.json` has 19 deps and 16 devDeps. Confirmed **not** present:
- `html2canvas` ✓ removed
- `canvas-confetti` ✓ removed
- `framer-motion` ✓ never added
- `@react-spring/*` ✓ never added

The bundle-weight kill-list from earlier councils held. SVG +
native CSS animations + small canvas-based confetti
(`SessionCelebration.tsx` rolls its own ~50-line raf loop) handle
all motion needs.

**Severity:** CLEAN.

### F5.2 [INFO] · Reduced-motion guards are present at every animated surface

```
src/components/Splity.tsx:97         — bob skipped
src/components/SessionCelebration.tsx:184 — confetti raf early-return
src/components/plan/PlanPathSVG.tsx:22 — runner skipped
src/app/globals.css:478              — global @media block
src/app/onboarding/components/PlanGenerationScreen.tsx:174 — message cycling skipped
src/app/onboarding/ai/AIOnboardingClient.tsx:121 — analysis cycling skipped
```

WCAG 2.3.3 compliance is consistent across surfaces. The pattern
"`window.matchMedia('(prefers-reduced-motion: reduce)').matches`
early-return" is repeated 5 times — opportunity to extract a
`useReducedMotion()` hook (minor; F4.2 territory).

**Severity:** CLEAN.

### F5.3 [LOW] · `setInterval` audit — 8 sites, all justified

| File | Interval | Purpose | Reduced-motion guard |
|------|----------|---------|----------------------|
| `Splity.tsx:101` | 16ms (62.5Hz) | bob | ✓ |
| `FocusMode.tsx:37` | 1000ms | session timer | n/a (functional) |
| `coach/VoiceRecorder.tsx:78` | 1000ms | record timer | n/a (functional) |
| `gym/live/GymLiveClient.tsx:20` | n/a | rest timer | n/a (functional) |
| `today/hooks/useUndoCountdown.ts:48` | 1000ms | undo countdown | n/a (functional) |
| `onboarding/PlanGenerationScreen.tsx:178` | 1200ms | message cycle | ✓ |
| `onboarding/PlanGenerationScreen.tsx:179` | 160ms | progress fill | ✓ |
| `NudgeSquadPill.tsx:27` | 60_000ms | re-render gate | n/a |

The Splity 16ms interval is the only one near "high cost". It is
documented as intentional at the file header
(`Splity.tsx:10` — "62.5 Hz setInterval bob is a UX accent, worth
the frame cost") and is reduced-motion gated. CPU cost on mid-range
Android: low. **Severity:** CLEAN.

### F5.4 [LOW] · Bundle weight — Lighthouse audit script exists, run cadence is the gap

`scripts/lighthouse-audit.js` exists. No CI integration. The roadmap
(§7 Quality Bars row "Performance: Lighthouse ≥80 on Home/Train") is
asserted but not enforced. **Fix:** add a Vercel preview-comment
bot or a manual cadence (founder runs every Friday). **Effort:** S.

### F5.5 [INFO] · Database indexes — BL-X4/X5 applied

The marathon session's `phase-bl-x4-x5-indexes.sql` migration added
critical indexes on `training_logs(user_id, completed_at desc)`,
`squad_feed(squad_id, created_at desc)`, `community_progress
(user_id, week_n, day_i)`. These cover the hot paths for Today,
Squad, and community fan-out queries. **Severity:** CLEAN.

---

## Phase 6 — Testing + deploy-pipeline audit

### F6.1 [HIGH] · Test surface is thin: 3 unit + 3 e2e for a 250+ file app

```
src/lib/rpg.test.ts                   — character / level / badge logic
src/lib/statsUtils.test.ts            — stats rollups
src/lib/notifications.test.ts         — push payload shape
src/test/e2e/core-journey.spec.ts     — Playwright happy path
src/test/e2e/pre-alpha-gates.spec.ts  — pre-alpha gate suite
src/test/e2e/uat-full.spec.ts         — UAT expansion
```

Untested critical paths (highest blast radius):
- ACWR / VDOT logic (T7 domain — only validated by `statsUtils.test`)
- Push subscription lifecycle
- Squad feed insert/fan-out RPC
- Cron handlers (no test calls /api/cron/* with the bearer)
- Stripe webhook (no fixture-based tests)

**Severity:** HIGH (regression surface grows with every PR; F1
friend-testing is the only real safety net).
**Persona:** all (production reliability) but especially A,D
(domain math correctness).
**Fix:**
1. Add 3-5 more unit tests on the highest-risk libs:
   `acwr.ts`, `vdot.ts`, `referral.ts`, `streak.ts`.
2. Add e2e for: signup → onboarding → first log; coach signup →
   plan-author → assign-to-athlete; squad join → react → push.
3. Fix vitest infra (the "pre-exist" issue; F4.5 unblock).

**Effort:** M (2-3 days for the unit-test expansion; e2e is L).

### F6.2 [INFO] · Deploy is decoupled, recovers cleanly

`deploy.yml` is one curl. Vercel handles the rest. Hobby cron 2-fire
limit was learned (per ROADMAP / HANDOFF) and the smart-notify cron
piggy-backs P3.10's seasonal snapshot. The lesson is durable —
documented, encoded in `vercel.json`. **Severity:** CLEAN.

### F6.3 [MEDIUM] · No staging env

There's `localhost`, `*.vercel.app` previews per PR, and
`nextsplit.app` production. No persistent staging. Real users have
been shielded by **no real users** (pre-alpha). Once F1 friend-test
ships and the live test cohort is non-trivial, a staging branch with
its own Supabase project becomes much more valuable than a one-off
preview URL.

**Severity:** MEDIUM (foundation cost; deferrable until ~50 active
users).
**Fix:** spin up `staging.nextsplit.app` (Vercel branch deploy from
`develop` branch + a separate Supabase project). **Effort:** M.

---

## Phase 7 — Per-phase risk register

This collates findings against the 4 ROADMAP phases (§6). Each
phase has a top-3 risk + a "what blocks the next phase" line.

### Phase 0 — opening ideation + foundation cleanup
- **Status:** mostly done (op-ideation deferred until next major
  council window; ops items shipped piecemeal in PRs #1-12).
- **Top risks:**
  1. F4.1 stale types → compounding `as never` debt.
  2. F0.4 CI continues-on-error masking regressions.
  3. F0.1 redundant deploy.yml + F0.2 duplicate cron firings →
     deployment hygiene + Resend cost line.
- **What blocks Phase 1:** none — F1 device test (P1.6) is the
  remaining gate, and is non-code.

### Phase 1 — sharpen the device experience
- **Status:** P1.1 (squad nudges) shipped; P1.2 / P1.3 (brand
  consistency, character continuity) not yet started; P1.4
  de-dup pass in flight; P1.5 GDPR baseline at PECR done — ICO
  registration outstanding (F2.10).
- **Top risks:**
  1. F1 friend-test surfaces a new IA blocker → Phase 2.1 changes
     scope.
  2. F2.10 ICO registration blocks any coach-data feature in
     Phase 3 (already shipped — paying-coach path exposes us
     until ICO completes; founder-admin task).
  3. F2.2 nps_responses RLS hole exposes free-text feedback
     before any audit (drop-table / drop-policy).
- **What blocks Phase 2:** F1 friend-test outcome.

### Phase 2 — IA restructure + retention wiring
- **Status:** P2.3 referral loop shipped; P2.7 third-week experience
  shipped (Week3Reanchor); P2.1 IA shape held for F1 input; P2.2
  Profile split deferred; P2.4 lifecycle-email cohort run pending
  Resend domain.
- **Top risks:**
  1. ROADMAP §6 P2.1 IA decision shipped without F1 → recovery
     is a tab restructure (M effort) but kills any user mid-flight.
  2. F3.6 onboarding event-name drift across 3 paths → A/B
     analysis muddled.
  3. F2.8 CSP `unsafe-inline` + any new third-party widget
     compounds XSS risk.
- **What blocks Phase 3 retention proof:** P3.8 dashboards live
  (already done — admin/retention page); F0.3 admin gate
  (CRITICAL).

### Phase 3 — Coach Suite full build + retention proof
- **Status:** P3.1, P3.2, P3.3, P3.6, P3.10, P3.11, P3.12 shipped;
  P3.4 Revenue v2, P3.5 Athlete management bulk, P3.7 Coach
  onboarding overhaul, P3.8 dashboards live (admin/retention),
  P3.9 nudge effectiveness — partial.
- **Top risks:**
  1. **F0.3 admin/retention has no admin gate** — anyone with a
     login can see service-role-derived cohort data. CRITICAL.
  2. F3.3 AI surface fragmentation → cost spike at coach-tier
     onboarding.
  3. F4.1 stale types → coach plan-assign route used `as never`
     to ship; compounding risk on the coach surface where bugs
     hit paying users.
- **What blocks Phase 4:** retention bar (P4.0 gate from §6) +
  pre-paid security audit (P4.1, £500-2000 founder spend) +
  fixing the 3 CRITICAL findings.

### Phase 4 — revenue switch + scale
- **Status:** not yet entered. Pre-flip gate (P4.0) requires
  retention bar pass.
- **Top risks (forecast):**
  1. **F0.3 admin gate must be fixed** before anyone outside the
     founder sees the dashboard, because Phase 4 will publicise
     the URL.
  2. F2.2 nps_responses + F2.4 SECURITY DEFINER RPCs + F2.1 RLS
     verification all need to land before P4.1 pentest, or
     pentest scope balloons (the audit firm finds these in 1h
     and bills for it).
  3. F2.8 CSP widening invites XSS regressions during P4.3
     contextual-trigger UI work — every new banner is a CSP test.
- **What blocks v1.0 launch:** P4.0 retention gate + P4.1
  pentest + F0.3 fix + F2.1 / F2.2 / F2.4 fixes + ICO registration.

---

## Phase 9 — Integrations audit

### Current integrations

| Integration | Surface | Status | Notes |
|-------------|---------|--------|-------|
| **Anthropic Claude** | 9 routes under `/api/ai/*` | live | F3.3 — fragmented; needs central wrapper |
| **PostHog** | client + server | live | gated by cookie consent (PR #7); event taxonomy v1 in flight (Phase 0 OP4) |
| **Sentry** | feature-tagged | live | feature tags `p3.12-strava-oauth`, `bl-x8` etc. — alert rules need founder Sentry-side action |
| **Resend** | lifecycle emails + transactional | infra live | domain verification confirmation pending (F0.5) |
| **Stripe** | Connect (coach payouts) + checkout | deferred | live for coach onboarding test path; full Phase 3.7 / 4 work pending |
| **Web Push (VAPID)** | reaction / nudge / coach msg | live | iOS standalone gating works (PR #5) |
| **Supabase** | auth + DB + realtime + service-role | live | RLS audit ongoing (F2.1) |
| **Strava OAuth** | connect + sync | live | observability hardened in BL-X8 quick-wins; P3.12 done |
| **Vercel** | host + cron + analytics | live | Hobby cron 2-fire cap honoured |

### Opportunity map — integrations not yet present

These are not commitments. They are options for ROADMAP §9 backlog
intake.

1. **Garmin / Apple Health** — closes the persona-A logging-friction
   loop (auto-import). Cost: medium (Garmin Connect API auth pain).
   Persona: A. Trigger: when manual-log abandonment rate > 30%.
2. **Whoop / Oura** — adds recovery signal to ACWR. Cost: low (OAuth).
   Persona: A,D. Trigger: when domain-correctness team (T7) wants
   richer recovery input.
3. **Mailchimp / Customer.io** — replaces Resend for marketing
   automation if Resend stays a dev-side tool. Cost: medium. Trigger:
   when lifecycle-email cohort > 1k.
4. **Stripe Tax** — handles VAT for cross-border coach payments at
   Phase 4 scale. Cost: low (flag flip). Trigger: first non-UK
   paying coach.
5. **Discord / Slack webhooks** — squad chat on-platform deferred;
   webhook export to a server is a cheap "we ship the data" bridge.
   Cost: low. Persona: B,C,E.
6. **Mux / Cloudflare Stream** — coach video delivery if the Coach
   Suite Phase 3.6 marketplace adds video plans. Trigger: first
   coach who asks for a "explain my plan" video.

### Claude / Anthropic connector opportunities (specific)

- **Plan generation cost dashboard** — F3.3's wrapper feeds a
  PostHog group `(model, feature, user_tier)` event. Founder
  builds a board: £/feature/day, latency p95, error rate. This
  is the single most impactful 1-day improvement to the AI surface.
- **Prompt versioning** — store prompt strings in `src/lib/ai/
  prompts/` with semver. Lets the founder A/B prompt v1.1 vs v1.0
  on a slice of users.
- **Tool-use migration** — current routes run plain `messages.create`.
  For the coach digest and plan adaptation surfaces (where Claude
  needs structured output that today is parsed from prose),
  switching to tool-use cuts hallucination + parsing fragility.
  Effort: M per route; pays back on every prompt revision.

---

## Audit summary table — all findings ranked

| ID | Sev | Phase | Title | Effort |
|----|-----|-------|-------|--------|
| F2.1 | **CRITICAL** | 2 | RLS verification gap on 15+ core tables | M |
| F0.1 | HIGH | 0 | Session-9 redundant `deploy.yml` still on main | S |
| F0.2 | HIGH | 0 | lifecycle-emails fires twice daily; dead `/api/cron/notify` | M |
| F0.3 | HIGH | 0/3 | `/admin/retention` has no admin auth check | S |
| F2.2 | HIGH | 2 | `nps_responses` SELECT policy leaks across users | S |
| F2.4 | HIGH | 2 | older SECURITY DEFINER RPCs lack body-level caller validation | M |
| F4.1 | HIGH | 4 | `src/types/database.ts` stale by 5 migrations | S |
| F6.1 | HIGH | 6 | test surface thin: 3 unit + 3 e2e | M |
| F0.4 | MEDIUM | 0 | CI continues-on-error on tsc/eslint/tests | S |
| F0.5 | MEDIUM | 0 | files >500 lines beyond BL-X1/X2/X3 candidates | S |
| F2.8 | MEDIUM | 2 | CSP `unsafe-inline` + `unsafe-eval` on script-src | L |
| F3.3 | MEDIUM | 3 | AI fragmentation — 9 routes, no central wrapper | M |
| F6.3 | MEDIUM | 6 | no staging env | M |
| F0.6 | LOW | 0 | `.gitignore` minimal coverage | S |
| F2.5 | LOW | 2 | aiRateLimit anon-key fallback foot-gun | S |
| F2.9 | LOW | 2 | `dangerouslySetInnerHTML` audit (see F4.4) | — |
| F3.2a | LOW | 3 | trophy-room / squad-members ad-hoc tier check | S |
| F3.6 | LOW | 3 | onboarding event-name drift across 3 flows | S |
| F4.2 | LOW | 4 | `: any` count = 120; hotspots | M |
| F5.3 | LOW | 5 | `setInterval` audit — all justified | — |
| F5.4 | LOW | 5 | Lighthouse cadence not enforced | S |
| F0.7 | INFO | 0 | env-var inventory matches HANDOFF | — |
| F1.x | INFO | 1 | reconnaissance details (see Phase 1 section) | — |
| F2.3 | INFO | 2 | `group_coaching_sessions` SELECT-public — intentional | — |
| F2.6 | INFO | 2 | service-role usage clean (no client leak) | — |
| F2.7 | INFO | 2 | CRON_SECRET coverage clean (4/4 routes) | — |
| F2.10 | INFO | 2 | ICO registration pending (founder-admin) | — |
| F3.1 | INFO | 3 | server-action pattern consistent | — |
| F3.2 | INFO | 3 | premium-gating refactor clean | — |
| F3.4 | INFO | 3 | mascot continuity holds at data layer | — |
| F3.5 | INFO | 3 | council/forge tooling intact (23 personas on disk) | — |
| F4.3 | INFO | 4 | TODO/FIXME/HACK clean (4 marked TODOs, all P1.x) | — |
| F4.4 | INFO | 4 | `dangerouslySetInnerHTML` clean (6 sites, all SVG primitives) | — |
| F4.5 | INFO | 4 | cross-ref to F0.4 (CI continue-on-error) | — |
| F4.6 | INFO | 4 | deploy workflow single-line and stable | — |
| F5.1 | INFO | 5 | kill-list deps absent (html2canvas/canvas-confetti/framer/spring) | — |
| F5.2 | INFO | 5 | reduced-motion guards present at every animated surface | — |
| F5.5 | INFO | 5 | DB indexes BL-X4/X5 applied | — |
| F6.2 | INFO | 6 | deploy decoupled / recoverable | — |

**Critical-track items (must fix before any external traffic beyond
F1):**
- F2.1 RLS verification (deliver the SQL audit + cross-account test)
- F0.3 admin gate (already noted twice; should be a 10-minute fix)
- F2.2 nps_responses leak (drop the over-broad SELECT policy)

**High-track items (must fix before paywall flip):**
- F0.1 delete redundant `deploy.yml`
- F0.2 consolidate cron firings + delete dead notify route
- F2.4 SECURITY DEFINER body audit (coach earnings + can_nudge)
- F4.1 regenerate `database.ts`
- F6.1 add unit tests on T7 domain libs (`acwr.ts`, `vdot.ts`,
  `referral.ts`, `streak.ts`)

**Total findings:** 39 (1 critical, 7 high, 5 medium, 8 low, 18 info).
The product is in good shape for pre-alpha. The critical-track is
small (1 item — F2.1 — plus two HIGH items that read like
criticals to a pentester: F0.3 and F2.2). High-track is also
small and shippable in a 2-3 day **foundation sprint** between F1
and Phase 4. Info-track shows the marathon session's discipline:
service-role usage, cron-auth coverage, motion guards,
dangerouslySetInnerHTML, kill-list dependencies, premium gating,
character-continuity, server-action pattern — all clean.
