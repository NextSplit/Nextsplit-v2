# NextSplit — Master Handoff
**Version:** 9.24 | **13 May 2026** | **Canonical — replaces all previous HANDOFF files**
<!-- 9.24: PR J17 — Upstash Redis rate-limit fast-path + hot-read cache helper. Background: `checkAndIncrementAIUsage` did 3 round-trips to Supabase per AI call (tier lookup + upsert + read total + potentially rollback) — ~50-100ms of DB latency per call before the model was even invoked. Replaced with: Upstash `Ratelimit.slidingWindow(limit, '24h')` for the rate-limit decision (sub-ms via Upstash REST). The `ai_usage` row upsert becomes fire-and-forget for cost attribution (still hits DB but no longer blocks the response). Graceful no-op when env not set: `isRedisConfigured()` checks for both `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`; if either is missing, the code falls through to the original DB-only path unchanged. New `src/lib/redis.ts` carries the singleton; new `src/lib/cache.ts` adds a `cachedRead<T>(key, ttlSec, loader)` helper for future hot-read caching (leaderboard top-N, daily-race entrants, PostHog feature-flag evals). Deps: `@upstash/redis` + `@upstash/ratelimit`. Type-check clean. **Founder action (J17)**: register at upstash.com (free tier 10k cmd/day), create a Redis instance in `eu-west-1` (matches Supabase EU region), add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` to Vercel Production + Preview. Until then the code runs the DB-only path — no regression. **Next**: PR J14 — Inngest cron migration (will also pause for founder action: Inngest registration + env vars). -->
<!-- 9.23: PR J10 — PostHog unlock (session replay + feature flags + admin funnel launcher). PostHog was already wired with PECR-compliant consent gating (PR P1.2) and an AARRR taxonomy in `src/lib/analytics.ts`. J10 closes the last three gaps: (1) **Session replay sampling** — `PostHogProvider.tsx` init now passes `session_replay_sample_rate` (default 10%, override via `NEXT_PUBLIC_POSTHOG_REPLAY_SAMPLE_RATE`). Existing PII mask config (`maskAllInputs: true`) stays untouched. Note: server-side toggle in PostHog Project Settings → Session Replay must also be ON; client sampling alone won't record. (2) **Feature-flag hook** — new `src/hooks/useFeatureFlag.ts` wraps PostHog's `useFeatureFlagEnabled` with two guarantees: returns false until flag loads (avoids first-render flicker) + reads `NEXT_PUBLIC_FF_<NAME>` env override (lets us toggle a flag from Vercel without dashboard access — useful during smoke-testing). Naming convention: snake_case, namespace by feature (e.g. `character_3d_v1`, used by J9b later). (3) **`/admin/funnels` page** — admin-gated launcher into PostHog. PostHog dashboards require org-level auth and can't be iframed without sharing tokens, so this page is a reference index of the 5 AARRR funnel groups (Acquisition / Activation / Retention / Revenue / Referral) plus 4 launcher cards (Insights / Dashboards / Replays / Flags) that deep-link into the PostHog UI when `NEXT_PUBLIC_POSTHOG_PROJECT_URL` is set. Linked from /admin/health (new "Funnels" header link). **Founder actions (J10)**: (a) toggle Session Replay ON in PostHog Project Settings → Session Replay; (b) set `NEXT_PUBLIC_POSTHOG_PROJECT_URL` on Vercel (e.g. `https://eu.posthog.com/project/12345`) for the launcher links; (c) optionally pre-create the `character_3d_v1` feature flag in PostHog (will be referenced by PR J9b later — flag defaults to false = SVG fallback, set to true to enable 3D character). Type-check clean. **Next**: PR J17 — Upstash rate-limit + hot-read cache. -->
<!-- 9.22: PR J7 — regenerated `src/types/database.generated.ts` against live Supabase schema via `mcp__supabase__generate_typescript_types`. File was last refreshed by PR #14 (May 8); 4 migrations applied since then plus today's `phase-advisor-findings-v1.sql` left it stale. New snapshot covers 110 tables/views/RPCs (was 12 in the hand-rolled `src/types/database.ts`). The two files now follow a **dual-file convention**: `database.ts` is hand-rolled and the source of truth for call sites (carries literal-union enums like `experience: 'beginner' | 'intermediate' | 'advanced'` that the generated file flattens to `string`); `database.generated.ts` is the full live snapshot used to spot drift, not imported. `scripts/gen-types.sh` rewritten to output to the generated file (was previously CLOBBERING the hand-rolled file — silent risk). New `npm run types:gen` alias. Drift-check workflow: after each migration, run `npm run types:gen`, `git diff src/types/database.generated.ts` to spot new columns/tables, then hand-update `database.ts` only for the bits call sites need typed access to. Type-check clean across the codebase. **Next**: PR J10 — unlock PostHog session replay + feature flags. -->
<!-- 9.21: PR J2 — prompt caching rolled out to the remaining 8 AI endpoints. /api/ai/fuel was the only previously-cached endpoint (PR C2); the rest (`coach`, `coach-digest`, `weekly-summary`, `pre-race-brief`, `recommend`, `suggestions`, `adapt-plan`, `generate-plan`) all paid full $3/M input rate per call. Each endpoint gained: (a) a hoisted `SYSTEM_PROMPT` constant carrying the role + style guide + response schema (the stable content); (b) for endpoints with stable per-call context (coach: athlete context; coach-digest: athlete profile; weekly-summary: athlete training data), a SECOND cached system block carrying that block; (c) variable per-call content (the specific ask, the analysisData payload, the race context, etc.) moved to the user `messages` array. Both system blocks tagged `cache_control: { type: 'ephemeral' }`. Each `recordTokenUsage` call extended to pass `cache_read_input_tokens` + `cache_creation_input_tokens` so `/admin/ai-cost` attributes spend correctly (PR I2 schema already supported these; only `/api/ai/fuel` was passing them prior to J2). Net behaviour: the model receives the same total context; cache hits on the 2nd+ call within ~5min hit $0.30/M (10× cheaper than standard $3/M input). Highest expected savings: `coach` + `coach-digest` + `weekly-summary` which share recently-cached athlete context across a session. Caveat: `recommend` SYSTEM_PROMPT is small (~600 chars) — may not meet Anthropic's 1024-token minimum for cache creation, in which case the API just doesn't cache (no error). Type-check clean across all 8 routes. **Verification**: after PR deploy, call any endpoint twice with same inputs within 5min — second call's `cache_read_input_tokens` should be > 0 in /admin/ai-cost. **Next**: PR J7 — regenerate Supabase database types (close the manual `src/types/database.ts` drift). -->
<!-- 9.20: PR J1 — Supabase advisor sweep + /admin/health DB-linter card. First step of the J-series (17 PRs across 5 phases — see /root/.claude/plans/root-claude-uploads-1293c024-d8ff-4877-quizzical-knuth.md). One-shot advisor run via mcp__supabase__get_advisors returned 78 security + 330 performance findings. Two real RLS leaks fixed in migration `phase-advisor-findings-v1.sql` (applied live to wlrmeiczqgmharvfmalq): (1) `bug_reports` — SELECT policy was `{public} USING(true)` letting ANY caller read every bug report (URL + UA + message PII); INSERT policy was `{public} WITH CHECK(true)` letting any caller forge `user_id` of another user. Replaced with: SELECT removed (service_role-only by default); INSERT split into `authenticated WITH CHECK (user_id = auth.uid())` + `anon WITH CHECK (user_id IS NULL)`. (2) `plan_templates` — "Authenticated bump counters" UPDATE policy was `{authenticated} USING(true) WITH CHECK(true)` letting any authenticated user overwrite `weeks_data` / `name` / `price_gbp` of any template. Dropped; counter bumps now route through two new SECURITY DEFINER RPCs `bump_plan_template_starts(uuid)` + `bump_plan_template_completions(uuid)` with `auth.uid() IS NOT NULL` guard + `SET search_path = public, pg_temp` per F2.4 hardening pattern. Two callers updated (`src/app/api/marketplace/purchase/route.ts` + `src/app/api/coach/plans/assign/route.ts`) to call the RPC instead of direct UPDATE. (3) `cron_runs` — RLS-enabled-no-policy INFO finding documented via COMMENT (intentional: service_role-only by design). Post-migration advisor re-run confirms `rls_policy_always_true` count went 2→0. New `src/lib/advisorSnapshot.ts` snapshots all counts at 2026-05-13 (last_run); render workflow documented in-file (refresh via MCP, update file, commit). `/admin/health` HealthDashboard.tsx gained a "DB linter" card showing security/performance totals with WARN counts, expand-on-tap breakdown by lint name, plus a founder-action card surfacing the one remaining auth setting (`auth_leaked_password_protection` — toggle in Supabase Auth dashboard → Project Settings → Auth → Password Security). Type-check clean. **Founder action item (J1)**: enable HaveIBeenPwned leak protection in Supabase Auth dashboard. **Next**: PR J2 — prompt caching rollout to the remaining 8 AI endpoints. -->
<!-- 9.19: Rolls up PRs #83 (PR E follow-ons) + #84 (PR F nutrition extensions) + PR G (this PR — code polish + production bug fix). **PR #83 merged** as commit `38c9fdf` — 5 commits in one bundle: HANDOFF v9.18 capsule, confetti trim (SessionCelebration ↔ CharacterStatToast coordinate via `nextsplit:celebration-shown` / `-dismissed` events so the toast holds while celebration is mounted), session-type-aware default RPE (easy=4/steady=6/tempo=7/threshold=8/race=9/recovery=3 — was a flat 7), settings audit (Account moves above coach sections; "Coach Access" → "Work with a coach"; "Squad & Coaching" → "Become a coach"), /you renamed "Your stats" with subtitle "XP · badges · weekly progression", unified `<AppHeader />` component applied to /race /you /squad (skipped /home /train /settings for structural reasons), `meal_plan_entries` freeform migration (recipe_id NULLABLE + 5 snapshot columns + CHECK), new `AssignMealModal` with recipes/freeform tabs wired into the previously-inert FuelDailyView "Assign" button. **PR #84 merged** as commit `94fabcd` — 3 nutrition-planner-v2 extensions: NutritionSettings cloud sync (`profiles.nutrition_settings jsonb` migration; `useNutritionSettings` rewritten as cloud-authoritative with localStorage offline cache + first-run migration of pre-F1 localStorage data to cloud), recipe seed expansion 8→18 (added eggs/porridge breakfast, tuna pasta/halloumi wrap lunch, beef stir-fry/chickpea curry dinner, bagel race-morning, apple+almond pre-easy snack, cottage cheese pre-bed, aglio e olio carb-load; auto-seed wired into both RecipeLibraryClient and AssignMealModal — RLS-scoped per user), voice-first AI Fuel Coach via new `useVoiceInput` hook wrapping Web Speech API (Chrome/Safari/Edge supported; Firefox gracefully unsupported; en-GB default). **PR G — this PR (in progress)** — 4 code-polish items: (G1) /home unified under AppHeader after extending the title prop to `ReactNode` (Splity in leadSlot, stacked greeting + brand mark as title, Settings cog in rightSlot, XPHeaderBar in bottomSlot); (G2) new `/admin/ai-cost` dashboard reading the `ai_usage` table with daily breakdown + top users + per-feature aggregation + 30d cost projection using Sonnet 4.6 list pricing ($3/M input · $15/M output, cache-hit discount not factored — slightly over-counts); `/api/ai/fuel` now records token usage via `recordTokenUsage` so the dashboard attributes its spend (most other AI endpoints still don't — follow-on); admin gate matches /admin/retention pattern (ADMIN_EMAILS env-allowlist on auth.users.email). (G3) **Real production bug found + fixed during Pre-Load Nudge cron behavioural test**: `public.notifications` table never existed despite being referenced by `src/app/api/cron/smart-notify/route.ts:299` (INSERT) and `src/hooks/useNotifications.ts:62` (SELECT). Every cron fire since the Fueling Moments pivot (PR #80, 11 May 2026) has silently failed at the inserting step — the F0.2 zero-send Sentry alert never fired because `toNotify.length` was 0 (no eligible users in a 9-user prod cohort hit the run-long/tempo/int/mp/race threshold for tomorrow). Sentry org `nextsplot` shows zero issues across last 7 days, confirming nothing tripped. Applied migration `phase_notifications_table_v1` to live Supabase `wlrmeiczqgmharvfmalq`: created `public.notifications` (id PK · user_id FK to auth.users CASCADE · type · title · body · data jsonb · read bool · created_at) + partial index `(user_id, created_at DESC) WHERE read = false` + RLS policies (`users read own notifications` SELECT auth.uid()=user_id; `users mark own notifications as read` UPDATE same predicate). INSERTs come from service-role bypassing RLS so no INSERT policy needed. Updated `src/types/database.ts` with the new Tables.notifications definition. (G4) this HANDOFF v9.19 capsule. **Production state at PR G time**: PR #84 prod deploy `dpl_6JcKt2dqdRZS14MXA2kBdDLvUhVc` (commit `94fabcd`, target=production, state=READY) — zero error/fatal runtime logs in 1h pre-PR-G; Sentry zero unresolved issues. Two migrations applied this PR G + carryover (4 total in the last week from screenshot audit cycle: `phase_meal_plan_entries_freeform_v1` (PR E5), `phase_profiles_nutrition_settings_v1` (PR F1), `phase_notifications_table_v1` (PR G3)). **Verification owed**: founder still owes Android Chrome smoke-test for PRs #82/#83/#84 + visual confirm of /home AppHeader hydration; next 14:00 UTC cron fire (today) should land actual notification rows now the table exists — confirm via `SELECT * FROM public.notifications WHERE created_at > now() - interval '24h' ORDER BY created_at DESC` after the fire. **Founder admin RED carryover unchanged**: ICO registration £40, Companies House, STRAVA_CLIENT_ID + STRAVA_CLIENT_SECRET on Vercel Production, delete VERCEL_DEPLOY_HOOK GitHub repo secret. **Next dev block**: F1 friend test reopening still gates Phase 4 paywall flip; remaining nice-to-haves (cache-hit cost breakdown in ai-cost, recordTokenUsage rollout across remaining AI endpoints, ai_usage feature tagging, /settings AppHeader unification) are non-blocking polish. -->
<!-- 9.18: PR #82 MERGED to main as commit `c2a0dd7` (13 May 2026, 5 commits in one branch `claude/verify-pr80-production-KblEH`). Production-screenshot UX audit close-out across 5 sequential commits. Started from 16 production screenshots covering /home /train /race /squad /you /you/inv /settings — diagnostic split into 6 P0 bugs + 3 buried-code surfaces + visual identity gaps + nutrition rebuild. Founder fork: Fuel = full nutrition planner v2 · /race = character + races · sequential PR shape A→B→D→C1→C2. **Commit A (`64b9d5e` fix(pr-a)): 6 P0 UX bugs** — (1) CharacterStatToast: tap-to-dismiss + coalesce-within-200ms + 2.5s duration + queue cap 2 (was 4.4s × N stacking on rapid events, persisted across 8+ screen navigations); (2) HomeHeroes.HeroTraining: outer `<Link href="/train">` wrap removed — CTA now `/train?logToday=1` auto-opens log modal for today's first unfinished session via new `useSearchParams` effect in TrainClient; (3) cross-route log invalidation: new `nextsplit:training-log-changed` CustomEvent dispatched from `useTrainingLog.logSession`, subscribed by `useAllTrainingLogs` — /home today-card flips to new `HeroTrainingDone` (green ✓ · tomorrow preview · streak emoji) immediately after log resolves on /train without route reload; (4) BottomNavWrapper: APP_PATHS gained `/race` (singular) — was only `/races` (plural, redirects /dashboard); (5) XPHeaderBar: day-1 users (no plan/XP/streak) now render a single "🚀 Build your first plan →" CTA pill instead of the dead streak/progress/level triple; (6) TrainClient: week-completion auto-advance via new `lastAdvancedWeekRef`-guarded useEffect that fires `advanceWeek()` when ALL current-week non-rest sessions are done — was only firing on final-week completion, so plan.current_week froze at 1/20 forever. **Commit B (`831622a` feat(pr-b)): /race rehome** — /race RaceClient.tsx full rewrite (88 LOC → 360 LOC) mounting character (HeroCard moved from /you) + BuildClassCard (moved from /you) + cosmetics teaser (moved from /you) + daily 5K race card (kept) + race replay (kept) + season+league chip (moved from /squad SquadDiscoverSection) + virtual races list (moved from /squad) + global leaderboard (moved from /squad) + CharacterProfileModal mount (followed leaderboard). /squad SquadDiscoverSection.tsx reduced 572→306 LOC: deleted LEAGUE_CONFIG + season card + races section + leaderboard section + enterRace/fmtTime helpers + CharacterProfileModal; added single "🏁 Races + leaderboard now live on /race →" link card. /you YouClient.tsx reduced 257→192 LOC: deleted HeroCard + BuildClassCard + Inventory link + useActiveCosmetics + charId/kitColour state + heroDisplayName/charState/medal; added single "🏃 Your runner is now on /race →" link card. Net effect: every gamified surface that culminates in "compete" lives on /race; /you reduces to pure stats; /squad Discover reduces to pure community (feed/clubs/challenges). **Commit D (`cac4060` style(pr-d)): visual identity pass** — applied pale-cream gradient + soft-shadow pattern to DailyQuests (when 0<doneCount<total), HomeChrome.SquadMini (gradient on squad's own colour), HomeNudges.CoachNudge (violet gradient), HomeNudges.SquadNudge (track-green gradient). Wrapped /race HeroCard in 2px gradient ring tinted by active kit_colour (inherits HeroTraining pattern). Skipped from PR D plan: unified AppHeader across /home/train/race/squad/you/settings (high risk, low ROI in same session) + pale-cream on season pill (already league-coloured). **Commit C1 (`4286da9` feat(pr-c1)): Nutrition Planner v2 foundation** — PR #80 deleted ~1602 LOC nutrition stack; this rebuilds the foundation layer. `src/lib/nutrition.ts` extended (kept existing day-type/calorie module untouched): new NutritionSettings shape (weight/height/age/sex/activity/goal) + Mifflin-St Jeor BMR + activity-multiplier TDEE + goal-aware macro split (cut: 35P/30F · maintain: 25/30 · build: 25/25) + per-session-type fuel hints (8 codes: easy/steady/tempo/threshold/intervals/long/race/rest with pre-run carbs + post-run protein targets + note) + DEFAULT_MEAL_SLOTS template (breakfast/pre-run/lunch/post-run/dinner with % of daily calories). `src/hooks/useNutritionSettings.ts` new: localStorage-only under `nextsplit_nutrition_settings_v1` (no DB migration in C1 scope — cloud sync is C1-followon when founder wants cross-device parity). `src/components/nutrition/TDEESetupCard.tsx` new: single-form intake (3-up number row weight/height/age + sex chip + 5-row activity radio + goal chip) with live preview of computed calories + P/C/F. Validates 30-250kg, 120-230cm, 13-99yo. Pale-cream golden surface. `src/components/nutrition/FuelDailyView.tsx` new: top pale-cream daily target card (calories + P/C/F macro pills) + session-aware fuel hint card when today has non-rest session + 5-slot meal stack with per-slot calorie share. Assign button intentionally inert in C1 (recipe + assignment ship in C2). `src/app/train/TrainFuelTab.tsx` rewritten 27→55 LOC: three modes (pre-setup TDEESetupCard prompts / editing pre-filled / set FuelDailyView). Race-week FuelPlanCard from PR #80 still mounts ABOVE the daily view when planDay.nut events are present — race-week specific cues stay surfaced when relevant. **Commit C2 (`05d2245` feat(pr-c2)): Nutrition AI Coach + Recipe library** — `src/app/api/ai/fuel/route.ts` new POST endpoint inputs question + NutritionSettings + targets + optional today-session metadata, outputs one short paragraph plan-aware fuel advice. Model claude-sonnet-4-6, prompt caching on system prompt + profile/targets block (both stable across follow-up turns; cuts output cost on repeat questions). Rate-limited via existing checkAndIncrementAIUsage middleware. NOT Pro-gated (founder said dog-food in pre-alpha first). `src/lib/schemas.ts` extended with AiFuelCoachSchema (zod). `src/components/nutrition/AIFuelCoach.tsx` new: input + Ask button + 5 quick-question chips covering highest-frequency asks (pre-run breakfast, recovery meal, protein adequacy, carb-load week, etc.); renders AI answer inline; surfaces rate-limit + network errors. Mounted in TrainFuelTab below FuelDailyView when settings are set. `src/app/train/fuel/recipes/page.tsx` + `RecipeLibraryClient.tsx` new: reads user's own recipes from the `recipes` DB table (left intact by PR #80) + empty state + quick-add form (name + kcal + P/C/F → POST insert via db(supabase)). Read-only display. Meal-slot assignment is intentionally deferred — needs a DB migration to extend meal_plan_entries with macro snapshots + a redesign of the FuelDailyView assign button. That ships in C2-followon. `src/app/train/TrainFuelTab.tsx` extended: mounts AIFuelCoach + a Link card to /train/fuel/recipes below the existing FuelDailyView when settings are set. Deferred from PR C2 plan (founder follow-on): AssignMealModal full DB-integration (needs migration) · Voice-first option via Web Speech API · Recipe seed dataset (~20 recipes; founder owns this) · Anthropic cost cap dashboard. Database delta in PR #82: zero (all new tables/columns deferred). Type-check clean across the merged branch. Smoke-test on Vercel preview deployment still owed by founder on Android Chrome (auth-gated paths). **Follow-on PR E in progress this session** (E1 = this HANDOFF v9.18 capsule, E2 = confetti trim + log-session friction reduction, E3 = settings audit + /you slim, E4 = unified AppHeader across tabs, E5 = AssignMealModal + meal_plan_entries DB migration to wire the inert "Assign" button from FuelDailyView). Next dev block after PR E: founder smoke-test sign-off on PR #82, then F1 friend test reopening. -->
<!-- 9.18: PR #82 MERGED to main as commit `c2a0dd7` (13 May 2026, 5 commits in one branch `claude/verify-pr80-production-KblEH`). Production-screenshot UX audit close-out across 5 sequential commits. Started from 16 production screenshots covering /home /train /race /squad /you /you/inv /settings — diagnostic split into 6 P0 bugs + 3 buried-code surfaces + visual identity gaps + nutrition rebuild. Founder fork: Fuel = full nutrition planner v2 · /race = character + races · sequential PR shape A→B→D→C1→C2. **Commit A (`64b9d5e` fix(pr-a)): 6 P0 UX bugs** — (1) CharacterStatToast: tap-to-dismiss + coalesce-within-200ms + 2.5s duration + queue cap 2 (was 4.4s × N stacking on rapid events, persisted across 8+ screen navigations); (2) HomeHeroes.HeroTraining: outer `<Link href="/train">` wrap removed — CTA now `/train?logToday=1` auto-opens log modal for today's first unfinished session via new `useSearchParams` effect in TrainClient; (3) cross-route log invalidation: new `nextsplit:training-log-changed` CustomEvent dispatched from `useTrainingLog.logSession`, subscribed by `useAllTrainingLogs` — /home today-card flips to new `HeroTrainingDone` (green ✓ · tomorrow preview · streak emoji) immediately after log resolves on /train without route reload; (4) BottomNavWrapper: APP_PATHS gained `/race` (singular) — was only `/races` (plural, redirects /dashboard); (5) XPHeaderBar: day-1 users (no plan/XP/streak) now render a single "🚀 Build your first plan →" CTA pill instead of the dead streak/progress/level triple; (6) TrainClient: week-completion auto-advance via new `lastAdvancedWeekRef`-guarded useEffect that fires `advanceWeek()` when ALL current-week non-rest sessions are done — was only firing on final-week completion, so plan.current_week froze at 1/20 forever. **Commit B (`831622a` feat(pr-b)): /race rehome** — /race RaceClient.tsx full rewrite (88 LOC → 360 LOC) mounting character (HeroCard moved from /you) + BuildClassCard (moved from /you) + cosmetics teaser (moved from /you) + daily 5K race card (kept) + race replay (kept) + season+league chip (moved from /squad SquadDiscoverSection) + virtual races list (moved from /squad) + global leaderboard (moved from /squad) + CharacterProfileModal mount (followed leaderboard). /squad SquadDiscoverSection.tsx reduced 572→306 LOC: deleted LEAGUE_CONFIG + season card + races section + leaderboard section + enterRace/fmtTime helpers + CharacterProfileModal; added single "🏁 Races + leaderboard now live on /race →" link card. /you YouClient.tsx reduced 257→192 LOC: deleted HeroCard + BuildClassCard + Inventory link + useActiveCosmetics + charId/kitColour state + heroDisplayName/charState/medal; added single "🏃 Your runner is now on /race →" link card. Net effect: every gamified surface that culminates in "compete" lives on /race; /you reduces to pure stats; /squad Discover reduces to pure community (feed/clubs/challenges). **Commit D (`cac4060` style(pr-d)): visual identity pass** — applied pale-cream gradient + soft-shadow pattern to DailyQuests (when 0<doneCount<total), HomeChrome.SquadMini (gradient on squad's own colour), HomeNudges.CoachNudge (violet gradient), HomeNudges.SquadNudge (track-green gradient). Wrapped /race HeroCard in 2px gradient ring tinted by active kit_colour (inherits HeroTraining pattern). Skipped from PR D plan: unified AppHeader across /home/train/race/squad/you/settings (high risk, low ROI in same session) + pale-cream on season pill (already league-coloured). **Commit C1 (`4286da9` feat(pr-c1)): Nutrition Planner v2 foundation** — PR #80 deleted ~1602 LOC nutrition stack; this rebuilds the foundation layer. `src/lib/nutrition.ts` extended (kept existing day-type/calorie module untouched): new NutritionSettings shape (weight/height/age/sex/activity/goal) + Mifflin-St Jeor BMR + activity-multiplier TDEE + goal-aware macro split (cut: 35P/30F · maintain: 25/30 · build: 25/25) + per-session-type fuel hints (8 codes: easy/steady/tempo/threshold/intervals/long/race/rest with pre-run carbs + post-run protein targets + note) + DEFAULT_MEAL_SLOTS template (breakfast/pre-run/lunch/post-run/dinner with % of daily calories). `src/hooks/useNutritionSettings.ts` new: localStorage-only under `nextsplit_nutrition_settings_v1` (no DB migration in C1 scope — cloud sync is C1-followon when founder wants cross-device parity). `src/components/nutrition/TDEESetupCard.tsx` new: single-form intake (3-up number row weight/height/age + sex chip + 5-row activity radio + goal chip) with live preview of computed calories + P/C/F. Validates 30-250kg, 120-230cm, 13-99yo. Pale-cream golden surface. `src/components/nutrition/FuelDailyView.tsx` new: top pale-cream daily target card (calories + P/C/F pills) + session-aware fuel hint card when today has non-rest session + 5-slot meal stack with per-slot calorie share. Assign button intentionally inert in C1 (recipe + assignment ship in C2). `src/app/train/TrainFuelTab.tsx` rewritten 27→55 LOC: three modes (pre-setup TDEESetupCard prompts / editing pre-filled / set FuelDailyView). Race-week FuelPlanCard from PR #80 still mounts ABOVE the daily view when planDay.nut events present. **Commit C2 (`05d2245` feat(pr-c2)): Nutrition AI Coach + Recipe library** — `src/app/api/ai/fuel/route.ts` new POST endpoint inputs question + NutritionSettings + targets + optional today-session metadata, outputs one short paragraph plan-aware fuel advice. Model claude-sonnet-4-6, prompt caching on system prompt + profile/targets block (both stable across follow-up turns; cuts output cost on repeat questions). Rate-limited via existing checkAndIncrementAIUsage middleware. NOT Pro-gated (founder said dog-food in pre-alpha first). `src/lib/schemas.ts` extended with AiFuelCoachSchema (zod). `src/components/nutrition/AIFuelCoach.tsx` new: input + Ask button + 5 quick-question chips covering highest-frequency asks (pre-run breakfast, recovery meal, protein adequacy, carb-load week, etc.); renders AI answer inline; surfaces rate-limit + network errors. Mounted in TrainFuelTab below FuelDailyView when settings are set. `src/app/train/fuel/recipes/page.tsx` + `RecipeLibraryClient.tsx` new: reads user's own recipes from `recipes` DB table (left intact by PR #80) + empty state + quick-add form (name + kcal + P/C/F → POST insert via db(supabase)). Read-only display. Meal-slot assignment is intentionally deferred — needs migration to extend `meal_plan_entries` with macro snapshots + redesign of FuelDailyView assign button (PR E5 incoming). Visual system: confirmed bold/bright base intact; pale-cream pattern now used in 4 new places. Database deltas in PR #82: zero (all new tables/columns deferred). Type-check clean across the merged branch. Smoke-test on Vercel preview deployment still owed by founder on Android Chrome (auth-gated paths). **Follow-on PR E in progress this session** (E1 = this HANDOFF v9.18 capsule, E2 = confetti trim + log-session friction reduction, E3 = settings audit + /you slim, E4 = unified AppHeader across tabs, E5 = AssignMealModal + meal_plan_entries DB migration to wire the inert "Assign" button from FuelDailyView). Next dev block after PR E: founder smoke-test sign-off on PR #82, then F1 friend test reopening. -->
<!-- 9.17: PR #80 prod-verification debt partially closed. Vercel MCP token rotated since v9.16 — now scoped to NextSplit team (`team_C7COgxDlzndSCNtv6bGNENPF`). `list_deployments`, `get_deployment`, `get_runtime_logs`, `web_fetch_vercel_url`, `get_access_to_vercel_url` all working. Confirmed: current prod = commit `135c34e` (PR #81 merge, `target: production`, `state: READY`); PR #80's `474d232` is the prior READY production deploy (one-click rollback target). Zero `error`/`fatal` runtime logs across serverless / edge / middleware in the 23.5h since deploy. All 7 PR #80 routes (`/community` → `/squad?tab=discover` / `/squad?tab=mine` / `/explore` / `/coach` / `/home` / `/train` / `/plan?tab=fuel`) respond cleanly under the auth gate — every unauthenticated probe redirects to `/auth/login` server-side (status 200, `x-matched-path: /auth/login`), no 5xx anywhere, middleware loads without crashing on any path. Visual system intact on login render (`--ns-cyan` / `--ns-ember` / `--color-bg` vars + dark-mode inline script). **Still owed:** authenticated render of R1 tab strip + Discover sections, R2 6 extracted coach sections + home hero states + train session card, A2 1-banner cap (ACWR vs Gap winner), Fueling `RaceWeekFuelCard` 0/3/7-day windows — `web_fetch_vercel_url` only defeats Vercel platform auth, not the app-level Supabase auth gate, so sandbox can't mint a session. 5-min manual smoke-test on Android Chrome as test account remains owed. Pre-Load Nudge cron still untested behaviourally — `get_runtime_logs` on next 14:00 UTC fire is now reachable from this MCP since the token rotated. **MCP state supersedes v9.16:** Vercel MCP ✅ working; GitHub MCP ✅ unchanged; Supabase MCP ⚠️ still loaded-but-not-exercised; curl-WAF-403 finding obsolete (use `web_fetch_vercel_url` instead). Doc-only change. Next dev block unchanged: Phase 4 entry gate. -->
<!-- 9.16: Track 1 close-out PR #80 MERGED to main as commit `474d232` at 12:54 UTC. 10 commits, 4 workstreams, 53 files, +2,950 / −4,283 (net −1,333 lines). CI was green (TypeScript + ESLint + Tests + Vercel Preview Comments). What landed: (R1) `/explore` stripped to 3-card landing hub + `/community` resurrected as `/squad?tab=discover` with `?tab=` URL-param sync + `/community/page.tsx` now redirects to `/squad?tab=discover`. (R2) god-component decomp across 3 client files — CoachDashboardClient 762→183 LOC (-76%), HomeClient 843→254 LOC (-70%), TrainClient 911→607 LOC (-33%); 19 new components lifted into `src/components/coach/*`, `src/app/home/*`, `src/app/train/*`. (A2) Train banner cascade caps stack at one (ACWR > Gap priority). (Fueling Moments) `/nutrition` route + 11 components + AI fuel-coach API + nutritionUtils deleted (~1,602 LOC); `RaceWeekFuelCard` lives on /plan fuel tab; Pre-Load Nudge slot added to smart-notify cron as new highest priority. **VERIFICATION DEBT — none of this is browser-tested in production.** R2 was a behaviourless refactor per commit messages but "zero behavioural change" can only be verified by clicking. Attempted curl probes from sandbox were 403'd by Vercel WAF; Vercel MCP authenticated to empty workspace (zero teams visible), so deployment status / runtime logs / runtime errors are not reachable from this environment. Smoke-test is a 10-min human job on phone or desktop — order to hit (highest blast radius first): `/community` (redirect to `/squad?tab=discover`) → `/squad?tab=discover` + `/squad?tab=mine` (tab strip + URL param sync) → `/explore` (3-card landing) → `/coach` (dashboard renders all extracted sections) → `/home` (hero states) → `/train` (1 banner cap + session card + fuel tab + week sheet) → `/plan?tab=fuel` (RaceWeekFuelCard with `race_date` set 0–7 days out). Pre-Load Nudge cron not behaviour-tested — fastest verification: manual `curl` with `CRON_SECRET` to `/api/cron/smart-notify`, or wait for next 14:00 UTC fire and inspect Sentry breadcrumbs + 🥗-prefixed rows in `notifications`. **MCP/connection findings this session:** GitHub MCP working (used for PR #80 create + merge verification); Supabase MCP tools were loaded but not exercised this session; **Vercel MCP returned `teams: []` — authenticated to an empty workspace, NOT the NextSplit team** — next session needs Vercel MCP token rotation to a token scoped to the NextSplit team if deployment / runtime-log access is required (otherwise stays on PR-status path via GitHub MCP only). curl outbound from sandbox to nextsplit.app is WAF-blocked (403 on all routes incl. /); not fixable from inside the sandbox. NEXT WORK BLOCK (unchanged from v9.14): Phase 4 entry gate — either P4.0 retention bar (code work, unblocks paywall) OR founder admin ICO registration £40 (unblocks paying-coach acquisition + marketing). Founder admin still RED: ICO registration · Companies House · STRAVA_CLIENT_ID + STRAVA_CLIENT_SECRET on Vercel Production · delete VERCEL_DEPLOY_HOOK GitHub repo secret. -->
<!-- 9.15: Fueling Moments pivot (2 PRs on `claude/track1-closeout-track1.5-WyXKk`, pre-merge). Replaces the never-shipped `/nutrition` meal-tracking dashboard (route + 11 components + AI fuel-coach API + nutritionUtils, ~1,602 lines deleted) with two fuel-moments tied to training reality. PR1 (`199849a`): `RaceWeekFuelCard` on `/plan` fuel tab — renders endurance carb-load + race-morning protocol when `user_plans.race_date` is 0–7 days out; pre-race-week shows countdown framing; no race shows steady-state message. The existing daily-fuel-timing block on /plan and the `FuelPlanCard` on /today + /train both kept (distinct data path — `planDay.nut`). `useMealPlan` hook kept (Profile/You still read `mealsByDate` for stats). `/nutrition` removed from `BottomNavWrapper` APP_PATHS. RPG nutrition stat + badge category kept (independent data). PR2 (`1c01779`): new highest-priority slot in `src/app/api/cron/smart-notify/route.ts` per-user cascade — for users with an active plan whose tomorrow's session code (from `weeks_data[].days[].sessions[].c`) is `run-long` / `run-tempo` / `run-int` / `run-mp` / `run-race`, fire a pre-load push tonight ("🥗 Pre-load tonight" / "🏁 Race tomorrow"). Reframed from coach-domain spec's "morning push" to "evening-before pre-load" because the cron fires once daily at 14:00 UTC (Vercel Hobby cap = 2 crons/day, already full with `smart-notify` + `race-tick`); morning-of is too late for European users at 14:00 UTC. Tomorrow-target = UTC date + 1; users outside 09–21 local gate skipped (existing TZ behaviour). Slot priority cascade now: 1. Pre-Load Nudge (NEW, beats Sunday-wrap on conflict because more actionable) → 2. Sunday weekly wrap → 3. Leader-queued squad nudge (pre-loop) → 4. At-risk squad detection (pre-loop) → 5. Keep-streak fallback. Easy runs / gym / pilates / sauna / rest deliberately excluded from pre-load targets — pre-loading doesn't matter and would devalue the signal. Notification type stays `'smart_notify'`; title prefix 🥗 / 🏁 lets analytics filter without a new enum value. Type-check clean both PRs; not browser-tested (Race-Week Card) or behaviourally tested (cron slot — confirm via manual curl with CRON_SECRET or wait for next 14:00 UTC fire and inspect Sentry breadcrumbs + 🥗-prefixed notification rows). Branch unmerged. NEXT WORK BLOCK (unchanged from v9.14): Phase 4 entry gate (P4.0 retention bar + P4.1 pre-paid pentest) before paywall flip. Founder admin still RED: ICO registration £40, Companies House, STRAVA_CLIENT_ID + STRAVA_CLIENT_SECRET on Vercel Production, delete VERCEL_DEPLOY_HOOK GitHub repo secret. -->
<!-- 9.14: Phase 3 (Coach Suite + retention proof + squad seasons + plan-path + Strava) close-out across 6 PRs (#42 docs roll-up, #43 P3.1 dashboard v2 promotion + stats grid, #44 P3.2 plan authoring fix-broken-save + edit flow, #45 quick-wins (My Plans tile + ProfileClient cosmetics), #46 P3.3 messaging /coach/messages athlete inbox + Train banner + push routing fix, this v9.14 PR P3.5 bulk filter-message + P3.7 first-athlete day counter + Phase 3 audit roll-up). 3 real bugs closed during the close-out: (a) BottomNav Coach tab 404'd because /coach had no page.tsx — orphaned dashboard at /coach/squad. PR #43 promoted to canonical /coach with back-compat redirect from /coach/squad. (b) Plan-builder Save button POSTed to /api/coach/plans which is a directory not a route handler (404). Coaches lost work to silent fail. PR #44 switched to /api/coach/save-plan + wired ?edit=<uuid> flow. (c) Coach→athlete push notification destinationUrl was /coach which redirects non-coaches to /coach/setup. Athletes tapping coach pushes since #29 landed at the setup wizard. PR #46 fixed routing to /coach/messages (athlete-only inbox, also new). Phase 3 item state post-close-out: P3.1 ✅ #43 dashboard v2 promotion + stats grid · P3.2 ✅ #44 plan authoring tool · P3.3 ✅ #46 messaging · P3.4 ✅ already shipped (EarningsDashboardClient has gross/commission/net/monthly/YTD/activeSubscribers/commissionRate at 275 lines) · P3.5 ✅ this PR (filter-message bulk on top of existing 6-status filters; broadcast endpoint already supported athlete_ids subset) · P3.6 ✅ already shipped (/coach/[slug] CoachProfileClient + ReviewCard + Stars + would_recommend + sample plans + reviews UI) · P3.7 ✅ #44+this PR (Stripe Connect button + first-athlete day-7 counter on empty state with progressive copy) · P3.8 ✅ already shipped (RetentionDashboard at /admin/retention with D1/D7/D30 cohort table 30-day window + aggregates) · P3.9 partial — squad nudge templates exist (BroadcastModal + nudge_kind tagging in squad_nudges) but A/B effectiveness tracking is gated on F1 retention data (founder backlogged) · P3.10 ✅ shipped per HANDOFF v9.8 (SquadSeasonCard) · P3.11 ✅ shipped per code (PlanPathSVG.tsx animateMotion + mpath at line 630, periodisation glyphs P3.11 comment at line 476) · P3.12 ✅ code shipped (auth/strava/callback/route.ts exchanges code for tokens, /api/strava/sync refreshes + pulls activities, /api/strava/import imports into training_logs, /api/strava/disconnect, StravaSection on /profile, StravaConnectScreen in onboarding, env var stravaClientId wired) — gate is founder admin: NEXT_PUBLIC_STRAVA_CLIENT_ID + STRAVA_CLIENT_SECRET need confirmed in Vercel Production. NEXT WORK BLOCK: Phase 4 entry gate (P4.0 retention bar + P4.1 pre-paid pentest) before paywall flip. Until F1 testing reopens (founder backlogged), no Phase 4 paywall flip. Founder admin still RED: ICO registration £40 (gates paying coaches + marketing) · Companies House (devils-advocate personal-liability framing) · STRAVA_CLIENT_ID + STRAVA_CLIENT_SECRET on Vercel Production · delete VERCEL_DEPLOY_HOOK GitHub repo secret. -->
<!-- 9.13: Character system V1 ENTIRE BUILD landed in 14 PRs (#28→#41) merged 2026-05-09 to 2026-05-10 across two contiguous sprints. Founder direction at v9.12 close: "build first, test later" + "push richer" + framing-gate locked: two-layer class system (existing 7 RUNNER_CLASSES auto-derived archetypes + 3 selectable build classes track_star/trail_champion/marathon_monster). Engagement-pro-rata XP rate ratios picked: modest 1.0/1.3/1.6/1.8× (free/Elite/+coach/+marketplace plan). Boost mechanic locked: stat-buff only, single-race consumable, max 2 per entry. Acquisition: ALL FOUR PATHS — random drop on session log (~2% per log) + streak milestones (7/30/60/90/180/365d) + daily quest grants + Stripe purchase. Cosmetics: BOTH visual flair AND functional buffs (kit_colour drives HeroCard runner SVG accent + race-replay lane gradient; aura renders box-shadow on self lane; banner renders animated CSS flame plume behind avatar). 7 Supabase migrations applied live to project wlrmeiczqgmharvfmalq: phase-character-system-v1.sql (#28: characters table + award_session_xp + recompute_xp_rate_multiplier RPCs), phase-character-system-races-v2.sql (#29: character_races/_entries/_results + enter_race + simulate_race + seed_daily_race RPCs; deterministic finish_secs from base_speed × class_fit × endurance_factor; rng_seed retained as inert per Gambling Act 2005 ss.6-9 compliance), phase-character-system-extra-formats-v3.sql (#33: seed_weekly_marquee 10K + seed_monthly_major 21097m), phase-character-system-inventory-v4.sql (#34: catalogs + inventory tables + grant_boost/grant_cosmetic/consume_boost/set_active_cosmetic/roll_random_drop RPCs + 11 boosts + 10 cosmetics seeded), phase-character-system-boost-loadout-v5.sql (#36: enter_race extended to accept p_boost_loadout text[] DEFAULT '{}' max 2; simulate_race aggregates per-stat multipliers via EXP(SUM(LN(...))) overflow-safe with resilience-halved-into-endurance until trail/squad formats use it directly), phase-character-system-rewards-v6.sql (#37: character_reward_claims tracking table for streak/quest/purchase idempotency + claim_streak_reward + record_purchase_grant), phase-character-system-quest-rewards-v7.sql (#40: claim_daily_quest re-evaluating 4 quest predicates server-side with day/week period keys). All 14 RPCs follow F2.4 hardening pattern: SECURITY DEFINER + SET search_path = public, pg_temp + appropriate REVOKE/GRANT. New routes shipped: /race (5th bottom-nav tab, magenta accent #ff3d8b, athlete-only — coach mode keeps 4-tab Home/Train/Coach/You), /you/inventory, /api/race/today, /api/race/[id]/enter, /api/race/active, /api/character (CRUD), /api/character/inventory + /cosmetic-toggle + /purchase, /api/cron/race-tick at 22:05 UTC daily (Vercel Hobby cron cap now FULL: smart-notify 14:00 + race-tick 22:05). 5 new toast surfaces mounted in app/layout.tsx: CharacterStatToast (PR #32), CharacterLootToast (PR #35), StreakRewardToast (PR #39), CharacterAccessoryOverlay (PR #41 wraps HeroCard avatar with banner flame + shoes chip + accessory icon). Stripe webhook (src/app/api/stripe/webhook/route.ts) extended with character_inventory branch handling checkout.session.completed for one-time payments routed via record_purchase_grant. recomputeXpRateMultiplier wired into 5 sites: 3 in stripe webhook (subscription.updated, subscription.deleted, coach checkout.session.completed) + /api/coach/accept + /api/plans/activate. NEXT WORK BLOCK per founder direction: Phase 3 Coach Suite — P3.1 coach dashboard v2 (athlete-roster overview), then P3.2 plan authoring tool. Founder admin still: ICO registration £40 (gates paying coaches + marketing), Companies House, delete VERCEL_DEPLOY_HOOK GitHub repo secret. -->
<!-- 9.12: Late-evening sprint after v9.11 — 5 more PRs merged (#22, #23, #24, #25, #26 + this v9.12 close-out PR). Sequence: PR #22 future-date logging guard (DB CHECK + client + Zod schema; migration phase-future-date-guard-v1.sql applied as 20260508225349). PR #23 character-gamification V2 spec proposal + 19-lens /council verdict (HOLD with 5 RED pre-ship blockers + 4 concurrent live bugs found during review). FOUNDER OVERRULE: F1 friend testing BACKLOGGED — direction is now "build app to fully usable state before we let any test users in". This overrides several council recommendations that were F1-gated. Founder also overruled the council's recommended V0 sliver (character select + class display + daily 5K only) in favour of "push richer". PR #24 closed council blockers #2 (live RLS vulns: dropped Public-reads-entries USING(true) on challenge_entries + virtual_race_entries, recreated TO authenticated; migration 20260508231830) + #4 (MissedSessionFlow Pro→Elite £4.99→£7.99 pricing) + 4 live bugs (PlanPathSVG hydration flash via lazy useReducedMotion initialiser; BottomNav focus-visible WCAG 2.4.11 outline restoration; LevelUpScreen 6000ms→3500ms with prefers-reduced-motion gate; globals.css shimmer-gold infinite→4-iteration cap with reduced-motion override). PR #25 shipped passive Race V0: new /leaderboard route hosting existing SquadLeaderboard component as first-class page + global rankings teaser + privacy footer + Squad header link. PR #26 closed council blocker #3 (deleted rng_jitter from gamification V2 spec §3.3 — race sim now fully deterministic from character_snapshot + boost_loadout, addressing UK Gambling Commission concern under Gambling Act 2005 ss.6-9). Council blockers post-merge: 2 closed in code (#2, #4), 1 closed in spec (#3); 2 still open and founder-only (#1 ICO registration £40, #5 8 pre-alpha gates — but #5 is now explicitly backlogged per founder direction). NEXT WORK BLOCK: gamification character system build (Phase 3+ Race tab) — schema for user_characters + character_inventory + races/race_entries/race_results, class picker UI extension, basic XP from training_logs, completion-based race outcomes (no RNG, no VDOT-anchoring). Founder still owes ICO registration + Companies House (per devils-advocate personal-liability framing). All audit work that doesn't depend on F1 signal is now closed; Track 5 (F4.2/F5.4/F6.3) was F1-gated and is now backlog under the new "build first, test later" direction. -->
<!-- 9.11: Track 2 partial + Track 3 partial + character-gamification /forge close-out. PRs 17-21 merged 2026-05-08 same evening as v9.10. F2.5 anon-key fallback dropped (aiRateLimit + seed-plans now throw if SUPABASE_SERVICE_ROLE_KEY missing instead of silently fail-open via anon-key). F0.6 tightened .gitignore (.env*, *.log, coverage/). F0.4 CI tests now BLOCKING (52→100 vitest cases all green; tsc + eslint stay continue-on-error until F4.1 cleanup PR + eslint error sweep). F0.2 cron consolidation: deleted dead /api/cron/notify route, removed lifecycle-emails from vercel.json (notify.yml is sole source of truth, frees a Hobby cron slot), added zero-send Sentry alert (eligible>0 && sent===0 fires) on lifecycle-emails + smart-notify. S9 src/lib/planValidator.ts shipped — pure-TS post-generation plan validator wired into /api/ai/generate-plan as advisory Sentry breadcrumb (flags missing taper for marathon/half/10mi/ultra; flags long-run > 30% of weekly km). 12 unit tests for planValidator. F2.4 SECURITY DEFINER body audit — 8 RPCs hardened in phase-rpc-hardening-v1.sql (recorded as 20260508222328): coach_earnings_summary/ytd, get_commission_rate, increment_profile_xp, increment_season_xp now check auth.uid()=p_*_id; refresh_coach_rating + decrement_club_members check auth.uid() IS NOT NULL; apply_split_leader_reward (zero src/ callers) revoked from authenticated/anon, granted only to service_role. All 8 also got SET search_path = public, pg_temp for schema-injection hygiene. F6.1 unit tests on core libs: 48 new cases across vdot.test.ts (13), streak.test.ts (11), referral.test.ts (11) + planValidator.test.ts (12 in PR 18) — meets audit ≥5 cases + zero-input + boundary acceptance bar per file. **Forge ran on character gamification idea**: docs/forge/character-gamification-v1.md captures 13-agent + shortlister output. SHORTLIST recommends Option A (XP Ceremony + Token SVG, conv 5) over Option B (Race Room) due to thesis-level concern raised by devil's-advocate that no other agent named — squad-as-safety-net (accountability) and squad-as-arena (competition) are opposing social contracts. Founder must resolve framing gate before any V1 ships. **PR 18 attempt was abandoned**: F4.1 narrow as-never cast cleanup hit a supabase-js typing wall (Update parameter still resolves to never even with type widening). Full F4.1 cleanup needs database.generated.ts adoption with literal-union enum preservation pass — tracked as a dedicated future PR. NEXT GATING EVENT: F1 friend test (P1.6/P1.8) + framing-gate decision on character gamification. Founder admin RED still: ICO registration. Track 4 (coach inline items F3.2a/F3.3) intentionally still deferred to trigger PRs. -->
<!-- 9.10: Audit Tracks 1 + 1.5 CLOSED on main. PR #13 (Track 1 hotfix) and PR #14 (Track 1.5 follow-on) merged 2026-05-08. PR #15 (legacy claude/review-project-status-lGBPu branch with 2 stale commits) closed as not_planned — fully superseded. Migration phase-track1-hotfix-v1.sql applied live to Supabase project wlrmeiczqgmharvfmalq before PR #13 (recorded as 20260508195726_phase_track1_hotfix_v1); pre-flight RLS sweep confirmed all 52 public tables had RLS=true going in (the audit's worst-case "table without RLS" scenario didn't materialise). nps_responses SELECT policy now scoped TO service_role (was {-} = leak). plan_templates RLS canonical version-controlled record committed (live state was already correct — the migration is the audit trail). can_nudge SECURITY DEFINER auth.uid() guard verified live. F0.1 deploy.yml deleted, F0.3 admin gate via ADMIN_EMAILS env shipped on /admin/retention, S12 manifest.json bg #0a0e1a. Track 1.5 shipped: S5 gen-types.sh path fixed (writes to src/types/database.ts now), F4.1 partial (database.generated.ts saved as future-tool reference; full as-never cast cleanup deferred to dedicated PR), S6 checkAndIncrementAIUsage on 5 unguarded AI routes (generate-plan + adapt-plan + coach-digest + recommend + weekly-summary), S10 onboarding events.ts + onboardingStarted/onboardingCompleted wired across main flow + 4 sub-route Client files. **Discovery in PR #14:** the admin-gate pattern was broken on three pages (/admin/retention, /admin/plan-review, /admin/adapt-test) — profiles has neither is_admin nor email columns live, so the prior is_admin-OR-email check redirected every user including the founder. Retention fixed in #14; plan-review + adapt-test fixed in this v9.10 close-out PR. Bag-on-side: .claude/settings.local.json added to .gitignore defensively. NEXT GATING EVENT: F1 friend test (P1.6 / P1.8). Founder admin RED: ICO registration (£40, ico.org.uk — DPA 2018 s.17). Foundation sprint (Track 2, ~4 days, 6 items) is the next dev block after F1. -->
<!-- 9.8: Marathon execution session COMPLETE. 11 PRs merged into main (#4 P1.0a/P1.1 → #11 quick-wins). Phase 1 closed, Phase 2 6/7 shipped, Phase 3 9/11 + observability shipped, cross-cutting backlog 4/8 done + 2 partial. 5 Supabase migrations applied (P1.0a schema, P2.3 referral, P2.7 timezone, P3.10 squad seasons, BL-X4/X5 indexes). Founder admin remaining: £40 ICO registration; optional Sentry alert rule on tags.feature. NEXT GATING EVENT: F1 friend test (P1.8) — unblocks P2.1 (squad-tab IA), P2.5 (friction audit), P2.7 hard-deload council, P3.9 (nudge effectiveness baseline), P3.4/P3.7 (Stripe Connect work blocks Phase 4). All open code-only quick wins are now shipped. -->
<!-- 9.7: Marathon dev session shipped Phase 1 + Phase 2 code-feasible items across PR #5 (merged), PR #6 (merged), PR #7 (open: P1.2 PECR fix + reaction notifications + 6 follow-ups), PR #8 (open: P2.2 + P2.3 + P2.6 + P2.7 partial). Two open PRs need founder action: (a) Vercel env var rename NEXT_PUBLIC_PREMIUM_ENFORCED → PREMIUM_ENFORCED for PR #7's P1.3; (b) 2 Supabase migrations for PR #8 (phase-p2-3-referral-reward.sql + phase-p2-7-timezone.sql). Phase 1 done; Phase 2 6/7 done (P2.1 squad-tab IA promotion + P2.5 friction audit + P2.7 deload suppression deferred — all gated on F1 friend-test signal or council). Phase 3 (Coach Suite + retention proof) deliberately not started — it's roadmap week 7-14, dependent on F1 retention data. NEXT GATING EVENT: F1 friend test (P1.8). -->
<!-- 9.6: P1.0 partial decomposition landed on claude/review-project-status-lGBPu (5 commits 29d7307..cdf8fd5). Council /council 2026-05-07 verdict HOLD on full P1.0; founder picked Path B (surgical fixes + decomposition). Pre-ship blockers all resolved: S1+S2 capture session+effectivePace before await (kills stale-closure planDay → wrong squad_feed metadata bug + propagates derived pace into milestone payload); S3 react-hooks/exhaustive-deps bumped warn→error so future stale-closure regressions fail CI. T1 useUndoCountdown hook + T2 useSessionLogging hook extracted from TodayClient (870→759 lines, 15→10 useState). L1 useLogFormState lift in LogModal closes the silent km/duration discard-warning gap (12→3 useState). Remaining: L2 LogModal split into BasicEntry/AdvancedEntry/SaveControls and A1 AthleteDetailClient split into 4 sections — both pure JSX surgery, no bug-fix value, deferred pending live smoke-test on nextsplit.app. -->
<!-- 9.5: P1.0a Prerequisites PR landed on claude/review-project-status-lGBPu (10 commits b310fc0..4547cdd). Schema migration applied + verified in Supabase: squad_feed.milestone_type CHECK gains 'session_logged'; training_log_id FK + partial UNIQUE; profiles.share_logs_with_squad NOT NULL DEFAULT true; SECURITY DEFINER RPC insert_squad_feed_on_log fan-out; INSERT lockdown via REVOKE FROM authenticated. Three migration-fragility fixes pushed (CHECK lookup canonical-form, RPC loop reset, policy-drop by predicate). Code-side P1.1 wire-up live: SessionCelebration shows "Posted to your squad's feed" affirmation, ACWR-band gated single-line copy, NudgeSquadPill on Home (30min post-log), iOS standalone push gate, PostHog logCompleted/squadFeedCardShown/nudgeSent/nudgeOpened taxonomy. Branch is unmerged — PR-to-main pending. -->
<!-- 9.4: Direction split out into docs/ROADMAP.md (v0.1) — single source of truth for delivery, threads, phases, persona coverage. HANDOFF now state-only; §What's Next is a pointer. -->
<!-- 9.3: claude/new-session-2Ldeo merged to main as PR #2 (3326449). Council/forge systems and all Session 10 work now on main. Vercel preview-vs-production tagging gotcha documented. -->
<!-- 9.2: post-deploy-unblock — visual redesign of PlanPathSVG via inaugural council pass; council and /forge multi-agent systems shipped as standard tooling. Three live-app UI fixes (header/modal/fuel) ahead of F1. -->
**Live URL:** https://nextsplit.app
**GitHub:** https://github.com/NextSplit/Nextsplit-v2
**Stack:** Next.js 15 App Router · TypeScript strict · Supabase · Tailwind · CSS vars · PWA · Anthropic SDK

> Previous handoffs (HANDOFF.md through HANDOFF-8.md) are archived in `/docs/archive/`.
> This is the single source of truth going forward.

---

## ✅ Deploy Pipeline — Unblocked (6 May 2026)

**Status:** Auto-deploy on push to `main` is working again. Session 9's "Vercel webhook not firing" diagnosis was wrong from the start.

**Real root cause:** Vercel Hobby tier rejects any cron expression that fires more than once per day. `vercel.json` had `smart-notify` on `0 9,14,18 * * *` (3× daily, added in commit `b466b6f` Session 8). Every deploy from that commit onward failed at build-time validation with the error `Hobby accounts are limited to daily cron jobs.` Pushes were going through, GitHub was notifying Vercel, Vercel was building — and the build was dying silently at cron validation. The auto-deploy on `main` never surfaced the error in any UI Session 9 looked at; the failure only became visible when a PR was opened in Session 10 and the PR check showed "Vercel — Deployment failed".

**Fix:** commit `8b84582` reduced `smart-notify` to `0 14 * * *` (single 14:00 UTC fire). One push and every commit since `b466b6f` shipped in one go — Option E redesign, Splity, 4-tab nav, 20-feature build, plus Session 10's plan-activate and AI-plan fixes.

**Notification dispatch:** the `smart-notify` route at `src/app/api/cron/smart-notify/route.ts` was rewritten to suit the once-daily fire. Each user now gets at most one notification per day, prioritised:
- Sunday → "Weekly wrap" (regardless of log state)
- Mon–Sat with active plan and not logged today → "Keep the streak — log before evening"
- Otherwise → no notification

If you later upgrade to Vercel Pro and want to restore split morning/midday/evening dispatches, re-introduce the hour conditions and bump `vercel.json` back to a multi-fire schedule.

**Cleanup outstanding:**
- Close the Vercel support ticket — webhooks were never broken, no action needed from their side.
- The Session 9 diagnostic commits (`f4f6ff8`, `7e65a4c`, `8bcff06`, `e7a8bba`, `0ee3757`, `1f2e448`) are no-op chore commits and the GitHub Actions deploy-hook workflow they introduced is now redundant. **F0.1 in PR #13 deleted the deploy.yml workflow itself**; founder still needs to delete the `VERCEL_DEPLOY_HOOK` GitHub repo secret (Settings → Secrets and variables → Actions).

---

## ✅ Audit Tracks 1 + 1.5 — CLOSED (8 May 2026)

The 11-agent /council pass on `docs/audit/audit-report-v1.md` Phase 8 produced a 5-item Track 1 (hotfix) + 4-item Track 1.5 (follow-on). Both shipped via PR #13 + PR #14, merged into `main` on 8 May.

### Track 1 (PR #13) — what landed

| ID | Acceptance | Evidence |
|---|---|---|
| F0.1 | `.github/workflows/deploy.yml` deleted | file removed on `main` |
| F0.3 | `/admin/retention` admin gate via `ADMIN_EMAILS` allow-list against `user.email` | redirects non-admins to `/home`; founder set `ADMIN_EMAILS` on Vercel Production + Preview |
| F2.1 | `plan_templates` RLS version-controlled | `phase-track1-hotfix-v1.sql` Block A (idempotent CREATE POLICY) — pre-flight confirmed live state already RLS=true on all 52 public tables, so this is now an audit trail, not a fix |
| F2.2 | `nps_responses` SELECT scoped to `service_role` | same migration Block C — `polroles` went from `{-}` (all roles) to `{service_role}` |
| S3 | `can_nudge` `auth.uid()` guard | already-live in DB, verified via `pg_get_functiondef` (`IF auth.uid() IS NULL OR auth.uid() <> p_from THEN RAISE EXCEPTION '42501'`); migration intentionally skipped Block B |
| S12 | `manifest.json` `background_color` `#0a0e1a` | string change on disk + live |

Migration applied to project `wlrmeiczqgmharvfmalq` recorded as `20260508195726_phase_track1_hotfix_v1`.

### Track 1.5 (PR #14 + this v9.10 PR) — what landed

| ID | Acceptance | Evidence |
|---|---|---|
| S5 | `scripts/gen-types.sh` writes to `src/types/database.ts` | path corrected + `set -euo pipefail` added |
| F4.1 (partial) | live schema saved | `src/types/database.generated.ts` (52 public tables) committed as reference snapshot — full `as never` cast cleanup is its own dedicated follow-up PR |
| F4.1 (admin gate fix) | `/admin/retention` no longer dead-ends every user | switched from broken `profiles.is_admin/email` query (those columns don't exist live, verified via `information_schema`) to `user.email` from `auth.getUser()` |
| **F4.1 (admin gate fix, sister pages)** | **same fix applied to `/admin/plan-review` + `/admin/adapt-test`** | this PR (v9.10) — `db()` + `eslint-disable any` workaround dropped on both |
| S6 | rate-limit guard added to 5 unguarded AI routes | `await checkAndIncrementAIUsage(user.id, 'free')` in `generate-plan` (replaces fire-and-forget upsert), `adapt-plan`, `coach-digest`, `recommend`, `weekly-summary`; returns 429 with `rateLimited: true` over-limit |
| S10 | unified onboarding event taxonomy | `src/app/onboarding/events.ts` exports `ONBOARDING_STARTED` + `ONBOARDING_COMPLETED` + `ONBOARDING_PATH` constants; wired into `OnboardingContext` (start) + `PlanGenerationScreen` + 4 sub-route Client files (complete) |

---

## ✅ Audit Tracks 2 + 3 (partial) — CLOSED (8 May 2026, same evening as v9.10)

The night-of-9.10 sprint shipped 5 PRs (#17 → #20, plus this v9.11 close-out PR). PR 18 in the original plan (F4.1 narrow `as never` cleanup) was **abandoned** mid-PR when supabase-js's overload resolution turned out to override the type widening. Remaining work documented in "Still queued" below.

### What landed (PRs 17 → 21)

| PR | ID | Acceptance |
|---|---|---|
| #17 | F2.5 + F0.6 | `aiRateLimit` + `seed-plans` throw if `SUPABASE_SERVICE_ROLE_KEY` missing (no anon-key fail-open). `.gitignore` adds `.env*`, `*.log`, `coverage/`. |
| #18 | F0.4 + F0.2 + S9 | CI tests blocking (`continue-on-error: false`); 100/100 passing. Deleted dead `/api/cron/notify`. Removed `lifecycle-emails` from `vercel.json` (notify.yml is sole source, frees a Hobby cron slot). Zero-send Sentry alert on `lifecycle-emails` + `smart-notify` (`eligible > 0 && sent === 0`). New `src/lib/planValidator.ts` flags missing taper + long-run > 30%, wired to `/api/ai/generate-plan` as advisory Sentry breadcrumb. |
| #19 | F2.4 + S4 | `phase-rpc-hardening-v1.sql` migration applied (`20260508222328`). 8 RPCs hardened: 5 caller-owns (`auth.uid() = p_*_id`), 2 caller-authenticated, 1 service-role-only. All 8 also got `SET search_path = public, pg_temp` for schema-injection hygiene. |
| #20 | F6.1 | 48 new unit tests across `vdot.test.ts` (13), `streak.test.ts` (11), `referral.test.ts` (11) + `planValidator.test.ts` (12 in PR 18). 100/100 cases passing. |

### Character-gamification /forge

Founder seeded a /forge on character gamification. 13-agent + shortlister output saved at `docs/forge/character-gamification-v1.md`. **SHORTLIST recommends Option A** (XP Ceremony + Token SVG, conv 5) over Option B (Race Room) due to a thesis-level concern raised by `ns-devils-advocate` that no other agent named: **squad-as-safety-net (accountability) and squad-as-arena (competition) are opposing social contracts**. Race Room reframes squads as a competitive arena vs the safety-net dynamic that drives the founding thesis — may *increase* churn for the majority user. **Founder must resolve framing gate before any V1 character gamification ships.**

### Still queued (post-this-PR)

- **F4.1 cast cleanup (dedicated future PR):** drop the 9 `as never` casts. PR 18 attempt failed because supabase-js's overload resolution narrows the `.update()` parameter to `never` even with type widening on `user_plans.Update`. Solution: replace the hand-rolled `Database` interface with the auto-generated one (`src/types/database.generated.ts` already committed in #14), preserving literal-union enums (e.g. `coach_tier: 'split_leader' | 'professional' | null`) by deriving narrower types per-table. ~2-3h.
- **Track 6 (P4.1 pentest scope):** `F2.1` / `F2.4` / `F2.8` / `F2.10` / `F0.3` / `F2.2` + `S14` — pentest brief written when Track 6 scopes.
- **Track 8 (founder-admin, RED):** **ICO registration** at ico.org.uk — £40, 30 min, DPA 2018 s.17. **Cannot accept new paying coaches or run external marketing until done.** Plus Companies House registration (per devils-advocate personal-liability framing), Sentry alert rules, Resend domain verification, Stripe Connect e2e test, T&Cs solicitor review.
- **Track 4 inline (F3.2a, F3.3):** still trigger-gated to "next squad PR" / "P3.4 Coach Revenue v2 PR".

### Founder follow-ups before next dev block

- **Verify PRs #22 → #26 deployed clean to Production.** Vercel auto-deploys on `main` push — should be green.
- **Delete `VERCEL_DEPLOY_HOOK` GitHub repo secret** (still pending from F0.1).
- **ICO registration** — still RED priority. Now genuinely the only legal blocker on user acquisition.
- **Companies House** — devils-advocate flagged personal-liability framing if Gambling Commission scrutiny lands pre-incorporation.

---

## ✅ Late-evening sprint — 5 more PRs CLOSED (8 May 2026, after v9.11)

Same evening as v9.10/v9.11 + character-gamification /forge + /council. Five PRs merged on top of the v9.11 close-out:

| PR | What landed |
|---|---|
| **#22** | Future-date logging guard. DB CHECK constraint `training_logs_logged_at_not_future` (`logged_at <= now() + 18h`, IANA TZ tolerance). Migration applied as `20260508225349_phase_future_date_guard_v1`. Defensive client throw in `useTrainingLog` + reusable `loggedAt` Zod schema in `src/lib/schemas.ts`. |
| **#23** | Character-gamification V2 spec proposal + 19-lens /council verdict (HOLD, Conf 5). Founder seed ran through /forge v1 → V2 spec → /council pass with 19 active lenses + ns-synthesizer. Saved at `docs/forge/character-gamification-v2-proposal.md` + `docs/council/character-gamification-v2-verdict.md`. |
| **#24** | Council-blocker close-out (RLS + 4 live bugs + Pro pricing). Migration `phase-rls-community-entries-hardening-v1.sql` applied as `20260508231830` — drops `Public reads entries` USING(true) on `challenge_entries` + `virtual_race_entries`, recreates `Authenticated reads ...` TO authenticated. Plus 4 live bug fixes: `PlanPathSVG.tsx` lazy `useReducedMotion` initialiser; `BottomNav.tsx` focus-visible WCAG 2.4.11 outline; `LevelUpScreen.tsx` 6000ms→3500ms with reduced-motion gate; `globals.css` `.shimmer-gold` infinite→4-iteration cap. Plus `MissedSessionFlow.tsx` Pro→Elite £4.99→£7.99 founding (£9.99 standard) copy fix. |
| **#25** | Passive Race V0. New `/leaderboard` route hosting existing `SquadLeaderboard` component as first-class page; squadless empty state; global rankings teaser locked behind "character launch"; privacy footer pointing to `share_logs_with_squad`. Squad header link (`🏆 Leaderboard`) added. No new schema, RPCs, or migrations. |
| **#26** | Council blocker #3 close-out — deleted `rng_jitter` from gamification V2 spec §3.3. Race sim now fully deterministic from `(character_snapshot, boost_loadout, class_fit, race_format)` only. Addresses UK Gambling Commission concern under Gambling Act 2005 ss.6-9 + DCMS 2023 White Paper. `rng_seed` column retained as inert field with explicit comment that simulator does NOT consume it. |

### Founder strategic pivots this session

- **F1 friend testing BACKLOGGED.** Founder direction: "build app to fully usable state before we let any test users in. I don't want to keep stopping key dev work or making significant steps forward because we're waiting to test." This overrides several /council recommendations that were F1-gated. Track 5 items (F4.2 / F5.4 / F6.3) collapse from "F1-gated" to "Phase 4 entry gated" or longer.
- **"Push richer" overrule.** Founder overruled the synthesizer's recommended V0 sliver (character select + class display + daily 5K only) in favour of building richer mechanics. PR #25 is the first piece of that — passive leaderboard surface as Race V0.
- **Full Vision committed for character gamification.** Phase 3+ workstream: 5th bottom-nav Race tab, completion-based race outcomes (no VDOT-anchoring, no RNG), squad/race surface split + ekiden bridge, all 5 race formats, Habitica-grade pixel art, coach identity avatars. Engagement-pro-rata XP rate ratios + class system mechanic still deferred to founder framing on next session.

### Council pre-ship blockers — final state

| # | Blocker | Status |
|---|---|---|
| 1 | ICO registration | 🔴 still open — founder admin (£40, ico.org.uk) |
| 2 | Live RLS vulns | ✅ closed in #24 |
| 3 | Delete `rng_jitter` from spec | ✅ closed in #26 |
| 4 | MissedSessionFlow Pro pricing | ✅ closed in #24 |
| 5 | 8 pre-alpha gates open (Stripe/Resend/UAT/F1) | 🟡 founder explicitly backlogged F1; Stripe/Resend/UAT remain founder admin |

### Concurrent live bugs found during /council R2 — all closed

| # | Bug | Closed in |
|---|---|---|
| 1 | `PlanPathSVG.tsx:18-28` useReducedMotion hydration flash | #24 |
| 2 | `community-migration.sql:126/162` USING(true) RLS vulns | #24 |
| 3 | `BottomNav.tsx:144` focus-visible:outline-none WCAG 2.4.11 | #24 |
| 4 | `MissedSessionFlow.tsx:188` stale Pro/£4.99 pricing | #24 |
| 5 | `LevelUpScreen.tsx:28` 6000ms auto-dismiss not reduced-motion | #24 |
| 6 | `globals.css:302` `.shimmer-gold` infinite loop | #24 |

### Next dev block — character system build (Phase 3+ Race tab)

~~The audit + council work is now CLOSED for everything code-side. The next surface to build is the actual character gamification...~~

**SHIPPED — see "Character system V1 — CLOSED" below for the full 14-PR roll-up.**

---

## ✅ Character system V1 — CLOSED (10 May 2026)

14 PRs (#28→#41) merged across two contiguous sprints. Phase 3+ Race tab feature-complete end-to-end: pick a build class on `/you` → train daily (sessions yield class-weighted stat XP + ~2% loot drop + streak/quest grants) → equip cosmetics + boosts on `/you/inventory` → enter daily 5K / weekly 10K / monthly half on `/race` → cron at 22:05 UTC resolves deterministically with class fit × boost multipliers → 11-waypoint replay animation with squad-mate kit colours on each lane.

### Founder framing decisions (resolved)

| Question | Answer |
|---|---|
| **Class system mechanic** | Two-layer: 7 existing RUNNER_CLASSES auto-derived archetypes (`profiles.runner_class`, kept) + 3 selectable build classes (`characters.build_class` enum: `track_star` / `trail_champion` / `marathon_monster`) |
| **Engagement-pro-rata XP rate ratios** | Modest 1.0 / 1.3 / 1.6 / 1.8× — free / Elite / +active coach / +marketplace plan |
| **Schema drop order** | Phased — 7 migrations (v1 → v7) shipping schema with corresponding RPCs in each PR |
| **Asset pipeline trigger** | Aseprite commission still gated on founder; current cosmetic visuals are CSS/emoji placeholders that the future SVG assets can replace per-slot |
| **Boost mechanic** | Stat-buff only, single-race consumable, max 2 per entry |
| **Acquisition paths** | All four — random drop on session log + streak milestones + daily quest grants + Stripe one-time purchase |
| **Cosmetic vs functional** | Both — visual flair AND gameplay buffs |

### What landed (PRs #28 → #41)

| PR | Migration | Summary |
|---|---|---|
| **#28** | `phase-character-system-v1.sql` | `characters` table (1:1 profiles, RLS) + `award_session_xp` + `recompute_xp_rate_multiplier` RPCs. BuildClassCard picker on `/you`. Live wiring into `/api/community/progress`. |
| **#29** | `phase-character-system-races-v2.sql` | `character_races` + `_entries` + `_results` tables. `enter_race` (caller-owns) + `simulate_race` (service-role, deterministic) + `seed_daily_race`. `/api/cron/race-tick` at 22:05 UTC. |
| **#30** | — | `/race` 5th bottom-nav tab (magenta `#ff3d8b`). RaceCard 5 visual states. RaceResultReplay 11-waypoint animation. Coach-mode keeps 4-tab. |
| **#31** | — | `recomputeXpRateMultiplier` server helper wired into 5 sites: stripe webhook (sub.updated/sub.deleted/coach checkout) + coach/accept + plans/activate. |
| **#32** | — | `<CharacterStatToast>` mounted in layout. CustomEvent bridge `dispatchCharacterXP`. +N stat toast on session log. |
| **#33** | `phase-character-system-extra-formats-v3.sql` | `seed_weekly_marquee` (10K Mon→Sun) + `seed_monthly_major` (21097m full month). Cron tick fires all 3 seeders. `/api/race/active`. |
| **#34** | `phase-character-system-inventory-v4.sql` | `character_boosts_catalog` (11 items) + `_cosmetics_catalog` (10 items) + `_boost_inventory` + `_cosmetic_inventory`. 5 RPCs: `grant_boost`, `grant_cosmetic`, `consume_boost`, `set_active_cosmetic`, `roll_random_drop`. Random drop wired into `/api/community/progress` (~2% per log). |
| **#35** | — | `<CharacterLootToast>` mounted. `/you/inventory` page (boosts grid + cosmetics by slot, tap-to-activate). `/api/character/inventory` + `/cosmetic-toggle` routes. |
| **#36** | `phase-character-system-boost-loadout-v5.sql` | `enter_race(p_race_id, p_boost_loadout text[] DEFAULT '{}')` extended (max 2, no dupes, inventory ≥ 1). `simulate_race` aggregates per-stat multipliers via `EXP(SUM(LN(...)))`. Resilience halved-into-endurance. RaceCard pre-entry boost picker (2-col, rarity-coloured). |
| **#37** | `phase-character-system-rewards-v6.sql` | `character_reward_claims` tracking table. `claim_streak_reward` (7/30/60/90/180/365-day milestones → speed_tonic / banner_streak / marathon_focus / blitz_protocol / kit_chrome / aura_supernova). `record_purchase_grant` (idempotent per stripe_session_id). `/api/character/inventory/purchase` Stripe Checkout. Webhook `character_inventory` branch. |
| **#38** | — | `useActiveCosmetics` hook. YouClient overrides HeroCard `kitColour` from active kit_colour cosmetic. RaceResultReplay self lane gets aura `box-shadow` (pulse + supernova variants). |
| **#39** | — | `<StreakRewardToast>` (6s, rarity-coloured + amber gradient). `dispatchStreakReward`. `/you/inventory` Buy buttons + `?purchased=<id>` Stripe-success banner. force-dynamic page export. |
| **#40** | `phase-character-system-quest-rewards-v7.sql` | `claim_daily_quest` RPC re-evaluates 4 predicates server-side (log_today / streak_3 / weekly_km / sessions_3) with day/week period keys. Wired into `/api/community/progress` — 4 parallel claims, idempotent per period. |
| **#41** | — | `<CharacterAccessoryOverlay>` wraps HeroCard avatar (banner flame_trail CSS plume + accessory icon overlay + shoes chip). Squad-mate `runner_cosmetics` map on `/api/race/today` → RaceResultReplay lane gradients use kit_colour per RLS-readable runner. `@keyframes ns-flame-flicker` with `prefers-reduced-motion` gate. |

### DB inventory now contains

**12 character-system tables:** `characters`, `character_races`, `character_race_entries`, `character_race_results`, `character_boosts_catalog`, `character_cosmetics_catalog`, `character_boost_inventory`, `character_cosmetic_inventory`, `character_reward_claims` + new column `profiles.xp_rate_multiplier`.

**14 character-system RPCs:** `award_session_xp`, `recompute_xp_rate_multiplier`, `enter_race`, `simulate_race`, `seed_daily_race`, `seed_weekly_marquee`, `seed_monthly_major`, `grant_boost`, `grant_cosmetic`, `consume_boost`, `set_active_cosmetic`, `roll_random_drop`, `claim_streak_reward`, `record_purchase_grant`, `claim_daily_quest`. All follow F2.4 hardening.

### Catalog content (seeded live)

**11 boosts** — Common (Speed Tonic / Endurance Brew / Grit Bar @ +5%) · Rare (Lightning Serum / Marathon Focus / Iron Will @ +12%) · Epic (Class Amplifier / Blitz Protocol / Iron Lung) · Legendary (Apex Form / Class Overcharge).

**10 cosmetics** — Common (Cyan/Amber/Forest kits) · Rare (Neon Pink Kit / Volt Shoes / Race Visor) · Epic (Streak Banner / Pulse Aura) · Legendary (Chrome Kit / Supernova Aura). `gbp_price=null` items are drops/streak-only and excluded from the purchase API (422).

### Compliance notes

- **No RNG at race resolution.** Outcomes are pure function of `(character_snapshot, boost_loadout, class_fit, race_format)`. Gambling Act 2005 ss.6-9 + DCMS 2023 White Paper compliance maintained. `rng_seed` retained as inert column.
- **All RPCs follow F2.4 hardening** (PR #19): `SECURITY DEFINER` + `SET search_path = public, pg_temp` + `REVOKE` from PUBLIC/anon/authenticated where service-role-only, body `auth.uid()` checks where caller-owns.
- **Vercel Hobby cron cap now FULL** at 2/2: `smart-notify` 14:00 UTC + `race-tick` 22:05 UTC. Adding more crons requires Pro tier or pg_cron.

### Known small follow-ups (not gating)

- ProfileClient HeroCard cosmetic wiring (trivial — same `useActiveCosmetics` + `CharacterAccessoryOverlay` pattern as YouClient, ~3 line add).
- Aseprite pixel-art SVG asset commission (founder-gated; current cosmetics are CSS/emoji placeholders).
- DailyQuests UI tile claim-status badge ("Claimed today" pill).
- on_demand_1v1 + squad_ekiden race format seeders (need additional schema for invitations/teams).
- `recomputeXpRateMultiplier` on coach-disconnection (no app surface for ending an active coach yet).

### Next dev block — Phase 3 Coach Suite

Per founder direction post-character-system: P3.1 Coach dashboard v2 (athlete-roster overview), then P3.2 plan authoring tool. Track 4 inline items (F3.2a, F3.3) ride alongside.

---

## ✅ Fueling Moments pivot — CLOSED (11 May 2026)

2 PRs on `claude/track1-closeout-track1.5-WyXKk` (branch unmerged at time of writing). The `/nutrition` dashboard — recipes table + meal_plan_entries + AI fuel-coach — was a meal-tracking dead-end that never shipped traction. Pivot replaces it with **two fuel-moments tied to training reality**.

### What landed

| PR | Commit | What |
|---|---|---|
| **PR1** | `199849a` | `RaceWeekFuelCard` on `/plan` fuel tab (new component, `src/components/plan/RaceWeekFuelCard.tsx`). Renders endurance carb-load + race-morning protocol when `user_plans.race_date` is 0–7 days out. 8–14 days: countdown framing. No race set: steady-state message. Defaults to endurance protocol; distance-aware branching deferred until `race_distance_km` is wired through from `UserGoal`. Killed: `src/app/nutrition` route + `src/components/nutrition/*` (11 components: AssignMealModal, ShoppingList, RecipeFormModal, AIFuelCoach, TDEESetupCard, MacroBar, CalorieRing, DayMealCard, SupplementTracker, RecipeCard) + `src/app/api/ai/fuel` + `src/lib/nutritionUtils` + `/nutrition` from `BottomNavWrapper` APP_PATHS. ~1,602 lines deleted, +140 added. |
| **PR2** | `1c01779` | New highest-priority slot in `src/app/api/cron/smart-notify/route.ts` per-user cascade. For users with an active plan whose tomorrow's session code (from `weeks_data[].days[].sessions[].c`) is `run-long` / `run-tempo` / `run-int` / `run-mp` / `run-race`, fire a pre-load push tonight ("🥗 Pre-load tonight" / "🏁 Race tomorrow"). +63 / −9. |

### Kept (deliberate)

- **`useMealPlan` hook** — Profile + You still read `mealsByDate` for "X meal days logged" stats. Kept warm in `PlanClient` via a single call.
- **`FuelPlanCard` on /today + /train** — distinct surface, reads `planDay.nut` (per-day plan events), not the deleted recipes table.
- **RPG nutrition stat + badge category** — independent data path, doesn't reference `/nutrition`.

### Cron slot reframe — "morning push" → "evening-before pre-load"

Coach-domain spec originally said "morning push on hard-session days". The cron fires once daily at 14:00 UTC (Vercel Hobby cap = 2 crons/day, already full with `smart-notify` + `race-tick`). At 14:00 UTC, morning-of for European users is already past; evening-of-day-before lands in their dinner window when the message is actionable. Tomorrow-target = UTC date + 1 (a date string compared to `day.dt` in `weeks_data`). Users outside the 09–21 local TZ gate are skipped (existing behaviour).

### Slot priority cascade — current

1. **Pre-Load Nudge** (NEW — beats Sunday-wrap on conflict because it's narrowly targeted, time-sensitive, and actionable tonight)
2. Sunday weekly wrap
3. Leader-queued squad nudge (pre-loop)
4. At-risk squad detection (pre-loop)
5. Keep-streak fallback

Easy runs / gym / pilates / sauna / rest deliberately excluded from pre-load targets — pre-loading doesn't matter and would devalue the signal.

### Verification gaps (own these)

- **Not browser-tested.** Race-Week Fuel Card uses CSS-var Tailwind only, no new deps, no client hooks beyond the existing `useActivePlan`. Should poke /plan?tab=fuel on a test account with `race_date` set 0/3/5/8/15 days out before declaring done.
- **Cron slot not behaviourally tested.** Manual curl with `CRON_SECRET` to `/api/cron/smart-notify` is the fastest verification; otherwise wait for next 14:00 UTC fire and inspect Sentry breadcrumbs + 🥗-prefixed rows in `notifications` table.
- **No idempotency on duplicate cron fire.** Pre-existing pattern across the whole cron — none of the per-loop slots dedupe via the notifications table. If cron fires twice in one UTC day, user gets two pre-load pushes. Tracked as a small follow-up if traffic warrants.
- **Title prefix is the analytics tag.** Notification type stays `'smart_notify'` for schema safety; `🥗` / `🏁` prefixes let analytics filter without a new enum value. Acceptable trade-off; consider a `notifications.subtype` column if more slots accumulate.

### Compliance / schema notes

- **No DB schema changes.** Pure code pivot. No migrations applied.
- **No new env vars or secrets required.**
- **No new dependencies added.**

### Follow-ups (not gating)

- Wire `race_distance_km` from `UserGoal` into `RaceWeekFuelCard` to distinguish endurance carb-load (≥18 km) vs shorter-race top-up. Currently defaults to endurance protocol for all distances (sensible for the dominant half/marathon training audience).
- If Pre-Load Nudge open-rate proves out, consider a per-user `silence_preload_pushes` opt-out flag on profiles.
- Update `docs/ROADMAP.md` to remove `/nutrition` from any persona surface maps and note Fueling Moments as the canonical fuel surface.

---

## ✅ PR #80 production verified (partial) — v9.17 (12 May 2026)

Vercel MCP token rotated since v9.16 — now scoped to the NextSplit team (`team_C7COgxDlzndSCNtv6bGNENPF`). Used it to close half the verification debt without leaving the sandbox.

### What this session confirmed ✅

- **Current production = commit `135c34e`** (PR #81 merge — HANDOFF v9.16). `target: production`, `state: READY`. PR #80's `474d232` is the prior READY production deploy (one-click rollback target via Vercel dashboard).
- **Zero `error` / `fatal` runtime logs** across serverless / edge-function / middleware sources in the 23.5h between deploy and the audit — `get_runtime_logs(level: ["error","fatal"], since: deploy)` returned empty.
- **All 7 audited routes respond cleanly under the auth gate** — no 5xx anywhere. Each unauthenticated probe redirected to `/auth/login` server-side (HTTP 200, `x-matched-path: /auth/login`), which is correct middleware behaviour AND proves the middleware itself loads without crashing on each path. If `/community`'s new redirect-to-`/squad?tab=discover` had thrown at module load, the middleware wouldn't even fire.
- **Visual system intact** on the login page render — `--ns-cyan` / `--ns-ember` / `--color-bg` vars present, inline `localStorage.getItem('nextsplit_dark_mode')` script applying `dark` class pre-hydration. Matches the "single visual mode" core principle.

### What's still owed ❌

`web_fetch_vercel_url` only defeats Vercel platform auth (preview-protection password). It does **not** mint a Supabase session, so the app-level auth gate correctly redirects every protected route to `/auth/login` before the actual route handler renders. That means the **authenticated render** of the following remains unverified:

- `/community` → `/squad?tab=discover` app-level redirect (auth gate intercepts first)
- `/squad?tab=discover` tab-strip render + `SquadDiscoverSection`'s 5 stacked sub-sections (Feed / Clubs / Challenges / Races / Leaderboard)
- `/explore` 3-card landing (Find a coach / Browse plans / Squad)
- `/coach`'s 6 newly-extracted section components (header / stats grid / filter chips / weekly load / tools grid) in correct order
- `/home`'s hero-state switch under real `useActivePlan` data (training day / rest day / streak at risk / no plan / coach mode)
- `/train`'s 1-banner cap — whether `AcwrAdvisoryBanner` or `GapRecoveryBanner` correctly wins when both would qualify
- `/plan?tab=fuel` `RaceWeekFuelCard` slot at `race_date` 0 / 3 / 7 / 14 days out + no-race case

These are exactly the regressions that surface only when an authenticated user with the right data hits the page. The READY build + no-5xx + no-error-logs evidence is strong but not sufficient on its own. **5-min manual smoke-test on Android Chrome as the test account is still owed** (same checklist order as v9.16).

### Pre-Load Nudge cron — verification path now easier

Cron still untested behaviourally. With the Vercel MCP working, the fastest verification is now `get_runtime_logs` on the next 14:00 UTC fire (or any subsequent fire) — no more dependence on Sentry breadcrumbs or DB inspection. Filter by `requestId` for the cron invocation and scan for the 🥗 / 🏁 title-prefix log lines emitted from the slot handler.

### MCP / connection state — supersedes v9.16

- **Vercel MCP** ✅ now scoped to the NextSplit team. Verified working in-session: `list_deployments`, `get_deployment`, `get_runtime_logs`, `web_fetch_vercel_url`. `get_access_to_vercel_url` mints platform-auth bypass links good for 23h (does NOT bypass app-level Supabase auth).
- **GitHub MCP** ✅ unchanged from v9.16. Scope-locked to `nextsplit/nextsplit-v2`.
- **Supabase MCP** ⚠️ unchanged — still loaded-but-not-exercised; confirm scope = project `wlrmeiczqgmharvfmalq` before any DB work via `list_projects`.
- **curl outbound to nextsplit.app** ❌ still WAF-403 from sandbox, but **finding now obsolete** — use `web_fetch_vercel_url` instead.

### Next dev block

Unchanged from v9.16 — Phase 4 entry gate. See v9.16 section below for the two-candidate breakdown.

---

## ✅ PR #80 merged + verification debt (11 May 2026, 12:54 UTC)

The Track 1 close-out branch (`claude/track1-closeout-track1.5-WyXKk`) landed on `main` as merge commit `474d232`. CI was green (TypeScript + ESLint + Tests + Vercel Preview Comments). Local main fast-forwarded clean.

### Verification debt — open

None of this is browser-tested in production. R2 was explicitly a behaviourless refactor per commit messages, but "zero behavioural change" can only be verified by clicking. **Carry this debt into the next session.**

Attempted in-session smoke-test failed for environmental reasons:
- `curl https://nextsplit.app/<route>` returns **403 on every route including `/`** — Vercel WAF / anti-bot filter on the sandbox's IP / TLS fingerprint. Real user-agent header did not bypass.
- Vercel MCP `list_teams` returned `{ "teams": [] }` — the MCP is authenticated to an empty workspace, not the NextSplit team. Deployment status / runtime logs / runtime-error feeds are unreachable.

Smoke-test order (10-min human job on phone or desktop, highest blast radius first):

1. **`/community`** — should redirect to `/squad?tab=discover`. Silent dead-end if broken (bookmarks + notification links).
2. **`/squad?tab=discover`** then **`/squad?tab=mine`** — tab strip toggles, URL param updates, Discover surface shows Feed / Clubs / Challenges / Races / Leaderboard.
3. **`/explore`** — 3-card landing renders (Find a coach / Browse plans / Squad). Squad card is smart — "Open My Squad" if in one, else Start/Join CTAs.
4. **`/coach`** — dashboard renders all sections (header / stats grid / filter chips / weekly load / tools grid). Invite + Broadcast modals open. Filter chips persist.
5. **`/home`** — at least one hero state renders (training day / rest day / streak at risk / no plan / coach mode).
6. **`/train`** — today session card renders. Banner cap: at most one ACWR/Gap banner visible. Fuel tab + week-detail sheet open.
7. **`/plan?tab=fuel`** — `RaceWeekFuelCard` renders correctly for `race_date` 0 / 3 / 7 / 14 days out + no-race case.

### Pre-Load Nudge cron — still untested behaviourally

Fastest verification path: manual `curl` with `CRON_SECRET` to `/api/cron/smart-notify`. Otherwise wait for next 14:00 UTC fire and inspect Sentry breadcrumbs + 🥗-prefixed rows in `notifications` table.

### MCP / connection state — next session

- **GitHub MCP** ✅ working (used for PR #80 create + merge verification this session). Scope-locked to `nextsplit/nextsplit-v2`.
- **Supabase MCP** ⚠️ tools loaded this session but not exercised. Confirm scope = project `wlrmeiczqgmharvfmalq` before any DB work via `list_projects`.
- **Vercel MCP** ❌ authenticated to **empty workspace** (zero teams). If next session needs deployment status, runtime logs, runtime-error feeds, or `deploy_to_vercel`, the Vercel MCP token must be rotated to one scoped to the NextSplit team. Workaround if not rotated: rely on GitHub MCP for PR-level CI signal; rely on founder for prod observability.
- **curl outbound to nextsplit.app** ❌ Vercel WAF returns 403 from this sandbox's IP regardless of UA. Not fixable from inside the sandbox.

### Next dev block

Per HANDOFF v9.14/v9.15: **Phase 4 entry gate**. Two ready candidates:
- **P4.0 retention bar** — code work, unblocks paywall flip.
- **ICO registration £40** — founder admin, unblocks paying-coach acquisition + marketing.

Founder admin still RED (carried unchanged): ICO registration · Companies House · `STRAVA_CLIENT_ID` + `STRAVA_CLIENT_SECRET` on Vercel Production · delete `VERCEL_DEPLOY_HOOK` GitHub repo secret.

---

## How to Start a New Session

**Read order:** `CLAUDE.md` → **this file (state)** → `docs/ROADMAP.md` (direction).

Then run:
```bash
cd /home/claude/nextsplit-v2
git pull origin main
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "Cannot find module\|jsx-runtime" | head -20
```

Then push any changes using:
```bash
git add -A && git commit -m "type: description"
git push https://ghp_YOUR_PAT@github.com/NextSplit/Nextsplit-v2.git main
```

**Deploy:** auto-deploy on push to `main` is working. PR checks surface Vercel build failures — if a check goes red, read the Vercel log first; don't reach for webhook diagnostics.

**Branch tagging gotcha (Session 11, 7 May):** Vercel only tags a build "Production" if its commit is on the production branch (`main`). Builds from `claude/*` feature branches succeed but get tagged "Preview" — they don't go to nextsplit.app on their own. Two ways to ship feature-branch work live: (a) **merge to `main` via PR** — preferred, keeps source of truth and live site aligned, and Vercel auto-promotes the merge; (b) **manually promote a Preview** from the deployment's `⋯` menu in Vercel — fast, but leaves `main` behind reality, so the next push to `main` will revert the live site.

Claude Code sessions auto-create a `claude/<task>-<hash>` branch and develop there. They never push to `main` directly. To ship: open a PR from the Claude branch to `main` and merge — that's what produces a Production deploy.

If you ever add a cron to `vercel.json`, it must fire **once per day or less** while we're on Hobby (e.g. `0 14 * * *` ✓, `*/30 * * * *` ✗, `0 9,14,18 * * *` ✗). Anything more frequent fails the deploy with `Hobby accounts are limited to daily cron jobs.`

---

## Product Position

**NextSplit** is a running training app built around social accountability. The core thesis: the number one predictor of long-term running consistency is having people who notice when you don't show up.

**Go-to-market strategy:** Athlete-first → athlete invites friends via squad → squad introduces coach → coach brings their full roster.

**Pricing:** Free tier (plans + basic logging) + Elite £7.99/mo founding price (AI coaching, ACWR, adaptive plans, squad leadership, coach marketplace). 500 founding member spots.

**Three pillars:**
1. **Bespoke digital coaching** — predetermined plans (17 templates), AI-generated plans, coach-authored plans. All VDOT pace-personalised.
2. **Squad / Split Leader** — private accountability squads of up to 5. Orbital UI, nudges, leaderboard, collective goals.
3. **Coaching marketplace** — verified coaches, plan marketplace, athlete management tools.

---

## Current App State (May 2026)

### Navigation (5-tab athlete · 4-tab coach)

**Athlete mode (default):**
| Tab | Colour | Content |
|-----|--------|---------|
| 🏠 Home | `#00d4ff` cyan | Smart dashboard — 6 hero states, daily quests, streak widget, today's race teaser |
| 📅 Train | `#ff3d6e` coral | SVG illustrated plan path + today sessions + week tap sheet |
| 🏁 Race | `#ff3d8b` magenta | Daily 5K + weekly 10K + monthly half. Boost picker + replay animation. (PR #30) |
| 👥 Squad | `#7fff4d` lime | Squad orbit + leaderboard + nudge — see squad-mate kit colours on race results |
| ⭐ You | `#ffb800` amber | HeroCard + BuildClassCard + WeeklyXPChart + Inventory link |

**Coach mode (athlete tabs minus Race + plus Coach):** Home / Train / Coach / You. Race intentionally omitted (athlete-only feature for V1).

### Features Built ✅
| Feature | State | Notes |
|---------|-------|-------|
| Auth (email + Google OAuth) | ✅ Live | |
| Full onboarding (4 paths) | ✅ Live | Predetermined / AI bespoke / Manual / Lifestyle |
| Plan browser (17 templates) | ✅ Live | Filterable by distance, level, duration |
| Plan activation + VDOT personalisation | ✅ Live | Race date alignment warning |
| AI plan generation | ✅ Live | Claude Sonnet 4, 8000 token plans |
| Session logging (LogModal) | ✅ Live | Effort, km, pace, notes |
| Session celebration | ✅ Live | Full screen confetti, XP float, Splity, sound, haptics |
| SVG illustrated plan path | ✅ Live | 5 environments, animated runner, progress arcs |
| Week tap → session sheet | ✅ Live | Tap any week node to see sessions, tap to log |
| Daily quests | ✅ Live | 3 quests/day, XP rewards, progress bars |
| Streak widget | ✅ Live | Pulsing amber when active, red warning at evening |
| XP + levelling system | ✅ Live | 20 levels, runner classes |
| Squad orbital UI | ✅ Live | Circular orbit, swipe to focus, per-member stats |
| Squad member detail page | ✅ Live | 7-day heatmap, plan progress, nudge button |
| Nudge system | ✅ Live | 6 message options, rate-limited 1/day |
| Explore → squad inline | ✅ Live | Shows squad card if in squad, join/create if not |
| You tab (4 sub-tabs) | ✅ Live | Achievements / Character / Stats / Account |
| Dark-only visual system | ✅ Live | Deep navy `#0a0e1a` base, vivid accents, single mode |
| Bold & bright colour system | ✅ Live | Cyan/coral/cobalt/lime/amber/violet palette |
| Coach application flow | ✅ Live | Split Leader vs Professional coach |
| Plan browser (marketplace) | ✅ Live | Browse / My Plans tabs |
| AI coach chat | ✅ Live | In Explore → AI tab |
| Strava connect | ✅ Built | Not wired to env var |
| Push notifications | ✅ Built | VAPID, Android Chrome |
| PWA (installable) | ✅ Live | Manifest, service worker |
| UAT test suite | ✅ Built | Playwright + DB verify + 105 manual cases |
| Back buttons | ✅ Fixed | Coaches, squad create, settings |
| Re-onboarding | ✅ Fixed | Archive plan → skips to step 7 (Goals), not step 1 |
| **Character system V1** | ✅ **Live** | Build-class picker on `/you` (PR #28). 14-PR roll-up — see "Character system V1 — CLOSED" above. |
| **Race tab** | ✅ **Live** | 5th bottom-nav tab. Daily 5K + weekly 10K + monthly half. Boost picker + 11-waypoint replay (#29/#30/#33/#36/#41). |
| **Class-weighted XP + race outcomes** | ✅ **Live** | `award_session_xp` + deterministic `simulate_race`. Engagement-pro-rata multiplier 1.0/1.3/1.6/1.8× wired into 5 sites (#28/#29/#31/#36). |
| **Random loot drops** | ✅ **Live** | ~2% per session log via `roll_random_drop` RPC. Loot toast deep-links to inventory (#34/#35). |
| **Inventory + cosmetic activation** | ✅ **Live** | `/you/inventory` boosts grid + cosmetics by slot. Active kit_colour drives HeroCard runner SVG; aura on race-replay; banner flame trail behind avatar (#35/#38/#41). |
| **Stripe checkout for boosts/cosmetics** | ✅ **Live** | One-time payment via `/api/character/inventory/purchase`. Webhook `character_inventory` branch idempotent per stripe_session_id (#37/#39). |
| **Streak + daily quest reward grants** | ✅ **Live** | 7/30/60/90/180/365-day milestones + 4 daily-quest predicates re-evaluated server-side (#37/#40). |

### Features Pending / Partial
| Feature | State | Notes |
|---------|-------|-------|
| Stripe payments | ⚠️ Partial | Code built, signed up to Stripe, keys not confirmed in Vercel |
| Resend email | ⚠️ Partial | Code built, key status unknown — needs confirming in Vercel |
| AI plan double sessions | ⚠️ Partial | Prompt fixed, needs testing with new plan generation |
| Plan activation error | ⚠️ Partial | Zod fix deployed, needs real-device confirmation |
| Squad/squad page 404 | ⚠️ Check | `/squad/` trailing slash issue |
| Strava OAuth | ⚠️ Built | Not connected to live Strava app |
| Coaching marketplace | ⚠️ Partial | UI built, no live coaches yet |
| ACWR chart | ⚠️ Unlocks | Shows after 4+ sessions logged |
| Lifecycle emails (cron) | ⚠️ Partial | Built, needs RESEND_API_KEY confirmed |

---

## Visual System (single mode — never change)

```css
/* Base */
--color-bg:           #0a0e1a;   /* Deep navy */
--color-surface:      #111827;
--color-surface-2:    #1a2235;
--color-surface-3:    #243048;
--color-border:       rgba(99,130,255,0.12);
--color-border-2:     rgba(99,130,255,0.22);
--color-text-primary:   #f8faff;
--color-text-secondary: rgba(248,250,255,0.72);
--color-text-tertiary:  rgba(248,250,255,0.38);

/* Brand colours */
--ns-cyan:    #00d4ff;   /* Brand anchor, Home tab */
--ns-ember:   #ff3d6e;   /* Athlete/CTA, Train tab */
--ns-cobalt:  #4d8aff;   /* Plan/data */
--ns-lime:    #7fff4d;   /* Squad, Split Leader */
--ns-amber:   #ffb800;   /* XP/gold, You tab */
--ns-violet:  #a855f7;   /* Coach */
--ns-forest:  #00e676;   /* Success/easy run */
--ns-magenta: #ff2d9e;   /* Level up, special moments */
```

**No light mode. No toggle. One consistent experience.**

---

## Environment Variables

### Confirmed in Vercel Production ✅
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
NEXT_PUBLIC_SENTRY_DSN
SENTRY_AUTH_TOKEN
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_PREMIUM_ENFORCED=false
ADMIN_EMAILS=nextsplitplans@gmail.com
```

### Needs Confirming / Adding ⚠️
```
STRIPE_SECRET_KEY              — signed up to Stripe, key needs adding to Vercel
STRIPE_WEBHOOK_SECRET          — set up after adding secret key
STRIPE_PRICE_FOUNDING_MONTHLY  — create price in Stripe dashboard
STRIPE_PRICE_FOUNDING_ANNUAL   — create price in Stripe dashboard
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
RESEND_API_KEY                 — check if this is in Vercel already
```

### Future (not needed yet)
```
NEXT_PUBLIC_REFERRAL_ENABLED=false  — flip to true when referral goes live
NEXT_PUBLIC_VAPID_PUBLIC_KEY        — for push notifications
```

---

## Database

**Production:** Supabase project `wlrmeiczqgmharvfmalq`
**Staging:** nextsplit-staging (separate project, same schema)

### Tables (all migrated ✅)
`profiles` · `user_plans` · `training_logs` · `plan_templates` · `squads` · `squad_members` · `squad_invites` · `squad_nudges` · `squad_feed` · `coach_profiles` · `coach_athletes` · `coach_messages` · `coaching_subscriptions` · `coach_earnings` · `ai_usage` · `notifications` · `push_subscriptions`

### Key RPCs
`computeStreakForUser` · `getACWR` · `can_nudge` · `marketplace_coaches` · `squad_monthly_km`

### Test Account
```
Email:    uat@nextsplit.app
Password: UATtest2026!
Created by: scripts/uat-db-verify.ts
```

---

## Key File Locations

```
src/app/home/HomeClient.tsx          Smart Home dashboard (6 states)
src/app/train/TrainClient.tsx        Train tab (path + today + week sheet)
src/app/explore/ExploreClient.tsx    Explore (4 tabs, inline squad)
src/app/profile/ProfileClient.tsx    You tab (4 sub-tabs)
src/app/squad/SquadPageClient.tsx    Squad page wrapper
src/app/squad/SquadOrbit.tsx         Circular orbital squad UI
src/app/squad/member/[userId]/       Member detail page
src/app/onboarding/                  All 4 onboarding paths
src/app/api/squad/                   Squad API routes
src/app/api/ai/                      AI routes (coach, generate, adapt)
src/app/api/plans/activate/          Plan activation
src/app/api/stripe/                  Stripe (checkout, webhook, connect, portal)

src/components/SessionCelebration.tsx  Full screen post-log celebration
src/components/DailyQuests.tsx         Daily quest strip
src/components/plan/PlanPathSVG.tsx    SVG illustrated plan path
src/components/LogModal.tsx            Session logging modal

src/lib/rpg.ts           XP, levels, runner classes
src/lib/vdot.ts          Pace calculator
src/lib/stripe.ts        Stripe singleton
src/lib/schemas.ts       All Zod schemas
src/lib/squad-nudges.ts  8 nudge message templates

src/hooks/useActivePlan.ts      Active plan + weeks data
src/hooks/useAllTrainingLogs.ts All logs for current user
src/hooks/useSquad.ts           Squad state
src/hooks/useProfile.ts         Profile + RPG data
src/hooks/useSubscription.ts    Pro/free status
```

---

## Council & Forge — multi-agent review and ideation

The repo now has two slash commands backed by 24 agent charters in `.claude/agents/`:

- **`/council <proposal>`** — multi-agent **review**. Auto-detects scope, runs Tier A always-on (9 roles) plus Tier B auto-included (6 roles) in a two-round protocol; `ns-synthesizer` produces a SHIP / SHIP-WITH-FOLLOWUP / HOLD / ESCALATE verdict with forced pre-mortem.
- **`/forge <topic>`** — multi-agent **ideation**. Right-sized roster (LEAD generates, CONSULT adds lens), preset table maps topics to rosters; `ns-shortlister` produces a 2-4 option shortlist with named recommendation and pre-filled `/council` handoff.

Both systems are opt-in and built to right-size by default. See `.claude/agents/README.md` for the full system docs (when to use what, antagonist pairs, founder-override, output contracts).

The **inaugural council pass** ran on the PlanPathSVG redesign in Session 10 (commit `562a384`) — produced SHIP-WITH-FOLLOWUP with three pre-ship blockers all addressed, plus follow-up tickets (below) logged for post-F1.

## What's Next

> **Direction now lives in [`docs/ROADMAP.md`](docs/ROADMAP.md)** — the single source of truth for all planned delivery, threads (T1-T10), phases (P0-P4), and persona coverage (A-F). HANDOFF tracks _state_; ROADMAP tracks _direction_.
>
> Read `docs/ROADMAP.md` at the start of every session, after this file.

### Session-resume checklist (state verifications only)

Quick checks to confirm the deployed app matches the codebase before doing any work. Everything else is in ROADMAP.

**Resume entry-point (top priority next session):**

0. **NO OPEN PRS — all 11 session PRs are merged.** Code-only backlog is exhausted; everything remaining needs F1 data, council passes, or external API work (Stripe, ICO, Strava developer console).

1. **NEXT GATING EVENT: F1 friend test (P1.8).** 4-5 real runners on real Android devices over 1-2 weeks. F1 data unlocks:
   - **P2.1** squad-tab IA decision — keep or demote based on `/squad` engagement (≥3 of 4-5 testers visit /squad ≥3x/week unprompted = keep)
   - **P2.5** daily-log friction audit — real friction reports, not synthetic
   - **P2.7 hard-deload council** — what does "ACWR-aware adapt" mean concretely (4 design options enumerated; needs council T7 + content-copy)
   - **P3.9** squad nudge effectiveness — A/B over alternate templates needs baseline conversion data
   - **P3.8** retention dashboard cohort numbers — `/admin/retention` is built and starved of real cohort data
   - **Phase 4 readiness** — P4.0 retention bar can only be evaluated against real D1/D7/D30

2. **Phase summary after this session:**
   - **Phase 1 — closed.** All 9 items shipped. L2/A1 full structural splits deferred (cosmetic).
   - **Phase 2 — 6/7 shipped.** P2.1 + P2.5 + P2.7-hard-deload all gated on F1 / council.
   - **Phase 3 — 9/11 shipped + P3.12 observability polished.** P3.4 + P3.7 stripe-blocked; P3.9 F1-gated.
   - **Phase 4 — not started.** Gated on P3.8 retention bar clearing post-F1.
   - **Cross-cutting backlog:** BL-X4 + BL-X5 + BL-X7 + BL-X8 done. BL-X1/X2/X3 partial (minimal splits). BL-X6 partial (timezone shipped, unit_pref + week_start open).

3. **What's live on nextsplit.app** (after merges of PR #4-#11):
   - **P1.x stack:** P1.0a schema (squad_feed CHECK + RPC + share_logs_with_squad + INSERT lockdown). P1.1 social loop end-to-end (squad-feed RPC + post-log celebration affirmation + ACWR-band Splity reaction line + NudgeSquadPill on /today + iOS standalone push gate). P1.0 partial decomposition (useUndoCountdown + useSessionLogging + useLogFormState hooks). P1.2 PECR (posthog.init waits for cookie consent). P1.3 server-side paywall (PREMIUM_ENFORCED env-only). P1.4 6 CSS tokens. P1.5 Splity discipline. P1.6 PostHog taxonomy + timezone enrichment.
   - **P2.x stack:** P2.2 lean YouClient at `/you` (HeroCard + XP + badges + Settings link). P2.3 referral 5-log reward via SECURITY DEFINER RPC. P2.4 lifecycle email bank (already-built — 7 templates + cron). P2.6 motion audit + `docs/motion.md`. P2.7 in-app: Week3Reanchor full-screen + acwr_chart pro→free + per-user timezone gate on smart-notify + soft-deload (AcwrAdvisoryBanner + GapRecoveryBanner).
   - **P3.x stack:** P3.1 coach dashboard v2 (streak + days_since_message tiles + amber flags). P3.2 plan-assign (RPC + bottom-sheet picker in PlanBuilderClient). P3.3 push on coach↔athlete message. P3.5 athlete filter chips. P3.6 review submission form. P3.8 `/admin/retention` cohort dashboard. P3.10 squad seasons snapshot RPC + smart-notify month-1 piggyback + SquadSeasonCard. P3.11 PlanPath animateMotion runner trace + race/deload glyphs. P3.12 Strava OAuth feature-tagged Sentry alerts.
   - **SquadFeed stack:** recipient view + 5-emoji reactions + Load more pagination + Supabase realtime subscription + reaction → push notifications.
   - **Backlog stack:** BL-X4 squad_nudges_recipient_recent index. BL-X5 training_logs_user_logged_at index. BL-X7 anonymous→authenticated PostHog stitching (useProfile.ts:64). BL-X8 Sentry coverage on /admin/retention + Strava OAuth/sync.

4. **Migration log (apply-order, all live in Supabase):**
   1. `phase-p1-0a-schema.sql` — squad_feed CHECK + RPC + lockdown
   2. `phase-p2-3-referral-reward.sql` — referral_reward_months + credit_referral_reward_if_eligible RPC
   3. `phase-p2-7-timezone.sql` — profiles.timezone
   4. `phase-p3-10-squad-seasons.sql` — snapshot_squad_seasons_for_month RPC
   5. `phase-bl-x4-x5-indexes.sql` — squad_nudges_recipient_recent + training_logs_user_logged_at

5. **Founder admin remaining (no code can replace these):**
   - **£40 ICO registration** (privacy.tsx:25 placeholder waiting for the number) — no time pressure pre-F1; required before any payment flow ships
   - **Sentry alert rule on `tags.feature`** (recommended) — set `tags.feature = "p3.12-strava-oauth" OR tags.feature = "p3.8-retention-dashboard" OR tags.feature = "p1.1-squad-feed" OR tags.feature = "p2.3-referral" OR tags.feature = "p3.3-messaging"` with threshold ≥ 1 event / 5 min → notification. Catches every shipped server-action regression in one rule.
   - **Stripe Connect verification** (when ready for P3.4 / P3.7 / P4.x)
   - **Strava developer console** (when ready to flip P3.12 from observability-only to active-marketing)

6. **Deferred resume candidates** (none blocking; do these only if you want code work in the F1 wait):
   - **L2** — LogModal full BasicEntry/AdvancedEntry/SaveControls structural split (current: minimal `inputs.tsx` extraction). 2h, no bug-fix value, typecheck-cycle risk.
   - **A1** — AthleteDetailClient full 4-section split (current: minimal `charts.tsx` extraction). Same shape as L2.
   - **BL-X6 partial** — `profiles.unit_preference` + `profiles.week_start` columns + capture flow (timezone already shipped P2.7).
   - **Reaction grouping** in push notifications (aggregate "3 people reacted" rather than 3 separate pushes). Off-roadmap.
   - **SquadFeed delete-old-rows** maintenance job (year-old session_logged rows are dead weight). Off-roadmap.

7. **F1 readiness checklist** (run before friends start logging):
   - [ ] Test account confirmed in at least one squad with 1+ other test accounts (so the loop is observable)
   - [ ] Push subscriptions enabled on test devices (PWA installed + Notification permission granted)
   - [ ] PostHog production project receiving events (verify in PostHog Live Events)
   - [ ] Sentry alert rule set per item 5 above
   - [ ] HANDOFF and ROADMAP up to date for next-session resume (this v9.8 + ROADMAP v0.4 covers it)
   - [ ] /admin/retention loads cleanly with current (likely empty or near-empty) cohort data
   - [ ] One real test charge through Stripe (Open Q #6) — recommended before F1, required before paywall
1. **Verify nextsplit.app shows the latest redesign** — deep navy, Splity in hero, 4-tab nav without labels, single violet finish arch framing single ember finish flag, refined water surface, refined tree density.
2. **Confirm Stripe keys live in Vercel** — already in env vars list. (Roadmap: P0 OP2)
3. **Confirm Resend key live in Vercel** — already in env vars list. (Roadmap: P0 OP2)
4. **Device-test plan activation** — Session 10 added `details[]` surfacing in all 5 callers; any Zod failure now shows the failing field name. (Roadmap: P0 OP3)
5. **Device-test AI plan generation** — confirm double-session gym days render. Session 10 fixed `{type,name,detail}` ↔ `{c,n,det}` shape mismatch via `normalizeAIWeeks()`. (Roadmap: P0 OP3)
6. **Smart-notify** — single 14:00 UTC fire. Sundays "Weekly wrap"; other days "Keep the streak" if active plan and no log. One per user per day max. P1.x will absorb leader-nudge and at-risk-member dispatch into this same route (placeholders marked).
7. **3-template regression spot-check on PlanPathSVG** — 8wk 5K, 16wk half, 24wk marathon. One arch + one flag at the end; no overlapping trees; coastal water reads as a surface.

Everything below this line — F1 friend test, paywall flip, marketplace, security audit, ICO registration, animateMotion runner, periodisation glyphs, Trophy Room, seasons, Strava OAuth, etc. — has been absorbed into `docs/ROADMAP.md` with thread + phase + persona tagging. **Do not duplicate it here.**

---

## UAT Assets

```bash
# 1. Create test user + verify DB integrity
SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/uat-db-verify.ts

# 2. Run Playwright E2E suite
BASE_URL=https://nextsplit.app \
UAT_EMAIL=uat@nextsplit.app \
UAT_PASSWORD=UATtest2026! \
npx playwright test src/test/e2e/uat-full.spec.ts

# 3. View HTML report
npx playwright show-report

# Manual: UAT-SCRIPT-V1.md — 105 test cases across 10 sections
```

---

## Commit History (Sessions 8–11, May 2026)

### Session 11 (7 May 2026) — Council/forge + Session 10 work merged to main

Session 10's work was confirmed live by manually promoting a Preview deployment to Production in Vercel (commit `a2d36e1`). After that, `claude/new-session-2Ldeo` was merged to `main` as PR #2, restoring source-of-truth alignment between `main`, the production branch, and nextsplit.app. The Vercel preview-vs-production tagging behaviour that caused the confusion is now documented in the Deploy section above.

| Commit | Description |
|--------|-------------|
| `3326449` | Merge pull request #2 from `NextSplit/claude/new-session-2Ldeo` — brings council, /forge, plan-path redesign, smart-notify cron fix, and HANDOFF v9.2 onto main |

### Session 10 (6 May 2026) — Deploy unblock + plan-activate hardening + visual redesign + council & forge multi-agent systems

The single most productive session of the project. Eight commits land together on merge.

| Commit | Description |
|--------|-------------|
| `3245781` | fix: surface Zod `details[]` in all 5 plan-activate callers (PlanBrowse, AI/Manual/Lifestyle onboarding, PlanGenerationScreen) + add `normalizeAIWeeks()` to remap AI plan output `{type,name,detail}` → canonical `{c,n,det,km}` so gym pills, pace personalisation and session styling work on AI-generated plans |
| `8b84582` | fix: reduce smart-notify cron to once daily (`0 14 * * *`) — the **actual** fix that unblocked auto-deploy. Hobby tier rejects multi-fire crons; Session 9's "webhook" diagnosis was wrong |
| `23a88ef` | docs: HANDOFF v9.1 — deploy unblocked, real root cause documented; ACTIVE BLOCKER section replaced with post-mortem |
| `1ebb0bf` | refactor: smart-notify dispatch consolidated for once-daily Hobby cron — Sundays send "Weekly wrap"; Mon-Sat with active plan and not-logged send "Keep the streak"; one notification per user per day max |
| `2942cda` | fix(train): solid sticky header (no more bleed-through), log modal clears bottom-nav (z-[60] + 60px+safe-area marginBottom on inner panels for all 4 mode branches), Fuel tab empty state (was rendering null when planDay.nut was empty) |
| `c786c5c` | feat: NextSplit council — 23 agent charters in `.claude/agents/` (Tier A always-on, Tier B auto-included by scope keyword/file matching, Knowledge-base dormant) + `/council` slash command running two-round protocol with `ns-synthesizer` producing SHIP/HOLD/ESCALATE verdict + forced pre-mortem |
| `562a384` | feat(plan-path): single composed finish moment (violet arch frames ember flag, deleted duplicate FINISH banner), water as `<pattern>` band (replaces N stacked Wave glyphs), forest density capped 6→4 trees per side, hex tokenised to `--ns-*` vars, role="img"+`<title>`, 44×44 hit-rect per week node, reduced-motion gate on pulse animation, 100dvh container + safe-area-inset-bottom — implements the inaugural council pass's SHIP-WITH-FOLLOWUP verdict |
| `e3d7408` | feat: NextSplit `/forge` ideation orchestrator (sibling to `/council`) — preset roster table maps topic-keyword sets to LEAD/CONSULT splits, two-round protocol with implicit cluster framing (STRATEGY/EXPERIENCE/ENGINEERING/DOMAIN/RISK), `ns-shortlister` produces 2-4 option shortlist with named recommendation and pre-filled `/council` handoff. Three modes: default, `--quick` (top 2 LEAD, single round), `--wide` (all 23, two rounds, auto-promoted by end-to-end keywords) |

### Session 9 (May 2026) — Deploy diagnosis (red herring)
Six commits pushed during a wrong-track investigation into "broken webhook delivery." None of them deployed because the real issue (Hobby cron-tier validation) was unrelated. Safe to leave on `main`; the GitHub Actions deploy-hook workflow they introduced is now redundant.

| Commit | Description |
|--------|-------------|
| `1f2e448` | ci: GitHub Action triggers Vercel deploy hook on every push (redundant — auto-deploy works fine) |
| `0ee3757` | ci: deploy workflow + HANDOFF |
| `f4f6ff8` | chore: verify deploy pipeline |
| `7e65a4c` | chore: verify Vercel auto-deploy after Git reconnect |
| `8bcff06` | chore: webhook test after Vercel GitHub App reinstall |
| `e7a8bba` | chore: deploy test after OAuth refresh |

### Session 8 (April–May 2026) — Redesign + features (now deployed via Session 10 fix)

| Commit | Description |
|--------|-------------|
| `0ee3757` | ci: deploy workflow + HANDOFF updated (no secrets in files) |
| `1f2e448` | CI: GitHub Action triggers Vercel deploy hook on every push |
| `926e6f9` | Fix: CSS @import order, useMyCoach confirmed fixed |
| `d400703` | Fix: useMyCoach import path (was blocking all builds) |
| `a02083b` | Feat: Strava auto-import, injury flag, training diary, training zones chart |
| `b466b6f` | Feat: 20-feature build — share card, weekly summary, pre-run brief, milestones, ElitePreview |
| `3d5218c` | Feat: Option E redesign — ultra-dark navy, Splity animated shoe, 4-tab nav, Home rebuild |

### Earlier (currently the live build on nextsplit.app)

| Commit | Description |
|--------|-------------|
| `d9cff8c` | feat: plan completion ceremony wired, squad leaderboard, onboarding final dark fixes, HeroNewUser Splity + AI-first, week completion detection |
| `1822dfa` | Daily quests, streak emotional widget, nudge wired, plan activation fix, onboarding polish (101 files) |
| `4965291` | Bold & bright visual system, week tap session sheet, ai_usage fix, AI plan generation fix |
| `5c87fc1` | Session celebration — confetti, XP float, level up, Splity, sound, haptics |
| `3b51b60` | SVG illustrated plan path — 5 environments, animated runner |
| `810c44a` | Dark-only mode, squad API includes leader, orbit full circle, Explore squad inline |
| `3b9ab86` | Visual plan path — winding path, week nodes, phase milestones |
| `45b9d22` | Squad orbital UI — circular orbit, swipe, member stats, invite slots |
| `f4da333` | Dark mode hydration fix, DarkModeToggle, LogModal safe area |
| `b61dc1c` | Full UAT suite — Playwright, DB verify, 105 manual cases |
| `1e5cd85` | Re-onboarding skips to step 7, handle check fix, handle pre-fill |
| `e4f1620` | Dark mode script, Home toggle, log modal, back buttons, gym double sessions |

---

## Business Context

- **Product:** NextSplit v2 (v1 frozen at nextsplit.github.io/NextSplit-Training-Tracker)
- **Founder:** Ash
- **Stage:** Pre-alpha, approaching friend test
- **Stripe:** Signed up, keys need confirming in Vercel
- **Legal:** Not yet incorporated. ICO and Companies House pending.
- **Pricing:** Elite £7.99/mo founding (500 spots), standard £9.99/mo. Annual £59.99/yr.
- **Coach pricing:** £29/mo platform fee for Pro coaches. 15%→8% sliding commission.
