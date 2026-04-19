# NextSplit v2 — Dev Session Handoff
_Last updated: end of chat session 1_

## Repo
- GitHub: https://github.com/NextSplit/Nextsplit-v2
- Token: [TOKEN - see Vercel env]
- Live: https://nextsplit-v2.vercel.app
- Clone: /home/claude/nextsplit-v2

## Git log (latest first)
```
0ddba07  Phase 3A/B partial: haptics utility, share session card, haptics wired
55aeb73  Phase 2: contextual fuel card, pre-race AI brief, adaptive suggestions
4c55fd0  Phase 1: Settings page, plan history, plan switching, units/dark mode
68d68f1  Phase 0: CSS tokens, Toast, ErrorBoundary, units utility, any-cast fixes
71681ee  Feature: Plan tab v2 — active/full view, day drawer, nutrition timeline
```

## What was built this session

### Phase 0 ✅ COMPLETE
- CSS variable token system + dim dark mode (zinc palette) in globals.css
- ThemeWrapper — applies .dark + .text-size-* to <html> from localStorage
- Toast system — useToast() hook, ToastProvider, animated items 96px above nav
- ErrorBoundary — wraps all 5 tab pages
- units.ts — km/miles: useUnits(), fmtDistance(), fmtPace(), secsPerKmToDisplay(), parsePaceInput()
- Fixed any casts: TodayClient (weeks_data, tomorrowSessions), NutritionClient (weekStartEnd), ProfileClient (injury_notes)

### Phase 1 ✅ COMPLETE
- Updated TypeScript types: profiles with units/dark_mode/text_size/notifications_enabled/notification_time
- Updated TypeScript types: user_plans with archived_at/completed_at
- useProfile now syncs dark_mode/text_size/units to localStorage via syncPrefsToStorage() on every load
- useActivePlan — added archivePlan() method (sets status='archived', archived_at=now())
- /settings/page.tsx + /settings/SettingsClient.tsx — full settings page:
  Profile (name/weight/age/email inline edit), Plan (reset to W1 with confirm,
  switch/archive with confirm), Units (km/miles select), Appearance (dark mode
  toggle, text size select), Notifications (toggle + time picker),
  Account (plan history link, export, sign out, delete info)
- /api/plans/reset/route.ts — POST endpoint, verifies ownership, sets current_week=1
- /history/page.tsx + /history/HistoryClient.tsx — plan history with full read-only
  replay: archived plan cards (km, sessions, weeks, completion %), tap → full
  read-only plan with all weeks/sessions/log status shown
- src/hooks/usePlanHistory.ts — fetches all archived plans with aggregated stats
- Settings gear icon added to Profile tab header (links to /settings)

### Phase 2 ✅ COMPLETE
- 2A: Replaced static fuel hint in Today tab with real contextual fuel card using
  planDay.nut data. Time-aware: shows upcoming entries in next 4h + macro targets card.
- 2B: PreRaceBrief component in Stats tab — appears when next race ≤7 days.
  Claude API generates pacing/fuelling/taper/mindset sections. 24h localStorage cache.
  Shows loading skeletons, error retry, regenerate button.
- 2C: AdaptiveSuggestions component in Plan tab — auto-generates after week 3,
  every 4 weeks. Analyses logged km vs planned, ACWR, session adherence.
  Returns 2-3 dismissable suggestion cards. Cached per-plan in localStorage.

### Phase 3 🔄 IN PROGRESS
- 3A DONE: src/lib/haptics.ts created — hapticLight(), hapticSuccess(),
  hapticCelebration(), hapticWarning(). Wired into TodayClient:
  hapticLight on session log, hapticSuccess on PB.
- 3B IN PROGRESS: src/components/ShareSessionCard.tsx created — canvas-rendered
  1080×1080 share card, Web Share API with file download fallback.
  NOT YET wired into Today tab undo strip.

## Immediate next tasks (start here in new chat)

### 1. Wire ShareSessionCard into Today tab (30 min)
File: src/app/today/TodayClient.tsx

Find the undo strip section (search for "undoInfo" around line 1050-1100).
The undo strip shows after logging a session. Add a "Share" button next to the
undo button that opens ShareSessionCard as a modal.

State needed: add to TodayClient:
  const [shareSession, setShareSession] = useState<{ session: PlanSession; log: TrainingLog } | null>(null)

In handleLogSession, after setting undoInfo, also store the session+log for sharing:
  setShareSession({ session: planDay.sessions[params.session_i], log })

In the undo strip JSX, add a share button:
  <button onClick={() => setShareSession(...)} >Share</button>

At the bottom of the return, render:
  {shareSession && <ShareSessionCard session={shareSession.session} log={shareSession.log} weekN={weekN} onClose={() => setShareSession(null)} />}

### 2. Push notifications — Phase 3C (2-3 hours)
Files to create:
  - /public/sw.js — service worker (push event handler)
  - /app/api/notifications/subscribe/route.ts — POST saves push subscription
  - /app/api/notifications/send/route.ts — POST sends push (called by cron)
  - /app/api/cron/notify/route.ts — runs daily, queries users, sends pushes

VAPID keys needed — generate with:
  npx web-push generate-vapid-keys
Add to Vercel env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL

In Settings, the Notifications toggle should:
  1. Request Notification permission
  2. Register service worker
  3. Get PushSubscription from browser
  4. POST to /api/notifications/subscribe with endpoint/p256dh/auth
  5. Store in push_subscriptions Supabase table (already migrated)

Vercel cron config in vercel.json:
  { "crons": [{ "path": "/api/cron/notify", "schedule": "0 * * * *" }] }

### 3. Plan completion ceremony — Phase 3D (1 hour)
File: src/app/today/TodayClient.tsx + src/app/plan/PlanClient.tsx

Trigger: when advanceWeek() would push current_week > total_weeks
Currently advanceWeek caps at total_weeks. Change to detect completion:

In useActivePlan.ts advanceWeek():
  if (nextWeek > plan.total_weeks) {
    // mark completed, don't advance
    update status='completed', completed_at=now()
  }

In TodayClient/PlanClient: detect plan.status === 'completed' and show
full-screen celebration modal with confetti, stats (total km, sessions,
badges earned), and "Start your next plan" CTA → /onboarding

### 4. After Phase 3 is complete:
- Commit with message "Phase 3: haptics, share card, push notifications, plan completion ceremony"
- Run full Phase 3 gate check (see DEVPLAN.md)
- Move to Phase 4: Stats enhancements, dark mode deep pass, accessibility

## SQL already run in Supabase
```sql
alter table profiles add column if not exists units text default 'km';
alter table profiles add column if not exists dark_mode boolean default false;
alter table profiles add column if not exists text_size text default 'default';
alter table profiles add column if not exists notifications_enabled boolean default false;
alter table profiles add column if not exists notification_time time default '07:00:00';
alter table user_plans add column if not exists archived_at timestamptz;
alter table user_plans add column if not exists completed_at timestamptz;
alter table wellness_logs add column if not exists weight_kg numeric(5,2);
create table if not exists push_subscriptions (...); -- with RLS
```

## Key file locations
- Today tab:      src/app/today/TodayClient.tsx (~1150 lines)
- Stats tab:      src/app/dashboard/StatsClient.tsx (~1025 lines)
- Profile tab:    src/app/profile/ProfileClient.tsx (~1100 lines)
- Fuel tab:       src/app/nutrition/NutritionClient.tsx (~980 lines)
- Plan tab:       src/app/plan/PlanClient.tsx (~630 lines)
- Settings:       src/app/settings/SettingsClient.tsx
- Plan History:   src/app/history/HistoryClient.tsx
- Hooks:          src/hooks/useActivePlan.ts, useProfile.ts, usePlanHistory.ts
- Lib:            src/lib/haptics.ts, src/lib/units.ts, src/lib/rpg.ts
- Components:     src/components/Toast.tsx, ErrorBoundary.tsx, ThemeWrapper.tsx
                  PreRaceBrief.tsx, AdaptiveSuggestions.tsx, ShareSessionCard.tsx

## Design decisions locked
- Dark mode: dim mode (zinc-900 palette, CSS variables) not true OLED black
- Units: km/miles including pace format (min/km ↔ min/mile)
- Plan history: Option B — full read-only replay
- Settings: /settings dedicated page
- Notifications: fixed time (user picks reminder time)
- AI adaptation: suggest-and-accept (not auto-apply)
- Second users: keen runners with varying abilities and goals

## Build commands
  npm run build          # production build
  npx tsc --noEmit       # type check only
  npm run dev            # local dev

## Architecture
- Next.js 14 App Router + Supabase + Tailwind
- PWA (manifest.json, service worker planned)
- Anthropic Claude API for: coaching card, pre-race brief, adaptive suggestions
- Strava OAuth for activity sync
- 4 onboarding paths: Predetermined, AI bespoke, Manual, Lifestyle
