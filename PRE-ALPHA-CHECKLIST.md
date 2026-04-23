# Pre-Alpha Quality Gates — Phase F

Run through this checklist personally before sending the first alpha invite.
Every item must be ✅ before any user touches the app.

---

## F1 — Founder E2E on Real Device (iPhone)

### F1a — Fresh signup
- [ ] Visit https://nextsplit-v2.vercel.app on iPhone Safari
- [ ] Cookie consent banner appears — tap "Accept analytics"
- [ ] Tap sign up → enter email + password
- [ ] Receive verification email (check spam)
- [ ] Click verification link → redirected to onboarding
- [ ] Complete onboarding: pick Predetermined path
- [ ] Activate a plan (e.g. 12-week half marathon)
- [ ] Today tab loads with a greeting and today's session

### F1b — Core loop
- [ ] Tap a session card → focus mode opens
- [ ] Log the session: enter distance, pace, effort
- [ ] Session marked ✓, XP floats, plan progress updates
- [ ] Community progress fires (check Supabase club_feed table)
- [ ] Milestone check fires (check /api/community/milestone response)

### F1c — Plan view
- [ ] Tap Plan in bottom nav → see all weeks
- [ ] Week 1 sessions visible and labelled correctly
- [ ] ACWR chart appears (if >1 week data)

### F1d — Missed session
- [ ] Go back in date nav to a past day
- [ ] Tap a session as missed → see missed session flow
- [ ] Tap "Rebuild my week" → adaptation triggers
- [ ] See adapted plan (check weeks_data in Supabase)

### F1e — Settings + Legal
- [ ] Open Settings → Analytics toggle visible in Account section
- [ ] Tap Privacy Policy → real content, no placeholder text
- [ ] Tap Terms → real content, no placeholder text
- [ ] Check medical disclaimer appears on wellness check-in

### F1f — Coach view (if coach account available)
- [ ] Visit /coach/squad → command centre loads
- [ ] Squad shows athletes with ACWR badges
- [ ] Tap athlete → 3-tab drill-down (Overview, Sessions, Comms)
- [ ] Send a message → appears in Comms tab thread
- [ ] Visit /admin/plan-review → generate a test plan
- [ ] Visit /admin/adapt-test → run all 5 scenarios

---

## F2 — 3-Person Alpha Test

**Who to invite:** 3 runners who are non-technical and willing to give blunt feedback.

**Brief to send:**
> "I'm testing a running training app before launch. I'd love 30 minutes of 
> your time. Sign up, pick a training plan, and log your next run. Tell me 
> anything that confuses you, breaks, or feels wrong. Nothing is too small."

**Watch for:**
- [ ] Any error that prevents signing up
- [ ] Any error that prevents logging a session
- [ ] Anything that confuses them without explanation
- [ ] Any pace/plan that seems obviously wrong (VDOT check)

**Fix any blocker before broader alpha.**

---

## F3 — Performance Audit

Run: `node scripts/lighthouse-audit.js`

Or manually with Chrome DevTools:
- [ ] /auth/login: Performance ≥ 80, Accessibility ≥ 90
- [ ] /privacy: Performance ≥ 80
- [ ] /terms: Performance ≥ 80

Mobile simulation (4G). Not desktop.

---

## F4 — Sentry Verification

- [ ] Login to Sentry dashboard
- [ ] Confirm NextSplit project exists and receiving events
- [ ] Deploy app, open /today, trigger a known error (or check recent events)
- [ ] Verify error appears in Sentry within 60 seconds

If no events in Sentry: check NEXT_PUBLIC_SENTRY_DSN in Vercel environment.

---

## F5 — Pre-Alpha Infrastructure

- [x] RESEND_API_KEY is set in Vercel → test email sends ✅
- [ ] Verify lifecycle email cron fires (GitHub Actions → notify.yml, runs 9am UTC)
- [ ] Test notification email: visit /api/debug/notify-test while logged in → should return ok:true
- [ ] Run pending SQL migration: supabase/migrations/phase-12-referral.sql
- [ ] Run npx tsx scripts/seed-plans.ts (if not yet run)
- [ ] ICO registration complete (ico.org.uk — £40)
- [ ] Company formation complete (Companies House — £12)

---

## F6 — Alpha Invite List

Prepare invite list before this checklist is complete:

| Name | Email | Role | Notes |
|------|-------|------|-------|
| | | | |

**Brief:**
> "NextSplit is in closed alpha. We're a training platform built for runners 
> who want plans that adapt to real life. Your feedback directly shapes the 
> product. Expect rough edges — that's why you're here first."

Target: 10–20 runners. Mix of experience levels (2 beginner, 12 intermediate, 
6 advanced). At least 2 who have coached others.

---

## Gate Decision

| Gate | Status | Sign-off |
|------|--------|----------|
| F1 Founder E2E | ⬜ | |
| F2 3-person test | ⬜ | |
| F3 Performance | ⬜ | |
| F4 Sentry | ⬜ | |
| F5 Infrastructure | ⬜ | |
| F6 Invite list | ⬜ | |

**Do not send alpha invites until all 6 gates are ✅.**
