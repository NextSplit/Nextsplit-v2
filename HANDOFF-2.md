# NextSplit v2 — Dev Session Handoff
_Last updated: end of session 12 (UI-3 + UI-4 complete)_

## ⚠️ START OF SESSION CHECKLIST
1. Reuse GitHub token from conversation (ghp_TOKEN_REDACTED)
2. `cd /home/claude/nextsplit-v2 && git pull origin main && npm install`
3. `node_modules/.bin/next build` — confirm clean before touching anything
4. Read EXACT NEXT STEPS below before writing any code

---

## Repo
- GitHub: https://github.com/NextSplit/Nextsplit-v2
- Live: https://nextsplit-v2.vercel.app
- Deploy hook (user opens in browser): `https://api.vercel.com/v1/integrations/deploy/prj_pEA372Qu7gpT6SbskQbeuveYZ9Ri/onqfsTdnji`

## Git log (latest first)
```
5d7a7ce  Phase UI-4: TDEE calculator, AI fuel coach, calorie ring, macro bars
d135c16  Phase UI-3: kit colour, character states, medal overlays
69e3787  docs: update HANDOFF-2 after Phase UI-2 complete
133177f  Phase UI-2: session card redesign, week progress bar, colour tightening
```

## Phases complete
- Phase 0–9  ✅ Foundation, AI, Strava
- Phase UI-1 ✅ Tab renames + reorders
- Phase UI-2 ✅ Session card redesign, progress bar, colour tightening
- Phase UI-3 ✅ Character: kit colour, states, medals
- Phase UI-4 ✅ Fuel: TDEE, AI coach, calorie ring

---

## EXACT NEXT STEPS

### Phase UI-5 — Motion & delight (NEXT)

#### TASK 1 — PB toast animation
File: `src/app/today/TodayClient.tsx` around line 1162
Currently uses `animate-bounce-once` (custom class). Upgrade:
- Replace with a slide-up + fade-in entrance
- Add confetti burst (use CSS only — 6–8 coloured spans with keyframe animations, no external lib)
- Add a subtle pulse on the trophy emoji

#### TASK 2 — Session card tap feedback
File: `src/app/today/TodayClient.tsx` → `SessionCard` component
When quick-done button is tapped:
- Scale the checkmark with `scale-125` for 200ms then back
- Flash the card border briefly to the accent colour (already have `cfg.accent`)

#### TASK 3 — Level-up screen upgrade
File: `src/app/profile/ProfileClient.tsx` → `LevelUpScreen`
Currently uses `animate-bounce` on the ⚡ emoji. Add:
- Stars/particles radiating outward (pure CSS keyframes)
- Slide-up entrance on the card content
- Number counter animating from old level to new level

#### TASK 4 — XP gain micro-animation on Today tab
When a session is logged, show a small "+XP" bubble that floats up from the quick-done button and fades out. Lives in TodayClient. Pure CSS, no library.

---

### Phase 10 — Social + sharing (after UI-5)
- Share session card (already has basic ShareSessionCard) — upgrade to proper image generation
- Weekly summary share card
- Deep link: nextsplit.app/u/[username] public profile page

### Phase 11 — Stripe + Pro tier
- ProGate is already wired (src/components/ProGate.tsx)
- NEXT_PUBLIC_PREMIUM_ENFORCED=false currently (all open)
- Add Stripe checkout, webhook, update profiles.is_pro in Supabase
- Gate: AI coaching (5→unlimited calls), advanced analytics, character cosmetics

### Phase 12 — Coach tier
- Coach dashboard (admin view of multiple athletes)
- Athlete invite links
- Coach-written plan templates

---

## Key files
- Today tab:      src/app/today/TodayClient.tsx
- Coach tab:      src/app/dashboard/StatsClient.tsx
- Character tab:  src/app/profile/ProfileClient.tsx
- Fuel tab:       src/app/nutrition/NutritionClient.tsx
- RPG lib:        src/lib/rpg.ts (renderCharSVG takes optional kitColourOverride)
- Nutrition lib:  src/lib/nutrition.ts (calcCalories now takes height/age/sex)
- Session utils:  src/lib/sessionUtils.ts (accent colours for cards)
- Feature flags:  src/lib/features.ts
- ProGate:        src/components/ProGate.tsx

## Architecture
- Next.js 16, Supabase, all tabs client components
- Colour system: teal=brand, amber=warnings, emerald=success, red=danger
- AI: Anthropic API called client-side in artifacts/components
- Kit colour: localStorage nextsplit_kit_colour
- TDEE: localStorage nextsplit_tdee_height/age/sex
- Premium: NEXT_PUBLIC_PREMIUM_ENFORCED=false (all features open)

## Build + deploy
```bash
cd nextsplit-v2 && git pull && npm install
node_modules/.bin/next build
git config user.email "dev@nextsplit.app" && git config user.name "NextSplit Dev"
git add -A && git commit -m "message" && git push origin main
# User opens deploy hook in browser
```
