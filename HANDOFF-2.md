# NextSplit v2 — Dev Session Handoff
_Last updated: end of session 19 — core training plan phase complete_

## START OF SESSION CHECKLIST
1. Reuse GitHub token from conversation history
2. `cd /home/claude/nextsplit-v2 && git pull origin main && npm install`
3. `node_modules/.bin/next build` — confirm clean before touching anything
4. Read EXACT NEXT STEPS below

---

## Repo
- GitHub: https://github.com/NextSplit/Nextsplit-v2
- Live: https://nextsplit-v2.vercel.app
- Deploy hook (user opens in browser): `https://api.vercel.com/v1/integrations/deploy/prj_pEA372Qu7gpT6SbskQbeuveYZ9Ri/onqfsTdnji`

## Git log (latest first)
```
1d60ed4  Fix week 1 gym sessions: base week gym-a/b not gym-c
85f0195  Core feature: gym sessions in all 17 plans, coached session notes, ad-hoc session logging
c1cd13d  docs: update HANDOFF-2 — all audit items closed
ad5d579  Audit closes: gym error handling, AI free tier 0→3, gym celebration
c8da7d9  Audit fixes: gym error handling + celebration, HeroCard XP skeleton, race date validation
10ef953  Security: 3 client-side Anthropic calls → server routes; VAPID fix; race-date warning
```

---

## ⚠️ IMPORTANT: Re-seed plan templates after deploy

After deploying, run the seed endpoint to update Supabase plan_templates with gym sessions + coached notes:
```
POST https://nextsplit-v2.vercel.app/api/admin/seed-plans
Header: x-seed-secret: [SEED_SECRET env var value]
```
Or just hit it from curl/Postman. Existing active user_plans won't change automatically (weeks_data is copied at activation). New plan activations will get everything.

---

## What was built in session 19

### Gym sessions added to all 17 plan templates
Placement rules (all verified clean — no gym in race weeks):
- **Beginners** (3 rest days: 0,2,4): 1 gym session on day 2
- **Intermediate** (2 rest days: 2,4): 2 sessions — gym-a day 2, gym-b day 4, alternating weekly
- **Advanced** (1 rest day: 4): 1 session on day 4

Build-phase rules:
- `b=k` (build): Gym A (lower body 3x10) or Gym B (upper body 3x10) alternating by week
- `b=p` (peak): Gym B only (upper body 4x5 — spare legs for hard running)
- `b=d` (deload/taper): Gym C (posterior chain + mobility, 2x12)
- `b=r` (race week): No gym
- Week 1 (always `b=d` in templates): Gym A with beginner coaching note (not taper note)

### Coached session notes on every session
Every running AND gym session det field now contains:
`"technical detail — coaching rationale explaining the why"`

UI splits these at ` — `:
- **Technical part**: shown in compact card preview (line-clamp-2) and bold in modals
- **Coaching rationale**: shown in a teal 🧠 callout card in log modal (Today tab) and session drawer (Plan tab)

### Ad-hoc session logging
"Add a session" dashed button at bottom of Today's session list (today only).
Opens bottom sheet with 6 types: Easy run, Lower body, Upper body, Mobility, Cross-training, Walk.
Optional duration (minutes) + notes. Logs at `session_i: 99` — never conflicts with plan sessions.
Feeds training history and AI coach context.

---

## NEXT PHASE: Gym discoverability + AI coach awareness

### Phase A — Gym discoverability (START HERE)

**Problem:** Gym sessions now exist in plans but users can only reach the gym live tracker by tapping the session card on Today. There's no visual distinction between a gym card and a run card, and users don't know they can "go live" into a gym session.

**Tasks:**

**A1 — Gym session card visual treatment on Today tab**
In `src/app/today/TodayClient.tsx`, gym session cards (where `session.c.startsWith('gym')`) need:
- A weight icon or 🏋️ emoji prominently displayed
- Clear "Start session →" CTA instead of the RPE quick-done button
- The card should communicate this is an interactive tracker, not just a log entry
Current code at line ~860: cards already route to `/gym/live/...` but look identical to run cards

**A2 — Week view gym session indicator in Plan tab**
In `src/app/plan/PlanClient.tsx`, the DayRow pills at line ~409 show session type colours but gym sessions don't stand out enough. Add 🏋️ emoji before gym session names in the pill.

**A3 — Gym session direct entry on rest days**
When Today tab shows a rest day (`todaySessions.length === 0`) but the plan has a gym session for this day index, show it. Currently rest days show "😴 Rest day" and nothing else. The fix: check `planDay.sessions` directly (not filtered by `todaySessions`) and render gym sessions separately.

**A4 — "Your gym sessions this week" summary card**
Add a compact card to the Plan tab showing the week's gym sessions with completion status. Should appear in the current week section alongside the week note.

### Phase B — AI coach gym awareness

**Problem:** The AI coach route at `/api/ai/coach` builds context from `weeks_data` but its prompt doesn't mention gym sessions at all. The coach can't reference strength work in its insights.

**Tasks:**

**B1 — Update AI coach prompt to include gym sessions**
In `src/app/api/ai/coach/route.ts`, the `context` string built around line 70 shows running summaries only. Add:
- Count of gym sessions completed this week vs planned
- Types of gym work done (lower body, upper body, mobility)
- Flag if a gym session was missed during a peak week

**B2 — Update AI suggestions to consider gym load**
`src/app/api/ai/suggestions/route.ts` receives `analysisData` from `AdaptiveSuggestions.tsx`. The analysis currently only looks at running logs. Add gym log count to the data sent.

### Phase C — Onboarding gym preference question

**Problem:** AI bespoke onboarding doesn't ask about gym preferences, so the recommendation prompt has no gym context. Also, all predetermined plans now include gym sessions regardless of whether the user wants them.

**Tasks:**

**C1 — Add gym preference step to AI onboarding**
In `src/app/onboarding/ai/AIOnboardingClient.tsx`, add a step after `level` asking:
"Do you want to include strength training?" with options: Yes (2x/week), Light (1x/week), No (running only)
Pass this preference to `/api/ai/recommend` and include it in the prompt.

**C2 — Gym preference in predetermined onboarding**
In `src/app/onboarding/predetermined/PlanBrowserClient.tsx`, show a toggle on the plan detail page: "Include strength sessions (recommended)" defaulting to on. If toggled off, pass a flag to `/api/plans/activate` that strips gym sessions from `weeks_data` before saving.

**C3 — Strip gym sessions from activate route when requested**
In `src/app/api/plans/activate/route.ts`, handle a `include_gym: false` body param that removes gym sessions from `weeks_data` before insertion.

### Phase D — Longer term (roadmap)
- Other activity logging (swimming, cycling, walking) → affects fuelling + analytics
- Garmin export
- AI-generated personalised coaching note per session (Option B from earlier discussion)
- Weekly gym plan progression (weight suggestions based on previous session)

---

## File map for next phase work

| File | What to change |
|---|---|
| `src/app/today/TodayClient.tsx` | Gym card visual treatment (A1), rest day gym sessions (A3) |
| `src/app/plan/PlanClient.tsx` | Gym pill emoji (A2), gym week summary card (A4) |
| `src/app/api/ai/coach/route.ts` | Add gym session counts to context (B1) |
| `src/app/api/ai/suggestions/route.ts` | Add gym data to analysis (B2) |
| `src/app/onboarding/ai/AIOnboardingClient.tsx` | Gym preference step (C1) |
| `src/app/onboarding/predetermined/PlanBrowserClient.tsx` | Gym toggle (C2) |
| `src/app/api/plans/activate/route.ts` | include_gym flag (C3) |
| `plans/*.json` | All 17 seeded — do not edit manually, use scripts/ |

---

## Plan template structure (for reference)

```json
{
  "meta": { "id": "slug", "level": "intermediate", "distance": "marathon", ... },
  "weeks": [
    {
      "n": 1, "ph": "p1", "b": "k", "title": "...", "note": "...",
      "kl": [50, 60], 
      "days": [
        {
          "sessions": [
            {
              "c": "run-easy",
              "n": "Easy recovery run", 
              "det": "8km easy · 5:55–6:20/km — coaching rationale here",
              "km": 8
            }
          ]
        }
      ]
    }
  ]
}
```

Session `c` codes: `run-easy`, `run-int`, `run-tempo`, `run-long`, `run-race`, `gym-a`, `gym-b`, `gym-c`, `rest`
Build flags: `k`=build, `d`=deload/base, `p`=peak, `r`=race week
Gym det format: `"Exercise NxM · Exercise NxM · ... — coaching note"` (parsed by `parseDetToExercises()`)

---

## All API routes
```
POST /api/ai/coach          — Coaching card (server, auth + rate limited)
POST /api/ai/fuel           — Fuel tip (server, auth + rate limited)
POST /api/ai/suggestions    — Adaptive suggestions (server, auth + rate limited)
POST /api/ai/pre-race-brief — Pre-race brief (server, auth + rate limited)
POST /api/ai/recommend      — AI onboarding plan recommendation
POST /api/plans/activate    — Activate plan (validates race date, returns raceTooSoon)
POST /api/plans/reset       — Reset plan to week 1
POST /api/strava/sync       — Sync Strava
POST /api/strava/disconnect — Remove Strava connection
POST /api/notifications/subscribe — Register push subscription
POST /api/notifications/send      — Send push notification
GET  /api/cron/notify       — Daily training reminder cron
POST /api/admin/seed-plans  — Re-seed plan templates (requires x-seed-secret header)
```

## Architecture
- Next.js 16, Supabase, all tabs client components
- All AI calls: server-side only, auth + rate limited (free=3/day, pro=25, coach=50)
- Colour system: teal=brand, amber=warnings, emerald=success, red=danger only
- No window.confirm/alert — all inline confirmation patterns
- Haptics: hapticLight() on session log, hapticSuccess() on gym/PB
- Premium: NEXT_PUBLIC_PREMIUM_ENFORCED=false (all open until Stripe)

## Build + deploy
```bash
cd nextsplit-v2 && git pull && npm install
node_modules/.bin/next build
git config user.email "dev@nextsplit.app" && git config user.name "NextSplit Dev"
git add -A && git commit -m "message" && git push origin main
# User opens deploy hook in browser
# Then re-seed: POST /api/admin/seed-plans with x-seed-secret header
```
