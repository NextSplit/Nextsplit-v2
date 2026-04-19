# NextSplit v2 — Dev Session Handoff
_Last updated: end of session 4_

## ⚠️ START OF SESSION CHECKLIST
1. Ask the user: **"Please share your GitHub token so I can clone the repo"**
2. Clone: `git clone https://ghp_TOKEN@github.com/NextSplit/Nextsplit-v2.git nextsplit-v2`
3. Read this file fully before touching any code

---

## Repo
- GitHub: https://github.com/NextSplit/Nextsplit-v2
- Live: https://nextsplit-v2.vercel.app

## Deploy instructions
**Auto-deploy is broken on Hobby plan. Do NOT use the deploy hook URL — that's for the user to trigger manually.**

- Push to `main` with `git push origin main`
- Then **tell the user** to open this URL in their browser to trigger Vercel deploy:
  `https://api.vercel.com/v1/integrations/deploy/prj_pEA372Qu7gpT6SbskQbeuveYZ9Ri/onqfsTdnji`
- Never open that URL yourself

## Git log (latest first)
```
e55f308  fix: 8-item audit sprint — duplicate nutrition, plan log modal, stats units, dark mode sync, strava gate, gym logs, wellness dismiss, sw debug log
699109b  fix: PWA install button — capture beforeinstallprompt at module scope, Android button in profile card
a4f0146  Phase 5C: PWA — install prompt, offline page, improved SW caching, better manifest
5511fab  (dark mode toggle on all tab headers)
036cbf1  fix: dark mode higher specificity CSS overrides
bf6c56c  Phase 5B: Strava — fix callback URL, disconnect button
f4c10b7  Phase 5A: onboarding polish — entry screen, progress bars, animations
5a202cb  Phase 4: PB history card, dark mode global overrides, accessibility
a81ce1d  fix: remove cron for Hobby plan compatibility
589e7e6  Phase 3: share card wired, plan completion ceremony, push notifications
55aeb73  Phase 2: contextual fuel card, pre-race AI brief, adaptive suggestions
4c55fd0  Phase 1: settings, plan history, plan switching, units/dark mode
68d68f1  Phase 0: CSS tokens, Toast, ErrorBoundary, units
```

## Phases complete
- Phase 0 ✅ CSS tokens, Toast, ErrorBoundary, units
- Phase 1 ✅ Settings, plan history, switching, units/dark mode prefs
- Phase 2 ✅ Fuel card, PreRaceBrief, AdaptiveSuggestions
- Phase 3 ✅ Haptics, ShareSessionCard wired, push notifications, plan completion ceremony
- Phase 4 ✅ PB history card, dark mode CSS overrides, accessibility
- Phase 5A ✅ Onboarding polish — entry screen redesign, progress bars, animations
- Phase 5B ✅ Strava — fixed callback URL, disconnect button, improved UI
- Phase 5B+ ✅ Dark mode toggle (sun/moon) on all 5 tab headers
- Phase 5C ✅ PWA — install prompt (Android native + iOS steps), offline page, SW caching, manifest shortcuts
- Audit Fix Sprint ✅ All 8 bugs fixed (see below)

## Audit fix sprint — completed (commit e55f308)
All 8 issues from the full audit were resolved:

1. ✅ **Duplicate nutrition** — removed redundant strip below sessions in TodayClient (smart fuel card above is the only one now)
2. ✅ **Plan tab Log button** — now opens full LogModal with effort/km/pace/notes instead of silent quick-done with no data
3. ✅ **Stats units** — `useUnits()` added to StatsClient, SessionSummary, PBCard, PaceTrend; distances and paces now respect km/miles preference
4. ✅ **Dark mode sync** — Settings now syncs Supabase `dark_mode` + `text_size` + `units` → localStorage on profile load (fixes fresh device/new install)
5. ✅ **Strava button** — StravaSyncButton now reads `nextsplit_strava_connected` from localStorage and returns null if not connected; StravaSection writes that flag on mount
6. ✅ **Gym log completion dots** — Plan tab WeekRow and DayRow now check both `training_logs` AND `gym_logs` for session completion; weekComplete check also updated
7. ✅ **Wellness dismissal** — × button on morning check-in now persists `nextsplit_wellness_dismissed` with today's date key; won't reappear until tomorrow
8. ✅ **console.debug removed** from ServiceWorkerRegistrar

## Vercel env vars
- NEXT_PUBLIC_SUPABASE_URL ✅
- NEXT_PUBLIC_SUPABASE_ANON_KEY ✅
- NEXT_PUBLIC_SITE_URL ✅
- NEXT_PUBLIC_VAPID_PUBLIC_KEY ✅
- VAPID_PRIVATE_KEY ✅
- VAPID_EMAIL ✅
- CRON_SECRET ✅
- ANTHROPIC_API_KEY ❌ NOT SET — add to unlock PreRaceBrief, AdaptiveSuggestions, CoachingCard
- STRAVA_CLIENT_ID ❌ NOT SET — need Strava developer app
- STRAVA_CLIENT_SECRET ❌ NOT SET

## Known issues remaining (from audit — not yet fixed)
These are the next priority items:

### Medium bugs
- **PB detection misses quick-done logs** — `checkNewPB` requires both `km` AND `pace`. Quick-done (no modal) never sets pace. Auto-calculate pace from duration+km and feed into PB check even without explicit pace entry.
- **Week advance on Sunday shows wrong day** — After advancing week on Sunday, `viewWeekN` calculation anchors to Sunday which is day 6 of the new week (likely rest day). User sees blank "rest day" instead of Monday's sessions. Fix: after advancing, if today is Sunday and dateOffset=0, show day 0 (Monday) of the new week instead.
- **Race date dual source of truth** — `plan.race_date` drives the countdown in Stats. Races logged in the Races section don't link. Consider syncing the nearest A-race date to `plan.race_date` automatically.

### Low priority
- `decodeHtml` called on every render — memoize or run at data fetch time
- Very small text (`text-[9px]`, `text-[10px]` in gray-300) below WCAG AA contrast at that size
- LogModal: no confirmation before backdrop-tap-to-dismiss if fields are dirty
- FocusMode: no Escape key handler to close overlay

## Roadmap — next phases

### Phase 6 — Polish & Stability (recommended next)
- Fix remaining medium bugs above (PB detection, week advance Sunday, race date)
- Split TodayClient (700+ lines) into sub-components with React.memo to stop cascade re-renders
- Add shared PlanContext so useActivePlan fetches once per session (currently re-fetches on every tab switch)
- Post-plan-completion: show "Start your next plan" prompt on Today instead of bare empty state
- LogModal: dirty-check before dismiss

### Phase 7 — AI Features (needs ANTHROPIC_API_KEY in Vercel)
- PreRaceBrief, AdaptiveSuggestions, CoachingCard all already built — just need the key
- New: post-session AI feedback (1 sentence based on effort vs plan)

### Phase 8 — Strava full activation
- Add STRAVA_CLIENT_ID + STRAVA_CLIENT_SECRET to Vercel env
- Register redirect URI in Strava developer console: `https://nextsplit-v2.vercel.app/auth/strava/callback`
- Test end-to-end connect → sync → splits display flow

### Phase 9 — Data depth
- Body weight trending graph (in wellness schema, not surfaced in Stats)
- Sleep score trending (in wellness schema, not surfaced)
- Weekly email digest
- Heart rate zone analysis

### Phase 10 — Monetisation
- Paywall gate (free: 1 plan; pro: unlimited + AI)
- Stripe integration
- Coach tier: plan builder UI, athlete management

## Key files
- Today:       src/app/today/TodayClient.tsx
- Stats:       src/app/dashboard/StatsClient.tsx
- Profile:     src/app/profile/ProfileClient.tsx
- Fuel:        src/app/nutrition/NutritionClient.tsx
- Plan:        src/app/plan/PlanClient.tsx
- Settings:    src/app/settings/SettingsClient.tsx
- History:     src/app/history/HistoryClient.tsx
- Onboarding:  src/app/onboarding/ (OnboardingEntry.tsx + 4 sub-flows)
- Offline:     src/app/offline/page.tsx
- Components:  DarkModeToggle.tsx, PWAInstallPrompt.tsx, ServiceWorkerRegistrar.tsx,
               WellnessCheckIn.tsx, ShareSessionCard.tsx, PlanCompletionCeremony.tsx,
               PreRaceBrief.tsx, AdaptiveSuggestions.tsx, FocusMode.tsx, StravaSyncButton.tsx
- Hooks:       useActivePlan.ts, useTrainingLog.ts, useGymLog.ts, usePushNotifications.ts,
               useWellness.ts, useProfile.ts
- Lib:         haptics.ts, units.ts, rpg.ts, personalBests.ts, streak.ts, sessionUtils.ts

## Architecture notes
- Supabase backend (9-table schema with RLS)
- Next.js 16 App Router, all tabs are client components
- Dark mode: localStorage + CSS class `.dark` on `<html>` — ThemeWrapper applies on mount
- Units: localStorage `nextsplit_units` ('km'|'miles') — useUnits() hook + event dispatch
- PWA: /public/sw.js registered eagerly by ServiceWorkerRegistrar, install prompt in PWAInstallPrompt
- No shared state context — each tab calls useActivePlan() independently (known perf issue, Phase 6 fix)
- 53 `as any` casts on Supabase calls — harmless at runtime, TS types not generated

## Build commands
```
cd nextsplit-v2
npm install
node_modules/.bin/next build   # verify before pushing
git add -A
git commit -m "your message"
git push origin main
# Then tell user to open deploy hook URL in browser
```
