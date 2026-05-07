---
description: Generate and balance options for an open question — multi-agent ideation, right-sized roster, shortlist output. Sibling to /council.
argument-hint: <topic-or-question> [--lead=role1,role2] [--consult=role3] [--skip=role4] [--quick] [--wide]
---

# /forge — orchestration prompt

You are about to orchestrate a NextSplit ideation pass on the topic below. Follow this protocol precisely. Do not skip steps. Do not improvise structure.

`/forge` is the **generation** sibling of `/council`. `/council` reviews a written proposal; `/forge` produces a shortlist of options for an open question. The two compose: shortlist with `/forge`, then stress-test the chosen option with `/council`.

TOPIC / INVOCATION:
$ARGUMENTS

## Step 0 — Parse the invocation

Inspect $ARGUMENTS for flags:

- `--quick` → top 2 LEAD only, single round, no Round 2, lightweight shortlist (~15-30k tokens). Use for narrow questions like "what should the empty-squad CTA say?"
- `--wide` → all 23 active agents (everyone in LEAD or CONSULT), full two-round (~200-280k tokens). Use for end-to-end / strategic questions.
- `--lead=role1,role2,…` → force-include those roles as LEAD even if scope detection wouldn't
- `--consult=role3,…` → force-include as CONSULT
- `--skip=role4,…` → exclude even if scope detection would include
- `--override <reason>` → log and exit; do not run `/forge`. Print: "Forge overridden by founder. Reason: <reason>. Logged."
- `--skip-forge <reason>` → log and exit. Print: "Forge skipped. Reason: <reason>. Logged."

If the remaining argument is a file path, read it. Otherwise treat it as the topic text.

If the topic contains "end-to-end", "holistic", "redesign", "post-F1 roadmap", or similar broad-strokes language, auto-promote to `--wide` and inform the user.

## Step 1 — Roster detection

Match the topic against the preset table below. Each row maps a keyword set to a LEAD/CONSULT roster. Multi-match: union the rosters, cap LEAD at 6 (demote lowest-relevance to CONSULT), print the merge so the user sees what happened.

| Keyword set | LEAD | CONSULT |
|---|---|---|
| plan, template, vdot, periodisation, ai-plan, training-block | coach-domain-expert, product-strategist | ux-designer, content-copy |
| squad, accountability, social, nudge, leaderboard, trophy | product-strategist, ux-designer, coach-domain-expert | frontend-engineer, content-copy, customer-support |
| onboarding, first-run, signup, account-setup | ux-designer, product-strategist, content-copy | accessibility, mobile-pwa, frontend-engineer |
| coach marketplace, coach-app, coach-tier, coach-acquisition | product-strategist, coach-domain-expert, finance-pricing, marketing-growth | backend-data-engineer, ux-designer, legal-compliance |
| pricing, tier, monetisation, subscription, billing | finance-pricing, product-strategist, marketing-growth | legal-compliance, ux-designer, customer-support |
| notification, push, email, comms, smart-notify | mobile-pwa, ux-designer, content-copy, product-strategist | accessibility, performance, backend-data-engineer |
| analytics, metric, kpi, funnel, retention, cohort | analytics-data, product-strategist, marketing-growth | backend-data-engineer, ux-designer |
| compliance, gdpr, ico, t&cs, privacy-policy, cookie | legal-compliance, security-privacy, product-strategist | backend-data-engineer, content-copy |
| performance, bundle, lighthouse, web-vitals, fps | performance, frontend-engineer, backend-data-engineer | mobile-pwa, qa-risk, devops-sre |
| campaign, gtm, launch, share-card, referral, asoseo | marketing-growth, product-strategist, content-copy | ux-designer, finance-pricing, customer-support |
| visual, ui-overhaul, theme, motion-system, illustration | visual-brand, ux-designer, frontend-engineer | accessibility, mobile-pwa, performance |
| mobile, pwa, ios, android, install, offline | mobile-pwa, frontend-engineer, performance | ux-designer, accessibility, qa-risk |
| strava, third-party, integration, oauth, webhook | backend-data-engineer, security-privacy, product-strategist | legal-compliance, mobile-pwa, ux-designer |
| feature-flag, experiment, ab-test, rollout | product-strategist, analytics-data, frontend-engineer | qa-risk, backend-data-engineer, devops-sre |

**Zero match:** default to STRATEGY cluster as LEAD: `product-strategist, pm-tech-lead, devils-advocate`. Print: "No domain match for topic — defaulting to strategy framing. Refine with `--lead=` if you have a steer."

**Apply manual overrides** (`--lead=`, `--consult=`, `--skip=`) AFTER preset detection.

**Always include** `devils-advocate` as CONSULT (unless `--skip=devils-advocate` set). Hostile read on every ideation pass.

**Print the active roster** grouped by cluster, with role per agent:

```
ROSTER for /forge:
  STRATEGY:    [LEAD] product-strategist | [CONSULT] marketing-growth
  EXPERIENCE:  [LEAD] ux-designer | [CONSULT] content-copy, accessibility
  ENGINEERING: [SKIP]
  DOMAIN:      [LEAD] coach-domain-expert
  RISK:        [CONSULT] devils-advocate
Total active: 6 (3 LEAD, 3 CONSULT)
```

## Functional clusters (5)

Used for in-prompt cluster framing. Don't run a literal cluster round — implicit framing is enough.

| Cluster | Members |
|---|---|
| STRATEGY | product-strategist, finance-pricing, marketing-growth, pm-tech-lead |
| EXPERIENCE | ux-designer, visual-brand, accessibility, content-copy, animation-motion |
| ENGINEERING | frontend-engineer, backend-data-engineer, performance, devops-sre, mobile-pwa |
| DOMAIN | coach-domain-expert, analytics-data |
| RISK | security-privacy, legal-compliance, qa-risk, devils-advocate, customer-support, localisation |

## Step 2 — Round 1: Generation (LEAD only, parallel)

For every LEAD agent in the active roster, spawn an Agent call **in parallel** (one message, multiple tool calls). Each agent gets:

1. The topic in full
2. **Cluster framing**: "You are in cluster <X> with peers <list-other-LEADs-in-same-cluster>. Generate options that your cluster could plausibly co-own. Don't try to cover engineering / strategy / risk / etc — peers in those clusters will bring their own options. Stay in your lane and go deep."
3. **Inlined generation contract** (overrides charter's review contract):

```
Read .claude/agents/COMMON.md for project context. Read .claude/agents/ns-<your-name>.md for your charter, but IGNORE the charter's review output contract (VERDICT/CONCERN/etc). Apply your charter's LENS only — what you own, anti-patterns to flag, your discipline.

Generate 3-5 distinct options for the topic. Format per option:

  NAME: <short, evocative — 2-5 words>
  ONE-LINE: <single sentence describing the option>
  PRIMARY BENEFIT: <one specific gain — strengthens accountability loop / unlocks F1 / etc>
  PRIMARY RISK: <one specific failure mode>
  WHO LEADS: <which role / cluster owns build>
  CONVICTION: <1-5 — your honest confidence this is the right path>

≤300 words total. No preamble, no meta-commentary.
```

Tool call uses `subagent_type: <agent-name>` (which auto-loads the charter).

If `--quick` flag was set, after Round 1 jump straight to Step 4 (skip Round 2). Quick mode produces a fast shortlist with no cross-pollination.

## Step 3 — Round 2: Cross-pollination (LEAD + CONSULT, parallel)

For every active agent in the roster (LEAD + CONSULT, except the Shortlister), spawn an Agent call in parallel. Each agent gets:

1. The topic
2. **All Round 1 outputs** from all LEAD agents, labelled by role
3. **Role-specific instruction:**

For LEAD agents:
```
This is Round 2. You've now seen Round 1 generation outputs from all LEAD agents across all clusters. Refine, combine, and eliminate weak options. Propose 2-3 strongest synthesised options drawing from across clusters. Use the same per-option format (NAME / ONE-LINE / BENEFIT / RISK / WHO LEADS / CONVICTION). ≤200 words.
```

For CONSULT agents:
```
This is Round 2. Add your lens to the Round 1 options from LEAD agents. For each top option you can identify, name ONE concern, ONE opportunity, and ONE blocker from your charter's perspective. Don't propose new options — your job is to inform the shortlister, not generate. Format:

  Option <name>:
    Concern: <specific>
    Opportunity: <specific>
    Blocker: <specific or "none">

≤150 words total.
```

## Step 4 — Shortlister

Spawn the `ns-shortlister` agent (subagent_type: `ns-shortlister`) with:

1. The topic
2. The active roster (LEAD/CONSULT split)
3. All Round 1 outputs
4. All Round 2 outputs (skip if `--quick`)

The Shortlister follows its charter: dedup, conviction-weighted scoring, CONSULT-lens integration, named recommendation, optional `/council` handoff. Return the SHORTLIST block verbatim to the user.

## Step 5 — Print the shortlist

Print the Shortlister's SHORTLIST block to the user. Below that, in a collapsed-by-default section ("Show all agent outputs"), include the full Round 1 + Round 2 transcripts so the audit trail is preserved.

If the shortlist's `WARRANTS /council REVIEW?` line is `yes`, print the pre-filled `/council` invocation prominently so the user can copy-paste in one move.

Then stop. **Do not implement** the recommended option — `/forge` shortlists, the founder picks, then either ships directly or runs `/council` on the chosen option for stress-test.

## Constraints on this orchestration

- Round 1 and Round 2 must each be **parallel within their round** (one message, multiple Agent tool calls). Sequential calls waste wall-clock and confuse the model.
- No Round 3. Hard cap.
- LEAD output: ≤300 words Round 1, ≤200 words Round 2.
- CONSULT output: ≤150 words Round 2.
- Shortlister output: ≤450 words.
- If any agent returns >50% over its word cap or ignores the format, downweight in shortlisting and flag the offending agent for charter tightening.
- If a tool call fails for an agent, retry once. If it fails again, note the missing role in the shortlist and continue.
- `--quick` mode: 2 LEAD agents only, single round, no CONSULT, lightweight shortlister output. Use when token cost matters more than thoroughness.

## Token budget guidance

| Mode | Roster | Rounds | Tokens |
|---|---|---|---|
| `--quick` | 2 LEAD | 1 | 15-30k |
| Narrow (3 LEAD + 2 CONSULT) | typical for "plan template" / "copy variant" | 2 | 40-70k |
| Default (5 LEAD + 4 CONSULT) | typical for "feature design" / "flow redesign" | 2 | 80-130k |
| `--wide` (all 23) | strategic / end-to-end | 2 | 200-280k |

`/forge` averages ~30-40% cheaper than `/council` at equivalent breadth because CONSULT outputs are smaller and many agents are SKIP not silent-included.

If projected tokens look excessive for a clearly narrow topic, ask the user if they want `--quick` instead.

## Founder override — first-class action

You can ship past any shortlist recommendation:

```
/forge --override <reason>
```

The override is logged with reasoning. The shortlist advises; the founder decides. This rule exists so the system can never become a trap. If running `/forge` is slowing you down on questions you'd answer alone in 30 seconds, prune.
