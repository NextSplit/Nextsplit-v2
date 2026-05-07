# NextSplit Council — Agent System

A multi-disciplinary review-and-ideation system, mechanised. Each agent is a focused expert with a charter; two slash commands orchestrate them:

- **`/council` — review** a written proposal. Two-round multi-agent verdict (SHIP / SHIP-WITH-FOLLOWUP / HOLD / ESCALATE) via `ns-synthesizer`, with bias-toward-ship and a forced pre-mortem.
- **`/forge` — generate and balance** options for an open question. Right-sized roster (LEAD generates, CONSULT adds lens), two-round, shortlist via `ns-shortlister`, with optional `/council` handoff for stress-testing the chosen option.

The two compose: `/forge` shortlists, founder picks, `/council` reviews the pick.

## When to use what

| Need | Command | Examples |
|---|---|---|
| Trivial fix, ship-as-decided | (none) | Typo, one-line bug, dep bump, doc edit, schedule change |
| Open question, generate options | `/forge <topic>` | "How should the empty-squad CTA read?", "What's our F1-to-paid roadmap?", "Ideas for Trophy Room?" |
| Quick option burst, no deliberation | `/forge --quick <topic>` | "5 copy variants for the streak warning push" |
| Strategic / end-to-end ideation | `/forge --wide <topic>` | "Post-F1 roadmap", "End-to-end app redesign" |
| Written proposal, stress-test before ship | `/council <proposal>` | New feature, schema change, payments-on, marketplace launch |
| Strategic review across all roles | `/council --strategic <proposal>` | Pricing change, repositioning, legal-touching launch |

Both systems are opt-in. Skip them for things you'd ship anyway. Use them for decisions you'd write a press release about.

## Roster

### Tier A — always invoked on `/council` (9)

Auto-loaded for every council pass. These cover the failure modes most likely to bite a solo pre-alpha founder.

- `ns-product-strategist` — thesis fit, scope, MVP discipline
- `ns-ux-designer` — flow, IA, mobile-first task success
- `ns-frontend-engineer` — React/Next, code quality, tests
- `ns-backend-data-engineer` — schema, RLS, queries, jobs
- `ns-security-privacy` — OWASP, auth, RLS, PII, GDPR
- `ns-qa-risk` — edge cases, failure modes, rollback
- `ns-coach-domain-expert` — VDOT, ACWR, periodisation, sport-science correctness
- `ns-devils-advocate` — hostile read, reasons NOT to ship
- `ns-synthesizer` — merges all `/council` reviews into a single verdict

### Orchestration synthesizers

- `ns-synthesizer` — used by `/council`. Bias-toward-ship, forced pre-mortem, SHIP/HOLD/ESCALATE verdict.
- `ns-shortlister` — used by `/forge`. Dedup, conviction-weighted scoring, named recommendation, optional `/council` handoff.

These two are different roles with different output contracts. Don't conflate them.

### Tier B — auto-included when triggers match (6)

The `/council` skill detects scope and adds these when relevant.

| Role | Auto-included when… |
|---|---|
| `ns-visual-brand` | Change touches CSS, colours, illustrations, motion, marketing surfaces |
| `ns-accessibility` | Change touches any user-facing UI |
| `ns-performance` | Change touches bundles, large libs, images, animations, route weight |
| `ns-mobile-pwa` | Change touches push, install, offline, iOS Safari behaviour, safe-area |
| `ns-legal-compliance` | Change touches payments, auth, PII, T&Cs, third-party data, age, cookies |
| `ns-pm-tech-lead` | Change crosses ≥3 surfaces, or scope >1 day work |

Force inclusion: `/council --with=visual,a11y <proposal>`. Force exclusion: `/council --without=legal <proposal>`.

### Knowledge base — dormant until summoned (8)

Charters live in this folder so the perspectives are codified, but they aren't auto-invoked. Call them via the Agent tool when relevant: `Agent(subagent_type='ns-analytics-data', ...)`.

- `ns-analytics-data` — KPIs, funnels, cohort retention, experiment design
- `ns-devops-sre` — deploy, monitoring, alerting, on-call
- `ns-content-copy` — UX writing, error messages, push copy
- `ns-animation-motion` — motion-system, reduced-motion, FPS budget
- `ns-marketing-growth` — pre-launch campaign, ASO/SEO, referrals
- `ns-finance-pricing` — tier design, churn modelling, unit economics
- `ns-customer-support` — feedback intake, support workflow, community
- `ns-localisation` — units, currency, timezones, multi-language

## Protocol — how a council pass actually runs

### Round 1 — parallel, independent (~90 sec)

Every active agent reviews the proposal with no visibility into other agents' opinions. Forces genuine first-principles thinking, not contagion.

### Round 2 — parallel, with sight (~90 sec)

Every agent sees all Round 1 outputs. Each must:
1. Endorse the strongest concern from another agent
2. Disagree with one recommendation if they disagree
3. Flag anything they missed in Round 1 now visible from another lens

There is no Round 3. Hard cap.

### Synthesizer (~30 sec)

Reads everything, runs a forced pre-mortem ("two weeks from now, this shipped, we regret it — why?"), and returns a single verdict:

```
VERDICT: SHIP | SHIP-WITH-FOLLOWUP | HOLD | ESCALATE
Confidence: 1-5 · Reversibility: high | med | low

Pre-ship blockers:        (RED items, must fix)
Ship-with-followup items: (YELLOW items, do later)
Dissents overruled:       (logged for audit)
Pre-mortem:               (top 3 plausible regrets)
After-ship signs to watch: (falsifiable predictions)
```

Default verdict is **SHIP-WITH-FOLLOWUP**. **HOLD** only if a single agent gave RED on a non-reversible decision, or two agents independently RED'd the same concern. **ESCALATE** only if dissent is first-principles AND low-reversibility — the founder decides.

## Protocol — how a `/forge` ideation pass actually runs

`/forge` is the generation sibling of `/council`. Same agent pool, different orchestration.

### Step 1 — Roster detection (right-sizing)

Match the topic against a preset table in `.claude/commands/forge.md`. Each row maps a keyword set (plan, squad, onboarding, pricing, etc.) to a **LEAD** and **CONSULT** roster. Multi-match unions the rosters and caps LEAD at 6 (demotes lowest-relevance to CONSULT). Zero match → defaults to STRATEGY cluster.

User can override: `--lead=role1,role2`, `--consult=role3`, `--skip=role4`. Modes: default, `--quick` (top 2 LEAD only, single round), `--wide` (all 23, two rounds).

### Step 2 — Round 1: Generation (LEAD only, parallel)

Each LEAD agent generates 3-5 distinct options independently. Inlined contract:

```
NAME · ONE-LINE · PRIMARY BENEFIT · PRIMARY RISK · WHO LEADS · CONVICTION (1-5)
≤300 words.
```

Each LEAD also gets **cluster framing** — "you're in cluster X with peers A, B; stay in your lane and go deep." Implicit clustering, not a literal cluster round.

### Step 3 — Round 2: Cross-pollination (LEAD + CONSULT, parallel)

All active agents see all Round 1 outputs.

- **LEAD** agents refine, combine, eliminate weak options across all clusters → propose 2-3 strongest synthesised options. ≤200 words.
- **CONSULT** agents add their lens — for each top option, name one concern, one opportunity, one blocker. Don't propose new options. ≤150 words.

`--quick` mode skips Round 2 entirely.

### Step 4 — Shortlister

`ns-shortlister` reads everything: dedupes near-duplicates, weights by aggregate conviction, integrates CONSULT lens, picks ONE recommended option, flags whether the option warrants `/council` review:

```
SHORTLIST

OPTIONS (2-4) — name, summary, benefits, risks, effort, reversibility, endorsed-by, validates-with

RECOMMENDED: <option>
WHY: <≤2 sentences>
FOUNDER PICK REQUIRED: <the specific decision>
WARRANTS /COUNCIL REVIEW? yes | no
  (if yes, pre-filled invocation for one-tap handoff)
```

### Functional clusters (used by `/forge` for in-prompt framing)

| Cluster | Members |
|---|---|
| STRATEGY | product, finance, marketing, pm-tech-lead |
| EXPERIENCE | ux, visual-brand, accessibility, content-copy, animation-motion |
| ENGINEERING | frontend, backend, performance, devops, mobile-pwa |
| DOMAIN | coach-domain-expert, analytics-data |
| RISK | security, legal, qa, devils-advocate, customer-support, localisation |

These are organising shorthand. They don't run as separate rounds — agents just know which peers are nearby in their lane.

## Founder override — first-class action (both commands)

You can ship past any verdict or shortlist. The systems advise; you decide.

```
/council --override <reason>
/forge --override <reason>
```

The override is logged with reasoning. This rule exists so the systems can never become a trap. If running them is slowing you down on things you'd ship anyway, prune.

## Output discipline — no hedging tolerated

### `/council` review contract (in every charter)

```
VERDICT: GREEN | YELLOW | RED
TOP CONCERN: <specific, references the proposal — file/line/decision>
RECOMMENDATION: <specific action, not "consider">
STEELMAN: The strongest case against my recommendation is: <≤2 sentences>
CONFIDENCE: 1-5

Round 2 additionally:
ENDORSE: <one other agent's concern you back, by role>
DISAGREE: <one other agent's rec, with reason — only if applicable>
MISSED: <anything you should have flagged in Round 1>
```

Total ≤200 words per agent per round.

### `/forge` generation contract (injected inline by `/forge`, NOT in charters)

LEAD Round 1 (≤300 words):
```
NAME · ONE-LINE · PRIMARY BENEFIT · PRIMARY RISK · WHO LEADS · CONVICTION (1-5)
```

LEAD Round 2 (≤200 words): refine 3-5 R1 options into 2-3 synthesised options, same per-option format.

CONSULT Round 2 (≤150 words): for each top option — one concern, one opportunity, one blocker. No new options.

Charters stay review-shaped. `/forge` carries its own contract verbiage in the orchestrator prompt so the kernels don't bloat with two modes.

Long output gets downweighted by the Synthesizer/Shortlister and the offending charter gets tightened.

## Antagonist pairs — disagreement is a feature

The council is designed knowing which roles will (and *should*) clash. Each charter calls out its natural antagonists so disagreement is engaged with, not avoided.

- Frontend ↔ Performance (animation vs FPS budget)
- Visual/Brand ↔ Accessibility (aesthetic vs contrast/motion compliance)
- UX ↔ Security (frictionless flow vs MFA, rate limits)
- Product ↔ QA (ship the demo vs edge-case handling)
- Backend ↔ Frontend (simple API vs rich client experience)
- Visual ↔ Performance (rich illustration vs bundle size)
- Coach Domain ↔ Product (sport-science depth vs simplification)
- Devil's Advocate ↔ everyone (hostile read)

## Common briefing

All active agents read `.claude/agents/COMMON.md` at the start of any council or forge pass. That's the shared project context — thesis, stage, stack, principles. Update it when reality changes; everyone gets the new ground truth automatically.

## Calibration

The first 3-5 councils and forges, charters get refined based on what each agent caught vs missed vs hedged. Send feedback and I tighten.
