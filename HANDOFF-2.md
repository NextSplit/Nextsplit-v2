# NextSplit v2 — Dev Session Handoff
_Last updated: end of session 10 (Phase UI-1 complete)_

## ⚠️ START OF SESSION CHECKLIST
1. Ask user for GitHub token: **"Please share your GitHub token so I can clone the repo"**
2. Clone: `git clone https://ghp_TOKEN@github.com/NextSplit/Nextsplit-v2.git nextsplit-v2`
3. `cd nextsplit-v2 && npm install`
4. `node_modules/.bin/next build` — confirm clean before touching anything
5. Read the EXACT NEXT STEPS section below before writing any code

---

## Repo
- GitHub: https://github.com/NextSplit/Nextsplit-v2
- Live: https://nextsplit-v2.vercel.app

## Deploy instructions
**Auto-deploy is broken. Never trigger the deploy hook yourself.**
- Push: `git push origin main`
- Tell user to open in browser to deploy:
  `https://api.vercel.com/v1/integrations/deploy/prj_pEA372Qu7gpT6SbskQbeuveYZ9Ri/onqfsTdnji`

## Git log (latest first)
```
5513b23  Phase UI-1: Today sessions-first reorder, Coach tab reorder + rename, Character tab reorder + rename + divider
bb432d2  Phase UI-1 (partial): rename Stats→Coach, Me→Character in bottom nav
129007c  docs: update HANDOFF-2 after Phase 8 Strava
7b59ac9  fix: Strava — useEffect for connection check, env var for client ID
36231bc  Phase 8: Strava — connect toast, athlete name, manual sync, last sync time
5cf8235  docs: update HANDOFF-2 after Phase 9
6a53e16  Phase 9: rich wellness dashboard, weight trend, multi-distance race predictor
bb8fbeb  Phase 7: premium framework + AI rate limiting
e127022  Phase 6: PB auto-pace, Sunday week fix, re-engagement, dirty-check
```

## Phases complete
- Phase 0–9 ✅ Full foundation, AI live, Strava live
- Phase UI-1 ✅ COMPLETE — tab renames, Today reorder, Coach reorder, Character reorder + divider

---

## ═══════════════════════════════════════════
## EXACT NEXT STEPS — READ CAREFULLY
## ═══════════════════════════════════════════

### Phase UI-1 — DONE ✅
All tasks complete:
- ✅ Bottom nav: Stats→Coach (lightbulb), Me→Character (person icon)
- ✅ Today tab: session cards are now the hero — immediately visible. Week note chip at top, low readiness/all done/tomorrow/advance/missed after cards, wellness+weather+weekly report below the fold
- ✅ Coach tab: header renamed "Coach", CoachingCard first, then PBCard, WeeklyVolumeChart, ACWRChart, PaceTrend, SessionSummary, WellnessTrend, WeightTrend
- ✅ Character tab: header renamed "Character", badges moved near top (after hero + NextReward), XP chart, streak, PBs, training summary, then "Account & Integrations" divider, then Strava/PWA/Athlete/Settings/Export/Sign out

---

### Phase UI-2 — NEXT UP

#### TASK 1 — Session card visual redesign
File: `src/app/today/TodayClient.tsx` → `SessionCard` component (around line 356)

Current card:
```jsx
<div className={`rounded-2xl border transition-all ${done ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-100 bg-white'} overflow-hidden`}>
  <div className="flex items-start gap-3 p-4" onClick={onTap}>
```

Target changes:
- Add `border-l-4` left accent in session type colour (use `cfg.accent` — add this field to `getSessionType` in `src/lib/sessionUtils.ts`)
- Increase padding: `p-4` → `p-5`
- Session name: `text-sm` → `text-base font-bold`
- Done state: make the green wash more visible — `bg-emerald-50/50` → `bg-emerald-50` with `border-emerald-300`
- Card minimum height: add `min-h-[80px]`

Session type accent colours to add to `getSessionType`:
```
run_easy    → border-l-emerald-400
run_tempo   → border-l-amber-400
run_long    → border-l-teal-500
run_intervals → border-l-red-400
gym_*       → border-l-violet-400
rest/cross  → border-l-gray-200
```

#### TASK 2 — Week progress bar in Today header
File: `src/app/today/TodayClient.tsx` → header section (around line 614)

The header currently has:
```jsx
<span className="text-[11px] text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
  W{weekN}/{plan.total_weeks}
</span>
```

Enhance to show a thin progress bar inside or below the pill:
- Keep the `W{weekN}/{plan.total_weeks}` text
- Add a mini progress fill: `width: ${(plan.current_week / plan.total_weeks) * 100}%`
- Colour: teal for < 80% complete, emerald for ≥ 80%

#### TASK 3 — Colour system tightening (lower priority, do last)
Reduce colour palette. Currently scattered: teal + violet + amber + orange + red + emerald + indigo + blue + purple.
Target: **teal** (brand), **amber** (warnings), **emerald** (success), **red** (danger only).

Files to touch:
- `src/app/today/TodayClient.tsx` — Sunday banner + weekly report: violet/indigo → teal
- `src/app/dashboard/StatsClient.tsx` — early-weeks guidance card already teal ✅
- `src/app/profile/ProfileClient.tsx` — mostly fine

---

## After Phase UI-2 — Phase UI-3 (next sessions)

### UI-3a — Character customisation (skin/hair/kit)
### UI-3b — Character states + medals  
### UI-3c — Unlockable items + challenge system (£ revenue)

---

## Vercel env vars — all set ✅
| Var | Status |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | ✅ |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✅ |
| NEXT_PUBLIC_SITE_URL | ✅ |
| ANTHROPIC_API_KEY | ✅ Live |
| NEXT_PUBLIC_PREMIUM_ENFORCED | ✅ false |
| STRAVA_CLIENT_ID | ✅ |
| NEXT_PUBLIC_STRAVA_CLIENT_ID | ✅ |
| STRAVA_CLIENT_SECRET | ✅ |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | ✅ |
| VAPID_PRIVATE_KEY | ✅ |
| VAPID_EMAIL | ✅ |
| CRON_SECRET | ✅ |
| SUPABASE_SERVICE_ROLE_KEY | ❌ Optional |

---

## Full roadmap summary
```
Phase UI-1  ✅  Tab restructure — COMPLETE
Phase UI-2  🟡  Session card redesign, week progress bar, colour tightening  ~4h
Phase UI-3a ⬜  Character customisation (skin/hair/kit)            ~5h
Phase UI-3b ⬜  Character states + medals                          ~5h
Phase UI-3c ⬜  Unlockable items + challenge system (£ revenue)    ~6h
Phase UI-4  ⬜  Fuel platform (TDEE, macro targets, AI nutrition)  ~8h
Phase UI-5  ⬜  Motion & delight (animations, PB toast, confetti)  ~4h
Phase 10    ⬜  Social, email digest, sharing                      ~6h
Phase 11    ⬜  Monetisation — Stripe + Pro tier                   ~8h
Phase 12    ⬜  Coach tier + performance improvements              ~8h
```

## Key files
- Bottom nav:    src/components/BottomNav.tsx ✅ done
- Today tab:     src/app/today/TodayClient.tsx ✅ done (UI-2 next)
- Coach/Stats:   src/app/dashboard/StatsClient.tsx ✅ done
- Character/Me:  src/app/profile/ProfileClient.tsx ✅ done
- Session utils: src/lib/sessionUtils.ts (add accent colours for UI-2)
- Plan:          src/app/plan/PlanClient.tsx
- Fuel:          src/app/nutrition/NutritionClient.tsx
- Feature flags: src/lib/features.ts
- ProGate:       src/components/ProGate.tsx
- AI rate limit: src/lib/aiRateLimit.ts

## Architecture notes
- Next.js 16, Supabase, all tabs client components
- Dark mode: localStorage + `.dark` on `<html>`, ThemeWrapper applies on mount
- Units: localStorage `nextsplit_units`, `useUnits()` hook
- PWA: `/public/sw.js`, ServiceWorkerRegistrar
- Premium: NEXT_PUBLIC_PREMIUM_ENFORCED=false → all features open
- AI: 5 calls/user/day dev limit, checks `ai_usage` table (fails open if missing)

## Build commands
```bash
cd nextsplit-v2
npm install
node_modules/.bin/next build   # ALWAYS verify before committing
git add -A && git commit -m "message"
git push origin main
# Tell user to open deploy hook URL in browser
```

## After each phase
Update this HANDOFF-2.md, commit it, push it, copy to /mnt/user-data/outputs/, use present_files tool.
