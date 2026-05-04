# NextSplit — UAT Script v1.0
**Pre-Alpha Quality Gate**
Tester: Founder / Date: ___________
Pass = ✅ | Fail = ❌ | Skip = ⏭

---

## Setup
- Device: Android Chrome (nextsplit.app)
- Start in a fresh browser tab (or incognito)
- Clear app data if testing fresh signup flow

---

## SECTION A — Landing & Auth

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| A1 | Visit nextsplit.app | Landing page loads dark with cyan "NextSplit" wordmark | | |
| A2 | Check nav bar | "Get started free" button visible | | |
| A3 | Tap "Get started free" | Goes to /auth/signup (not login) | | |
| A4 | Enter email + password | Form accepts input | | |
| A5 | Submit signup | Redirects to /onboarding | | |
| A6 | Visit nextsplit.app/auth/login | Login form shows dark background | | |
| A7 | Try Google OAuth | Redirects to Google, returns to app | | |

---

## SECTION B — Onboarding (full new user flow)

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| B1 | Step 1: Welcome screen | Dark background, coral "Get started" CTA | | |
| B2 | Step 2: Character creation | Runner visible, options selectable | | |
| B3 | Enter handle "@testuser" | No error, continues | | |
| B4 | Try taken handle | Red error "This handle is taken" | | |
| B5 | Step 3: Strava connect | Dark background, skip button visible | | |
| B6 | Tap "Skip for now" | Advances to step 4 | | |
| B7 | Step 4: Sport select | Running pre-selected, gym selectable | | |
| B8 | Step 5: About you | Name/DOB/sex fields work, continue active | | |
| B9 | Step 6: Running history | Slider and race time inputs work | | |
| B10 | Step 7: Goals | A race, B race, C race structure shows | | |
| B11 | Set Brighton Marathon Apr 2027 | Date picker accepts it | | |
| B12 | Step 8: Training week | Day selection works, 5d pre-selected | | |
| B13 | Time icons | Each shows emoji + label (Morning/Lunch etc) | | |
| B14 | Step 9: Gym config | Toggle on, 3x shows, equipment selectable | | |
| B15 | Step 10: Training path | 5 options shown, AI recommended highlighted | | |
| B16 | Select "Follow a structured plan" | Advances to generation | | |
| B17 | Plan generation screen | Dark background, runner animation, progress bar | | |
| B18 | Plan preview | Plan name, weeks, sessions listed | | |
| B19 | Race date alignment | If plan ≠ race date by >3 weeks, amber warning shows | | |
| B20 | Tap "Start training" | Redirects to /home | | |
| B21 | Go back during onboarding | Previous step shows with data retained | | |

---

## SECTION C — Home Tab

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| C1 | /home loads | Dark background, cyan "NextSplit" wordmark | | |
| C2 | XP bar visible | Level 1, 0% progress | | |
| C3 | Greeting shows | "Good morning/afternoon/evening, [name]" | | |
| C4 | Hero card state | Training day = coral card / Rest day = muted card | | |
| C5 | Stats strip | Weekly km (0.0), Full stats link | | |
| C6 | Coach nudge card | "Get a coach" violet card | | |
| C7 | Squad nudge card | "Join a squad" lime card | | |
| C8 | Elite upsell | Amber card with £7.99/mo | | |
| C9 | Dark mode toggle | Moon/sun icon in header, toggles correctly | | |
| C10 | Dark mode persists | Switch tabs and back — stays dark | | |
| C11 | Bottom nav | Home/Train/Explore/You visible, Home cyan | | |

---

## SECTION D — Train Tab

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| D1 | Tap Train tab | /train loads, coral active indicator | | |
| D2 | Plan name in header | "Marathon Novice · Week 1 of 20" | | |
| D3 | Progress bar | Thin cobalt bar showing week progress | | |
| D4 | Today section | "Today · [Day]" in coral | | |
| D5 | Session cards | Full colour hero cards (green=easy, blue=long etc) | | |
| D6 | Rest day | Muted grey card with "Rest day 😴" | | |
| D7 | Stats strip | Weekly km, ACWR (—), streak (—) | | |
| D8 | Full plan visible | Week 1 expanded, weeks 2-20 below | | |
| D9 | Tap a session card | Bottom sheet slides up | | |
| D10 | Log modal shows | Session name, distance, pace visible | | |
| D11 | "Done ✓" button visible | Not cut off by bottom bar | | |
| D12 | Tap "Done ✓" | Session logged, XP float shows "+15 XP" | | |
| D13 | Undo toast | "Undo" appears for 8 seconds | | |
| D14 | Session marked done | Card shows green tick, faded | | |
| D15 | Fuel tab | Tap "🥗 Fuel" — shows nutrition guidance | | |
| D16 | "+ Add" button | Opens ad-hoc session modal | | |

---

## SECTION E — Explore Tab

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| E1 | Tap Explore tab | /explore loads, lime active indicator | | |
| E2 | 4 tabs visible | Coaches / Squads / Plans / AI | | |
| E3 | Coaches tab | Violet header card, "Coaches coming soon" | | |
| E4 | "Browse all coaches" link | Goes to /coaches with back button | | |
| E5 | "Apply to coach" link | Goes to /coach/setup | | |
| E6 | Squads tab | Lime header card, Start/Join CTAs | | |
| E7 | "Start a squad" | Goes to /squad/create with back button | | |
| E8 | "Join a squad" | Goes to /squad/join — code entry shows | | |
| E9 | Plans tab | Cobalt header card, Elite upsell, plan list | | |
| E10 | Plan list | Shows "NextSplit Official" plans | | |
| E11 | AI tab | Cyan header card, 4 starter prompts | | |
| E12 | Type AI question | Input works, send button active | | |
| E13 | AI responds | Response appears (may need Elite for some) | | |
| E14 | Bottom nav visible | Nav shows on all Explore sub-pages | | |

---

## SECTION F — You Tab

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| F1 | Tap You tab | /you loads, amber active indicator | | |
| F2 | Default tab | Opens on 🏆 Achievements (not Character) | | |
| F3 | 4 sub-tabs | Achievements / Character / Stats / Account | | |
| F4 | Achievements tab | PBs empty, training summary 0/0, badges grid | | |
| F5 | Character tab | Runner avatar, RPG stats, class "The Newcomer" | | |
| F6 | Stats tab | "Stats unlock after 4 sessions" message | | |
| F7 | Account tab | Elite upsell, Strava connect, Settings, Sign out | | |
| F8 | Settings link | Goes to Settings with ← Back button | | |
| F9 | Dark mode in Settings | Toggle works and persists | | |
| F10 | Sign out | Signs out, redirects to /auth/login | | |

---

## SECTION G — Plan Management

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| G1 | You → Account → Settings | Settings page loads | | |
| G2 | Find "Archive plan" | Confirm dialog appears | | |
| G3 | Confirm archive | Goes to /onboarding?step=7 (Goals, NOT step 1) | | |
| G4 | Goals screen shows | Name/handle NOT required again | | |
| G5 | Complete new plan setup | New plan activates correctly | | |
| G6 | Gym sessions in plan | If 3x gym chosen + 5 run days, plan has double session days | | |

---

## SECTION H — Dark Mode Consistency

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| H1 | Fresh visit (cleared storage) | App loads dark by default | | |
| H2 | Navigate Home → Train → Explore → You | Stays dark throughout | | |
| H3 | Toggle to light in Home header | All tabs go light | | |
| H4 | Navigate all tabs in light | Stays light throughout | | |
| H5 | Onboarding screens | Dark background throughout | | |
| H6 | Auth/login | Dark background | | |
| H7 | Refresh page | Remembers last theme, no flash | | |

---

## SECTION I — Edge Cases

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| I1 | Visit /today | Redirects to /train | | |
| I2 | Visit /profile | Redirects to /you | | |
| I3 | Visit /community | Redirects to /explore | | |
| I4 | Visit /plan | Redirects to /train | | |
| I5 | Visit /home unauthenticated | Redirects to /auth/login | | |
| I6 | Bad URL /xyz | 404 or redirect to home | | |
| I7 | Log in, close tab, reopen | Stays logged in | | |
| I8 | Rotate to landscape | No broken layouts | | |

---

## SECTION J — Performance

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| J1 | Time from tap "Get started" to onboarding step 1 | Under 3 seconds | | |
| J2 | Time from login to /home | Under 3 seconds | | |
| J3 | Tab switching speed | Instant, no loading spinner | | |
| J4 | Plan generation | Under 15 seconds | | |
| J5 | Session log | Under 1 second response | | |

---

## Summary

| Section | Total | Pass | Fail | Skip |
|---------|-------|------|------|------|
| A — Landing & Auth | 7 | | | |
| B — Onboarding | 21 | | | |
| C — Home tab | 11 | | | |
| D — Train tab | 16 | | | |
| E — Explore tab | 14 | | | |
| F — You tab | 10 | | | |
| G — Plan management | 6 | | | |
| H — Dark mode | 7 | | | |
| I — Edge cases | 8 | | | |
| J — Performance | 5 | | | |
| **Total** | **105** | | | |

---

## Sign-off
Alpha ready when: all sections A–F pass with ≤2 minor failures, G–J no critical failures.

Tester sign-off: ___________________ Date: ___________
