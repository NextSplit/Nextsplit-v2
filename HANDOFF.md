# NextSplit v2 — Dev Session Handoff
_Last updated: end of session 2_

## Repo
- GitHub: https://github.com/NextSplit/Nextsplit-v2
- Token: [TOKEN - see Vercel env]
- Live: https://nextsplit-v2.vercel.app

## Git log (latest first)
```
a81ce1d  fix: remove cron for Hobby plan compatibility
589e7e6  Phase 3: share card wired, plan completion ceremony, push notifications
66c84a3  Add HANDOFF.md
0ddba07  Phase 3A/B partial: haptics, share session card
55aeb73  Phase 2: fuel card, pre-race brief, adaptive suggestions
4c55fd0  Phase 1: settings, plan history, switching, units, dark mode
68d68f1  Phase 0: CSS tokens, Toast, ErrorBoundary, units utility
```

## Phases complete
- Phase 0 ✅ CSS tokens, Toast, ErrorBoundary, units
- Phase 1 ✅ Settings, plan history, switching, units/dark mode prefs
- Phase 2 ✅ Fuel card, PreRaceBrief, AdaptiveSuggestions
- Phase 3 ✅ Haptics, ShareSessionCard wired, push notifications, plan completion ceremony

## Vercel notes
- Hobby plan — cron removed from vercel.json (was blocking deploys)
- Auto-deploy from GitHub NOT working — to deploy, go to Vercel dashboard →
  nextsplit-v2 → Deployments → Create Deployment → paste latest commit hash
- Env vars all set EXCEPT ANTHROPIC_API_KEY (AI features skip gracefully)

## VAPID keys (in Vercel env)
- Public: BCfA02eIMUzW0dHw5KLiw7SDunfQNEcsfJS8BE7Z9hulEKluKwc5syOb-oBxjF2DJoZKdsZR8SWaiIFT0Eu0LCI
- Private: in Vercel env only

## Known issues
- ANTHROPIC_API_KEY not set — AI features fail silently
- Push notification cron removed — manual send works via /api/notifications/send
- GitHub auto-deploy broken — use commit hash method to deploy

## Next tasks — Phase 4
- 4A: Stats enhancements (PB history, better charts)
- 4B: Dark mode deep pass
- 4C: Accessibility pass (focus rings, aria, contrast)

## Key files
- Today:    src/app/today/TodayClient.tsx
- Stats:    src/app/dashboard/StatsClient.tsx
- Profile:  src/app/profile/ProfileClient.tsx
- Fuel:     src/app/nutrition/NutritionClient.tsx
- Plan:     src/app/plan/PlanClient.tsx
- Settings: src/app/settings/SettingsClient.tsx
- Hooks:    src/hooks/useActivePlan.ts, useProfile.ts, usePushNotifications.ts
- Lib:      src/lib/haptics.ts, units.ts, rpg.ts
- Components: ShareSessionCard.tsx, PlanCompletionCeremony.tsx,
              PreRaceBrief.tsx, AdaptiveSuggestions.tsx, FocusMode.tsx

## Build commands
  npm run build
  npx tsc --noEmit
  npm run dev
