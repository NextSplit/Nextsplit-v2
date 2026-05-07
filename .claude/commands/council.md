---
description: Run a NextSplit council review on a proposal — two-round, multi-agent, synthesized verdict.
argument-hint: <proposal text or file path or "--with=visual,a11y" / "--without=legal" / "--strategic" / "--override <reason>" / "--skip <reason>">
---

# /council — orchestration prompt

You are about to orchestrate a NextSplit council review on the proposal below. Follow this protocol precisely. Do not skip steps.

PROPOSAL / INVOCATION:
$ARGUMENTS

## Step 0 — Parse the invocation

Inspect $ARGUMENTS for flags:

- `--strategic` → invoke ALL 15 active agents regardless of scope detection
- `--with=role1,role2` → force-include those Tier B roles even if scope detection wouldn't
- `--without=role1` → skip those roles even if scope detection would include them
- `--override <reason>` → log the override and exit; do not run the council. Print: "Council overridden by founder. Reason: <reason>. Logged."
- `--skip <reason>` → log the skip and exit. Print: "Council skipped. Reason: <reason>. Logged."

If the remaining argument is a file path, read it. Otherwise treat it as the proposal text.

## Step 1 — Determine scope

Compute which Tier B agents to auto-include based on the proposal. Detection rules:

| Trigger keywords / file paths | Tier B role to include |
|---|---|
| `.css`, `globals`, `tailwind.config`, `colour`, `motion`, `Splity`, share card, OG image, marketing | `ns-visual-brand` |
| any file in `src/app/` or `src/components/` (user-facing UI) | `ns-accessibility` |
| `package.json`, `next.config`, image, animation, lottie, rive, bundle | `ns-performance` |
| `manifest.json`, `service-worker`, push, VAPID, `safe-area`, iOS, Android, PWA, `dvh`, `vh` | `ns-mobile-pwa` |
| `stripe`, payment, auth, PII, profile fields, T&Cs, cookie, GDPR, ICO, Strava, scope, age | `ns-legal-compliance` |
| diff touches ≥3 distinct top-level dirs OR estimate >1 day | `ns-pm-tech-lead` |

State the active roster up front (Tier A + auto-Tier B + manual `--with` − `--without`). If `--strategic`, all 15.

## Step 2 — Round 1 (parallel, independent)

For every active agent in the roster, spawn an Agent call **in parallel** (one message, multiple tool calls). Each agent gets:

1. The proposal text in full
2. An instruction: "Read `.claude/agents/COMMON.md` before reviewing. Then read your charter at `.claude/agents/<your-name>.md`. Apply your charter's lens. Return only the Round 1 output contract — no preamble."
3. The tool call uses `subagent_type: <agent-name>` if available; else `general-purpose` with the charter content inlined.

**Round 1 produces** N independent reviews. Collect them verbatim.

## Step 3 — Round 2 (parallel, with sight)

For every active agent **except the Synthesizer**, spawn another Agent call in parallel. Each agent gets:

1. The proposal text
2. **All** Round 1 outputs from all agents, labelled by role
3. An instruction: "This is Round 2. You've now seen everyone's Round 1 outputs. Return the Round 2 output contract: VERDICT, TOP CONCERN, RECOMMENDATION, STEELMAN, CONFIDENCE, plus required ENDORSE / DISAGREE (if applicable) / MISSED. ≤200 words."

**Round 2 produces** N reviews that have engaged with each other.

## Step 4 — Synthesizer

Spawn the `ns-synthesizer` agent with:

1. The proposal text
2. All Round 1 outputs
3. All Round 2 outputs

The Synthesizer follows its charter: pre-mortem, decision rules, output format. Return the COUNCIL DECISION verbatim to the user.

## Step 5 — Print the decision

Print the Synthesizer's COUNCIL DECISION block to the user. Below that, in a collapsed-by-default section ("Show all agent outputs"), include the full Round 1 + Round 2 transcripts so the audit trail is preserved.

If the decision is `ESCALATE`, print clearly:
> **Founder decision required.** The council split on a first-principles question. See "Founder decision required?" line above.

Then stop. **Do not implement** the proposal — the council reviews, the founder decides whether to ship.

## Constraints on this orchestration

- Round 1 and Round 2 must be **parallel** within their round (one message, multiple Agent tool calls). Sequential calls waste wall-clock and confuse the model with the ordering.
- No Round 3. If the Synthesizer can't decide, escalate to the user.
- Length cap: each agent ≤200 words, Synthesizer ≤450 words.
- If any agent returns >300 words or ignores the output contract, downweight in synthesis and flag the offending agent for charter tightening.
- If a tool call fails for an agent, retry once. If it fails again, note the missing role in the synthesis and continue.

## Token budget guidance

- Tier A only (9 roles, two rounds + synth): expect 90-130k tokens
- Default with auto-Tier B (typically 11-13 roles): expect 120-180k tokens
- `--strategic` (all 15): expect 200-300k tokens

If projected tokens look excessive for a clearly-trivial change, ask the user if they want to skip with `--skip <reason>` instead.
