# NextSplit — Pre-Alpha Checklist
**Version:** 2.0 | **May 2026**
**Gate:** Complete all sections before sending invites beyond the founding team.

---

## Stage 1 — Environment Verification (do this first)

- [ ] Confirm `STRIPE_SECRET_KEY` is in Vercel → Settings → Environment Variables
- [ ] Confirm `RESEND_API_KEY` is in Vercel → Settings → Environment Variables
- [ ] Confirm `STRIPE_WEBHOOK_SECRET` is set (after adding secret key)
- [ ] Create Stripe products + prices in Stripe dashboard:
  - Founding Monthly: £7.99/mo
  - Founding Annual: £59.99/yr
- [ ] Add `STRIPE_PRICE_FOUNDING_MONTHLY` and `STRIPE_PRICE_FOUNDING_ANNUAL` to Vercel
- [ ] Confirm `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is in Vercel

---

## Stage 2 — Founder Device Test (F1)

Test on **Android Chrome** — this is the primary target device.

### F1a — Fresh account signup
- [ ] Visit https://nextsplit.app on Android Chrome
- [ ] Sign up with new email
- [ ] Complete onboarding → select predetermined plan
- [ ] Plan activates successfully (no "Invalid request" error)
- [ ] Redirected to Home tab with dark navy background

### F1b — Core daily loop
- [ ] Train tab loads with SVG plan path
- [ ] Tap a week node → session sheet slides up
- [ ] Tap a session → log modal opens, Done button visible (not cut off)
- [ ] Log session → full screen celebration fires (confetti, XP, Splity)
- [ ] Daily quest on Home updates after logging

### F1c — AI plan generation
- [ ] Go through onboarding → select "AI bespoke" path
- [ ] Enter gym preference (3x/week)
- [ ] Plan generates successfully
- [ ] Plan includes double-session days (gym + run on same day)

### F1d — Squad
- [ ] Create a squad
- [ ] Squad page shows orbital UI with your avatar in centre
- [ ] 4 empty invite slots around the circle
- [ ] Share invite link → works on another device/account

### F1e — You tab
- [ ] 4 sub-tabs visible: Achievements / Character / Stats / Account
- [ ] Account tab has Elite upsell, Strava, Settings, Sign out
- [ ] No duplication of items across tabs

### F1f — Dark mode consistency
- [ ] All pages load with deep navy background (#0a0e1a)
- [ ] No white/light grey pages visible anywhere in the app
- [ ] Onboarding screens all dark

---

## Stage 3 — Friend Test (F2)

**Who:** 4-5 friends. Mix of running experience. Use separate real accounts (not UAT).

**Script to send:**
> "I'm testing NextSplit before launch. Takes 15-20 mins. Sign up at nextsplit.app, pick a training plan, and log your next run. Tell me anything confusing, broken, or wrong — nothing too small. Be brutal."

**Watch for:**
- [ ] Any error that blocks signup
- [ ] Any error that blocks plan selection
- [ ] Any error that blocks session logging
- [ ] Anything described as "confusing" without explanation
- [ ] Pages that look wrong (light mode bleeding through)
- [ ] Plan quality — do the paces feel right?

**Fix any blocker before continuing.**

---

## Stage 4 — Infrastructure

- [ ] Run DB verify: `SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/uat-db-verify.ts`
- [ ] All checks pass (no RLS holes, no duplicate handles, valid plan data)
- [ ] Sentry: login, confirm events are being captured from nextsplit.app
- [ ] Check Vercel function logs for any recurring errors
- [ ] Test push notification (install PWA on Android, log a session, check notification)

---

## Stage 5 — Performance

Run from Chrome DevTools (Mobile simulation, 4G):
- [ ] nextsplit.app/auth/login — Performance ≥ 80
- [ ] nextsplit.app/home — Performance ≥ 80 (after login)
- [ ] nextsplit.app/train — Performance ≥ 80

---

## Stage 6 — Alpha Invite List

Prepare before completing this checklist:

| Name | Email | Device | Notes |
|------|-------|--------|-------|
| | | Android / iPhone | |
| | | Android / iPhone | |
| | | Android / iPhone | |
| | | Android / iPhone | |
| | | Android / iPhone | |

**Target:** 10-20 runners. Mix of beginner/intermediate/advanced. At least 1 who has coached others.

**Brief for wider alpha:**
> "NextSplit is in closed alpha. We're building a running training app around one insight: the best predictor of consistency is having people who notice when you don't show up. Your job is to break it and tell us what feels wrong. Expect rough edges."

---

## Gate Sign-off

| Stage | Status | Notes |
|-------|--------|-------|
| 1 — Environment | ⬜ | |
| 2 — Founder device test | ⬜ | |
| 3 — Friend test | ⬜ | |
| 4 — Infrastructure | ⬜ | |
| 5 — Performance | ⬜ | |
| 6 — Invite list ready | ⬜ | |

**Do not send wider alpha invites until all 6 stages are ✅.**
