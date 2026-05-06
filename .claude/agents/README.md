# NextSplit Council — Agent System

A multi-disciplinary review council, mechanised. Each agent is a focused reviewer with a charter; the `/council` slash command orchestrates them on a two-round protocol with a synthesizer that bias-toward-ship while logging dissents.

## When to use it

| Lane | Default action | Examples |
|---|---|---|
| Trivial | Ship without council | Typo fix, one-line bug, dependency bump, doc edit, schedule change |
| Material | Mini-council (3-4 roles, manually selected) | New screen, refactor, copy change in core flow |
| Full | `/council <proposal>` (Tier A + auto-included Tier B) | New feature, schema change, payments-on, marketplace launch |
| Strategic | `/council --strategic <proposal>` (all relevant active roles) | Pricing change, repositioning, legal-touching launch |

The system is opt-in. Skip it for things you'd ship anyway. Use it for decisions you'd write a press release about.

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
- `ns-synthesizer` — merges all reviews into a single verdict

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

## Founder override — first-class action

You can ship past any verdict. The council advises; you decide.

```
/council --override <reason>
```

The override is logged with reasoning. This rule exists so the system can never become a trap. If running councils is slowing you down on things you'd ship anyway, prune.

## Output discipline — no hedging tolerated

Every active agent's charter mandates the same output contract:

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

Total ≤200 words per agent per round. Long output gets downweighted by the Synthesizer and the offending charter gets tightened.

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

All active agents read `.claude/agents/COMMON.md` at the start of any council pass. That's the shared project context — thesis, stage, stack, principles. Update it when reality changes; everyone gets the new ground truth automatically.

## Calibration

The first 3-5 councils, charters get refined based on what each agent caught vs missed vs hedged. Send feedback and I tighten.
