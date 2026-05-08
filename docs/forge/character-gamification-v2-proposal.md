# Character Gamification V2 — Proposal for /council

**Companion to:** `docs/forge/character-gamification-v1.md` (round 1 ideation)
**Date:** 2026-05-08
**Status:** awaiting /council pass — DO NOT BUILD YET
**Founder framing decisions captured:** see "Locked constraints" below.

---

## 1. Why this exists

NextSplit's founding thesis is **squad-based social accountability** — someone notices when you don't show up. Character gamification is the proposed second retention layer: a digital twin whose progression is fed by IRL training, plus an async-race ecosystem where characters compete on a level digital field regardless of IRL ability.

The /forge v1 surfaced a thesis-level concern from `ns-devils-advocate` that no other agent named: **squad-as-safety-net (accountability) and squad-as-arena (competition) are opposing social contracts**. V1's recommendation was Option A (XP Ceremony only) to avoid that conflict.

Founder has now resolved the framing gate by:
- **Splitting the surfaces.** Squad tab stays the safety-net. **Race becomes its own 5th bottom-nav tab** with its own ecosystem.
- **Bridging via squad-vs-squad ekiden** races (relay-style team competition) — squads compete _together_, preserving the safety-net dynamic _within_ a squad while creating an _between-squad_ arena.
- **Decoupling race outcomes from IRL pace.** Race results are derived from character level + completion-fed boosts + class fit, NOT VDOT-anchored. This kills the "slow runners feel consistent loss → churn" attack: a C25K runner and a 30K MP runner level at the rate of *completion*, not *pace*.

This proposal is **Option C / Full Vision** committed (Phase 3+, ~4-8 weeks dedicated workstream). V1 lite is no longer the path.

## 2. Locked constraints (founder-decided, /council does NOT re-litigate)

- **Async races only.** Server-side simulation; result animation plays back on next app open.
- **Pay-to-win closed at the DB layer.** Performance boosts come ONLY from training milestones, never from cash. Cosmetics buyable.
- **Race outcomes are completion-based, NOT VDOT-anchored.** Character power = cumulative session-completion XP + boost stack + class fit. Does not read VDOT.
- **Daily-progression-cap honesty enforced at the DB layer.** `training_logs_logged_at_not_future` CHECK shipped in PR #22.
- **Race becomes the 5th bottom-nav tab** (Home / Train / Race / Explore / You). Founder accepts the small-screen cramping cost for discoverability.
- **All five race formats** ship: daily 5K sprint + weekly marquee + monthly major + on-demand 1v1 challenges + squad-vs-squad ekiden.
- **Squad surface = safety-net; Race surface = arena.** Two distinct emotional contracts. Ekiden bridges them.
- **Habitica-grade detailed customisable pixel art.** Aseprite atlas pipeline confirmed.
- **Coaches get pixel-art identity avatars** — animated representation visible on coach profile, in athlete plan view, in marketplace listings, in coach dashboard. Coaches do NOT race against each other.
- **Engagement-pro-rata boost rate** — Free / Elite / Elite+coach / Elite+marketplace plan tiers earn XP at progressively higher rates, prorated to revenue contribution to NextSplit. Boosts themselves still come from training; only the *rate* of earning is enhanced. Concrete ratios deferred to /council.

## 3. Spec

### 3.1 Schema (new tables — 4 + extensions)

```
characters
  user_id uuid PK references profiles(id)
  class text check (class in ('track_star','trail_champion','marathon_monster')) not null
  level int not null default 1
  xp bigint not null default 0  -- cumulative; level derived
  speed_stat int not null default 0
  endurance_stat int not null default 0
  resilience_stat int not null default 0
  active_cosmetics jsonb not null default '{}'  -- { hat: 'cap_bronze', shoes: 'roadrunner_red', ... }
  created_at + updated_at
  RLS: own row + squad members read via existing is_squad_member RPC

character_inventory
  id uuid PK
  user_id uuid FK profiles(id)
  item_slug text  -- 'gel_caffeine_30g', 'electrolyte_endura_500ml', 'medal_bronze_5k', ...
  item_type text check (item_type in ('boost_consumable','cosmetic','medal'))
  source text check (source in ('training_milestone','elite_grant','partner_sponsor','race_reward')) not null
  granted_at timestamptz not null default now()
  consumed_at timestamptz null  -- null = unused
  consumed_in_race uuid FK races(id) null
  RLS: own row only; INSERT REVOKED FROM authenticated, SECURITY DEFINER RPC grant_milestone_boost only

races
  id uuid PK
  format text check (format in ('daily_5k','weekly_marquee','monthly_major','on_demand_1v1','squad_ekiden'))
  distance_m int not null  -- virtual
  starts_at timestamptz not null
  resolves_at timestamptz not null
  league_id uuid FK leagues(id) null
  rng_seed bigint not null
  finalized_at timestamptz null
  RLS: SELECT public; INSERT service_role only

race_entries
  id uuid PK
  race_id uuid FK races(id)
  user_id uuid FK profiles(id)
  squad_id uuid FK squads(id) null  -- ekiden
  ekiden_leg_index int null  -- 0..4 for 5-runner relay
  character_snapshot jsonb not null  -- { level, class, speed, endurance, resilience, active_cosmetics }
  boost_loadout jsonb not null  -- [{ inventory_id, slot: 'gel'|'drink' }]
  predicted_finish_secs int null  -- pre-computed at entry
  RLS: SELECT same-race + same-squad readable; UPSERT own row only; entry locked once race.starts_at

race_results
  race_id uuid PK FK
  result_timeline jsonb not null  -- per-runner per-100m positions, computed deterministically from seed+entries
  finishing_order jsonb not null  -- [{ user_id, finish_secs, rank, rewards: [...] }]
  computed_at timestamptz not null
  RLS: SELECT same as race_entries

leagues
  id uuid PK
  tier int not null  -- 1 = top, increasing
  format text  -- 'daily_5k_global', 'weekly_marquee_uk', etc.
  starts_at + ends_at
  RLS: SELECT public

league_members
  league_id uuid FK leagues(id)
  user_id uuid FK profiles(id)
  joined_at + season_score int default 0
  PRIMARY KEY (league_id, user_id)
  RLS: own + same-league readable

(extensions to profiles)
  +xp_rate_multiplier numeric default 1.0  -- materialised from tier+coach+marketplace; updated on subscription change
```

### 3.2 RPCs (SECURITY DEFINER + auth.uid() body checks, audit-pattern-compliant)

- `enter_race(p_race_id, p_boost_loadout)` — validates ownership of boosts, race not yet started, user not already entered. Inserts race_entries row.
- `simulate_race(p_race_id)` — service-role-only via `REVOKE EXECUTE FROM authenticated`. Triggered by cron at race.resolves_at. Computes deterministic result_timeline + finishing_order from rng_seed + entries.
- `claim_race_rewards(p_race_id)` — caller-owns. Grants race-reward inventory rows for the caller's finishing position.
- `grant_milestone_boost(p_milestone_id)` — service-role-only. Triggered by training-log writes that cross milestone thresholds. Inserts character_inventory with source='training_milestone'.
- `recompute_xp_rate_multiplier(p_user_id)` — service-role-only. Triggered by subscription-state change. Reads is_pro / has_coach / has_marketplace_plan, writes profiles.xp_rate_multiplier.
- All 5 RPCs add `SET search_path = public, pg_temp` per the F2.4 hardening pattern.

### 3.3 Race simulation algorithm (deterministic)

For each runner in race_entries:
- `base_speed = character.speed_stat * (1 + class_fit_modifier(character.class, race.format))`
- `endurance_factor = character.endurance_stat / race_distance_kth_percentile` (capped 0.5..1.5)
- `boost_stack_modifier = sum(boost_loadout.effects)` (e.g. caffeine gel +3% for 30s, electrolyte +1% sustained)
- `rng_jitter = seeded(rng_seed, runner.user_id)` — small ±2% per-runner noise so results don't feel deterministic-flat
- `finish_secs = race_distance_m / (base_speed * endurance_factor * (1 + boost_stack_modifier) * rng_jitter)`

Result timeline stored as 100m-bucket positions for replay animation.

### 3.4 IA — 5th bottom-nav tab "Race"

```
/race
  → 'My Character' card (top of tab) — current level, class, stat bars, active cosmetics
  → 'Today's race' card — daily 5K sprint, entry CTA
  → 'This week's marquee' card — weekly race details, leaderboard preview
  → 'This month's major' card — monthly event with bigger cosmetic prize pool
  → 'Challenge a friend' CTA — picks from squad members + recent opponents
  → 'Squad ekiden' card — squad-vs-squad relay state (only renders if user has a squad)
  → 'Inventory' link → /race/inventory
  → 'Leagues' link → /race/leagues
  → 'Coaches' showcase strip (animated coach avatars) — entry to /coaches
```

Tab colour identity: TBD — proposed `--ns-magenta` or new accent. /council to weigh against existing palette.

### 3.5 Cross-surface character render

Single `<RunnerCharacter user variant="hero|orbit|icon|race-grid" />` component:
- `hero` (full pose, idle/run/celebrate states) — Home, Train, Race
- `orbit` (small sprite, idle only) — Squad orbital UI
- `icon` (head + torso, static) — squad feed avatars, profile thumbnail
- `race-grid` (small running sprite, animated) — race result replay

Asset pipeline: Aseprite atlas per class + per cosmetic-category. PNG sprite atlas + CSS `steps()` animation. ~4KB per atlas. Lazy-loaded per class via `dynamic(() => import('./avatars/X'), { ssr: false })`.

`prefers-reduced-motion` collapses to a static frame across all variants via `useReducedMotion()`.

### 3.6 Onboarding hook

Existing `CharacterCreationScreen.tsx` extended (NOT replaced) with a class picker step. Default class derived from training goals if user skips picker. New users get a starter character + tutorial daily-5K race that fires automatically on day 2 (after they've logged their first session) so the V1 race experience is seeded.

### 3.7 Engagement-pro-rata boost rate (deferred to /council)

The `xp_rate_multiplier` value derived from subscription state. **Concrete ratios for /council to propose 2-3 sets:**
- Modest: Free 1.0× → Elite 1.3× → +coach 1.6× → +marketplace plan 1.8×
- Punchy: 1.0× → 1.5× → 2.0× → 2.5×
- Per-tier finance/legal/UX trade-offs to assess.

### 3.8 Class system (deferred to /council)

Three options the v1 forge ranked, /council picks:
- Cosmetic only (no mechanical edge)
- Session-type-weighted XP edge (Track Star levels speed faster from intervals; Marathon Monster levels endurance faster from steady-state long; Trail Champion levels resilience faster from long/hill). All classes can race in all formats. **Founder leans this way given "build diversity layer" framing.**
- Hard class lock (Track Star only enters sprint races etc.)

### 3.9 Coach character treatment

Pixel-art identity avatars for coaches in same Aseprite style. Visible on:
- Coach profile (`/u/[username]` if `is_coach`)
- Coach marketplace listings (`/coaches`, `/coach/[slug]`)
- Athlete's active-plan card
- Coach dashboard
Coaches do NOT race. Their character is identity + brand. Optional cosmetic unlocks tied to athlete count / earnings (e.g. "1000 sessions coached" badge on character).

### 3.10 Squad ekiden

Squad selects an ekiden (e.g. weekly Tokyo Ekiden, monthly Hakone Ekiden styled). Each squad member runs a leg. Aggregate finish time = squad's result. Ranking against other squads.

Recruitment: leader picks 5 members; each runs a leg = 1 entry per member. If a member doesn't enter their leg by lock time, the squad gets a penalty time for that leg (configurable; suggest 110% of leg-distance world-class baseline).

## 4. What /council should pressure-test

This is the input set we want council to interrogate:

1. **Does the squad/race surface split actually neutralise the original retention attack?** Devil's-advocate v1: "Race Room reframes squad as competitive arena vs safety net". Founder's split moves Race to its own tab. Does that actually solve it, or does the ekiden bridge re-introduce the conflict?

2. **Does completion-based race outcome create a new attack?** If a user logs every session and their character still loses to a more-engaged user with higher XP rate multiplier (Elite+coach+marketplace), is "I trained more than them but lost because they pay more" a worse churn signal than "I'm slower IRL"?

3. **Engagement-pro-rata boost rate ratios** — pick a set. Free vs Elite vs Elite+coach vs +marketplace. Which is defensible legally (no loot-box / Gambling Commission risk), retention-friendly, and meaningfully incentivises upgrades?

4. **Class system** — cosmetic only / session-weighted XP edge / hard class lock. Sport-science integrity vs UX simplicity vs build diversity.

5. **5-tab bottom nav** — does adding a 5th tab disrupt existing 4-tab IA discipline? Mobile-PWA + UX + visual-brand should weigh.

6. **Coach character without coach-vs-coach racing** — does the visual upgrade alone justify the schema + art cost? Or is racing essential for the coach surface to feel alive?

7. **Schema + RLS surface** — is the 4-table + extensions design right-sized, or under/over-engineered? Does it interact safely with existing tables (profiles, squads, training_logs)?

8. **Asset pipeline** — Aseprite atlas commission cost ($400-800/class × 3 classes + cosmetic items). When does the spend trigger relative to F1 retention signal?

9. **Future-date logging guard ALREADY shipped (PR #22)** — does that close the daily-cap honesty hole completely, or are there side channels (e.g. retroactive Strava sync of fake sessions)?

10. **Phase-3+ sequencing** — is 4-8 weeks realistic for full-vision build? What's the natural V1 inside that arc that we ship + measure F1 retention against before committing the rest of the budget?

## 5. Devils-advocate must address

- The forge v1 raised: "racing bypasses coach value-prop entirely; Race Room may grow user segment that never converts to paid coaching, cannibalising the revenue model." Does the engagement-pro-rata boost rate (Elite+coach = higher rate) plus animated coach characters in the Race tab actually channel users TOWARD coaching, or is it cosmetic flavour around an unchanged dynamic?
- "$400-800 art commission pre-F1 = textbook polish-instead-of-ship." Founder has committed to Full Vision but not specified WHEN art lands relative to F1 friend-test. Should art commission be triggered by a specific F1 retention signal, or shipped on schedule regardless?

## 6. Acceptance for /council pass

A council verdict (SHIP / SHIP-WITH-FOLLOWUP / HOLD / KILL) with named pre-ship blockers. If SHIP-WITH-FOLLOWUP, list the F1-friend-test follow-ups that must close before Phase 4 paywall flip.

If HOLD, propose either a smaller V1 within Full Vision (e.g. ship just daily 5K + character + basic class without the ekiden/marquee/league mechanics) OR a different framing that resolves the named blockers.
