# NextSplit v2 — Dev Session Handoff
_Last updated: end of session 9 (Phase UI-1 partial — tab rename done, Today reorder next)_

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
bb432d2  Phase UI-1 (partial): rename Stats→Coach, Me→Character in bottom nav
129007c  docs: update HANDOFF-2 after Phase 8 Strava
7b59ac9  fix: Strava — useEffect for connection check, env var for client ID
36231bc  Phase 8: Strava — connect toast, athlete name, manual sync, last sync time
5cf8235  docs: update HANDOFF-2 after Phase 9
6a53e16  Phase 9: rich wellness dashboard, weight trend, multi-distance race predictor
bb8fbeb  Phase 7: premium framework + AI rate limiting
e127022  Phase 6: PB auto-pace, Sunday week fix, re-engagement, dirty-check
e55f308  fix: 8-item audit sprint
a4f0146  Phase 5C: PWA
bf6c56c  Phase 5B: Strava core
```

## Phases complete
- Phase 0–9 ✅ Full foundation, AI live, Strava live
- Phase UI-1 🟡 PARTIAL — tab rename done, Today reorder + Coach/Character restructure remaining

---

## ═══════════════════════════════════════════
## EXACT NEXT STEPS — READ CAREFULLY
## ═══════════════════════════════════════════

### What's done in Phase UI-1
- ✅ Bottom nav renamed: Stats → **Coach**, Me → **Character**
- ✅ Coach tab has a lightbulb icon, Character tab has person icon
- ✅ Tab label font slightly tightened (text-[9px] font-semibold tracking-wide)

### What still needs doing in Phase UI-1

#### TASK 1 — Today tab reorder (sessions first)
File: `src/app/today/TodayClient.tsx`

**WARNING**: This file is ~1,150 lines. Previous attempts at surgical str_replace failed due to file complexity. Use this strategy:

Find the main content block — it starts around line 700 with:
```
{/* Sessions */}
{!loading && plan && (
  <>
```

The current order inside this block is:
1. Weather
2. Wellness check-in
3. Monday weekly report
4. Low readiness suggestion
5. Sunday coach banner
6. Week note
7. Rest day
8. Session timing row
9. Contextual fuel card
10. **Session cards** ← these should be FIRST
11. Sleep note
12. Missed session suggestion
13. All done celebration
14. Tomorrow preview
15. Week advance prompt

**Target order:**
1. Week note chip (compact 1-liner, not a full card)
2. Rest day (if no sessions)
3. Session timing row
4. **Session cards** ← HERO, immediately visible
5. Low readiness suggestion (shown only when readiness ≤5)
6. All done celebration
7. Tomorrow preview
8. Week advance prompt
9. Missed session suggestion (past days)
10. Sleep note
11. Contextual fuel card (collapsed/secondary)
12. Wellness check-in (below the fold)
13. Weather (below the fold)
14. Monday weekly report (Mondays only, below the fold)
15. Sunday coach banner (Sundays only, below the fold)

**Best approach**: Extract the session cards block and the post-session blocks (all done, tomorrow, advance), put them at the top of the JSX after the week note chip, then put everything else below. Do not try to do this with multiple str_replace calls — instead read the full block, rewrite it as one complete replacement.

#### TASK 2 — Coach tab (Stats) restructure
File: `src/app/dashboard/StatsClient.tsx`

Find the stats tab render around line 1075:
```jsx
<CoachingCard />
<SessionSummary logs={logs} weeks={weeks} />
<PBCard logs={logs} />
<WeeklyVolumeChart logs={logs} weeks={weeks} />
<WellnessTrend />
<WeightTrend />
<ACWRChart logs={logs} weeks={weeks} />
<PaceTrend logs={logs} />
```

**Target order** (AI first, analytics second):
```jsx
<CoachingCard />         {/* AI insight — top, most prominent */}
{/* Pre-race brief already rendered above this */}
<PBCard logs={logs} />   {/* Achievements — high value */}
<WeeklyVolumeChart />    {/* Volume */}
<ACWRChart />            {/* Load */}
<PaceTrend />            {/* Pace trend */}
<SessionSummary />       {/* Summary numbers */}
<WellnessTrend />        {/* Wellness */}
<WeightTrend />          {/* Weight */}
```

Also update the Stats tab header (around line 940) to say "Coach" instead of whatever it currently says. Find:
```jsx
<h1 className="...">Stats</h1>  {/* or similar */}
```

#### TASK 3 — Character tab (Profile) restructure
File: `src/app/profile/ProfileClient.tsx`

Current order in the JSX (roughly lines 1100–1270):
- Hero card (character + XP + level) ← good, keep at top
- XP feed
- Badge grid
- Training summary
- Strava section
- PWA install card
- Athlete profile section
- Data export
- Settings link
- Sign out

**Target order:**
1. Hero card (character + XP + level) ← already first ✅
2. Badge grid (achievements visible immediately)
3. XP feed (recent gains)
4. Training summary
5. **[divider: "Account & Integrations"]**
6. Strava section
7. PWA install card
8. Athlete profile section
9. Settings link
10. Data export
11. Sign out

#### TASK 4 — Update tab headers
Each tab has a sticky header with its name. Update:
- `src/app/dashboard/StatsClient.tsx` — find header h1 "Stats" → change to "Coach"  
- `src/app/profile/ProfileClient.tsx` — find header text "Profile" or similar → change to "Character"

#### TASK 5 — Move AI Coaching Card to very top of Coach tab
In StatsClient, the CoachingCard is already in the render order but may not be first. Make sure it renders before everything else in the stats tab (after the tab switcher UI, before SessionSummary/PBCard etc).

---

## After Phase UI-1 — Phase UI-2 (next session)

### Session card redesign
In `TodayClient.tsx` → `SessionCard` component (around line 340):
- Make cards taller (increase padding)
- Add left accent border: `border-l-4` in the session type colour
- Larger session name text (text-base instead of text-sm)
- Done state: full card green wash (bg-emerald-50 already exists, make it more prominent)

### Week progress in Today header
In `TodayClient.tsx` → header section (around line 610):
- Add a thin progress bar or `W3/16` pill showing week progress
- Already shows `W{weekN}/{plan.total_weeks}` as a pill — enhance this

### Colour system tightening
Currently uses: teal + violet + amber + orange + red + emerald + indigo + blue + purple
Reduce to: **teal** (primary/brand), **amber** (warnings), **emerald** (success/done), **red** (danger only)
Replace all violet/indigo/purple background cards with teal-tinted equivalents

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
Phase UI-1  🟡  Tab restructure (IN PROGRESS — tasks above)       ~3h remaining
Phase UI-2  ⬜  Session card redesign, visual language              ~4h
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
- Bottom nav:    src/components/BottomNav.tsx (tab rename done ✅)
- Today tab:     src/app/today/TodayClient.tsx (reorder needed)
- Coach/Stats:   src/app/dashboard/StatsClient.tsx (reorder + rename needed)
- Character/Me:  src/app/profile/ProfileClient.tsx (reorder needed)
- Plan:          src/app/plan/PlanClient.tsx
- Fuel:          src/app/nutrition/NutritionClient.tsx
- Feature flags: src/lib/features.ts (edit to gate features)
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
