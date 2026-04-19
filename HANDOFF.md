# NextSplit v2 — Dev Session Handoff
_Last updated: end of session 3_

## Repo
- GitHub: https://github.com/NextSplit/Nextsplit-v2
- Live: https://nextsplit-v2.vercel.app
- Deploy hook: https://api.vercel.com/v1/integrations/deploy/prj_pEA372Qu7gpT6SbskQbeuveYZ9Ri/onqfsTdnji
  (open this URL in browser to trigger deploy after any push)

## Git log (latest first)
```
[pending]    feat: dark mode toggle on all tab headers
036cbf1      fix: dark mode higher specificity CSS overrides
bf6c56c      Phase 5B: Strava — fix callback URL, disconnect button
f4c10b7      Phase 5A: onboarding polish — entry screen, progress bars, animations
5a202cb      Phase 4: PB history card, dark mode global overrides, accessibility
a81ce1d      fix: remove cron for Hobby plan compatibility
589e7e6      Phase 3: share card wired, plan completion ceremony, push notifications
55aeb73      Phase 2: contextual fuel card, pre-race AI brief, adaptive suggestions
4c55fd0      Phase 1: settings, plan history, plan switching, units/dark mode
68d68f1      Phase 0: CSS tokens, Toast, ErrorBoundary, units utility
```

## Phases complete
- Phase 0 ✅ CSS tokens, Toast, ErrorBoundary, units
- Phase 1 ✅ Settings, plan history, switching, units/dark mode prefs
- Phase 2 ✅ Fuel card, PreRaceBrief, AdaptiveSuggestions
- Phase 3 ✅ Haptics, ShareSessionCard wired, push notifications, plan completion ceremony
- Phase 4 ✅ PB history card, dark mode CSS overrides, accessibility
- Phase 5A ✅ Onboarding polish — entry screen redesign, progress bars, animations across all 4 flows
- Phase 5B ✅ Strava — fixed callback URL bug (/auth/strava/callback), disconnect button, improved UI
- Phase 5B+ ✅ Dark mode toggle (sun/moon) on all 5 tab headers, persists via localStorage

## Vercel setup
- Project: nextsplit-v2 (nextsplit-v2.vercel.app)
- Hobby plan — cron removed from vercel.json
- Auto-deploy broken — open deploy hook URL after each push to trigger
- Env vars set: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY, VAPID_EMAIL, CRON_SECRET
- ANTHROPIC_API_KEY: NOT SET (AI features skip gracefully)
- STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET: NOT SET (Strava UI shows but connect will fail)

## VAPID keys (in Vercel env)
- Public: BCfA02eIMUzW0dHw5KLiw7SDunfQNEcsfJS8BE7Z9hulEKluKwc5syOb-oBxjF2DJoZKdsZR8SWaiIFT0Eu0LCI

## Known issues / to activate later
- ANTHROPIC_API_KEY — add to Vercel to enable PreRaceBrief, AdaptiveSuggestions, CoachingCard
- STRAVA_CLIENT_ID + STRAVA_CLIENT_SECRET — need Strava developer app + add redirect URI:
  https://nextsplit-v2.vercel.app/auth/strava/callback
- Push notifications cron removed — manual send works via /api/notifications/send
- Dark mode CSS overrides use [class*="bg-white"] attribute selectors — may still miss
  some inline style backgrounds. If any remain, target them individually in globals.css

## Next tasks — Phase 5C + beyond
- 5C: PWA — install prompt (beforeinstallprompt), offline page, better manifest
- 6: Final polish pass — any remaining dark mode gaps, animation smoothness
- 7: ANTHROPIC_API_KEY setup when ready → AI features come alive

## Key files
- Today:       src/app/today/TodayClient.tsx
- Stats:       src/app/dashboard/StatsClient.tsx
- Profile:     src/app/profile/ProfileClient.tsx
- Fuel:        src/app/nutrition/NutritionClient.tsx
- Plan:        src/app/plan/PlanClient.tsx
- Settings:    src/app/settings/SettingsClient.tsx
- Onboarding:  src/app/onboarding/ (OnboardingEntry.tsx + 4 sub-flows)
- Components:  DarkModeToggle.tsx, OnboardingProgress.tsx, ShareSessionCard.tsx,
               PlanCompletionCeremony.tsx, PreRaceBrief.tsx, AdaptiveSuggestions.tsx,
               FocusMode.tsx, StravaSyncButton.tsx
- Hooks:       useActivePlan.ts, useProfile.ts, usePushNotifications.ts
- Lib:         haptics.ts, units.ts, rpg.ts, personalBests.ts

## Build commands
  npm run build
  npx tsc --noEmit
  npm run dev
