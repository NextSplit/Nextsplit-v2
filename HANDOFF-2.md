# NextSplit v2 — Dev Session Handoff
_Last updated: end of session 5 (Phase 6 complete)_

## ⚠️ START OF SESSION CHECKLIST
1. Ask the user: **"Please share your GitHub token so I can clone the repo"**
2. Clone: `git clone https://ghp_TOKEN@github.com/NextSplit/Nextsplit-v2.git nextsplit-v2`
3. `cd nextsplit-v2 && npm install`
4. Read this file fully before touching any code

---

## Repo
- GitHub: https://github.com/NextSplit/Nextsplit-v2
- Live: https://nextsplit-v2.vercel.app

## Deploy instructions
**Auto-deploy is broken on Hobby plan. Never trigger the deploy hook yourself.**

- Push to `main` with `git push origin main`
- Then **tell the user** to open this URL in their browser to trigger Vercel deploy:
  `https://api.vercel.com/v1/integrations/deploy/prj_pEA372Qu7gpT6SbskQbeuveYZ9Ri/onqfsTdnji`
- Never open that URL yourself — user does it manually

## Git log (latest first)
```
e127022  Phase 6: PB auto-pace, Sunday week fix, post-completion re-engagement, LogModal dirty-check
e55f308  fix: 8-item audit sprint — duplicate nutrition, plan log modal, stats units, dark mode sync, strava gate, gym logs, wellness dismiss, sw debug log
699109b  fix: PWA install button — capture beforeinstallprompt at module scope
a4f0146  Phase 5C: PWA — install prompt, offline page, improved SW caching, better manifest
5511fab  dark mode toggle on all tab headers
036cbf1  fix: dark mode higher specificity CSS overrides
bf6c56c  Phase 5B: Strava — fix callback URL, disconnect button
f4c10b7  Phase 5A: onboarding polish
5a202cb  Phase 4: PB history card, dark mode global overrides, accessibility
a81ce1d  fix: remove cron for Hobby plan compatibility
589e7e6  Phase 3: share card, plan completion ceremony, push notifications
55aeb73  Phase 2: contextual fuel card, pre-race AI brief, adaptive suggestions
4c55fd0  Phase 1: settings, plan history, switching, units/dark mode
68d68f1  Phase 0: CSS tokens, Toast, ErrorBoundary, units
```

## Phases complete
- Phase 0 ✅ CSS tokens, Toast, ErrorBoundary, units
- Phase 1 ✅ Settings, plan history, switching, units/dark mode prefs
- Phase 2 ✅ Fuel card, PreRaceBrief, AdaptiveSuggestions
- Phase 3 ✅ Haptics, ShareSessionCard, push notifications, plan completion ceremony
- Phase 4 ✅ PB history card, dark mode CSS overrides, accessibility
- Phase 5A ✅ Onboarding polish — entry screen, progress bars, animations
- Phase 5B ✅ Strava — fixed callback URL, disconnect button
- Phase 5B+ ✅ Dark mode toggle on all 5 tab headers
- Phase 5C ✅ PWA — install prompt, offline page, SW caching, manifest shortcuts
- Audit Fix Sprint ✅ 8 bugs fixed (duplicate nutrition, plan log modal, stats units, dark mode sync, strava gate, gym logs, wellness dismiss, sw debug)
- Phase 6 ✅ PB auto-pace detection, Sunday week fix, post-completion re-engagement, LogModal dirty-check

## Phase 6 — what was done (commit e127022)
1. **PB detection** — now auto-calculates pace from `duration_secs / km` when no explicit pace entered, so quick-done + duration logs can trigger PB toasts
2. **Sunday week fix** — `viewWeekN` in TodayClient now anchors by the Monday of each week (using `vdMonday`) so Sunday correctly stays in the current plan week, not the next
3. **Post-completion re-engagement** — `PlanCompletionCeremony` sets `nextsplit_plan_completed` in localStorage on mount; TodayClient empty state reads this and shows "Plan complete — what's next?" with "Start next plan →" instead of generic "No active plan"
4. **LogModal dirty-check** — backdrop tap and Cancel button now check `isDirty` and show `window.confirm('Discard changes?')` before closing if user has entered data

## Vercel env vars
- NEXT_PUBLIC_SUPABASE_URL ✅
- NEXT_PUBLIC_SUPABASE_ANON_KEY ✅
- NEXT_PUBLIC_SITE_URL ✅
- NEXT_PUBLIC_VAPID_PUBLIC_KEY ✅
- VAPID_PRIVATE_KEY ✅
- VAPID_EMAIL ✅
- CRON_SECRET ✅
- ANTHROPIC_API_KEY ❌ NOT SET — add to unlock PreRaceBrief, AdaptiveSuggestions, CoachingCard
- STRAVA_CLIENT_ID ❌ NOT SET — needs Strava developer app setup
- STRAVA_CLIENT_SECRET ❌ NOT SET

## Known remaining issues (low priority)
- `decodeHtml` called on every render — memoize or run at data fetch time
- Very small text (`text-[9px]`, `text-[10px]` gray-300) may be below WCAG AA contrast
- Race date dual source of truth — `plan.race_date` drives countdown; races logged in Races section don't auto-sync
- No shared PlanContext — each tab calls `useActivePlan()` independently (re-fetches on tab switch)
- TodayClient is 700+ lines — could be split into sub-components with React.memo

## Next phases — recommended order

### Phase 7 — AI Features (needs ANTHROPIC_API_KEY added to Vercel)
All components already built, just need the env var:
- `PreRaceBrief` — AI race day briefing (wired into Stats tab)
- `AdaptiveSuggestions` — AI coaching suggestions (wired into Plan tab)
- `CoachingCard` — AI coaching card (wired into Stats tab)
- New to build: post-session AI feedback (1 sentence based on effort vs plan target)
- New to build: AI onboarding flow completion (the "AI bespoke" path is a stub)

### Phase 8 — Strava full activation
Steps needed:
1. Create Strava developer app at https://developers.strava.com
2. Set redirect URI: `https://nextsplit-v2.vercel.app/auth/strava/callback`
3. Add `STRAVA_CLIENT_ID` + `STRAVA_CLIENT_SECRET` to Vercel env vars
4. Test: connect → sync → splits display → disconnect
- `nextsplit_strava_connected` localStorage flag already wired — button auto-shows after connect

### Phase 9 — Data depth & analytics
- Body weight trending graph (data already in `wellness_logs.weight_kg`, not surfaced in Stats)
- Sleep score trending (data in `wellness_logs.sleep`, not surfaced)
- Weekly training load chart improvement (ACWR chart exists, needs better explanation UI)
- Heart rate zone analysis (requires HR from Strava or manual entry)
- Race predictor improvement (currently basic — could use Riegel formula with actual PB data)

### Phase 10 — Social & sharing
- Weekly email digest (needs cron + email provider e.g. Resend)
- Garmin/Wahoo export (FIT file generation)
- Share card: test canvas render on Safari/iOS (may need html2canvas fix)
- Leaderboard / friend challenges (new tables needed)

### Phase 11 — Monetisation
- Free tier: 1 active plan, no AI features
- Pro tier: unlimited plans + AI + advanced analytics
- Stripe integration + webhook
- Coach tier: plan builder UI, athlete management dashboard

## Key files
- Today:       src/app/today/TodayClient.tsx
- Stats:       src/app/dashboard/StatsClient.tsx
- Profile:     src/app/profile/ProfileClient.tsx
- Fuel:        src/app/nutrition/NutritionClient.tsx
- Plan:        src/app/plan/PlanClient.tsx
- Settings:    src/app/settings/SettingsClient.tsx
- History:     src/app/history/HistoryClient.tsx
- Onboarding:  src/app/onboarding/ (OnboardingEntry.tsx + 4 sub-flows: ai, lifestyle, manual, predetermined)
- Offline:     src/app/offline/page.tsx
- Components:  DarkModeToggle, PWAInstallPrompt, ServiceWorkerRegistrar,
               WellnessCheckIn, ShareSessionCard, PlanCompletionCeremony,
               PreRaceBrief, AdaptiveSuggestions, CoachingCard, FocusMode, StravaSyncButton
- Hooks:       useActivePlan, useTrainingLog, useGymLog, usePushNotifications,
               useWellness, useProfile, usePlanHistory, useRaces
- Lib:         haptics.ts, units.ts, rpg.ts, personalBests.ts, streak.ts, sessionUtils.ts, nutrition.ts

## Architecture notes
- Supabase backend (9-table schema with RLS), Next.js 16 App Router
- All tabs are client components — no RSC data fetching
- Dark mode: localStorage + `.dark` on `<html>` — ThemeWrapper applies on mount, Settings syncs from Supabase
- Units: localStorage `nextsplit_units` ('km'|'miles') — `useUnits()` hook + event dispatch
- PWA: `/public/sw.js` registered eagerly by ServiceWorkerRegistrar; install prompt in PWAInstallPrompt
- Strava connection state: localStorage `nextsplit_strava_connected` ('true'|'false'), written by StravaSection
- Plan completion state: localStorage `nextsplit_plan_completed` ('1'), written by PlanCompletionCeremony
- No shared state context — each tab fetches independently (known perf issue, acceptable for now)
- 53 `as any` casts on Supabase calls — harmless at runtime, TypeScript types not auto-generated

## Build commands
```bash
cd nextsplit-v2
npm install
node_modules/.bin/next build   # always verify before pushing
git add -A
git commit -m "your message"
git push origin main
# Then tell the user to open the deploy hook URL in their browser
```

## Handoff update instructions (for Claude)
After each phase: update this file, commit it, push, then present it to the user with present_files tool.
