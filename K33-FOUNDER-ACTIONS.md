# K33 — Founder Action Brief

Everything in this file requires Ash personally — registrations,
external accounts, or signed agreements that an AI assistant cannot
file. Each item lists what to do, where, the expected cost, the
expected wait time, and what the legal docs / schema now expect to
match.

The K33 code work on branch `claude/k33-launch-readiness` is done.
This brief is the parallel work that has to happen before paid launch.

---

## 1. Incorporate NextSplit Ltd (BLOCKING — everything else queues behind this)

**Why** — the council surfaced that no legal entity exists. Every IDTA,
DPA, ICO registration, and Stripe Connect merchant-of-record needs a
named counterparty. Ash currently signs personally and carries
unlimited liability for every paid customer's data and any AI-related
claim.

**Where** — https://www.gov.uk/limited-company-formation

**Cost** — £50 (same-day service); £12 (24h standard)

**Time** — 24h standard, 1h same-day

**Provide**:
- Company name: `NextSplit Ltd` (check availability)
- Registered office address (UK)
- At least one director (Ash)
- Share structure (default 100 ordinary shares @ £1 each)
- SIC code: `62012` (Business and domestic software development) and/or
  `63110` (Data processing, hosting and related activities)

**On completion** — note the company number. It is the input to items
2, 3, 4, 5, 7.

---

## 2. ICO registration (BLOCKING for paid launch, 14–28 day external clock)

**Why** — under DPA 2018 s.17, processing personal data for commercial
purposes without ICO registration is a civil offence (fine up to £4,350
plus daily penalties). Privacy Policy `src/app/privacy/page.tsx` § "Who
we are" currently has a placeholder for the registration number; you
need to fill it in before any paying user lands on that page.

**Where** — https://ico.org.uk/for-organisations/data-protection-fee/self-assessment/

**Cost** — £40/year (Tier 1, under 10 staff and under £632k turnover)

**Time** — 14–28 days from filing to certificate

**Provide**:
- Company number (from step 1)
- Registered office
- Categories of personal data processed (tick: name, contact, lifestyle,
  health, financial)
- Special-category data (Yes — injury notes and health flags fall
  under UK GDPR Art 9)
- Purposes of processing (Provision of services, marketing, research)

**On completion** — paste the registration number into the placeholder
at `src/app/privacy/page.tsx` line ~24 (the sentence "Our registration
number is published here once issued.")

---

## 3. Upgrade Vercel Hobby → Pro (BLOCKING — Hobby ToS bars commercial use)

**Why** — devils-advocate flagged that the Vercel Hobby plan prohibits
commercial use. The moment the first Stripe charge fires through a
Vercel Hobby deployment, the app is in breach of Vercel ToS and may be
terminated without warning. The Vercel DPA is also Pro-only.

**Where** — Vercel dashboard → Team Settings → Billing → Upgrade to Pro

**Cost** — £20/month per seat

**On completion** — within the Pro account, accept the Vercel DPA at
https://vercel.com/legal/dpa under the NextSplit Ltd entity name.

---

## 4. Sign DPAs / IDTAs with each US sub-processor

Self-serve, but each needs the NextSplit Ltd name on it. Privacy
policy's "Sub-processors and third parties" section lists what's
expected for each.

| Processor | DPA URL | Notes |
|---|---|---|
| Anthropic | https://www.anthropic.com/legal/dpa | Also request Zero Data Retention API option (separate form in console). Update `transfer` field in `src/lib/legal/sub-processors.ts` once confirmed. |
| Sentry    | https://sentry.io/legal/dpa/ | Includes EU SCCs + UK Addendum. |
| PostHog   | https://posthog.com/dpa | EU-hosted; less critical. |
| Resend    | https://resend.com/legal/dpa | EU SCCs + UK Addendum. |
| Stripe    | https://stripe.com/gb/legal/dpa | Covers both Billing and Connect. |
| Vercel    | https://vercel.com/legal/dpa | Pro-only (see step 3). |
| Supabase  | https://supabase.com/legal/dpa | EEA-hosted; lowest-risk. |

**Time** — 2–4 hours for all of them.

---

## 5. Solicitor brief — two clauses need legal sign-off

The doc rewrite in this branch is good for an in-house pass but two
clauses materially shape consumer-law exposure and want a UK consumer-
contracts solicitor on them. £400–£800 of solicitor time, 5–7 working
days.

**Brief**:
- "Please review §4 (Subscriptions, payments and refunds) and §10
  (Limitation of liability) of our T&Cs at https://nextsplit.app/terms
  against (a) the UK Consumer Contracts Regulations 2013 reg 37
  digital-content cooling-off right, and (b) UCTA 1977 s.2 / CRA 2015
  s.62. We have already added the UCTA personal-injury carve-out at
  §10 paragraph 1 and an immediate-performance acknowledgement at §4
  paragraph 4 — we need confirmation the wording satisfies the
  reasonableness test and that the immediate-performance language is
  enforceable as drafted. Our annual liability cap is 12 months."
- Send them the live `src/app/terms/page.tsx` URL.
- Ask for a redline, not advice; a 1-page memo is enough.

---

## 6. Coach Agreement (separate doc, blocks coach onboarding)

The K33 T&Cs rewrite moves the 20%/30% revenue split OUT of the
athlete-facing T&Cs into a separate Coach Agreement (§5 now references
it). Until that document exists, no coach can be onboarded onto the
marketplace.

**Out of scope for this branch.** Suggested next-session task:
draft a Coach Agreement covering — platform fee, revenue split, Stripe
Connect onboarding, IP ownership of plans, verification scope,
indemnities, term + termination, dispute handling, GDPR sub-processing
(coach as sub-processor of athlete data when delivering paid coaching).

---

## 7. Vercel cron registration

The new daily deletion cron at `/api/cron/process-deletions` needs a
schedule entry. Add to `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/process-deletions", "schedule": "0 3 * * *" }
  ]
}
```

And set `CRON_SECRET` as a Vercel env var (Vercel will pass it as
`Authorization: Bearer …`).

---

## 8. Stripe Connect operational checks

Two open questions a billing-and-tax adviser should answer before the
first coach payout fires:

- **Deemed-supplier VAT** — under HMRC's online-marketplaces VAT rules,
  if NextSplit verifies coaches, takes commission, and controls
  payment + delivery infrastructure, NextSplit may be the deemed
  supplier and owe VAT on gross (not net) coach revenue. Get an
  HMRC-position memo from an accountant before any live coach payout.
- **Connect-account DPA** — when a coach onboards a Connect account,
  athlete billing data flows into the coach's connected Stripe entity.
  This is a joint-controller posture, already disclosed in the K33
  privacy policy. Confirm with Stripe that no separate paperwork is
  required.

---

## 9. Working inboxes

The legal docs reference three addresses:
- `privacy@nextsplit.com`
- `legal@nextsplit.com`
- `support@nextsplit.com`

Council found these were unverified. All three need to land in a real
inbox (Google Workspace or whatever you use), with at least one auto-
reply confirming SLA: "We respond to GDPR requests within 30 days as
required by UK GDPR Article 12."

---

## 10. Incident response runbook

UK GDPR Article 33 requires breach notification to the ICO within 72
hours. The privacy policy claims this. A one-page runbook covering:
who to call, what to log, how to decide if it's a notifiable breach,
and the ICO breach-reporting URL — needs to live somewhere
discoverable (HANDOFF.md? a Notion page?).

---

## Sequencing — minimum critical path to paid launch

```
Day 0      Step 1  (Companies House, same-day £50)
Day 0–1    Step 3  (Vercel Pro upgrade + DPA, immediate)
Day 1      Step 2  (ICO filing — clock starts)
Day 1      Step 4  (DPAs / IDTAs with sub-processors — 2-4h)
Day 1      Step 5  (Solicitor brief sent — 5-7 day wait)
Day 1      Step 7  (vercel.json cron schedule — 5 min)
Day 1      Step 9  (Inboxes wired)
Day 2-7    Step 8  (HMRC VAT memo — accountant time)
Day 5-7    Step 5 returns (solicitor redline applied to terms)
Day 14-28  Step 2 returns (ICO number published into privacy page)
Day N      First paid charge enabled
```

The bottleneck is ICO (step 2). Everything else completes in week 1.
The 30-day launch window holds if ICO comes back within 28 days.

---

## Reminder — what's already done on the K33 branch

For context, the code-side blockers are closed:

- Legal docs rewritten (privacy + terms), anchor IDs, dark theme,
  Art 9 basis, UCTA s.2(1) carve-out, ICO complaint right, full
  cookie disclosure, AI reframed as informational, Strava reclassified
  as controller, Stripe Connect added as joint controller.
- Schema safe-harbour migration: dropped CASCADE FKs on coach_earnings,
  coaching_subscriptions, and account_lifecycle_events so financial +
  audit records survive user deletion. Added `share_body_weight` column
  that was previously missing. Added `anonymise_user_financial_records`
  RPC.
- Account export route walks USER_OWNED_TABLES (21-entry registry,
  single source of truth) — fixes the council's "export RPC misses
  ≥10 tables" finding.
- Daily deletion cron at `/api/cron/process-deletions` calls the
  anonymisation RPC then `auth.admin.deleteUser`.
- MHRA Path B: InjuryFlag severity 3 hard-stops the AI path with a
  static medical-assessment message and signpost; AI prompt sanitiser
  module at `src/lib/ai/sanitise-context.ts` is the chokepoint for
  every future AI call.
- Consent surfaces: age-16 gate + terms checkbox above the sign-up
  CTA, both required; Google OAuth callback routes through the new
  `/auth/accept-terms` interstitial when consent is missing or stale;
  consent moments persisted to profiles + audit-logged.
