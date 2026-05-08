# NextSplit — Master Handoff
**Version:** 9.12 | **8 May 2026** | **Canonical — replaces all previous HANDOFF files**
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

The audit + council work is now CLOSED for everything code-side. The next surface to build is the actual character gamification per `docs/forge/character-gamification-v2-proposal.md`. Open design questions for the next session before code starts:

1. **Class system mechanic** (cosmetic only / session-type-weighted XP edge / hard class lock) — /council deferred to founder.
2. **Engagement-pro-rata XP rate ratios** (modest 1.0/1.3/1.6/1.8× vs punchy 1.0/1.5/2.0/2.5×) — /council split.
3. **Schema drop order** — `user_characters` first (lightest table) or full `characters/character_inventory/races/race_entries/race_results/leagues` migration in one shot?
4. **Asset pipeline trigger** — founder direction is "build first, test later" so the Aseprite art commission doesn't have an F1 gate. When does the £400-800/class commission fire? Suggest: after V0 character select + class picker UI lands, before any race UI.

`/leaderboard` (PR #25) is the placeholder Race V0 surface until the full Race tab ships.

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

### Navigation
| Tab | Colour | Content |
|-----|--------|---------|
| 🏠 Home | `#00d4ff` cyan | Smart dashboard — 6 hero states, daily quests, streak widget |
| 📅 Train | `#ff3d6e` coral | SVG illustrated plan path + today sessions + week tap sheet |
| 🔍 Explore | `#7fff4d` lime | Coaches / Squads / Plans / AI — squad orbit if already in squad |
| ⭐ You | `#ffb800` amber | Achievements / Character / Stats / Account |

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
