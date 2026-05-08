# Character Gamification — /forge v1

**Topic:** Character gamification layer (V1 lite + Full vision arc)
**Date:** 2026-05-08
**Roster:** 13 active agents (6 LEAD + 7 CONSULT) + shortlister
**Founder seed:** Runner-character is the digital twin — central to identity, social signal to squad + coaches. Tamagotchi-like care. IRL training drives progression; character competes in async digital races. Solves retention, levels playing field across IRL ability, gives squads a 2nd social loop. F1 friend-test will measure retention lift.

**Founder-locked constraints:**
- Async races only (no real-time multiplayer in V1)
- Pay-to-win closed: cosmetics buyable; boosts ONLY from training milestones
- Daily progression cap tied to logging (only past/today, not future)
- Friend social loop: squad sees character progress; "race together IRL?" prompt
- Visual bar: Habitica-grade pixel art
- Cross-surface character: Home, Train, Squad, You, profile icon
- Class diversity: track star / trail champion / marathon monster
- Division/league ranking

---

## SHORTLIST + RECOMMENDATION

### FRAMING GATE — founder must resolve before any V1 ships

Devil's-advocate raised a thesis-level conflict no other agent named: **squad-as-safety-net (accountability) vs squad-as-arena (competition) are opposing social contracts.** Race Room puts friends in a competitive frame. If the majority user segment relies on squad as a safe space to show up imperfectly, Race Room may *increase* churn, not retention. This is not an implementation risk — it is a product-identity decision. All options below are evaluated against it.

### OPTIONS

#### Option A — V1 Lite: XP Ceremony + Token SVG Character (accountability-first)
- **Summary:** Log submit fires character react + challenge-squadmate CTA; Token SVG Splity ships; no commissioned art, no race room.
- **Benefits:** Closes accountability loop at peak emotional moment. Zero art spend; ships 1-2 weeks; fully reversible. SessionCelebration already exists — pm-tech-lead confirms 30-min audit.
- **Risks:** Animation fatigue (3rd celebration layer); cap at 1200ms + useReducedMotion. Thin on novelty; no competitive hook.
- **Effort:** small. **Reversibility:** high.
- **Endorsed by:** product-strategist (CONV 5), ux-designer (CONV 5), visual-brand (CONV 5), pm-tech-lead.
- **Validates with:** F1 testers complete log → squad feed flow; PostHog `xp_ceremony_fired` + `challenge_sent`.

#### Option B — V1 Lite: Text-Sim Race Room Squad-Only (competitive social signal)
- **Summary:** VDOT-seeded deterministic race; 24h reveal; CSS-only playback; no pixel art; squad-gated entry.
- **Benefits:** Adds second social signal. Deterministic seed + stored timeline = audit trail. Revenue lever via Elite-gated replays.
- **Risks:** 4-5 F1 squad = no competitive density. Squad-as-arena may damage retention for accountability-seeking majority. 2 infra PRs before user sees anything. iOS push zero without PWA install.
- **Effort:** med. **Reversibility:** med.
- **Endorsed by:** product-strategist (CONV 4), ux-designer (CONV 4), backend-data-engineer (CONV 5).
- **Validates with:** F1 testers complete one race; PostHog `race_entered` + `race_result_viewed` funnel.

#### Option C — Full Vision: Class-Divergence + VDOT Race Ladder + Cosmetic Scaffold
- **Summary:** Phase 3+. Aseprite pixel atlas per class, class-stat divergence, VDOT race sim, RPC boost wall, cosmetic slot scaffold, division/league.
- **Benefits:** Complete Habitica-grade experience. Pay-to-win-closed at DB. Class-stat divergence means volume doesn't dominate.
- **Risks:** $400-800 art commission = sunk-cost pressure pre-F1 evidence. JSONB snapshot unbounded growth on 500MB Hobby. VDOT sim doesn't level perceived playing field — slow runners feel loss. Single founder: 4-8wk bet-the-sprint scope.
- **Effort:** large. **Reversibility:** low.
- **Endorsed by:** coach-domain-expert (CONV 5+5), visual-brand (CONV 5), backend-data-engineer (CONV 5+5).
- **Validates with:** Post-F1 retention data + coach feedback. Sentry error rate on sim RPC.

### RECOMMENDATION: Option A

**Why:** Only V1 option that closes the accountability loop **without introducing the squad-as-arena social contract conflict**, ships in under two weeks, validates at F1 scale (4-5 people) without needing competitive density. Option B's core risk — squad competition damaging the safety-net dynamic — has not been countered by any agent and cannot be resolved at F1 scale.

**Founder pick required:**
1. Resolve framing gate: **is squad a safety net or an arena?** That gates whether Option B is ever right for V1.
2. If safety-net → ship Option A now, revisit Race Room post-alpha with density data.
3. If arena → swap to Option B, but run `/council` on the retention thesis first.
4. For Option C → commit only after F1 produces evidence that logging behaviour + character reaction drives re-engagement. **Do not commission Aseprite art before that signal exists.**

### WARRANTS /council REVIEW: yes

Pre-filled invocation:
```
/council "Ship XP Ceremony as V1 gamification: on training log submit, trigger a character
reaction animation (Token SVG, CSS steps, 1200ms cap, reduced-motion fallback) and surface a
challenge-squadmate CTA in the squad feed. Thin New Tables schema (characters + xp_ledger) with
RPC-gated boost wall. No pixel art commission, no Race Room, no future-date logs. Validate at F1
with PostHog xp_ceremony_fired + challenge_sent events. Full Vision (class divergence, VDOT race
sim, Aseprite atlas) deferred until F1 retention signal confirmed."
```

---

## Round 1 — Generation (LEAD only)

### product-strategist
- **XP Skin** (CONV 2) — character grows but nothing to do with it.
- **V1 Lite Daily Race Room** (CONV 4) — founder-scoped Phase 2; pixel-art is 3-5wk dependency.
- **Race Without Art (Text-Sim)** (CONV 3) — decouples mechanic from art; low fidelity may poison F1.
- **Full Vision Now** (CONV 1) — KILL: 8-12wk single-founder pre-F1 trap.
- **Squad Race Only** (CONV 4) — squad-scoped; defers strangers; forces results through accountability layer.

### ux-designer
- **Heartbeat** (CONV 3) — character ambient on Home cyan tab. Home congestion risk.
- **Race Room** (CONV 4) — Squad-tab dedicated screen + 24h reveal. Reveal trigger gap critical.
- **Class Quest** (CONV 4) — You-tab weekly quest mapping to plan. Dead end without plan.
- **Character Card on Profile** (CONV 3) — /u/[username] hero. Hydration flash risk.
- **XP Ceremony at Log** (CONV 5) — log confirmation triggers character react + challenge-squadmate. Animation fatigue risk.

### visual-brand
- **Splity-Spine** (CONV 4) — extend SVG + CSS keyframes + kit-colour vars.
- **Aseprite-Atlas-PNG** (CONV 5) — commission pixel art ~$400-800/class; PNG atlas ~4KB.
- **SVG-Lottie-Hybrid** (CONV 3) — lottie 37KB; consumer-app feel rejected.
- **GLB-Three.js** (CONV 2) — R3F+three=280KB RED.
- **Token-Driven Static SVG + CSS Steps** (CONV 4) — defer commissioned art.

### coach-domain-expert
- **Effort-Weighted XP + ACWR Gate** (CONV 4) — hard-block when ACWR>1.3. False-positive at race week.
- **Class-Stat Divergence Model** (CONV 5) — each class accrues different stat from matching session.
- **VDOT-Anchored Race Sim** (CONV 5) — finishing time from VDOT (not XP level) + class modifier.
- **Deload-as-XP-Multiplier** (CONV 3) — 1.5× after deload; gameable by sandbagging.
- **Daily-Cap Sanity Ceiling** (CONV 4) — per-session physiological ceiling.

### frontend-engineer
- **SingleCharacterWithRealtimeSync** (CONV 4) — one component + realtime channel; channel-cap risk.
- **ServerComponentShell + ClientIsland** (CONV 4) — RSC fetches, client island animates.
- **SpriteAtlasLazyPerClass** (CONV 3) — dynamic import per class; may not chunk under 10KB.
- **RaceResultCSS-Only Playback** (CONV 5) — no Lottie/Canvas/RSpring; orphan-state risk on nav.
- **FutureDateGuardInRouteHandler** (CONV 5) — server-side date check; TZ tolerance question.

### backend-data-engineer
- **Profiles-Embedded Lite** (CONV 2) — KILL: JSONB only, no audit trail.
- **Thin New Tables** (CONV 5) — characters + character_boosts (source-tagged) + sim_races.
- **RPC-Gated Boost Wall** (CONV 5) — SECURITY DEFINER + REVOKE INSERT.
- **Deterministic Sim with Stored Seed** (CONV 4) — entry_snapshot + rng_seed + result_timeline + finalized_at.
- **Future-Date Guard via Generated Column** (CONV 4) — DB-level CHECK; UTC normalisation needed.

---

## Round 2 — Synthesis (LEAD)

### product-strategist
- **XP Loop Now** (CONV 5) — log → character react → challenge squadmate; zero art spend.
- **Text-Sim Race Room Squad-Only** (CONV 4) — VDOT-seeded; 24h reveal; no art.
- **Defer Art Investment** (CONV 5) — no commission until F1 evidence; ship Token SVG.

### ux-designer
- **Log-to-Ceremony Loop** (CONV 5) — XP ceremony on log submit + squad feed card.
- **Race Room Lite** (CONV 4) — VDOT sim + CSS playback + boost wall.
- **Class-Divergence Profile** (CONV 3) — You-tab card; empty pre-alpha.

### visual-brand
- **Splity-Steps** (CONV 5) — Token SVG + CSS @keyframes + accent tokens; zero bundle cost; three states.
- **Pixel-Splity** (CONV 4) — Aseprite atlas; requires brand commitment ratification before F1.
- **No Character Yet** (CONV 3) — three SVG stat rings; soulless.

### coach-domain-expert
- **ACWR-Gated XP + Class-Stat Divergence** (CONV 5) — structural sport-science correctness.
- **VDOT-Anchored Race Sim + Daily Cap** (CONV 4) — kills effort inflation at source.
- **Deload-as-Multiplier** (CONV 3) — F1 group too small to validate.

### frontend-engineer
- **RaceResultShell** (CONV 5) — RSC + 'use client' island; CSS keyframe celebration.
- **SingleCharacterComponent** (CONV 4) — `<CharacterSprite class athleteId frame>` everywhere; typed union.
- **LayeredDateGuard** (CONV 5) — DB generated column + route-handler Zod parse.

### backend-data-engineer
- **VDOT-Native Race Schema** (CONV 5) — races + race_entries + race_results + characters.stats jsonb.
- **RPC-Gated Boost Wall + Effort-Weighted XP** (CONV 5) — two SECDEF RPCs; append-only xp_ledger.
- **Cosmetic Slot Scaffold** (CONV 4) — cosmetic_id FK now; cosmetics table empty until art lands.

---

## Round 2 — CONSULT lens

### finance-pricing
- **Aseprite:** $400-800 commission creates sunk-cost pressure; cosmetic catalogue not yet architected.
- **XP Ceremony:** gate enhanced animations behind Elite to create tier value.
- **Boost Wall:** boost inventory scarcity is natural retention lever; Elite gets higher cap without breaking pay-to-win.
- **V1 Race Room:** gate replays/extended history behind Elite or free tier competes with paid.

### pm-tech-lead
- **V1 Race Room:** 2 infra PRs before user sees anything; Track 2 foundation must precede.
- **XP Ceremony:** SessionCelebration exists — audit event chain first (30 min). Lowest-risk highest-confidence option.
- **Aseprite:** Blocked on third-party deliverable; commission must be initiated before sequencing.
- **Class-Stat:** If pure derived computation (no new columns), single PR. If new columns, blocked on Track 2.

### animation-motion
- **XP Ceremony:** 3-state animation must hard-cap 1200ms with reduced-motion fallback; useReducedMotion hook exists.
- **Aseprite atlas:** steps()-easing GPU-composited; FPS-safe; lazy per class.
- **Race Room reveal:** stagger 40ms / max 5 cards; never animate during scroll.
- **RaceResultCSS-Only:** every @keyframes must pair with @media (prefers-reduced-motion).

### mobile-pwa
- **Daily Race Room:** iOS Safari ≤17 = no push without PWA install (16.4+ gate). Single 14:00 cron — race resolution timing must align or needs 2nd cron slot.
- **XP Ceremony:** iOS keyboard-dismiss timing — defer modal one rAF tick.
- **Single Character + Realtime:** Cache last-known position in localStorage for reconnect.
- **Sprite Atlas:** Service-worker precache user's own class to prevent pop-in.

### performance
- **XP Ceremony:** transform/opacity only; no box-shadow/filter pulse on mid-Android.
- **Aseprite atlas:** ~4KB/atlas; lazy-import at class-select; cached thereafter.
- **RaceResultCSS-Only:** strongest performance option — one GPU composite layer per card.
- **VDOT Sim:** pre-bake timeline server-side; never run sim client-side per frame.

### qa-risk
- **V1 Race Room:** 23:58/00:02 bucket boundary corrupts leaderboard silently — freeze bucket at room creation. No down-migration defined.
- **RPC Boost Wall:** Double-tap fires two RPCs without idempotency; add (user, date) UNIQUE.
- **Future-Date Guard:** UTC normalisation gap (UTC+9 user @ 23:00 local → tomorrow UTC). Accept ±18h tolerance.
- **Thin New Tables:** JSONB snapshot grows unbounded (500MB Hobby); store 4 fields not full profile.
- **Class-Stat:** Past-log edits leave class permanently misclassed; add class_computed_at + recompute trigger.

### devils-advocate (HOSTILE READ)
- **V1 Race Room:** 4-5 squad at F1 = no density. "Hallway sprint against someone you already know beat you." Measuring retention on feature that needs density without density.
- **XP Ceremony:** Pure polish; if logging itself broken (Zod gate 4 unverified), gilding a door that doesn't open.
- **Aseprite:** Single-founder pre-F1 = textbook polish-instead-of-ship. Founding thesis is social accountability not pixel fidelity.
- **VDOT Sim "levels playing field":** IT DOESN'T. 3:30 marathoner's normalised output still dwarfs 5:30 runner's. Slow runners lose consistently → CHURN.
- **Retention thesis broader:** SQUAD ACCOUNTABILITY ≠ SQUAD COMPETITION. Opposing social contracts. **Most dangerous assumption in proposal. No agent in R1 named this.**
- **Coach-monetisation:** Racing bypasses coach value-prop. Race Room may grow user segment that never converts to paid coaching.

---

## Open questions for the founder

1. **Framing gate** — squad as safety net (accountability), as arena (competition), or both? Decision gates the V1 path.
2. **VDOT race-sim fairness** — back-of-pack runners feeling consistent loss is the devil's-advocate thesis-killer. If Option B/C ship, the fairness model must be tuned beyond raw VDOT (effort percentile? class-relative? handicap?). Pre-launch decision.
3. **Coach-monetisation guardrail** — if gamification grows a non-paying user segment, what's the safeguard for the coach value-prop?
4. **Brand commitment to pixel art** — Aseprite atlas locks the illustration voice for the app. Ratify or hedge with Token SVG first?
5. **Future-date logging amendment** — DB generated column vs route-handler guard (or both — qa-risk wants belt-and-suspenders). When does this ship?
